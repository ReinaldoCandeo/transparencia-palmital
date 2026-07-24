import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // ── Barreira de Segurança (Idêntica ao Cron) ──────────────────────────────
  // Este endpoint é exclusivo para debug interno e nunca deve ser público.
  const authHeader = req.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ────────────────────────────────────────────────────────────────────────

  const baseUrl = process.env.ONEDOC_BASE_URL;
  const authHash = process.env.ONEDOC_AUTH_HASH;

  if (!baseUrl || !authHash) {
    return NextResponse.json(
      { error: "Erro Crítico: Variáveis ONEDOC_BASE_URL ou ONEDOC_AUTH_HASH não configuradas." },
      { status: 500 }
    );
  }

  // ── MODO INSPECÇÃO POR HASH (?hash=XXXX) ───────────────────────────────────
  // Bate diretamente no endpoint de detalhe da 1Doc e retorna o payload bruto.
  // Útil para: (1) investigar falhas do cron, (2) mapear campos obfuscados.
  const hash = req.nextUrl.searchParams.get("hash");
  if (hash) {
    try {
      const res = await fetch(
        `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`,
        { headers: { "X-Auth-Hash": authHash }, cache: "no-store" }
      );

      const payload = res.ok ? await res.json() : null;

      return NextResponse.json({
        hash,
        status_1doc: res.status,
        status_text: res.statusText,
        ok: res.ok,
        payload,
      });
    } catch (error) {
      return NextResponse.json(
        { hash, error: "Erro ao consultar 1Doc", detalhe: String(error) },
        { status: 500 }
      );
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── MODO LISTAGEM PAGINADA (?pagina=X) ────────────────────────────────────
  const paginaStr = req.nextUrl.searchParams.get("pagina") ?? "1";
  const pagina = parseInt(paginaStr, 10);

  if (isNaN(pagina) || pagina < 1 || pagina > 500) {
    return NextResponse.json({ error: "Página inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${baseUrl}/processos-administrativos?pagina=${pagina}`,
      {
        headers: { "X-Auth-Hash": authHash },
        next: { revalidate: 300, tags: ["onedoc-bruta", String(pagina)] }
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Falha na API 1Doc", status: res.status }, { status: 502 });
    }

    const dados = await res.json();
    return NextResponse.json(dados);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no proxy", detalhe: String(error) }, { status: 500 });
  }
}
