"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface DashboardChartsProps {
  statusData: any[];
  entidadesData: any[];
  evolutionData: any[];
}

const COLORS = ["#0284c7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function DashboardCharts({ statusData, entidadesData, evolutionData }: DashboardChartsProps) {
  // Formatters
  const formatYAxisMoeda = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {payload[0].name}: {Number(payload[0].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatMonthYear = (tickItem: string, index: number) => {
    const item = evolutionData[index];
    if (!item) return tickItem;
    return `${item.mes}/${item.ano}`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Gráfico 1: Evolução Financeira */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2 lg:col-span-3">
        <h3 className="text-lg font-semibold text-foreground mb-6">Evolução Mensal de Repasses</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis 
                dataKey="mes" 
                tickFormatter={formatMonthYear}
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatYAxisMoeda}
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="valor_total" 
                name="Valor" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-primary)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Top 10 Entidades */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
        <h3 className="text-lg font-semibold text-foreground mb-6">Top Entidades por Volume</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={entidadesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis 
                type="number"
                tickFormatter={formatYAxisMoeda}
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <YAxis 
                dataKey="search_entidade" 
                type="category" 
                width={150}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor_total" name="Total Repassado" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 3: Distribuição por Status */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-6">Status dos Processos</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="total"
                nameKey="situacao_atual"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [`${value} processo(s)`, name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {statusData.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
              {entry.situacao_atual}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
