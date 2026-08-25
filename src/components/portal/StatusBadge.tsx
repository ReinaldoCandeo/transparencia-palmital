export const STATUS_COLORS: Record<string, string> = {
  "Em Tramitação": "border-blue-500/20 bg-blue-500/10 text-blue-500",
  Concluído: "border-green-500/20 bg-green-500/10 text-green-500",
  Arquivado: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
  "Em Formalização": "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:border-slate-400/20 dark:text-slate-400",
  "Em Execução": "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Em Prestação de Contas": "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Concluído (AUDESP)": "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status] ??
    "border-gray-500/20 bg-gray-500/10 text-gray-500";
  return (
    <span className={`inline-flex items-center whitespace-nowrap gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
