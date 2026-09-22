import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { LinkButton } from "@/components/plaid/LinkButton";
import { UnlinkButton } from "@/components/plaid/UnlinkButton";
import { SyncButton } from "@/components/plaid/SyncButton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const items = await prisma.item.findMany({
    include: { accounts: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <LinkButton />
      </div>

      {items.length === 0 && (
        <p className="text-sm text-foreground/60">
          No accounts linked yet. Click &quot;Link a bank account&quot; to connect Chase, PNC, Discover, or
          another institution via Plaid.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">{item.institutionName}</h2>
                {item.status !== "active" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Needs attention: {item.error ?? item.status}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <SyncButton itemId={item.id} />
                <UnlinkButton itemId={item.id} />
              </div>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-black/5 dark:divide-white/10">
              {item.accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {account.name}
                    {account.mask && <span className="text-foreground/50"> ••{account.mask}</span>}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(account.currentBalance?.toString(), account.isoCurrencyCode ?? "USD")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
