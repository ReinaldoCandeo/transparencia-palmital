import { listarProcessos } from "@/lib/onedoc";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const inicio = Date.now();
  const processos = await listarProcessos();

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
