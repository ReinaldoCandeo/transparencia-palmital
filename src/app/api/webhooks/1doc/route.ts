import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { syncProcessByHash } from "@/lib/sync-core";

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Barreira de Segurança
    const token = req.nextUrl.searchParams.get("token");
    if (!process.env.WEBHOOK_SECRET || token !== process.env.WEBHOOK_SECRET) {
      console.warn("🔒 [WEBHOOK] Tentativa de acesso não autorizada.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Extração e Decodificação do Base64
    // A 1Doc envia o payload encapsulado em Base64 no corpo bruto (raw text).
    const rawBody = await req.text();
    let decodedJson = "";
    let payload: any = {};

    try {
      decodedJson = Buffer.from(rawBody, 'base64').toString('utf-8');
      payload = JSON.parse(decodedJson);
    } catch (e: any) {
      console.error("❌ [WEBHOOK] Falha ao decodificar Base64 ou fazer Parse do JSON:", e.message);
      // Retornamos 200 para a 1Doc parar de tentar reenviar lixo
      return NextResponse.json({ ok: true, message: "Payload inválido ignorado" });
    }

    // 3. Validação de Sanidade (Trava)
    const hash = payload?.emissao?.hash;
    if (!hash) {
      console.warn("⚠️ [WEBHOOK] Recebido payload sem emissao.hash. Ignorando.");
      return NextResponse.json({ ok: true, message: "Ignorado - sem hash" });
    }

    // 4. Delegação em Background (Ping & Pull)
    console.log(`⚡ [WEBHOOK] Sinal recebido para o hash: ${hash}. Iniciando rotina de Pull...`);
    
    after(() => {
      syncProcessByHash(hash).catch((err) => {
        console.error(`❌ [WEBHOOK BACKGROUND] Falha crítica ao processar hash ${hash}:`, err);
      });
    });

    // 5. Resposta Imediata
    return NextResponse.json({ ok: true, message: "Sinal recebido e em processamento" });
  } catch (error: any) {
    console.error("❌ [WEBHOOK FATAL ERROR]:", error.message || error);
    return NextResponse.json(
      { ok: false, message: "Erro interno no processamento", error: error.message },
      { status: 500 }
    );
  }
}
