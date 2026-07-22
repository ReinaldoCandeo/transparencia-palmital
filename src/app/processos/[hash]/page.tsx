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
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { supabase } from "@/lib/db-client";
import type { EmendaInfo, EmendaSocialInfo } from "@/lib/onedoc";
import { StatusBadge } from "@/components/portal/BuscaProcessosClient";

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

function EmendaBlock({ emenda }: { emenda: EmendaInfo }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm dark:border-emerald-800/40 dark:bg-emerald-950/20 sm:p-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 border-b border-emerald-200/70 pb-4 dark:border-emerald-800/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
            Emenda Parlamentar — Informações Públicas
          </h3>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
            Dados do Formulário de Controle Interno de Emendas — Saúde
          </p>
        </div>
      </div>

      {/* Destaque do Valor */}
      {emenda.valor_disponibilizado && (
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl bg-emerald-600 py-5 text-white shadow-inner sm:flex-row sm:gap-4">
          <Banknote className="h-7 w-7 opacity-80" />
          <div className="text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-widest opacity-80">
              Valor Disponibilizado
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {emenda.valor_disponibilizado}
            </p>
          </div>
        </div>
      )}

      {/* Grid de campos */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <InfoField icon={Building} label="Origem" value={emenda.origem} />
        <InfoField icon={Gavel} label="Função Legislativa" value={emenda.funcao_legislativa} />
        <InfoField icon={Hash} label="Nº da Emenda" value={emenda.num_emenda} />
        <InfoField icon={ScrollText} label="Lei / Portaria" value={emenda.lei_portaria} />
        <InfoField icon={Tag} label="Tipo" value={emenda.tipo} />
        <InfoField icon={LayoutGrid} label="Bloco" value={emenda.bloco} />
        <InfoField icon={CalendarClock} label="Exercício" value={emenda.exercicio} />
        <InfoField
          icon={CreditCard}
          label="Banco Conveniado"
          value={emenda.banco}
          className="col-span-2 sm:col-span-2"
        />
        {emenda.num_proposta && (
          <InfoField
            icon={FileText}
            label="Nº Proposta"
            value={emenda.num_proposta}
            className="col-span-2 sm:col-span-3"
          />
        )}
      </dl>

      {/* Aviso de dados bancários */}
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-300/60 bg-emerald-100/60 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-300">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Dados bancários protegidos:</strong> O número da agência e da
          conta corrente são omitidos neste portal por proteção de
          infraestrutura pública, em conformidade com as boas práticas de
          segurança da informação e LGPD.
        </span>
      </div>

      {/* Justificativa */}
      {emenda.justificativa && (
        <div className="mt-6">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            <ScrollText className="h-4 w-4" />
            Justificativa da Emenda
          </h4>
          <p className="rounded-lg border border-emerald-200/60 bg-white/70 px-4 py-3 text-sm leading-relaxed text-foreground dark:border-emerald-800/30 dark:bg-black/20">
            {emenda.justificativa}
          </p>
        </div>
      )}
    </div>
  );
}

