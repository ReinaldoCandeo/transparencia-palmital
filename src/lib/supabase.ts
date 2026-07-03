import { createClient } from "@supabase/supabase-js";

// Este cliente é exposto para o frontend, utilizando a anon_key (com RLS de leitura ativa)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase (Client) não configuradas. Verifique o arquivo .env.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
