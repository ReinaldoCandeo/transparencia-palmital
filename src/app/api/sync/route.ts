import { revalidateTag } from "next/cache";
import { sincronizarProcessos } from "@/lib/onedoc";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Limpa os caches salvos de processos e detalhes
  revalidateTag("processos", "max");
  revalidateTag("processo-detalhe", "max");

  const inicio = Date.now();
  const processos = await sincronizarProcessos();

  const porAno = processos.reduce<Record<string, number>>((acc, p) => {
    acc[p.ano] = (acc[p.ano] ?? 0) + 1;
    return acc;
  }, {});

  return Response.json({
    ok: true,
    total_processos: processos.length,
    por_ano: porAno,
    duracao_ms: Date.now() - inicio,
    timestamp: new Date().toISOString(),
  });
}
