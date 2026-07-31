import {
  Landmark,
  Tag,
  Hash,
  LayoutGrid,
  CreditCard,
  Calendar,
  ScrollText,
  Gavel,
  ShieldAlert,
  Banknote,
  Building,
} from "lucide-react";
import {
  extractFromForm,
  buildRateioTable,
  parseMoedaToNumber,
  formatMoedaBR,
  normalizeLabel,
} from "@/lib/emendaUtils";

// ─── Whitelists ──────────────────────────────────────────────────────────────

/** Campos que pertencem à tabela de rateio — excluídos do grid para evitar duplicatas */
const RATEIO_ONLY_FIELDS = new Set([
  "vereador autor", "parlamentar autor", "no da emenda", "n. da emenda", "valor",
]);

/** Campos exibidos de forma destacada no layout — excluídos do grid extra */
const CAMPOS_DESTACADOS_TS = new Set([
  "razao social", "beneficiaria", "cnpj da unidade", "cnpj benefici",
  "concessor", "ente federado", "cnpj concessor",
  "objeto da despesa", "objeto",
  "modalidade", "lei", "portaria", "no espelho", "n. espelho",
  "vereador autor", "parlamentar autor", "no da emenda", "valor",
]);

const WHITELIST_TERCEIRO_SETOR = new Set([
  "modalidade", "origem", "ano", "objeto", "objeto da despesa",
  "concessor", "beneficiaria", "razao social", "cnpj", "cnpj concessor",
  "cnpj da unidade", "gnd", "esfera", "esfrea", "no espelho", "n. espelho",
  "ente federado", "total programado",
]);

const WHITELIST_SAUDE = new Set([
  "origem", "tipo", "bloco", "proposta", "portaria", "lei",
  "no da emenda", "no emenda", "demanda", "exercicio",
  "valor disponibilizado", "dados bancarios", "funcao legislativa",
  "agencia", "no da conta", "n. da conta", "conta", "nome do banco", "banco"
]);

const WHITELIST_MUNICIPAL = new Set([
  "esfera", "esfrea", "ente federado", "total programado", "valor", "gnd",
  "no espelho", "n. espelho", "modalidade", "origem",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseValorDisplay(label: string, valor: string | null | undefined): string {
  if (!valor) return "";

  // Sanitize array stringified values like '["Federal"]'
  let cleanValor = valor;
  if (valor.trim().startsWith("[") && valor.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        cleanValor = parsed.join(", ");
      }
    } catch (e) {
      // If it fails to parse, keep the original
    }
  }

  if (cleanValor.includes("R$")) return cleanValor;
  
  // Não formata como moeda se for ano, número, exercício, etc.
  const normLabel = normalizeLabel(label);
  const isMoeda = normLabel.includes("valor") || normLabel.includes("total") || normLabel.includes("repasse");
  
  if (isMoeda) {
    const num = parseMoedaToNumber(cleanValor);
    if (num > 0) return formatMoedaBR(num);
  }
  
  return cleanValor;
}

function extractEntityFromAssunto(assunto?: string | null): string | null {
  if (!assunto) return null;
  const parts = assunto.split(" - ");
  if (parts.length >= 2) return parts[1].trim();
  return null;
}

// Mapeia label normalizada → ícone lucide
function iconForSaudeLabel(norm: string): React.ElementType {
  if (norm.includes("origem")) return LayoutGrid;
  if (norm.includes("funcao") || norm.includes("legislativa")) return Gavel;
  if (norm.includes("emenda") || norm.includes("demanda")) return Hash;
  if (norm.includes("lei") || norm.includes("portaria")) return ScrollText;
  if (norm.includes("tipo")) return Tag;
  if (norm.includes("bloco")) return LayoutGrid;
  if (norm.includes("exercicio")) return Calendar;
  if (norm.includes("bancarios") || norm.includes("banco")) return CreditCard;
  if (norm.includes("proposta")) return Hash;
  if (norm.includes("valor")) return Banknote;
  return Tag;
}

// ─── Campo genérico ───────────────────────────────────────────────────────────

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-foreground">{valor}</span>
    </div>
  );
}

function CampoComIcone({ icon: Icon, label, valor }: { icon: React.ElementType; label: string; valor: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-foreground">{valor}</dd>
    </div>
  );
}

// ─── EmendaSaudeBlock ─────────────────────────────────────────────────────────

