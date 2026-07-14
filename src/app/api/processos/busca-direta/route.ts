import { NextResponse } from "next/server";
import { buscarHashPorNumero } from "@/lib/onedoc";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numero = searchParams.get("numero");
  const ano = searchParams.get("ano");

  if (!numero || !ano) {
    return NextResponse.json({ error: "Número e Ano são obrigatórios" }, { status: 400 });
  }

  try {
    const hash = await buscarHashPorNumero(numero, ano);
    
    if (hash) {
      return NextResponse.json({ hash });
    } else {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
  } catch (error) {
    console.error("[Busca Direta] Erro na rota:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
