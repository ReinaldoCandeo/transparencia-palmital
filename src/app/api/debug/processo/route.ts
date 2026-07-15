import { NextRequest, NextResponse } from "next/server";

// ⚠️ ENDPOINT DE DIAGNÓSTICO — FASE 1
// Rota temporária para inspecionar o payload bruto de um processo da 1Doc.
// NUNCA deve chegar ao ar em produção. Protegida pelo guard abaixo.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Rota de diagnóstico indisponível em produção." }, { status: 403 });
  }

  const hash = req.nextUrl.searchParams.get("hash");
  if (!hash) {
    return NextResponse.json({ error: "Parâmetro ?hash= obrigatório." }, { status: 400 });
  }

  const baseUrl = process.env.ONEDOC_BASE_URL;
  const authHash = process.env.ONEDOC_AUTH_HASH;

  if (!baseUrl || !authHash) {
    return NextResponse.json({ error: "Variáveis de ambiente não configuradas." }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`,
      { headers: { "X-Auth-Hash": authHash } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Falha na 1Doc", status: res.status }, { status: 502 });
    }

    const json = await res.json();
    const processo = json.data?.[0] ?? null;

    if (!processo) {
      return NextResponse.json({ error: "Processo não encontrado no payload." }, { status: 404 });
    }

    // Retorna APENAS os campos relevantes para diagnóstico
    // ⚠️ Nunca exponha este endpoint sem o guard de NODE_ENV acima
    return NextResponse.json({
      _diagnostico: true,
      id_assunto: processo.id_assunto,
      num_formatado: processo.num_formatado,
      assunto: processo.assunto,
      conteudo_tipo: typeof processo.conteudo,
      conteudo_tamanho: String(processo.conteudo ?? "").length,
      conteudo_preview: String(processo.conteudo ?? "").slice(0, 3000),
      resumo: processo.resumo ?? null,
      total_despachos: processo.total_despachos ?? null,
      // Campos adicionais do formulário de emenda (estruturado)
      emissao_campos_adicionais_assunto: (processo as any).emissao_campos_adicionais_assunto ?? null,
      // Campos sensíveis — valores presentes? (apenas diagnóstico — NUNCA expor em produção)
      _sensivel_agencia_presente: !!(processo as any).agencia_1hh0po1h,
      _sensivel_conta_presente: !!(processo as any).n_conta__1hmzl11h,
      _sensivel_agencia_valor: (processo as any).agencia_1hh0po1h ?? null,
      _sensivel_conta_valor: (processo as any).n_conta__1hmzl11h ?? null,
      // Outros campos do formulário mapeados
      campos_adicionais_raw: {
        orgaopedido: (processo as any).orgaopedido ?? null,
        orgaopedido_1hmg1t1h: (processo as any).orgaopedido_1hmg1t1h ?? null,
        divrequisitante: (processo as any).divrequisitante ?? null,
      },
      campos_presentes: Object.keys(processo),
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno", detalhe: String(error) }, { status: 500 });
  }
}