function EmendaSocialBlock({ emenda }: { emenda: EmendaSocialInfo }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-100">
            Terceiro Setor Social
          </h2>
          <p className="text-sm font-medium text-blue-700/80 dark:text-blue-300/80">
            {emenda.modalidade} • Lei/Portaria {emenda.num_emenda}
          </p>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <dt className="flex items-center gap-2 text-xs font-semibold text-blue-800/70 dark:text-blue-300/70">
            <Tag className="h-3.5 w-3.5" /> Entidade Beneficiária
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-blue-950 dark:text-blue-50">
            {emenda.razao_social}
            <div className="text-xs mt-0.5 text-blue-700/60 dark:text-blue-300/60">
              CNPJ: {emenda.cnpj_beneficiaria}
            </div>
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-2 text-xs font-semibold text-blue-800/70 dark:text-blue-300/70">
            <Building className="h-3.5 w-3.5" /> Órgão Concessor
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-blue-950 dark:text-blue-50">
            Prefeitura Municipal de Palmital
            <div className="text-xs mt-0.5 text-blue-700/60 dark:text-blue-300/60">
              CNPJ: {emenda.cnpj_concessor}
            </div>
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-2 text-xs font-semibold text-blue-800/70 dark:text-blue-300/70">
            <Banknote className="h-3.5 w-3.5" /> Valor do Repasse (Total)
          </dt>
          <dd className="mt-1.5 text-base font-bold text-blue-900 dark:text-blue-100">
            {emenda.valor_total || (emenda as any).valor}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="flex items-center gap-2 text-xs font-semibold text-blue-800/70 dark:text-blue-300/70">
            <Gavel className="h-3.5 w-3.5" /> Autores dos Repasses
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-blue-950 dark:text-blue-50">
            <ul className="space-y-1">
              {(emenda.autores_repasses || []).map((autor: any, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="font-semibold">{autor.nome}</span>
                  <span className="text-blue-700/60 dark:text-blue-300/60">—</span>
                  <span>{autor.valor}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="flex items-center gap-2 text-xs font-semibold text-blue-800/70 dark:text-blue-300/70">
            <ScrollText className="h-3.5 w-3.5" /> Objeto da Parceria
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-blue-950 dark:text-blue-50">
            {emenda.objeto}
          </dd>
        </div>
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

  // Fallback seguro para arrays (JSONB)
  const movimentacoes = Array.isArray(p.movimentacoes) ? p.movimentacoes : [];
  const anexos = Array.isArray(p.anexos) ? p.anexos : [];

  // Adaptadores para reaproveitar os componentes UI
  const temSaude = !!p.emenda_num_emenda || !!p.emenda_origem;
  const temSocial = !!p.social_num_emenda || !!p.social_origem;

  const emendaSaude = temSaude ? {
    origem: p.emenda_origem || "",
    lei_portaria: p.emenda_lei_portaria || "",
    funcao_legislativa: p.emenda_funcao_legislativa || "",
    num_emenda: p.emenda_num_emenda || "",
    num_proposta: p.emenda_num_proposta || "",
    tipo: p.emenda_tipo || "",
    bloco: p.emenda_bloco || "",
    valor_disponibilizado: p.emenda_valor_formatado || "",
    valor_raw: p.emenda_valor_raw || "",
    exercicio: p.emenda_exercicio || "",
    banco: p.emenda_banco || "",
    justificativa: p.emenda_justificativa || "",
  } : null;

  const emendaSocial = temSocial ? {
    num_emenda: p.social_num_emenda || "",
    ano: p.social_ano || "",
    objeto: p.social_objeto || "",
    origem: p.social_origem || "",
    modalidade: p.social_modalidade || "",
    cnpj_concessor: p.social_cnpj_concessor || "",
    cnpj_beneficiaria: p.social_cnpj_beneficiaria || "",
    razao_social: p.social_razao_social || "",
    valor_total: p.social_valor_total || "",
    autores_repasses: Array.isArray(p.social_autores_repasses) ? p.social_autores_repasses : [],
  } : null;

  return (
    <PortalLayout>
      <div className="bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para busca
          </Link>

          <div className="mt-6 space-y-6">
            {/* Header do processo */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
                    Autuação nº {p.num_formatado || `${p.num}/${p.ano}`}
                  </h1>
                  <p className="mt-2 text-lg font-medium text-muted-foreground">
                    {p.assunto}
                  </p>
                </div>
                <StatusBadge status={p.situacao_atual || "Indefinida"} />
              </div>

              <div className="mt-8 grid gap-6 rounded-xl bg-muted/40 p-5 sm:grid-cols-2 md:grid-cols-3">
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
              </div>
            </div>

            {/* Bloco de Emenda Parlamentar */}
            {emendaSaude && <EmendaBlock emenda={emendaSaude as any} />}
            {emendaSocial && <EmendaSocialBlock emenda={emendaSocial as any} />}

            {/* Documentos Anexados & Aviso LGPD */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-800 dark:text-yellow-200">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Aviso de Privacidade — LGPD</p>
                  <p className="mt-1 opacity-90">
                    {emendaSocial 
                      ? "Os documentos comprobatórios das parcerias e convênios estão sendo processados e serão disponibilizados nesta seção em breve, em cumprimento à LAI e ao MROSC."
                      : "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), os arquivos originais estão restritos a acessos autenticados. Este portal exibe apenas os metadados dos documentos comprobatórios."}
                  </p>
                </div>
              </div>

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
                          {doc.extensao.toUpperCase()} •{" "}
                          {doc.tamanho_bytes > 0
                            ? `${(doc.tamanho_bytes / 1024).toFixed(0)} KB`
                            : doc.tipo_mime}
                        </p>
                      </div>
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
                                {mov.anexos.map((anexo: any, aIdx: number) => (
                                  <button
                                    key={aIdx}
                                    disabled
                                    title="Download será disponibilizado na próxima fase de transparência"
                                    className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-foreground">
                                        {anexo.arquivo}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {anexo.extensao?.toUpperCase()} • {anexo.tamanho_bytes > 0 ? `${(anexo.tamanho_bytes / 1024).toFixed(0)} KB` : anexo.tipo_mime}
                                      </p>
                                    </div>
                                  </button>
                                ))}
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
