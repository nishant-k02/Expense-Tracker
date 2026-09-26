import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Scale, Landmark, ReceiptText, Settings, Plus } from "lucide-react";
import {
  getCategoryBreakdown,
  getMonthlySummary,
  getMonthlyTrend,
  getRecentTransactions,
  getSpendByInstitution,
  getSubscriptionActivity,
} from "@/lib/analytics";
import { formatCurrency, formatDate } from "@/lib/format";
import { SpendByCategoryChart } from "@/components/dashboard/SpendByCategoryChart";
import { MonthlyTrendChart } from "@/components/dashboard/MonthlyTrendChart";
import { SyncButton } from "@/components/plaid/SyncButton";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/accounts", label: "Link a bank", icon: Plus, chip: "chip-pink" },
  { href: "/accounts", label: "Accounts", icon: Landmark, chip: "primary" },
  { href: "/transactions", label: "Transactions", icon: ReceiptText, chip: "chip-purple" },
  { href: "/settings", label: "Settings", icon: Settings, chip: "chip-blue" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  let reference = new Date();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    reference = new Date(Date.UTC(year, month - 1, 1));
  }
  const selectedMonth = `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, "0")}`;

  const [summary, breakdown, byInstitution, recent, trend, subscriptionActivity] = await Promise.all([
    getMonthlySummary(reference),
    getCategoryBreakdown(reference),
    getSpendByInstitution(reference),
    getRecentTransactions(6, reference),
    getMonthlyTrend(),
    getSubscriptionActivity(reference),
  ]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(reference);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <MonthSelector selectedMonth={selectedMonth} />
          <SyncButton label="Refresh all" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Spent" value={summary.spend} tone="negative" icon={ArrowUpRight} />
        <SummaryCard label="Credited" value={summary.income} tone="positive" icon={ArrowDownRight} />
        <SummaryCard label="Net" value={summary.net} tone={summary.net >= 0 ? "positive" : "negative"} icon={Scale} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by bank</CardTitle>
          </CardHeader>
          <CardContent>
            {byInstitution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spending recorded this month.</p>
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
            <CardTitle>Transactions this month</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions this month.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {recent.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(tx.date)} · {tx.accountName}
                        {tx.isTransfer && (
                          <Badge variant="secondary" className="ml-1.5 align-middle">
                            Transfer
                          </Badge>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        tx.amount > 0 ? "text-negative" : "text-positive"
                      )}
                    >
                      {formatCurrency(Math.abs(tx.amount), tx.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.label === "Transactions" ? `/transactions?month=${selectedMonth}` : action.href}
              className="flex items-center gap-2.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  action.chip === "primary" && "bg-primary/15 text-primary",
                  action.chip === "chip-purple" && "bg-chip-purple/15 text-chip-purple",
                  action.chip === "chip-pink" && "bg-chip-pink/15 text-chip-pink",
                  action.chip === "chip-blue" && "bg-chip-blue/15 text-chip-blue"
                )}
              >
                <action.icon className="size-3.5" />
              </span>
              <span className="truncate">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

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
          <CardTitle>Subscriptions &amp; investments this month</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription or investment charges this month.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {subscriptionActivity.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tx.description}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(tx.date)} · {tx.accountName}
                      <Badge
                        variant={tx.categoryName === "Recurring Investments" ? "secondary" : "outline"}
                        className="ml-1.5 align-middle"
                      >
                        {tx.categoryName === "Recurring Investments" ? "Investment" : "Subscription"}
                      </Badge>
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums text-negative">
                    {formatCurrency(Math.abs(tx.amount), tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tabular-nums",
              tone === "positive" ? "text-positive" : "text-negative"
            )}
          >
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
