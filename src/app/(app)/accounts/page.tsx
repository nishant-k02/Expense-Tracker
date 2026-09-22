import { Landmark, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { LinkButton } from "@/components/plaid/LinkButton";
import { UnlinkButton } from "@/components/plaid/UnlinkButton";
import { SyncButton } from "@/components/plaid/SyncButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-chip-purple/15 text-chip-purple",
  "bg-chip-pink/15 text-chip-pink",
  "bg-chip-blue/15 text-chip-blue",
  "bg-chip-amber/15 text-chip-amber",
];

export default async function AccountsPage() {
  const items = await prisma.item.findMany({
    include: { accounts: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
        <LinkButton />
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Landmark className="size-6" />
            </div>
            <div>
              <p className="font-medium">No accounts linked yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click &quot;Link a bank account&quot; to connect Chase, PNC, Discover, or another institution via
                Plaid.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className={`text-sm font-medium ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}>
                    {item.institutionName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium leading-none">{item.institutionName}</p>
                  {item.status !== "active" ? (
                    <Badge variant="destructive" className="mt-1.5">
                      <AlertTriangle className="size-3" />
                      {item.error ?? item.status}
                    </Badge>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">Connected</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <SyncButton itemId={item.id} label="Refresh" />
                <UnlinkButton itemId={item.id} institutionName={item.institutionName} />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border text-sm">
                {item.accounts.map((account) => (
                  <li key={account.id} className="flex items-center justify-between py-2.5">
                    <span className="text-foreground">
                      {account.name}
                      {account.mask && <span className="text-muted-foreground"> ••{account.mask}</span>}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(account.currentBalance?.toString(), account.isoCurrencyCode ?? "USD")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
