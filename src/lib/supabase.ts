import { createClient } from "@supabase/supabase-js";

// Este cliente é exposto para o frontend, utilizando a anon_key (com RLS de leitura ativa)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Variáveis de ambiente do Supabase (Client) não configuradas.");
}

export const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseAnonKey || "dummy");
