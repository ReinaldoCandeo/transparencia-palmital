import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const baseUrl = process.env.ONEDOC_BASE_URL;
const authHash = process.env.ONEDOC_AUTH_HASH;

function cleanHtml(html: string): string {
  if (!html) return "";
  return html.replace(
    /<div[^>]*class=["'][^"']*emissao_assinatura[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  ).trim();
}

async function run() {
  console.log("🚀 Buscando todos os processos do banco...");
  
  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("hash, conteudo");

  if (error || !processos) {
    console.error("Erro ao buscar processos", error);
    return;
  }

  console.log(`Encontrados ${processos.length} processos. Verificando quais precisam de atualização...`);
  
  let count = 0;
  for (const proc of processos) {
    // Pula se já tiver conteudo
    if (proc.conteudo) continue;

    console.log(`⏳ Buscando conteúdo para ${proc.hash}...`);
    try {
      const res = await fetch(`${baseUrl}/processos-administrativos/${proc.hash}`, {
        headers: { "X-Auth-Hash": authHash! },
      });
      const json = await res.json();
      const processoRaw = json.data?.[0] || json;

      if (processoRaw && processoRaw.conteudo) {
        const conteudoLimpo = cleanHtml(processoRaw.conteudo);
        
        const { error: updateError } = await supabase
          .from("processos_emendas")
          .update({ conteudo: conteudoLimpo })
          .eq("hash", proc.hash);
          
        if (updateError) {
          console.error(`❌ Erro ao atualizar ${proc.hash}:`, updateError);
        } else {
          console.log(`✅ Atualizado ${proc.hash}`);
          count++;
        }
      } else {
        console.log(`⚠️ Processo ${proc.hash} não tem conteudo na API.`);
      }
    } catch (e) {
      console.error(`❌ Erro de rede ao buscar ${proc.hash}`, e);
    }
  }

  console.log(`🎉 Finalizado! ${count} processos atualizados.`);
}

run();
