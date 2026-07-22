import { supabaseAdmin } from "./db-admin";

/**
 * Higieniza o nome do arquivo para garantir links seguros.
 * Remove acentos, caracteres especiais e troca espaços por hifens.
 */
function slugifyFilename(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9.\-]/g, "-") // Troca inválidos por hífen
    .replace(/-+/g, "-") // Remove hifens duplicados
    .toLowerCase();
}

/**
 * Baixa um anexo da 1Doc e envia para o Supabase Storage.
 * Retorna a URL pública em caso de sucesso ou null em caso de erro.
 */
export async function syncAnexoStorage(hash: string, urlOriginal: string, filename: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s de limite por arquivo

    const res = await fetch(urlOriginal, {
      headers: { "X-Auth-Hash": process.env.ONEDOC_AUTH_HASH || "" },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error(`Falha HTTP ao baixar da 1Doc: ${res.status} ${res.statusText}`);
    }

    const blob = await res.blob();
    const safeName = slugifyFilename(filename);
    const path = `${hash}/${safeName}`;

    // Faz o upload de forma idempotente
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("anexos_processos")
      .upload(path, blob, { 
        upsert: true, 
        contentType: blob.type || "application/octet-stream"
      });

    if (uploadError) {
      throw uploadError;
    }

    // Retorna a URL pública do Supabase
    const { data } = supabaseAdmin.storage.from("anexos_processos").getPublicUrl(path);
    return data.publicUrl;

  } catch (error) {
    console.error(`Falha no anexo ${filename} do processo ${hash}:`, error);
    return null; // Graceful Degradation
  }
}
