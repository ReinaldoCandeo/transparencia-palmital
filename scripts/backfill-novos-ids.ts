/**
 * backfill-novos-ids.ts
 *
 * Ingestão histórica dos 4 novos IDs adicionados em 03/08/2026:
 *   1915774 - Terceiro Setor - Agricultura e Meio Ambiente
 *   1915763 - Terceiro Setor - Educação e Cultura
 *   1915772 - Terceiro Setor - Esporte
 *   1915764 - Terceiro Setor - Saúde
 *
 * Varre todas as páginas da 1Doc (dados brutos, sem filtro de assunto),
 * para poder ler o 'ano' de cada página e saber quando parar.
 * Só sincroniza processos dos NOVOS_IDS com ano >= 2026 e mês >= 7.
 *
 * Execução: npx tsx --env-file=.env.local scripts/backfill-novos-ids.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { syncProcessByHash } from "../src/lib/sync-core";

// ─── Config ────────────────────────────────────────────────────────────────
const NOVOS_IDS = new Set([1915774, 1915763, 1915772, 1915764]);
const DELAY_PAGINA_MS = 400;  // pausa entre páginas (proteção Rate Limit)
const DELAY_BATCH_MS = 2000;  // pausa entre batches de sync
const BATCH_SIZE = 2;

// Supabase admin para verificar o que já existe
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Chama a 1Doc direto (sem filtro de ASSUNTOS_EMENDA) ──────────────────
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
  const totalPaginas = Math.ceil(total / 20) || 1;
  return { emissoes, totalPaginas };
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function backfillNovosIds() {
  console.log("🚀 Iniciando backfill dos novos IDs (dados brutos da 1Doc)...");
  console.log("IDs alvo:", [...NOVOS_IDS].join(", "));
  console.log("Corte: processos de julho/2026 em diante\n");

  let pagina = 1;
  let totalPaginas = 1;
  let totalEncontrados = 0;
  let totalSincronizados = 0;
  let totalErros = 0;
  const hashesParaSincronizar: string[] = [];

  // ── Fase 1: Varredura ───────────────────────────────────────────────────
  console.log("📄 Fase 1: varrendo a 1Doc em busca dos novos IDs (jul/2026 em diante)...");

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

    // Filtra: novos IDs + ano 2026 + mês >= 7
    const novosNaPagina = emissoes.filter((e) => {
      if (!NOVOS_IDS.has(Number(e.id_assunto))) return false;
      const ano = Number(e.ano);
      if (ano < 2026) return false;
      // Para 2026, verifica o mês no campo data "DD/MM/AAAA"
      if (ano === 2026) {
        const partes = (e.data ?? "").split("/");
        const mes = parseInt(partes[1] ?? "0", 10);
        return mes >= 7;
      }
      return true; // ano > 2026 é sempre válido
    });

    if (novosNaPagina.length > 0) {
      const hashes = novosNaPagina.map((e) => e.hash).filter(Boolean);
      console.log(`  Página ${pagina}/${totalPaginas}: ✅ ${hashes.length} processo(s) encontrado(s) → ${hashes.join(", ")}`);
      hashesParaSincronizar.push(...hashes);
      totalEncontrados += hashes.length;
    } else {
      console.log(`  Página ${pagina}/${totalPaginas}: nenhum.`);
    }

    // Para quando chegarmos em páginas com apenas processos de 2025 ou antes
    if (menorAno < 2026) {
      console.log(`  ⛔ Página ${pagina}: menor ano encontrado = ${menorAno}. Encerrando varredura.`);
      break;
    }

    pagina++;
    if (pagina <= totalPaginas) await sleep(DELAY_PAGINA_MS);
  } while (pagina <= totalPaginas);

  console.log(`\n✅ Fase 1 concluída. Total encontrado: ${totalEncontrados} processo(s).`);

  if (hashesParaSincronizar.length === 0) {
    console.log("ℹ️  Nada a sincronizar.");
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
  console.log(`  Encontrados  : ${totalEncontrados}`);
  console.log(`  Sincronizados: ${totalSincronizados}`);
  console.log(`  Erros        : ${totalErros}`);
  console.log("═══════════════════════════════════");

  if (totalErros > 0) {
    console.warn("⚠️  Rode novamente para retentar os erros — o script é idempotente.");
  } else {
    console.log("🎉 Backfill concluído com sucesso!");
  }
}

backfillNovosIds().catch((err) => {
  console.error("💥 Erro fatal:", err);
  process.exit(1);
});
