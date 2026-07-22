import { NextResponse } from "next/server";
import { supabase } from "@/lib/db-client";
import { z } from "zod";

const querySchema = z.object({
  numero: z.string().regex(/^\d+$/, "Apenas números"),
  ano: z.string().regex(/^\d{4}$/, "Ano inválido").optional().or(z.literal("")),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const validation = querySchema.safeParse({
    numero: searchParams.get("numero") || "",
    ano: searchParams.get("ano") || "",
  });

  if (!validation.success) {
    return NextResponse.json({ error: "Formato de busca inválido" }, { status: 400 });
  }

  const { numero, ano } = validation.data;

  try {
    const anoAtual = new Date().getFullYear();
    const anosBusca = ano ? [ano] : [anoAtual.toString(), (anoAtual - 1).toString()];

    // Busca dupla segura (trata a virada de ano) + fallback maybeSingle()
    const { data, error } = await supabase
      .from("processos_emendas")
      .select("hash")
      .eq("num", numero)
      .in("ano", anosBusca)
      .order("ano", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("[Busca Direta] Erro no Supabase:", error);
      return NextResponse.json({ error: "Erro na consulta" }, { status: 500 });
    }

    if (data && data.hash) {
      return NextResponse.json({ hash: data.hash });
    } else {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }
  } catch (error) {
    console.error("[Busca Direta] Erro interno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
