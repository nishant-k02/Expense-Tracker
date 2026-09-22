import { getCategoryBreakdown, getMonthlySummary, getMonthlyTrend, getSpendByInstitution } from "@/lib/analytics";

export const dynamic = "force-dynamic";
import { formatCurrency } from "@/lib/format";
import { SpendByCategoryChart } from "@/components/dashboard/SpendByCategoryChart";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { SyncButton } from "@/components/plaid/SyncButton";

export default async function DashboardPage() {
  const [summary, breakdown, byInstitution, trend] = await Promise.all([
    getMonthlySummary(),
    getCategoryBreakdown(),
    getSpendByInstitution(),
    getMonthlyTrend(),
  ]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SyncButton label="Refresh all" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label={`Spent in ${monthLabel}`} value={formatCurrency(summary.spend)} tone="negative" />
        <SummaryCard label={`Credited in ${monthLabel}`} value={formatCurrency(summary.income)} tone="positive" />
        <SummaryCard label="Net" value={formatCurrency(summary.net)} tone={summary.net >= 0 ? "positive" : "negative"} />
      </div>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-4 font-medium">Spend by bank — {monthLabel}</h2>
        {byInstitution.length === 0 ? (
          <p className="text-sm text-foreground/60">No spending recorded yet this month.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 text-sm dark:divide-white/10">
            {byInstitution.map((entry) => (
              <li key={entry.institutionName} className="flex items-center justify-between py-2">
                <span>{entry.institutionName}</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(entry.spend)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2 font-semibold">
              <span>Total (all banks)</span>
              <span className="text-red-600 dark:text-red-400">{formatCurrency(summary.spend)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-4 font-medium">Spend by category — {monthLabel}</h2>
        <SpendByCategoryChart data={breakdown} />
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-4 font-medium">Last 6 months</h2>
        <MonthlyTrendChart data={trend} />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "positive" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
        {value}
      </p>
    </div>
  );
}
