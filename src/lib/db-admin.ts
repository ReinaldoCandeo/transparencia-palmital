import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, getServerEnv } from './env';

let instance: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (!instance) {
    const serverEnv = getServerEnv();
    const publicEnv = env.public;

    instance = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return instance;
}

/**
 * CLIENTE ADMINISTRATIVO DE GRAVAÇÃO (SERVICE_ROLE_KEY) - LAZY PROXY
 * 
 * 🚨 ATENÇÃO EXTREMA: Este cliente BURLA COMPLETAMENTE o Row Level Security (RLS).
 * Ele possui privilégios de administrador no banco de dados.
 * 
 * Implementado via Proxy para evitar instanciação ou validação de env no top-level,
 * garantindo que `next build` e testes automatizados não quebrem durante imports.
 * 
 * JAMAIS IMPORTAR ESTE ARQUIVO EM:
 * - Server Components de páginas públicas
 * - Client Components
 * 
 * USO EXCLUSIVO PARA:
 * - API Routes protegidas (ex: Cron Jobs com verificação de secret)
 * - Scripts de sincronização local (CLI)
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdminClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
