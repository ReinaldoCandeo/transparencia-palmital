import { supabaseAdmin } from "../src/lib/db-admin";
import { syncAnexoStorage } from "../src/lib/storage-sync";
import { obterDetalheInterno } from "../src/lib/onedoc";
import { processoEmendaSchema, flattenProcessoParaRow } from "../src/lib/schemas";

const BATCH_SIZE = 100;
const DELAY_MS = 1500;

// Função de utilidade para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log("🚀 Iniciando Carga Inicial de Anexos no Supabase Storage...");
  console.log(`Configuração: Lotes de ${BATCH_SIZE} processos. Delay de ${DELAY_MS}ms entre atualizações.\n`);

  let hasMore = true;
  let from = 0;
  let to = BATCH_SIZE - 1;
  let totalProcessados = 0;

  while (hasMore) {
    console.log(`\n📦 Buscando Lote [${from} - ${to}]...`);
    
    const { data: processos, error } = await supabaseAdmin
      .from("processos_emendas")
      .select("hash, num_formatado, anexos, movimentacoes")
      .order("hash", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`❌ Erro crítico ao buscar lote no Supabase:`, error);
      process.exit(1);
    }

    if (!processos || processos.length === 0) {
      console.log(`✅ Fim da fila! Nenhum processo retornado. Encerrando script.`);
      hasMore = false;
      break;
    }

    // 2. Itera sobre cada processo do lote
    for (let i = 0; i < processos.length; i++) {
      const p = processos[i];
      const progressLabel = `[Lote ${from}-${to}] [${i + 1}/${processos.length}] Processo ${p.num_formatado || p.hash}:`;

      try {
        // Verifica se há necessidade de sincronização
        let needsSync = false;
        
        // Função auxiliar para verificar anexos
        const checkNeedsSync = (anexosList: any[]) => {
          if (!anexosList) return;
          for (const a of anexosList) {
            // Se o anexo tem nome (é válido) mas a URL storage está nula/vazia, precisa de sync.
            if (a.arquivo && !a.url_storage) {
              needsSync = true;
            }
          }
        };

        checkNeedsSync(p.anexos || []);
        if (p.movimentacoes) {
          for (const m of p.movimentacoes) {
            checkNeedsSync(m.anexos || []);
          }
        }

        if (!needsSync) {
          console.log(`${progressLabel} Arquivos já processados. (Pulando)`);
          continue;
        }

        // --- INÍCIO DA SINCRONIZAÇÃO (Bate na 1Doc) ---
        console.log(`${progressLabel} Requer download. Baixando da 1Doc...`);
        const detalheCompleto = await obterDetalheInterno(p.hash);
        
        if (!detalheCompleto) {
          console.log(`${progressLabel} ⚠️ Detalhe não encontrado na 1Doc. (Ignorado)`);
          continue;
        }

        // Mantém a formatação do BD original se houver
        detalheCompleto.num_formatado = p.num_formatado || detalheCompleto.num_formatado;

        let totalArquivosBaixados = 0;

        // Escopo Cirúrgico de Download (Sincronização Paralela no Storage)
        const downloadAnexos = async (anexos: any[]) => {
          if (!anexos || anexos.length === 0) return;
          
          const tasks = anexos
            // O detalhe puxado da 1Doc fresca terá o _url_original
            .filter((a) => a._url_original && !a.url_storage)
            .map(async (a) => {
              a.url_storage = await syncAnexoStorage(p.hash, a._url_original, a.arquivo);
              if (a.url_storage) totalArquivosBaixados++;
            });
            
          if (tasks.length > 0) {
            await Promise.allSettled(tasks);
          }
        };
        
        // Monta e dispara todas as tarefas de sincronização simultaneamente
        const syncTasks = [downloadAnexos(detalheCompleto.anexos || [])];
        for (const m of detalheCompleto.movimentacoes || []) {
          syncTasks.push(downloadAnexos(m.anexos || []));
        }

        await Promise.allSettled(syncTasks);

        // Prepara para salvar
        const payloadFlat = flattenProcessoParaRow(detalheCompleto);
        const result = processoEmendaSchema.safeParse(payloadFlat);
        
        if (!result.success) {
          console.error(`${progressLabel} ❌ Erro de validação Zod no payload.`);
          continue;
        }

        const { error: upsertError } = await supabaseAdmin
          .from("processos_emendas")
          .upsert(result.data, { onConflict: "hash" });

        if (upsertError) {
          console.error(`${progressLabel} ❌ Erro no Upsert Supabase:`, upsertError);
          continue;
        }

        console.log(`${progressLabel} ${totalArquivosBaixados} anexos baixados e sincronizados com Sucesso.`);
        
        // Pausa Estratégica Anti-Ban
        await delay(DELAY_MS);

      } catch (error) {
        // DEFESA CRÍTICA: Se a 1Doc der erro 500 ou Timeout, o try/catch segura o rojão e impede o script de morrer.
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`${progressLabel} ❌ Erro ao acessar 1Doc ou processar processo (${errorMessage}). (Ignorado)`);
      }
    }

    totalProcessados += processos.length;
    from += BATCH_SIZE;
    to += BATCH_SIZE;

    // Força limpeza do Garbage Collector (Implicita, mas o delay ajuda o loop de eventos a respirar)
    await delay(1000); 
  }

  console.log(`\n🎉 Carga Inicial Concluída! Total de processos percorridos: ${totalProcessados}`);
  process.exit(0);
}

run();
