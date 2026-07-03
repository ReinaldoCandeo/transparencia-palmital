import { createClient } from "@supabase/supabase-js";

// Este cliente deve ser executado APENAS NO SERVIDOR (Rotas de API, Server Actions)
// Ele ignora as políticas RLS para permitir a ingestão/higienização dos dados
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
