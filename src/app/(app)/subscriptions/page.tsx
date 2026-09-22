import { Repeat, AlertCircle, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  syncDetectedSubscriptions,
  syncInvestmentSchedules,
  flagOverdueSubscriptionsInactive,
  isDueSoon,
} from "@/lib/subscriptions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionFormSheet } from "@/components/subscriptions/SubscriptionFormSheet";
import { DeleteSubscriptionButton } from "@/components/subscriptions/DeleteSubscriptionButton";

export const dynamic = "force-dynamic";

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Yearly",
  unknown: "Unknown",
};

export default async function SubscriptionsPage() {
  await syncDetectedSubscriptions();
  await syncInvestmentSchedules();
  await flagOverdueSubscriptionsInactive();

  const [subscriptions, accounts] = await Promise.all([
    prisma.subscription.findMany({
      include: { account: { include: { item: true } } },
      orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    }),
    prisma.account.findMany({
      select: {
        id: true,
        name: true,
        mask: true,
        item: { select: { institutionName: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    label: `${a.item.institutionName} · ${a.name}${a.mask ? ` ••${a.mask}` : ""}`,
  }));

  // Recurring investments (e.g. Robinhood) are tracked for visibility but are
  // never a "subscription" — kept in their own section and excluded from every
  // subscription total below.
  const subscriptionRows = subscriptions.filter((s) => s.type !== "investment");
  const investmentRows = subscriptions.filter((s) => s.type === "investment");

  const activeSubscriptions = subscriptionRows.filter((s) => s.isActive);
  const sumByFrequency = (frequency: string) =>
    activeSubscriptions
      .filter((s) => s.frequency === frequency)
      .reduce((sum, s) => sum + (s.amount ? Number(s.amount) : 0), 0);
  const monthlyTotal = sumByFrequency("monthly");
  const quarterlyTotal = sumByFrequency("quarterly");
  const yearlyTotal = sumByFrequency("annually");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <SubscriptionFormSheet mode="create" accounts={accountOptions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Monthly cost</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-negative">
              {formatCurrency(monthlyTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Quarterly cost</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-negative">
              {formatCurrency(quarterlyTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Yearly cost</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-negative">
              {formatCurrency(yearlyTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Active subscriptions
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {activeSubscriptions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {subscriptionRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Repeat className="size-6" />
            </div>
            <div>
              <p className="font-medium">No subscriptions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Recurring charges are detected automatically from your
                transactions, or add one yourself.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Billing email</TableHead>
                  <TableHead>Paid with</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionRows.map((sub) => {
                  const dueSoon = sub.isActive && isDueSoon(sub.nextDueDate);
                  return (
                    <TableRow
                      key={sub.id}
                      className={!sub.isActive ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {sub.name}
                        {!sub.isActive && (
                          <Badge variant="outline" className="ml-2">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.billingEmail ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {sub.account
                          ? `${sub.account.item.institutionName} · ${sub.account.name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {FREQUENCY_LABEL[sub.frequency ?? "unknown"]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={
                            dueSoon ? "font-medium text-chip-amber" : ""
                          }
                        >
                          {sub.nextDueDate ? formatDate(sub.nextDueDate) : "—"}
                        </span>
                        {dueSoon && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-chip-amber"
                          >
                            <AlertCircle className="size-3" />
                            Due soon
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-negative">
                        {sub.amount
                          ? formatCurrency(
                              sub.amount.toString(),
                              sub.currency ?? "USD",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <SubscriptionFormSheet
                            mode="edit"
                            accounts={accountOptions}
                            initial={{
                              id: sub.id,
                              name: sub.name,
                              billingEmail: sub.billingEmail,
                              amount: sub.amount ? Number(sub.amount) : null,
                              frequency: sub.frequency ?? "unknown",
                              nextDueDate: sub.nextDueDate
                                ? sub.nextDueDate.toISOString().slice(0, 10)
                                : null,
                              accountId: sub.accountId,
                              isActive: sub.isActive,
                              notes: sub.notes,
                              type: sub.type,
                            }}
                          />
                          <DeleteSubscriptionButton
                            id={sub.id}
                            name={sub.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {subscriptionRows.map((sub) => {
              const dueSoon = sub.isActive && isDueSoon(sub.nextDueDate);
              return (
                <Card
                  key={sub.id}
                  className={!sub.isActive ? "opacity-60" : ""}
                >
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{sub.name}</CardTitle>
                      <CardDescription>
                        {sub.billingEmail ?? "No billing email set"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <SubscriptionFormSheet
                        mode="edit"
                        accounts={accountOptions}
                        initial={{
                          id: sub.id,
                          name: sub.name,
                          billingEmail: sub.billingEmail,
                          amount: sub.amount ? Number(sub.amount) : null,
                          frequency: sub.frequency ?? "unknown",
                          nextDueDate: sub.nextDueDate
                            ? sub.nextDueDate.toISOString().slice(0, 10)
                            : null,
                          accountId: sub.accountId,
                          isActive: sub.isActive,
                          notes: sub.notes,
                          type: sub.type,
                        }}
                      />
                      <DeleteSubscriptionButton id={sub.id} name={sub.name} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium tabular-nums text-negative">
                        {sub.amount
                          ? formatCurrency(
                              sub.amount.toString(),
                              sub.currency ?? "USD",
                            )
                          : "—"}{" "}
                        · {FREQUENCY_LABEL[sub.frequency ?? "unknown"]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Paid with</span>
                      <span className="text-right">
                        {sub.account
                          ? `${sub.account.item.institutionName} · ${sub.account.name}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Next due</span>
                      <span
                        className={dueSoon ? "font-medium text-chip-amber" : ""}
                      >
                        {sub.nextDueDate ? formatDate(sub.nextDueDate) : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {investmentRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Recurring Investments
            </h2>
            <p className="text-sm text-muted-foreground">
              Money moving into investments, not a service subscription - kept
              separate from the costs above.
            </p>
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investment</TableHead>
                  <TableHead>Billing email</TableHead>
                  <TableHead>Paid with</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentRows.map((sub) => {
                  const dueSoon = sub.isActive && isDueSoon(sub.nextDueDate);
                  return (
                    <TableRow
                      key={sub.id}
                      className={!sub.isActive ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <TrendingUp className="size-3.5 text-muted-foreground" />
                          {sub.name}
                        </span>
                        {!sub.isActive && (
                          <Badge variant="outline" className="ml-2">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.billingEmail ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {sub.account
                          ? `${sub.account.item.institutionName} · ${sub.account.name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {FREQUENCY_LABEL[sub.frequency ?? "unknown"]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={
                            dueSoon ? "font-medium text-chip-amber" : ""
                          }
                        >
                          {sub.nextDueDate ? formatDate(sub.nextDueDate) : "—"}
                        </span>
                        {dueSoon && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-chip-amber"
                          >
                            <AlertCircle className="size-3" />
                            Due soon
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                        {sub.amount
                          ? formatCurrency(
                              sub.amount.toString(),
                              sub.currency ?? "USD",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <SubscriptionFormSheet
                            mode="edit"
                            accounts={accountOptions}
                            initial={{
                              id: sub.id,
                              name: sub.name,
                              billingEmail: sub.billingEmail,
                              amount: sub.amount ? Number(sub.amount) : null,
                              frequency: sub.frequency ?? "unknown",
                              nextDueDate: sub.nextDueDate
                                ? sub.nextDueDate.toISOString().slice(0, 10)
                                : null,
                              accountId: sub.accountId,
                              isActive: sub.isActive,
                              notes: sub.notes,
                              type: sub.type,
                            }}
                          />
                          <DeleteSubscriptionButton
                            id={sub.id}
                            name={sub.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {investmentRows.map((sub) => {
              const dueSoon = sub.isActive && isDueSoon(sub.nextDueDate);
              return (
                <Card
                  key={sub.id}
                  className={!sub.isActive ? "opacity-60" : ""}
                >
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-1.5 text-base">
                        <TrendingUp className="size-3.5 text-muted-foreground" />
                        {sub.name}
                      </CardTitle>
                      <CardDescription>
                        {sub.billingEmail ?? "No billing email set"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <SubscriptionFormSheet
                        mode="edit"
                        accounts={accountOptions}
                        initial={{
                          id: sub.id,
                          name: sub.name,
                          billingEmail: sub.billingEmail,
                          amount: sub.amount ? Number(sub.amount) : null,
                          frequency: sub.frequency ?? "unknown",
                          nextDueDate: sub.nextDueDate
                            ? sub.nextDueDate.toISOString().slice(0, 10)
                            : null,
                          accountId: sub.accountId,
                          isActive: sub.isActive,
                          notes: sub.notes,
                          type: sub.type,
                        }}
                      />
                      <DeleteSubscriptionButton id={sub.id} name={sub.name} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium tabular-nums">
                        {sub.amount
                          ? formatCurrency(
                              sub.amount.toString(),
                              sub.currency ?? "USD",
                            )
                          : "—"}{" "}
                        · {FREQUENCY_LABEL[sub.frequency ?? "unknown"]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Paid with</span>
                      <span className="text-right">
                        {sub.account
                          ? `${sub.account.item.institutionName} · ${sub.account.name}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Next due</span>
                      <span
                        className={dueSoon ? "font-medium text-chip-amber" : ""}
                      >
                        {sub.nextDueDate ? formatDate(sub.nextDueDate) : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
