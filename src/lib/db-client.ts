import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam variáveis de ambiente públicas do Supabase (URL ou ANON_KEY).');
}

/**
 * CLIENTE PÚBLICO DE LEITURA (ANON_KEY)
 * 
 * ATENÇÃO: Este é o ÚNICO cliente do Supabase que deve ser importado 
 * e utilizado nos Server Components do frontend (ex: page.tsx).
 * Ele está sujeito às regras de Row Level Security (RLS) do banco de dados,
 * garantindo que a aplicação frontend tenha permissão apenas de leitura.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
