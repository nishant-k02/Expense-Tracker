"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function SpendByCategoryChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-foreground/60">No spending recorded yet this month.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col justify-center gap-2 text-sm">
        {data.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.name}
            </span>
            <span className="font-medium">{formatCurrency(entry.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
