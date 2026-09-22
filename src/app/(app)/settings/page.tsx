import { prisma } from "@/lib/prisma";
import { SyncButton } from "@/components/plaid/SyncButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { transactions: true } } },
    }),
    prisma.item.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Sync</h2>
          <SyncButton label="Resync everything" />
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          A daily background sync also runs automatically once deployed with Vercel Cron.
        </p>
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 font-medium">Connection status</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span>{item.institutionName}</span>
              <span className={item.status === "active" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                {item.status === "active" ? "Connected" : `${item.status}${item.error ? ` — ${item.error}` : ""}`}
              </span>
            </li>
          ))}
          {items.length === 0 && <p className="text-foreground/60">No banks linked yet.</p>}
        </ul>
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-medium">Categories</h2>
        <p className="mb-3 mt-1 text-sm text-foreground/60">
          Categories marked <span className="text-foreground/50">(excluded)</span> represent money moving between
          your own accounts — transfers and credit card payments — and are left out of dashboard totals to avoid
          double-counting.
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between">
              <span>
                {category.name}
                {category.excludeFromTotals && <span className="ml-1 text-xs text-foreground/50">(excluded)</span>}
              </span>
              <span className="text-foreground/50">{category._count.transactions}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
