import { NextRequest, NextResponse, after } from "next/server";
import { syncProcessByHash } from "@/lib/sync-core";
import { assertSecretAuth } from "@/lib/api-auth";
import { webhook1DocPayloadSchema } from "@/lib/schemas";

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Barreira de Segurança Centralizada (Fail-Closed, Constant-Time)
    // Suporta Header X-Webhook-Secret / Bearer (preferenciais) e fallback para ?token=
    const authError = assertSecretAuth(req, "WEBHOOK_SECRET", {
      allowQueryParam: "token",
      headerName: "x-webhook-secret",
    });

    if (authError) {
      console.warn(`🔒 [WEBHOOK] Tentativa de acesso não autorizada a ${req.nextUrl.pathname}.`);
      return authError;
    }

    // 2. Extração e Decodificação do Base64
    // A 1Doc envia o payload encapsulado em Base64 no corpo bruto (raw text).
    const rawBody = await req.text();
    let decodedJson = "";
    let parsedRaw: unknown = null;

    try {
      decodedJson = Buffer.from(rawBody, 'base64').toString('utf-8');
      parsedRaw = JSON.parse(decodedJson);
    } catch (e: unknown) {
      const parseErrorMsg = e instanceof Error ? e.message : String(e);
      console.error("❌ [WEBHOOK] Falha ao decodificar Base64 ou fazer Parse do JSON:", parseErrorMsg);
      // Retornamos 200 para a 1Doc parar de tentar reenviar payload mal formatado
      return NextResponse.json({ ok: true, message: "Payload inválido ignorado" });
    }

    // 3. Validação Resiliente com Zod (.passthrough())
    const validation = webhook1DocPayloadSchema.safeParse(parsedRaw);
    if (!validation.success) {
      console.warn("⚠️ [WEBHOOK] Payload não compatível com o schema esperado.");
      return NextResponse.json({ ok: true, message: "Payload ignorado - estrutura incompatível" });
    }

    const hash = validation.data.emissao?.hash;
    if (!hash) {
      console.warn("⚠️ [WEBHOOK] Recebido payload sem emissao.hash. Ignorando.");
      return NextResponse.json({ ok: true, message: "Ignorado - sem hash" });
    }

    // 4. Delegação em Background (Ping & Pull)
    console.log(`⚡ [WEBHOOK] Sinal recebido para o hash: ${hash}. Iniciando rotina de Pull...`);
    
    after(() => {
      syncProcessByHash(hash).catch((err: unknown) => {
        const syncErrorMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [WEBHOOK BACKGROUND] Falha crítica ao processar hash ${hash}:`, syncErrorMsg);
      });
    });

    // 5. Resposta Imediata
    return NextResponse.json({ ok: true, message: "Sinal recebido e em processamento" });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [WEBHOOK FATAL ERROR]:", errorMsg);
    return NextResponse.json(
      { ok: false, message: "Erro interno no processamento", error: errorMsg },
      { status: 500 }
    );
  }
}
