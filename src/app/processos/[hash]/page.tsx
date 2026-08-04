import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Landmark,
  Banknote,
  Hash,
  Gavel,
  Tag,
  LayoutGrid,
  CalendarClock,
  CreditCard,
  ScrollText,
  Download,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { supabase } from "@/lib/db-client";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { after } from "next/server";
import { EmendaSaudeBlock, EmendaTerceiroSetorBlock, EmendaMunicipalBlock } from "@/components/portal/EmendaBlocks";
import { ASSUNTOS_SAUDE, ASSUNTOS_TERCEIRO_SETOR } from "@/lib/onedoc";
import { syncProcessByHash } from "@/lib/sync-core";
import { flattenProcessoParaRow } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/db-admin";
import { NOMENCLATURA } from "@/lib/constants";

function formatDateBR(dataStr: string, horaStr?: string) {
  if (!dataStr) return "";
  const [dia, mes, ano] =
    dataStr.includes("/") ? dataStr.split("/") : [null, null, null];
  if (!dia || !mes || !ano) return dataStr;
  const iso = `${ano}-${mes}-${dia}${horaStr ? "T" + horaStr : ""}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(horaStr ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

function InfoField({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}



import { obterDetalheInterno } from "@/lib/onedoc";
import { unstable_cache } from "next/cache";

// ─── Phase 1: Extração defensiva e Controle de Concorrência ────────────────
// Helper de concorrência para evitar rate limits
async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const p = fn(item).then(res => {
      results.push(res);
    });
    executing.push(p);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove the resolved promise(s)
      for (let i = executing.length - 1; i >= 0; i--) {
        // Unfortunately standard Promise doesn't expose state, 
        // but since we await Promise.race, at least one is done.
        // A simple chunking is actually safer and easier:
      }
    }
  }
  await Promise.all(executing);
  return results;
}

// Uma versão em lotes (chunking) é mais simples e segura
async function fetchInChunks<T, R>(items: T[], chunkSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

const getLinkedHashes = unstable_cache(
  async (hash: string) => {
    try {
      const liveData = await obterDetalheInterno(hash);
      return liveData?.processos_vinculados_hashes || [];
    } catch (err) {
      return [];
    }
  },
  ["processos-vinculados-hashes"], // O unstable_cache usa esse prefixo + os argumentos fornecidos (no caso o hash)
  { revalidate: 86400 * 3, tags: ["processos"] } // 3 dias de TTL
);

const getProcessoMetadata = unstable_cache(
  async (hash: string) => {
    try {
      const liveData = await obterDetalheInterno(hash);
      if (!liveData) return null;
      return {
        hash: liveData.hash,
        num_formatado: liveData.num_formatado,
        assunto: liveData.assunto,
        situacao_atual_str: liveData.situacao_atual_str
      };
    } catch (err) {
      return null;
    }
  },
  ["processo-vinculado-metadata"], // O unstable_cache usa esse prefixo + os argumentos fornecidos (no caso o hash)
  { revalidate: 86400, tags: ["processos"] } // 1 dia de TTL
);

function SubprocessosBlock({ subprocessos, vinculadosHtml }: { subprocessos: any[], vinculadosHtml?: any[] }) {
  const hasSub = subprocessos && subprocessos.length > 0;
  const hasVinc = vinculadosHtml && vinculadosHtml.length > 0;
  
  if (!hasSub && !hasVinc) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
        <LayoutGrid className="h-5 w-5 text-muted-foreground" /> Processos Vinculados (Execução Financeira)
      </h3>
      <div className="grid gap-3">
        {hasSub && subprocessos.map((sub: any, i: number) => (
          <div key={`sub-${i}`} className="flex flex-col rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm font-bold text-foreground">
                {NOMENCLATURA.PROCESSO} nº {sub.num_formatado || `${sub.num}/${sub.ano}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{sub.assunto}</p>
              {sub.situacao_atual && (
                <div className="mt-2 inline-flex">
                   <StatusBadge status={sub.situacao_atual} />
                </div>
              )}
            </div>
            <Link 
              href={`/processos/${sub.hash}`}
              className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:mt-0"
            >
              Ver Detalhes
            </Link>
          </div>
        ))}
        {hasVinc && vinculadosHtml.map((vinc: any, i: number) => (
          <div key={`vinc-${i}`} className="flex flex-col rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm font-bold text-foreground">
                {NOMENCLATURA.PROCESSO} nº {vinc.num_formatado}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{vinc.assunto}</p>
              {vinc.situacao_atual_str && (
                <div className="mt-2 inline-flex">
                   <StatusBadge status={vinc.situacao_atual_str} />
                </div>
              )}
            </div>
            <Link 
              href={`/processos/${vinc.hash}`}
              className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:mt-0"
            >
              Ver Detalhes
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DetalhesProcesso({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  
  const { data: p } = await supabase
    .from("processos_emendas")
    .select("*")
    .eq("hash", hash)
    .single();

  if (!p) {
    return (
      <PortalLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
          <p className="text-muted-foreground">
            Processo não encontrado ou indisponível.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Voltar para a busca
          </Link>
        </div>
      </PortalLayout>
    );
  }

  // Verifica se devemos fazer SWR (TTL de 3 dias)
  const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
  const ultimaSinc = p.ultima_sincronizacao ? new Date(p.ultima_sincronizacao).getTime() : 0;
  const agora = Date.now();
  const deveSincronizar = (agora - ultimaSinc) > tresDiasMs;

  if (deveSincronizar) {
    after(async () => {
      try {
        console.log(`[SWR] Iniciando sync reativo (TTL) para o processo ${p.num}/${p.ano} (hash: ${hash})`);
        
        const result = await syncProcessByHash(hash);
        
        if (!result) {
          console.error(`[SWR] Falha no sync-core do hash: ${hash}`);
        } else {
          console.log(`[SWR] Sincronização concluída (TimeExceeded: ${result.timeExceeded})`);
        }
      } catch (err) {
        console.error(`[SWR] Falha no background sync do processo ${hash}:`, err);
      }
    });
  }

  // Fallback seguro para arrays (JSONB)
  const movimentacoes = Array.isArray(p.movimentacoes) ? p.movimentacoes : [];
  const anexos = Array.isArray(p.anexos) ? p.anexos : [];

  // Buscar subprocessos (onde id_emissao_base == p.id_emissao)
  const { data: subprocessos } = await supabase
    .from("processos_emendas")
    .select("*")
    .eq("id_emissao_base", p.id_emissao)
    .order("data", { ascending: false });

  // Buscar hash do pai se for um subprocesso
  let parentHash = null;
  if (p.id_emissao_base) {
    const { data: parent } = await supabase
      .from("processos_emendas")
      .select("hash")
      .eq("id_emissao", p.id_emissao_base)
      .single();
    if (parent) parentHash = parent.hash;
  }

  // Phase 1: Extração defensiva e Controle de Concorrência
  let vinculadosHtml: any[] = [];
  if (ASSUNTOS_TERCEIRO_SETOR.has(p.id_assunto) || ASSUNTOS_SAUDE.has(p.id_assunto)) {
    const extractedHashes = await getLinkedHashes(hash);
    if (extractedHashes && extractedHashes.length > 0) {
      // Limitando a concorrência (chunking de 3 em 3) para evitar rate limits na Vercel / 1Doc
      const metadataResults = await fetchInChunks(extractedHashes, 3, async (h) => {
        return await getProcessoMetadata(h);
      });
      vinculadosHtml = metadataResults.filter(Boolean);
    }
  }
  return (
    <PortalLayout>
      <div className="bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          {parentHash ? (
            <Link
              href={`/processos/${parentHash}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para o Processo Pai
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para busca
            </Link>
          )}

          <div className="mt-6 space-y-6">
            {/* Header do processo */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
                    {NOMENCLATURA.PROCESSO} nº {p.num_formatado || `${p.num}/${p.ano}`}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-muted-foreground">
                    {p.assunto}
                  </p>
                </div>
                <StatusBadge status={p.situacao_atual || "Indefinida"} />
              </div>

              <dl className="mt-8 grid gap-6 rounded-xl bg-muted/40 p-5 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Data de abertura
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {formatDateBR(p.data || "", p.hora || "")}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Setor de origem
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {p.origem_setor}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Setor atual (destino)
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-foreground">
                    {p.destino_setor}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Formulário Dinâmico da Emenda com Blocos Especializados */}
            {!parentHash && (
              <>
                {ASSUNTOS_SAUDE.has(p.id_assunto) && (
                  <EmendaSaudeBlock formData={p.form_data || []} conteudo={p.conteudo} />
                )}

                {ASSUNTOS_TERCEIRO_SETOR.has(p.id_assunto) && (
                  <EmendaTerceiroSetorBlock 
                    formData={p.form_data || []} 
                    conteudo={p.conteudo ?? undefined} 
                    conteudoSemHtml={p.conteudo?.replace(/<[^>]*>?/gm, "").trim()} 
                    assunto={p.assunto ?? undefined}
                    idAssunto={p.id_assunto}
                  />
                )}
              </>
            )}

            {/* Bloco de Subprocessos e Vinculados HTML */}
            <SubprocessosBlock subprocessos={subprocessos || []} vinculadosHtml={vinculadosHtml} />

            {/* Documentos Anexados */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">

              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" /> Documentos
                Anexados
              </h3>

              {anexos.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {anexos.map((doc: any, i: number) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.arquivo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.extensao?.toUpperCase()} •{" "}
                          {doc.tamanho_bytes > 0
                            ? `${(doc.tamanho_bytes / 1024).toFixed(0)} KB`
                            : doc.tipo_mime}
                        </p>
                      </div>
                      
                      {doc.url_storage ? (
                        <a
                          href={doc.url_storage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors text-xs font-medium ml-auto shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" /> Baixar
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-xs font-medium cursor-not-allowed ml-auto shrink-0"
                          title="Arquivo em processamento"
                        >
                          <Clock className="h-3.5 w-3.5" /> Processando...
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhum documento público anexado a este processo.
                </p>
              )}
            </div>

            {/* Histórico / Linha do tempo de movimentações */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-muted-foreground" /> Histórico de
                Movimentações
              </h3>

              <div className="mt-8 flow-root">
                <ul className="-mb-8">
                  {movimentacoes.map((mov: any, idx: number) => (
                    <li key={mov.id}>
                      <div className="relative pb-8">
                        {idx !== movimentacoes.length - 1 ? (
                          <span
                            className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-4">
                          <div className="relative">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background ring-8 ring-card">
                              {idx === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : idx === movimentacoes.length - 1 ? (
                                <AlertCircle className="h-5 w-5 text-blue-500" />
                              ) : (
                                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <p className="font-medium text-foreground text-sm">
                              {mov.evento}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building className="h-3.5 w-3.5" />
                              {mov.origem_setor}
                            </div>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">
                              {formatDateBR(mov.data, mov.hora)}
                            </div>
                            
                            {Array.isArray(mov.anexos) && mov.anexos.length > 0 && (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {mov.anexos.map((anexo: any, aIdx: number) => {
                                  const renderAnexoContent = () => (
                                    <>
                                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground">
                                          {anexo.arquivo}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {anexo.extensao?.toUpperCase()} • {anexo.tamanho_bytes > 0 ? `${(anexo.tamanho_bytes / 1024).toFixed(0)} KB` : anexo.tipo_mime}
                                        </p>
                                      </div>
                                    </>
                                  );

                                  if (anexo.url_storage) {
                                    return (
                                      <a
                                        key={aIdx}
                                        href={anexo.url_storage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-md border border-border bg-blue-50/30 px-3 py-2 text-left transition-colors hover:bg-blue-50 hover:border-blue-200 group"
                                      >
                                        {renderAnexoContent()}
                                        <Download className="h-4 w-4 shrink-0 text-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                                      </a>
                                    );
                                  }

                                  return (
                                    <button
                                      key={aIdx}
                                      disabled
                                      title="Arquivo em processamento"
                                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {renderAnexoContent()}
                                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}

                  {movimentacoes.length === 0 && (
                    <p className="text-sm text-muted-foreground pb-8">
                      Nenhuma movimentação registrada.
                    </p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
