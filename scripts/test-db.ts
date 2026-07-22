import { config } from "dotenv";
config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/db-admin";
import { processoEmendaSchema } from "../src/lib/schemas";

async function runSmokeTest() {
  console.log("🔥 Iniciando Smoke Test de Integração com Supabase (Fase 1)...\n");
  
  const mockPayload = {
    hash: "test-smoke-99999",
    num: "99999",
    ano: "2026",
    id_assunto: 1915747,
    assunto: "MOCK DE TESTE FUMAÇA - SAÚDE",
    num_formatado: "99.999/2026",
    data: "2026-07-21",
    hora: "10:00:00",
    
    // Arrays rigorosos com a nova validação
    social_autores_repasses: [
      { nome: "Vereador Teste", valor: "R$ 50.000,00" }
    ],
    movimentacoes: [
      {
        id: "mov-1",
        evento: "Despacho Teste",
        data: "2026-07-21",
        hora: "10:30:00",
        origem_setor: "Gabinete Fantasma",
        anexos: [
          {
            arquivo: "oficio_teste.pdf",
            extensao: "pdf",
            tamanho_bytes: 2048,
            tipo_mime: "application/pdf"
          }
        ]
      }
    ],
    anexos: []
  };

  try {
    // Etapa 1: Validação Zod Estrita
    console.log("🧪 1. Validando payload mock no Zod (processoEmendaSchema)...");
    const safeData = processoEmendaSchema.parse(mockPayload);
    console.log("✅ Validação Zod concluída com sucesso! Os tipos estritos garantiram a integridade do JSON.");

    // Etapa 2: Inserção no Banco (Bypass RLS)
    console.log("\n🧪 2. Executando Upsert no banco via supabaseAdmin (Bypass RLS)...");
    const { error: upsertError } = await supabaseAdmin
      .from("processos_emendas")
      .upsert(safeData);

    if (upsertError) throw new Error(`Falha no upsert (Supabase): ${upsertError.message}`);
    console.log("✅ Inserção concluída! As chaves SERVICE_ROLE e o bypass do RLS estão operacionais.");

    // Etapa 3: Limpeza de Estado
    console.log("\n🧪 3. Realizando limpeza de estado (Delete) do mock no banco...");
    const { error: deleteError } = await supabaseAdmin
      .from("processos_emendas")
      .delete()
      .eq("hash", safeData.hash);

    if (deleteError) throw new Error(`Falha no delete (Supabase): ${deleteError.message}`);
    console.log("✅ Limpeza concluída! O banco está limpo e sem resíduos do teste.");

    console.log("\n🚀 TODOS OS TESTES PASSARAM! A fundação (Database + Zod) está pronta para receber a 1Doc.");
  } catch (error: any) {
    console.error("\n❌ ERRO FATAL NO SMOKE TEST:");
    if (error.errors) { // Verifica se é um erro de Zod para imprimir formatado
      console.error(JSON.stringify(error.errors, null, 2));
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

runSmokeTest();
