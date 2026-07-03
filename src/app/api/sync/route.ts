import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const syncId = crypto.randomUUID();
  console.log(`[AUDIT-SYNC-${syncId}] Iniciando processo de sincronização com a API 1Doc...`);

  try {
    // 1. Validar CRON_SECRET para segurança
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn(`[AUDIT-SYNC-${syncId}] Falha de autenticação: CRON_SECRET inválido ou ausente.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Buscar dados da API 1Doc
    console.log(`[AUDIT-SYNC-${syncId}] Requisitando dados estruturados da 1Doc...`);
    const response = await fetch("https://api.1doc.com.br/v1/processos?limit=100", {
      headers: {
        "Authorization": `Bearer ${process.env.ONEDOC_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`[AUDIT-SYNC-${syncId}] Falha na comunicação com 1Doc. Status Code: ${response.status}`);
      throw new Error(`1Doc API Error: ${response.status}`);
    }

    const json = await response.json();
    const processosRaw = json.data || [];
    console.log(`[AUDIT-SYNC-${syncId}] ${processosRaw.length} processos recebidos. Iniciando higienização LGPD...`);

    // 3. Camada de Compliance (LGPD) - Higienização
    let sanitizados = 0;
    const processosHigienizados = processosRaw.map((proc: Record<string, any>) => {
      // Remover metadados sensíveis do cidadão
      if (proc.requerente) {
        delete proc.requerente.email;
        delete proc.requerente.cpf;
        delete proc.requerente.telefone;
        delete proc.requerente.hash;
        delete proc.requerente.rg;
        delete proc.requerente.endereco;
      }
      
      // Mascarar dados do servidor público nos nós de tramitação
      const tramitacoesHigienizadas = proc.tramitacoes?.map((tramite: Record<string, any>) => {
        if (tramite.servidor) {
          return {
            ...tramite,
            servidor: {
              cargo: tramite.servidor.cargo || "Agente Administrativo",
              setor: tramite.servidor.setor || "Prefeitura Municipal"
              // Remove nome e detalhes pessoais
            }
          };
        }
        return tramite;
      });

      sanitizados++;
      return {
        id_1doc: proc.id,
        numero: proc.numero,
        ano: proc.ano,
        assunto: proc.assunto,
        status: proc.status,
        setor: proc.setor_atual || "Administração",
        orgaoAtual: proc.orgao_atual || "Prefeitura Municipal",
        dataAbertura: proc.data_abertura || new Date().toISOString(),
        requerente_nome: proc.requerente?.nome || "Cidadão Preservado",
        tramitacoes: tramitacoesHigienizadas || []
      };
    });
    
    console.log(`[AUDIT-SYNC-${syncId}] Higienização LGPD concluída: ${sanitizados} registros mascarados com sucesso.`);

    // 4. Persistir no Supabase com o client admin (Service Role)
    let inseridos = 0;
    let errosDePersistencia = 0;
    
    console.log(`[AUDIT-SYNC-${syncId}] Iniciando persistência no banco de dados (Supabase Admin Client)...`);
    for (const processo of processosHigienizados) {
      const { error } = await supabaseAdmin
        .from("processos")
        .upsert(processo, { onConflict: "id_1doc" });
        
      if (error) {
        errosDePersistencia++;
        console.error(`[AUDIT-SYNC-${syncId}] Erro ao inserir/atualizar processo ${processo.numero}:`, error.message);
      } else {
        inseridos++;
      }
    }

    console.log(`[AUDIT-SYNC-${syncId}] Ciclo de sincronização finalizado. Sucessos: ${inseridos}, Falhas: ${errosDePersistencia}`);

    return NextResponse.json({ 
      success: true, 
      message: "Sincronização e LGPD concluídas",
      synced_count: inseridos,
      errors: errosDePersistencia
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[AUDIT-SYNC-${syncId}] Erro crítico não tratado:`, msg);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
