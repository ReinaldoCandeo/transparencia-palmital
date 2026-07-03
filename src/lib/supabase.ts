import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Variáveis de ambiente do Supabase (Client/Anon) não configuradas localmente.");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Variáveis de ambiente do Supabase (Admin/Service) não configuradas localmente.");
}

// 1. Cliente Padrão: Expõe a anon_key para operações seguras do frontend (RLS ativado)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente Administrativo: Usa a service_role key para operações em background (Bypassa RLS)
// IMPORTANTE: Nunca expor este cliente em componentes renderizados no navegador!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
