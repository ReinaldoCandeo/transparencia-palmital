import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam variáveis de ambiente do Supabase");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runExpurgo() {
  console.log("Iniciando expurgo de processos e limpeza de storage...");

  console.log("\n[1/2] Apagando processos no banco de dados...");
  const { data: dbDeleted, error: dbError } = await supabase
    .from("processos_emendas")
    .delete()
    .neq("search_categoria", "terceiro_setor")
    .select("hash");

  if (dbError) {
    console.error("Erro ao expurgar banco:", dbError);
    return;
  }
  console.log(`Deletados ${dbDeleted?.length || 0} processos não pertencentes ao Terceiro Setor.`);

  console.log("\n[2/2] Iniciando varredura de arquivos órfãos no Storage 'anexos_processos'...");
  const { data: dbProcessos, error: dbProcError } = await supabase
    .from('processos_emendas')
    .select('hash');

  if (dbProcError) {
    console.error("Erro ao buscar processos válidos:", dbProcError);
    return;
  }

  const hashesValidos = new Set(dbProcessos.map(p => p.hash));
  console.log(`Encontrados ${hashesValidos.size} processos válidos no banco.`);

  const { data: folders, error: storageError } = await supabase.storage
    .from('anexos_processos')
    .list('');

  if (storageError) {
    console.error("Erro ao listar bucket:", storageError);
    return;
  }

  const foldersToDelete = folders
    .filter(f => f.name !== '.emptyFolderPlaceholder' && !hashesValidos.has(f.name))
    .map(f => f.name);

  if (foldersToDelete.length === 0) {
    console.log("Nenhum diretório órfão encontrado no Storage.");
    return;
  }

  console.log(`Encontrados ${foldersToDelete.length} diretórios órfãos. Iniciando exclusão...`);

  let totalFilesDeleted = 0;
  for (const folder of foldersToDelete) {
    const { data: files } = await supabase.storage.from('anexos_processos').list(folder);
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${folder}/${file.name}`);
      const { error: delError } = await supabase.storage.from('anexos_processos').remove(filePaths);
      if (delError) {
        console.error(`Falha ao excluir arquivos de ${folder}:`, delError);
      } else {
        totalFilesDeleted += filePaths.length;
      }
    }
  }

  console.log(`\n✅ Expurgo concluído! Total de arquivos deletados do Storage: ${totalFilesDeleted}`);
}

runExpurgo();
