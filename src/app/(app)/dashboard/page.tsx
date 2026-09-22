import { ArrowDownRight, ArrowUpRight, Scale, Landmark } from "lucide-react";
import { getCategoryBreakdown, getMonthlySummary, getMonthlyTrend, getSpendByInstitution } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { SpendByCategoryChart } from "@/components/dashboard/SpendByCategoryChart";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { SyncButton } from "@/components/plaid/SyncButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, breakdown, byInstitution, trend] = await Promise.all([
    getMonthlySummary(),
    getCategoryBreakdown(),
    getSpendByInstitution(),
    getMonthlyTrend(),
  ]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <SyncButton label="Refresh all" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Spent" value={summary.spend} tone="negative" icon={ArrowUpRight} />
        <SummaryCard label="Credited" value={summary.income} tone="positive" icon={ArrowDownRight} />
        <SummaryCard label="Net" value={summary.net} tone={summary.net >= 0 ? "positive" : "negative"} icon={Scale} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spend by bank</CardTitle>
        </CardHeader>
        <CardContent>
          {byInstitution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spending recorded yet this month.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {byInstitution.map((entry) => (
                <li key={entry.institutionName} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2">
                    <Landmark className="size-4 text-muted-foreground" />
                    {entry.institutionName}
                  </span>
                  <span className="font-medium text-negative">{formatCurrency(entry.spend)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-2.5 font-semibold">
                <span>Total (all banks)</span>
                <span className="text-negative">{formatCurrency(summary.spend)}</span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by category</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendByCategoryChart data={breakdown} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trend} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "positive" ? "text-positive" : "text-negative")}>
            {formatCurrency(value)}
          </p>
        </div>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "positive" ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
          )}
        >
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}
