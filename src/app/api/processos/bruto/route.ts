import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const paginaStr = req.nextUrl.searchParams.get("pagina") ?? "1";
  const pagina = parseInt(paginaStr, 10);

  if (isNaN(pagina) || pagina < 1 || pagina > 500) {
    return NextResponse.json({ error: "Página inválida" }, { status: 400 });
  }

  // 1. BLINDAGEM DE AMBIENTE: Pega as variáveis antes de qualquer coisa
  const baseUrl = process.env.ONEDOC_BASE_URL;
  const authHash = process.env.ONEDOC_AUTH_HASH;

  if (!baseUrl || !authHash) {
    return NextResponse.json(
      { error: "Erro Crítico: Variáveis ONEDOC_BASE_URL ou ONEDOC_AUTH_HASH não configuradas na Vercel (Ambiente Preview)." },
      { status: 500 }
    );
  }

  try {
    // 2. CACHE NATIVO: Usando o fetch patch do Next.js (estável em Route Handlers)
    const res = await fetch(
      `${baseUrl}/processos-administrativos?pagina=${pagina}`,
      { 
        headers: { "X-Auth-Hash": authHash },
        next: { revalidate: 300, tags: ["onedoc-bruta", String(pagina)] } // Cache explícito e seguro
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
