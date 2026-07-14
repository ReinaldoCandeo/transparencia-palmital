import { buscarDetalhe } from "@/lib/onedoc";

export const revalidate = 300; // cache ISR da Vercel: revalida a cada 5 minutos

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  const processo = await buscarDetalhe(hash);

  if (!processo) {
    return Response.json(
      { error: "Processo não encontrado ou não pertence ao setor permitido." },
      { status: 404 }
    );
  }

  return Response.json(processo);
}
