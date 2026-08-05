/**
 * backfill-julho.ts
 *
 * Ingestão histórica de todos os processos de Emenda a partir de 01/07/2026.
 * Varre as páginas da 1Doc e sincroniza todos os IDs que estão em ASSUNTOS_EMENDA.
 * 
 * Execução: npx tsx --env-file=.env.local scripts/backfill-julho.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { syncProcessByHash } from "../src/lib/sync-core";
import { ASSUNTOS_EMENDA } from "../src/lib/onedoc";

// ─── Config ────────────────────────────────────────────────────────────────
const DELAY_PAGINA_MS = 800;  // pausa entre páginas (proteção Rate Limit)
const DELAY_BATCH_MS = 2000;  // pausa entre batches de sync
const BATCH_SIZE = 2;
const CORTE_ANO = 2026;
const CORTE_MES = 7;

// Supabase admin para verificar o que já existe
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Chama a 1Doc direto (sem filtro de ASSUNTOS_EMENDA na chamada bruta) ──────────────────
async function fetchPagina1Doc(pagina: number) {
  const baseUrl = process.env.ONEDOC_BASE_URL!;
  const authHash = process.env.ONEDOC_AUTH_HASH!;
  const url = `${baseUrl}/processos-administrativos?pagina=${pagina}`;
  const res = await fetch(url, { headers: { "X-Auth-Hash": authHash } });
  if (!res.ok) throw new Error(`1Doc HTTP ${res.status} na página ${pagina}`);
  const json: any = await res.json();
  const paginaDados = json.data?.[0];
  const emissoes: any[] = paginaDados?.emissoes ?? [];
  const total = paginaDados?.total ?? 0;
  // A API agora retorna 20 itens por página
  const totalPaginas = Math.ceil(total / 20) || 1;
  return { emissoes, totalPaginas };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function backfillJulho() {
  console.log("🚀 Iniciando backfill de Emendas (dados brutos da 1Doc)...");
  console.log("Corte: processos de 01/07/2026 em diante\n");

  let pagina = 1;
  let totalPaginas = 1;
  let totalEncontrados = 0;
  let totalSincronizados = 0;
  let totalErros = 0;
  const hashesParaSincronizar: string[] = [];

  // Busca hashes que já temos no banco para evitar syncs desnecessários
  const { data: dbProcessos } = await supabase.from('processos_emendas').select('hash');
  const hashesExistentes = new Set(dbProcessos?.map((d: any) => d.hash) || []);

  // ── Fase 1: Varredura ───────────────────────────────────────────────────
  console.log("📄 Fase 1: varrendo a 1Doc em busca de Emendas (jul/2026 em diante)...");

  do {
    let emissoes: any[];
    try {
      const result = await fetchPagina1Doc(pagina);
      emissoes = result.emissoes;
      totalPaginas = result.totalPaginas;
    } catch (err: any) {
      console.error(`  ❌ Erro na página ${pagina}:`, err.message);
      pagina++;
      continue;
    }

    if (emissoes.length === 0) {
      pagina++;
      continue;
    }

    // Determina o menor ano nesta página para saber se podemos parar
    const anosNaPagina = emissoes.map((e) => Number(e.ano)).filter((a) => !isNaN(a));
    const menorAno = Math.min(...anosNaPagina);
    // Filtra: Assuntos emenda + >= Julho de 2026
    const emendasNaPagina = emissoes.filter((e) => {
      const ano = Number(e.ano);
      if (ano < CORTE_ANO) return false;
      if (ano === CORTE_ANO) {
        const partes = (e.data ?? "").split("/");
        const mes = parseInt(partes[1] ?? "0", 10);
        if (mes < CORTE_MES) return false;
      }
      // Se passou nas datas, checa se é um assunto válido (Emenda)
      return ASSUNTOS_EMENDA.has(Number(e.id_assunto));
    });

    if (emendasNaPagina.length > 0) {
      // Pega os que a gente ainda não tem ou que queremos re-sincronizar
      const hashes = emendasNaPagina.map((e) => e.hash).filter(Boolean);
      
      const hashesNovos = hashes.filter(h => !hashesExistentes.has(h));
      
      if (hashesNovos.length > 0) {
          console.log(`  Página ${pagina}/${totalPaginas}: ✅ ${hashesNovos.length} processo(s) NOVO(S) encontrado(s) → ${hashesNovos.join(", ")}`);
          hashesParaSincronizar.push(...hashesNovos);
          totalEncontrados += hashesNovos.length;
      } else {
          console.log(`  Página ${pagina}/${totalPaginas}: ${hashes.length} processo(s) (todos já existentes no DB).`);
      }
    } else {
      console.log(`  Página ${pagina}/${totalPaginas}: nenhum processo de Emenda no corte atual.`);
    }

    // Para quando chegarmos em páginas com apenas processos de 2025 ou antes
    if (menorAno < CORTE_ANO) {
      console.log(`  ⛔ Página ${pagina}: menor ano na página = ${menorAno} (< ${CORTE_ANO}). Encerrando varredura.`);
      break;
    }

    pagina++;
    if (pagina <= totalPaginas) await sleep(DELAY_PAGINA_MS);
  } while (pagina <= totalPaginas);

  console.log(`\n✅ Fase 1 concluída. Total NOVO encontrado: ${totalEncontrados} processo(s).`);

  if (hashesParaSincronizar.length === 0) {
    console.log("ℹ️  Nada novo a sincronizar.");
    return;
  }

  // Remove duplicatas
  const hashesUnicos = [...new Set(hashesParaSincronizar)];

  // ── Fase 2: Sincronização ────────────────────────────────────────────────
  console.log(`\n🔄 Fase 2: sincronizando ${hashesUnicos.length} processo(s) em batches de ${BATCH_SIZE}...`);

  for (let i = 0; i < hashesUnicos.length; i += BATCH_SIZE) {
    const batch = hashesUnicos.slice(i, i + BATCH_SIZE);
    console.log(`\n  Batch ${Math.floor(i / BATCH_SIZE) + 1}: [${batch.join(", ")}]`);

    for (const hash of batch) {
      try {
        const result = await syncProcessByHash(hash, 55000);
        if (result) {
          totalSincronizados++;
          console.log(`    ✅ ${hash} — sincronizado.`);
        } else {
          totalErros++;
          console.warn(`    ⚠️  ${hash} — retornou null (processo inexistente ou excluído).`);
        }
      } catch (err: any) {
        totalErros++;
        console.error(`    ❌ ${hash} — erro: ${err?.message ?? err}`);
      }
    }

    if (i + BATCH_SIZE < hashesUnicos.length) {
      console.log(`  ⏳ Aguardando ${DELAY_BATCH_MS / 1000}s...`);
      await sleep(DELAY_BATCH_MS);
    }
  }

  // ── Relatório ──────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════");
  console.log("📊 Relatório Final");
  console.log("═══════════════════════════════════");
  console.log(`  Encontrados (Novos): ${totalEncontrados}`);
  console.log(`  Sincronizados      : ${totalSincronizados}`);
  console.log(`  Erros              : ${totalErros}`);
  console.log("═══════════════════════════════════");
}

backfillJulho().catch((err) => {
  console.error("💥 Erro fatal:", err);
  process.exit(1);
});
