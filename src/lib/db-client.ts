import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.public.NEXT_PUBLIC_SUPABASE_URL || env.public.SUPABASE_URL;
const supabaseAnonKey = env.public.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.public.SUPABASE_ANON_KEY;

/**
 * CLIENTE PÚBLICO DE LEITURA (ANON_KEY)
 * 
 * ATENÇÃO: Este é o cliente do Supabase sujeito às regras de Row Level Security (RLS)
 * do banco de dados, garantindo permissão estrita de leitura pública.
 * 
 * Suporta fallback dual transparente:
 * - NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (local / client)
 * - SUPABASE_URL e SUPABASE_ANON_KEY (padrão de integração Vercel)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
