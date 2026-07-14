import { listarProcessos, type ProcessoPublico } from "@/lib/onedoc";

export const revalidate = 300; // cache ISR da Vercel: revalida a cada 5 minutos

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anoFiltro = searchParams.get("ano");

  const processos = await listarProcessos();

  const filtrados = anoFiltro
    ? processos.filter((p) => p.ano === anoFiltro)
    : processos;

  const anos = [...new Set(processos.map((p) => p.ano))].sort(
    (a, b) => Number(b) - Number(a)
  );

  const porAno = anos.reduce<Record<string, ProcessoPublico[]>>((acc, ano) => {
    acc[ano] = processos.filter((p) => p.ano === ano);
    return acc;
  }, {});

  return Response.json({ total: filtrados.length, anos, por_ano: porAno });
}
