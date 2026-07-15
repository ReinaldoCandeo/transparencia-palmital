import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const paginaStr = req.nextUrl.searchParams.get("pagina") ?? "1";
  const pagina = parseInt(paginaStr, 10);

  if (isNaN(pagina) || pagina < 1 || pagina > 500) {
    return NextResponse.json({ error: "Página inválida" }, { status: 400 });
  }

  // Cache individual com chave EXPLÍCITA amarrada à página atual
  const buscarPaginaBruta = unstable_cache(
    async () => {
      const res = await fetch(
        `${process.env.ONEDOC_BASE_URL}/processos-administrativos?pagina=${pagina}`,
        { headers: { "X-Auth-Hash": process.env.ONEDOC_AUTH_HASH! } }
      );
      if (!res.ok) return null;
      return res.json();
    },
    ["onedoc-bruta", String(pagina)], // Chave explícita: resolve colisões
    { revalidate: 300 }
  );

  const dados = await buscarPaginaBruta();
  if (!dados) return NextResponse.json({ error: "Falha upstream" }, { status: 502 });

  return NextResponse.json(dados);
}
