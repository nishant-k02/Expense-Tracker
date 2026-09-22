import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { CategorySelect } from "@/components/transactions/CategorySelect";
import type { Prisma } from "@prisma/client";

export default async function TransactionsPage(props: PageProps<"/transactions">) {
  const searchParams = await props.searchParams;
  const accountId = typeof searchParams.account === "string" ? searchParams.account : undefined;
  const categoryId = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
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
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label className="flex flex-col gap-1">
          Search
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Merchant or description"
            className="rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15"
          />
        </label>
        <label className="flex flex-col gap-1">
          Account
          <select
            name="account"
            defaultValue={accountId ?? ""}
            className="rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Category
          <select
            name="category"
            defaultValue={categoryId ?? ""}
            className="rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-black/10 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-foreground/60 dark:border-white/15">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {transactions.map((tx) => {
              const amount = Number(tx.amount);
              return (
                <tr key={tx.id}>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(tx.date)}</td>
                  <td className="px-3 py-2">
                    {tx.merchantName ?? tx.name}
                    {tx.pending && <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Pending</span>}
                    {(tx.isInternalTransfer || tx.category?.excludeFromTotals) && (
                      <span
                        className="ml-2 text-xs text-foreground/50"
                        title="Money moving between your own accounts — excluded from spend/income totals"
                      >
                        Transfer
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground/70">{tx.account.name}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <CategorySelect transactionId={tx.id} categoryId={tx.categoryId} categories={categories} />
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                      amount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {formatCurrency(Math.abs(amount), tx.isoCurrencyCode ?? "USD")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-foreground/60">No transactions found.</p>
        )}
      </div>
    </div>
  );
}
