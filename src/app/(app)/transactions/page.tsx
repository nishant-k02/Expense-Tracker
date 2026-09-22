import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptText } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const searchParams = await props.searchParams;
  const accountId = typeof searchParams.account === "string" ? searchParams.account : undefined;
  const categoryId = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const where: Prisma.TransactionWhereInput = {
    ...(accountId ? { accountId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { merchantName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { account: true, category: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>

      <TransactionFilters
        accounts={accounts}
        categories={categories}
        defaultQuery={q}
        defaultAccount={accountId}
        defaultCategory={categoryId}
      />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ReceiptText className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} categories={categories} />
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {transactions.map((tx) => {
              const amount = Number(tx.amount);
              const isTransfer = tx.isInternalTransfer || tx.category?.excludeFromTotals;
              return (
                <Card key={tx.id}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{tx.merchantName ?? tx.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)} · {tx.account.name}
                        </p>
                      </div>
                      <span className={`font-medium tabular-nums ${amount > 0 ? "text-negative" : "text-positive"}`}>
                        {formatCurrency(Math.abs(amount), tx.isoCurrencyCode ?? "USD")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tx.pending && (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                          Pending
                        </Badge>
                      )}
                      {isTransfer && <Badge variant="secondary">Transfer</Badge>}
                    </div>
                    <CategorySelect transactionId={tx.id} categoryId={tx.categoryId} categories={categories} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TransactionRow({
  tx,
  categories,
}: {
  tx: Prisma.TransactionGetPayload<{ include: { account: true; category: true } }>;
  categories: { id: string; name: string }[];
}) {
  const amount = Number(tx.amount);
  const isTransfer = tx.isInternalTransfer || tx.category?.excludeFromTotals;

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(tx.date)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{tx.merchantName ?? tx.name}</span>
          {tx.pending && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
              Pending
            </Badge>
          )}
          {isTransfer && (
            <Badge
              variant="secondary"
              title="Money moving between your own accounts — excluded from spend/income totals"
            >
              Transfer
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{tx.account.name}</TableCell>
      <TableCell>
        <CategorySelect transactionId={tx.id} categoryId={tx.categoryId} categories={categories} />
      </TableCell>
      <TableCell className={`whitespace-nowrap text-right font-medium tabular-nums ${amount > 0 ? "text-negative" : "text-positive"}`}>
        {formatCurrency(Math.abs(amount), tx.isoCurrencyCode ?? "USD")}
      </TableCell>
    </TableRow>
  );
}
