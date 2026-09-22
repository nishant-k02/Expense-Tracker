"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export function MonthlyTrendChart({ data }: { data: { label: string; spend: number; income: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" fontSize={12} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis
            fontSize={12}
            stroke="var(--muted-foreground)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v)}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="income" name="Income" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="spend" name="Spend" fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
