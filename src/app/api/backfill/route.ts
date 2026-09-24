import { NextResponse } from "next/server";
import { obterProcessosPaginadoInterno } from "@/lib/onedoc";
import { syncProcessByHash } from "@/lib/sync-core";

export const maxDuration = 300; 
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("🚀 Iniciando Backfill 2026+...");
  
  try {
    let pagina = 1;
    let stop = false;
    let totalSincronizados = 0;

    while (!stop) {
      console.log(`\n📄 Buscando página ${pagina} da 1Doc...`);
      const { processos, totalPaginas } = await obterProcessosPaginadoInterno(pagina);

      if (!processos || processos.length === 0) {
        console.log("Nenhum processo retornado ou página vazia. Ignorando página.");
        if (pagina >= totalPaginas) break;
        pagina++;
        continue;
      }

      for (const p of processos) {
        const ano = parseInt(p.ano, 10);
        
        // Regra do usuário: "somente até o ano de 2026, passou para 2025 não precisa"
        if (ano < 2026) {
          console.log(`🛑 Encontrado processo do ano ${ano} (menor que 2026). Parando o backfill.`);
          stop = true;
          break;
        }

        console.log(`🔄 Sincronizando: ${p.num_formatado} (Hash: ${p.hash})`);
        await syncProcessByHash(p.hash, 50000);
        totalSincronizados++;
      }

      if (stop || pagina >= totalPaginas) {
        break;
      }

      pagina++;
    }

    console.log(`\n✅ Backfill Finalizado! Total sincronizado: ${totalSincronizados}`);
    return NextResponse.json({ ok: true, message: "Backfill finalizado", total: totalSincronizados });
  } catch (err: any) {
    console.error("Erro no backfill:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