export function EmendaSaudeBlock({
  formData,
  conteudo,
}: {
  formData: any[];
  conteudo?: string;
}) {
  const valorDisponibilizado = extractFromForm(formData, "valor disponibilizado");
  const temDadosBancarios = (formData || []).some(
    (f) => normalizeLabel(f.label || "").includes("bancarios") || normalizeLabel(f.label || "").includes("agencia") || normalizeLabel(f.label || "").includes("conta") || normalizeLabel(f.label || "").includes("banco")
  );

  // Grid dinâmico via whitelist — exclui o valor (exibido no header)
  const camposGrid = (formData || []).filter((item) => {
    if (!item.label || !item.valor) return false;
    const norm = normalizeLabel(item.label);
    if (norm.includes("valor disponibilizado")) return false; // já no banner
    return Array.from(WHITELIST_SAUDE).some((w) => norm.includes(w));
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header verde premium */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Saúde — Destinação Direta</h3>
            <p className="mt-0.5 text-sm text-emerald-600/80 dark:text-emerald-400/70">
              Formulário de Controle Interno de Emendas
            </p>
          </div>
          {valorDisponibilizado && (
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/70">
                Valor Disponibilizado
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {parseValorDisplay("valor", valorDisponibilizado)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Grid de campos com ícones */}
        {camposGrid.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            {camposGrid.map((item, i) => {
              const norm = normalizeLabel(item.label);
              const Icon = iconForSaudeLabel(norm);
              return (
                <CampoComIcone
                  key={i}
                  icon={Icon}
                  label={item.label}
                  valor={parseValorDisplay(item.label, item.valor)}
                />
              );
            })}
          </dl>
        )}

        {/* Aviso sobre dados bancários */}
        {temDadosBancarios && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">Transparência Ativa: </span>
              A disponibilização dos dados bancários atende aos requisitos da Lei 14.133/2021 e de Transparência Pública para rastreamento de recursos. A exibição destas contas estritamente públicas não viola a LGPD.
            </p>
          </div>
        )}

        {/* Justificativa */}
        {conteudo && (
          <div className="border-t pt-5">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <ScrollText className="h-3.5 w-3.5" /> Justificativa da Emenda
            </h4>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 rounded-lg bg-muted/30 p-4"
              dangerouslySetInnerHTML={{ __html: conteudo }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EmendaTerceiroSetorBlock ──────────────────────────────────────────────────

export function EmendaTerceiroSetorBlock({
  formData,
  conteudo,
  conteudoSemHtml,
  assunto,
  idAssunto,
}: {
  formData: any[];
  conteudo?: string;
  conteudoSemHtml?: string;
  assunto?: string;
  idAssunto?: number;
}) {
  // ── Dados ──────────────────────────────────────────────────────────────────
  const rateios = buildRateioTable(formData, conteudoSemHtml);
  const valorGlobal = rateios.reduce((acc, r) => acc + parseMoedaToNumber(r.valor), 0);

  const beneficiaria =
    extractFromForm(formData, "razao social") ||
    extractFromForm(formData, "beneficiaria") ||
    extractEntityFromAssunto(assunto);
  const cnpjBenef =
    extractFromForm(formData, "cnpj da unidade") ||
    extractFromForm(formData, "cnpj benefici");
  const CNPJ_PREFEITURA = "44.543.981/0001-99";
  const NOME_PREFEITURA = "Prefeitura Municipal de Palmital";

  // Regex para detectar se o valor é um CNPJ (XX.XXX.XXX/XXXX-XX)
  const isCNPJ = (v: string) => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v.trim());

  const concessorRaw =
    extractFromForm(formData, "concessor") ||
    extractFromForm(formData, "ente federado") ||
    extractFromForm(formData, "ente concedente");

  // Se o campo de concessor veio com CNPJ no lugar do nome, usa nome padrão
  const concessorNome = concessorRaw && !isCNPJ(concessorRaw)
    ? concessorRaw
    : NOME_PREFEITURA;

  const cnpjConcess =
    extractFromForm(formData, "cnpj concessor") ||
    extractFromForm(formData, "cnpj do ente concedente") ||
    (concessorRaw && isCNPJ(concessorRaw) ? concessorRaw : CNPJ_PREFEITURA);

  const objeto =
    extractFromForm(formData, "objeto da despesa") ||
    extractFromForm(formData, "objeto");
  const modalidade = extractFromForm(formData, "modalidade");
  const lei =
    extractFromForm(formData, "lei") ||
    extractFromForm(formData, "no espelho") ||
    extractFromForm(formData, "n. espelho");

  // Título específico por tipo de processo
  const isEsporte = idAssunto === 1915759;
  const titulo = isEsporte ? "Esporte — Destinação Direta" : "Terceiro Setor Social";

  // Campos extras do grid (o que a whitelist aprovar e não está em destaque)
  const camposExtras = (formData || []).filter((item) => {
    if (!item.label || !item.valor) return false;
    const norm = normalizeLabel(item.label);
    // Exclui campos já exibidos de forma destacada
    if (Array.from(CAMPOS_DESTACADOS_TS).some((e) => norm.includes(e))) return false;
    if (Array.from(RATEIO_ONLY_FIELDS).some((f) => norm.includes(f))) return false;
    return Array.from(WHITELIST_TERCEIRO_SETOR).some((w) => norm.includes(w));
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header azul premium */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">{titulo}</h3>
            {(modalidade || lei) && (
              <p className="mt-0.5 text-sm text-blue-600/80 dark:text-blue-400/70">
                {[modalidade, lei ? `Lei/Portaria ${lei}` : null].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
          {valorGlobal > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-500/70">
                Valor do Repasse (Total)
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatMoedaBR(valorGlobal)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Entidade + Concessor */}
        {(beneficiaria || concessorNome) && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {beneficiaria && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Tag className="h-3.5 w-3.5" /> Entidade Beneficiária
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground leading-snug">{beneficiaria}</p>
                {cnpjBenef && (
                  <p className="mt-1 text-xs text-muted-foreground font-mono">CNPJ: {cnpjBenef}</p>
                )}
              </div>
            )}
            {concessorNome && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Building className="h-3.5 w-3.5" /> Órgão Concessor
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground leading-snug">{concessorNome}</p>
                {cnpjConcess && (
                  <p className="mt-1 text-xs text-muted-foreground font-mono">CNPJ: {cnpjConcess}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Autores dos Repasses — lista inline elegante */}
        {rateios.length > 0 && (
          <div className="border-t pt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Hash className="h-3.5 w-3.5" /> Autores dos Repasses
            </p>
            <ul className="space-y-2">
              {rateios.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 text-sm rounded-lg px-3 py-2 bg-muted/40"
                >
                  <span className="font-medium text-foreground">{r.autor}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {r.emenda ? `Emenda nº ${r.emenda}` : ""}
                    {r.emenda && r.valor ? " — " : ""}
                    {r.valor ? parseValorDisplay("valor", r.valor) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Objeto da Parceria */}
        {objeto && (
          <div className="border-t pt-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              <LayoutGrid className="h-3.5 w-3.5" /> Objeto da Parceria
            </p>
            <p className="text-sm font-medium text-foreground">{objeto}</p>
          </div>
        )}

        {/* Campos extras da whitelist */}
        {camposExtras.length > 0 && (
          <div className="border-t pt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {camposExtras.map((item, i) => (
              <Campo key={i} label={item.label} valor={parseValorDisplay(item.label, item.valor)} />
            ))}
          </div>
        )}

        {/* Conteúdo textual / Justificativa / Objeto - Ocultado no Terceiro Setor (1915739) se já extraímos rateios */}
        {conteudo && (idAssunto !== 1915739 || rateios.length === 0) && (
          <div className="border-t pt-5">
            <h4 className="mb-2 text-sm font-bold text-muted-foreground">Justificativa / Objeto</h4>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: conteudo }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EmendaMunicipalBlock ────────────────────────────────────────────────────

export function EmendaMunicipalBlock({
  formData,
  conteudo,
}: {
  formData: any[];
  conteudo?: string;
}) {
  const camposGrid = (formData || []).filter((item) => {
    if (!item.label || !item.valor) return false;
    const norm = normalizeLabel(item.label);
    return Array.from(WHITELIST_MUNICIPAL).some((w) => norm.includes(w));
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header roxo premium */}
      <div className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/50 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
            <Building className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400">Destinação Direta (Municipal)</h3>
            <p className="mt-0.5 text-sm text-purple-600/80 dark:text-purple-400/70">
              Formulário de Controle Interno
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {camposGrid.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {camposGrid.map((item, i) => (
              <Campo key={i} label={item.label} valor={parseValorDisplay(item.label, item.valor)} />
            ))}
          </div>
        )}

        {conteudo && (
          <div className="border-t pt-5">
            <h4 className="mb-2 text-sm font-bold text-muted-foreground">Observações do Processo</h4>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: conteudo }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
