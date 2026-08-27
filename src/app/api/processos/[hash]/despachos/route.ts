import { buscarDetalhe } from "@/lib/onedoc";
import { ASSUNTOS_EMENDA } from "@/lib/assuntos";

export const revalidate = 0; // Removido o cache ISR para evitar exposição de dados sensíveis cacheados

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  // S2: Proteção da rota com Token Bearer (mesmo do Cron)
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hash } = await params;
  const processo = await buscarDetalhe(hash);

  if (!processo) {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  // Validação adicional: Expor apenas processos que pertencem ao escopo do Portal da Transparência
  if (!ASSUNTOS_EMENDA.has(processo.id_assunto)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(processo);
}
