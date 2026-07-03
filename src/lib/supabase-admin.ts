import { createClient } from "@supabase/supabase-js";

// Este cliente deve ser executado APENAS NO SERVIDOR (Rotas de API, Server Actions)
// Ele ignora as políticas RLS para permitir a ingestão/higienização dos dados
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis de ambiente do Supabase (Admin) não configuradas. Verifique o arquivo .env.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
