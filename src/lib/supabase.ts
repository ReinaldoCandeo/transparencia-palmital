import { createClient } from "@supabase/supabase-js";

// Este cliente é exposto para o frontend, utilizando a anon_key (com RLS de leitura ativa)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
