import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASSUNTOS = [
  { id: 1915747, nome: "Saude_MAC_Federal" },
  { id: 1915739, nome: "Social_Municipal" },
  { id: 1915740, nome: "Social_Estadual_Federal" },
  { id: 1915759, nome: "Esporte" },
];

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

async function extractExamples() {
  const examples: Record<string, any> = {};
  const baseUrl = process.env.ONEDOC_BASE_URL || "https://palmital.1doc.com.br/api/v1";
  const authHash = process.env.ONEDOC_AUTH_HASH!;

  for (const assunto of ASSUNTOS) {
    const { data } = await supabase
      .from("processos_emendas")
      .select("hash")
      .eq("id_assunto", assunto.id)
      .order("data", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      examples[assunto.nome] = "Nenhum processo encontrado";
      continue;
    }

    try {
      // Bate na rota principal do processo em vez de despachos
      const res = await fetch(
        `${baseUrl}/processos-administrativos/${data.hash}`,
        { headers: { "X-Auth-Hash": authHash } }
      );
      
      const json = await res.json();
      // O objeto processo geralmente vem em json.data ou direto
      const processoRaw = json.data?.[0] || json;

      if (processoRaw && processoRaw.conteudo) {
        examples[assunto.nome] = {
            assunto: processoRaw.assunto,
            conteudo_puro_html: processoRaw.conteudo,
            conteudo_sem_html: stripHtml(processoRaw.conteudo)
        };
      } else {
         examples[assunto.nome] = "sem 'conteudo' encontrado na rota principal";
      }
    } catch (e) {
      examples[assunto.nome] = `Erro ao buscar hash ${data.hash}`;
    }
  }

  console.log(JSON.stringify(examples, null, 2));
}

extractExamples();
