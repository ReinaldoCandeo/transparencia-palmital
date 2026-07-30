import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "anexos_processos";

function slugifyFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function uploadAnexo(hash: string, urlOriginal: string, filename: string): Promise<string | null> {
  try {
    console.log(`  ⬇️  Baixando: ${filename}`);
    const res = await fetch(urlOriginal, {
      headers: { "X-Auth-Hash": process.env.ONEDOC_AUTH_HASH! },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const safeName = slugifyFilename(filename);
    const path = `${hash}/${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || "application/pdf",
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    console.log(`  ✅ Enviado: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (e) {
    console.error(`  ❌ Falha no anexo ${filename}:`, e);
    return null;
  }
}

async function run() {
  console.log("🚀 Buscando processos com anexos pendentes de upload...");

  const { data: processos, error } = await supabase
    .from("processos_emendas")
    .select("hash, anexos, movimentacoes");

  if (error || !processos) {
    console.error("Erro ao buscar processos", error);
    return;
  }

  let totalUploaded = 0;

  for (const proc of processos) {
    const hash = proc.hash;
    const anexos: any[] = proc.anexos ?? [];
    const movimentacoes: any[] = proc.movimentacoes ?? [];

    // Verifica se há algum anexo pendente
    const pendentesAnexos = anexos.filter((a) => !a.url_storage && a._url_original);
    const pendentesMov = movimentacoes.flatMap((m: any) =>
      (m.anexos ?? []).filter((a: any) => !a.url_storage && a._url_original)
    );

    if (pendentesAnexos.length === 0 && pendentesMov.length === 0) continue;

    console.log(`\n📁 ${hash} — ${pendentesAnexos.length} anexos principais + ${pendentesMov.length} em movimentações`);

    // Upload dos anexos principais
    let altered = false;
    for (const a of pendentesAnexos) {
      const url = await uploadAnexo(hash, a._url_original, a.arquivo);
      if (url) {
        a.url_storage = url;
        delete a._url_original;
        altered = true;
        totalUploaded++;
      }
    }

    // Upload dos anexos de movimentações
    for (const m of movimentacoes) {
      for (const a of m.anexos ?? []) {
        if (!a._url_original || a.url_storage) continue;
        const url = await uploadAnexo(hash, a._url_original, a.arquivo);
        if (url) {
          a.url_storage = url;
          delete a._url_original;
          altered = true;
          totalUploaded++;
        }
      }
    }

    if (altered) {
      const { error: upErr } = await supabase
        .from("processos_emendas")
        .update({ anexos, movimentacoes })
        .eq("hash", hash);

      if (upErr) {
        console.error(`  ❌ Erro ao atualizar banco para ${hash}:`, upErr.message);
      } else {
        console.log(`  💾 Banco atualizado para ${hash}`);
      }
    }
  }

  console.log(`\n🎉 Finalizado! ${totalUploaded} arquivo(s) enviados para o Storage.`);
}

run();
