/**
 * Scripts de Re-Sync Total
 * 
 * Objetivo: Re-sincronizar todos os processos já no banco para popular o campo
 * form_data que foi adicionado depois da carga inicial (e portanto ficou vazio).
 * 
 * Usa o endpoint /despachos que inclui emissao_campos_adicionais_assunto.
 * 
 * Execução: npx tsx scripts/resync_form_data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ONEDOC_BASE_URL = process.env.ONEDOC_BASE_URL!;
const ONEDOC_AUTH_HASH = process.env.ONEDOC_AUTH_HASH!;

// ─── Helpers copiados de onedoc.ts ──────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<div[^>]*class=["'][^"']*emissao_assinatura[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatarMoeda(valor: string): string {
  const isBrazilian = /^\d{1,3}(\.\d{3})*,\d{2}$/.test(valor.trim());
  let num: number;
  if (isBrazilian) {
    num = parseFloat(valor.replace(/\./g, "").replace(",", "."));
  } else {
    num = parseFloat(valor);
  }
  if (isNaN(num)) return valor;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function extrairFormData(p: any): { label: string; valor: string; tipo?: string }[] {
  const camposAdicionaisStr = p.emissao_campos_adicionais_assunto;
  if (!camposAdicionaisStr) return [];

  try {
    const camposDefinidos = JSON.parse(camposAdicionaisStr);
    const formData = [];

    for (const def of camposDefinidos) {
      if (!def.campo || !def.label) continue;

      const labelStr = stripHtml(def.label);
      if (!labelStr) continue;

      const valorCru = p[def.campo];
      if (valorCru === undefined || valorCru === null || valorCru === "") continue;

      let valorFormatado = stripHtml(String(valorCru));

      if (def.tipo === "text" && valorFormatado.match(/^\d{1,3}(\.\d{3})*,\d{2}$/)) {
        valorFormatado = formatarMoeda(valorFormatado);
      }

      // Ocultar agência e conta foi removido (Transparência Ativa)

      formData.push({ label: labelStr, valor: valorFormatado, tipo: def.tipo });
    }
    return formData;
  } catch {
    return [];
  }
}

// ─── Função principal ────────────────────────────────────────────────────────

async function resyncFormData() {
  console.log("🔍 Buscando processos no banco...");

  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("hash, num, ano, form_data");

  if (error || !processos) {
    console.error("❌ Erro ao buscar processos:", error);
    return;
  }

  // Agora re-sincroniza todos os processos para recuperar dados bancários que haviam sido ocultados
  const alvosSync = processos;

  console.log(`📋 Total no banco: ${processos.length} | Alvos de sync: ${alvosSync.length}`);

  let atualizado = 0;
  let semCampos = 0;
  let erros = 0;

  for (const proc of alvosSync) {
    const { hash, num, ano } = proc;
    process.stdout.write(`  ⟳  ${num}/${ano} (${hash.slice(0, 8)}...)  `);

    try {
      const res = await fetch(
        `${ONEDOC_BASE_URL}/processos-administrativos/${hash}/despachos?pagina=1`,
        { headers: { "X-Auth-Hash": ONEDOC_AUTH_HASH } }
      );

      if (!res.ok) {
        console.log(`→ HTTP ${res.status}`);
        erros++;
        continue;
      }

      const json = await res.json();
      const processo = json.data?.[0];

      if (!processo) {
        console.log("→ sem despachos");
        semCampos++;
        continue;
      }

      const formData = extrairFormData(processo);

      if (formData.length === 0) {
        console.log("→ form_data vazio (sem campos no assunto)");
        semCampos++;
        continue;
      }

      // Atualiza só o form_data — preserva tudo mais
      const { error: updErr } = await supabase
        .from("processos_emendas")
        .update({ form_data: formData })
        .eq("hash", hash);

      if (updErr) {
        console.log(`→ ❌ DB error: ${updErr.message}`);
        erros++;
      } else {
        console.log(`→ ✅ ${formData.length} campos`);
        atualizado++;
      }

      // Delay gentil para não sobrecarregar a 1Doc
      await new Promise((r) => setTimeout(r, 300));

    } catch (e: any) {
      console.log(`→ ❌ ${e.message}`);
      erros++;
    }
  }

  console.log("\n─────────────────────────────────");
  console.log(`✅ Atualizados:     ${atualizado}`);
  console.log(`⚪ Sem campos:      ${semCampos}`);
  console.log(`❌ Erros:           ${erros}`);
  console.log("─────────────────────────────────");
}

resyncFormData();
