import { obterDetalheInterno } from "@/lib/onedoc";
import { ASSUNTOS_EMENDA } from "@/lib/assuntos";
import { syncAnexoStorage } from "@/lib/storage-sync";
import { processoEmendaSchema, flattenProcessoParaRow } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/db-admin";

/**
 * Função core blindada que sincroniza integralmente um único processo pelo seu Hash.
 * Padrão "Pull": ela puxa da 1Doc, baixa anexos faltantes, converte formatos e salva no banco.
 * Pode ser invocada pelo Cron Job ou isoladamente no Webhook.
 *
 * @param hash Identificador único do processo na 1Doc
 * @param timeoutMs Limite opcional de tempo para downloads sequenciais, em milissegundos
 * @returns O Processo processado ou `null` se der falha ou timeout completo
 */
export async function syncProcessByHash(hash: string, timeoutMs: number = 50000, forceIdEmissaoBase?: string) {
  const syncStartTime = Date.now();
  let timeExceeded = false;

  console.log(`[CORE] Iniciando sincronização do processo: ${hash}`);

  // 1. Busca detalhes mais aprofundados do processo na 1Doc
  const detalheCompleto = await obterDetalheInterno(hash);
  if (!detalheCompleto) {
    console.error(`[CORE] Erro ao buscar detalhes na 1Doc. Hash: ${hash}`);
    return null;
  }

  const CUTOFF_DATE = new Date("2026-07-01T00:00:00Z");
  if (new Date(detalheCompleto.data) < CUTOFF_DATE) {
    console.log(`[CORE] Processo ${hash} ignorado: Data de emissão (${detalheCompleto.data}) é anterior ao limite (01/07/2026).`);
    return null;
  }

  // --- GATEKEEPER (Bypass Dinâmico para Subprocessos) ---
  let isEmendaOuSubprocesso = false;

  // Se recebemos via cron que este é um processo vinculado forçado, setamos o id_emissao_base
  if (forceIdEmissaoBase) {
    detalheCompleto.id_emissao_base = forceIdEmissaoBase;
  }

  // 2. Traz estado atual no DB para comparar o que já temos em anexo (e validar se já existe)
  const { data: dbData } = await supabaseAdmin
    .from("processos_emendas")
    .select("anexos, movimentacoes")
    .eq("hash", hash)
    .single();

  if (ASSUNTOS_EMENDA.has(detalheCompleto.id_assunto)) {
    isEmendaOuSubprocesso = true;
  } else if (detalheCompleto.id_emissao_base) {
    // É um subprocesso potencial. Vamos checar se o Processo Pai existe no banco.
    const { data: parentProc } = await supabaseAdmin
      .from("processos_emendas")
      .select("id_emissao")
      .eq("id_emissao", detalheCompleto.id_emissao_base)
      .single();

    if (parentProc) {
      console.log(`[CORE] Bypass Autorizado: Processo ${hash} é subprocesso do Pai ${detalheCompleto.id_emissao_base}`);
      isEmendaOuSubprocesso = true;
    }
  }

  // Bypass adicional: Se o processo já está na nossa base, ele deve ser sincronizado (pode ser um resync de um processo legado)
  if (dbData) {
    console.log(`[CORE] Bypass Autorizado: Processo ${hash} já existe no banco local.`);
    isEmendaOuSubprocesso = true;
  }

  if (!isEmendaOuSubprocesso) {
    console.log(`[CORE] Processo ${hash} rejeitado: Não é Emenda nem Subprocesso válido.`);
    return null;
  }
  // ------------------------------------------------------

  const existingUrls = new Map<string, string>();
  if (dbData) {
    if (Array.isArray(dbData.anexos)) {
      dbData.anexos.forEach((a: any) => {
        if (a._url_original && a.url_storage) existingUrls.set(a._url_original, a.url_storage);
      });
    }
    if (Array.isArray(dbData.movimentacoes)) {
      dbData.movimentacoes.forEach((m: any) => {
        if (Array.isArray(m.anexos)) {
          m.anexos.forEach((a: any) => {
            if (a._url_original && a.url_storage) existingUrls.set(a._url_original, a.url_storage);
          });
        }
      });
    }
  }

  // 3. Helper de Download (Sequencial)
  const downloadAnexosSequencial = async (anexos: any[]) => {
    if (!anexos || anexos.length === 0) return;
    
    for (const a of anexos) {
      if (!a._url_original) continue;
      
      // Cache
      if (existingUrls.has(a._url_original)) {
        a.url_storage = existingUrls.get(a._url_original);
        continue;
      }
      
      if (a.url_storage) continue;

      // Circuit Breaker
      if (Date.now() - syncStartTime > timeoutMs) {
        timeExceeded = true;
        console.warn(`[CORE] Timeout de ${timeoutMs}ms estourado no processo ${hash}. Downloads suspensos.`);
        break;
      }

      a.url_storage = await syncAnexoStorage(hash, a._url_original, a.arquivo, a.id_externo);
    }
  };

  // 4. Baixa e vincula URLs aos anexos do processo principal e movimentações
  if (!timeExceeded) {
    await downloadAnexosSequencial(detalheCompleto.anexos || []);
  }
  
  for (const m of detalheCompleto.movimentacoes || []) {
    if (timeExceeded) break;
    await downloadAnexosSequencial(m.anexos || []);
  }

  // 5. Normaliza
  const payloadFlat = flattenProcessoParaRow(detalheCompleto);
  const result = processoEmendaSchema.safeParse(payloadFlat);
  
  if (!result.success) {
    console.error(`[CORE] Erro de Schema (Zod) no Processo ${hash}:`, result.error.errors);
    return null;
  }

  // 6. Persiste
  const { error } = await supabaseAdmin
    .from("processos_emendas")
    .upsert(result.data);

  if (error) {
    console.error(`[CORE] Falha no upsert Supabase do hash ${hash}:`, error.message);
    return null;
  }

  console.log(`[CORE] ✅ Sincronização concluída com sucesso para o processo: ${hash}`);

  // ─── Dicionário de Entidades (Módulo Exclusivo do Terceiro Setor) ──────────
  // INTENÇÃO ARQUITETURAL: apenas entidades do tipo terceiro_setor (OSCs, ONGs,
  // associações beneficiárias de emendas municipais) são cadastradas aqui.
  // Entidades de outras categorias (saude, obras, etc) NÃO entram neste 
  // dicionário — são contratados/órgãos públicos, não beneficiários civis.
  // Não altere esta condição sem aprovação de produto.
  // ──────────────────────────────────────────────────────────────────────────────
  if (result.data.search_categoria === "terceiro_setor" && result.data.search_cnpj && result.data.search_entidade) {
    const { error: upsertError } = await supabaseAdmin
      .from("dicionario_entidades")
      .upsert(
        {
          cnpj: result.data.search_cnpj,
          nome_oficial: result.data.search_entidade,
        },
        {
          onConflict: "cnpj",
          ignoreDuplicates: true
        }
      );

    if (upsertError) {
      console.error(`[CORE] Erro no Upsert da entidade ${result.data.search_entidade}:`, upsertError.message);
    }
  }
  
  return {
    data: result.data,
    timeExceeded
  };
}
