import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Faltam variáveis de ambiente administrativas do Supabase (URL ou SERVICE_ROLE_KEY).');
}

/**
 * CLIENTE ADMINISTRATIVO DE GRAVAÇÃO (SERVICE_ROLE_KEY)
 * 
 * 🚨 ATENÇÃO EXTREMA: Este cliente BURLA COMPLETAMENTE o Row Level Security (RLS).
 * Ele possui privilégios de administrador no banco de dados.
 * 
 * JAMAIS IMPORTAR ESTE ARQUIVO EM:
 * - Server Components de páginas públicas
 * - Client Components
 * 
 * USO EXCLUSIVO PARA:
 * - API Routes protegidas (ex: Cron Jobs com verificação de secret)
 * - Scripts de sincronização local (CLI)
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
