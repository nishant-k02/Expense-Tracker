import { CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SyncButton } from "@/components/plaid/SyncButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync</CardTitle>
              <CardDescription>
                A daily background sync also runs automatically once deployed with Vercel Cron.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SyncButton label="Resync everything" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection status</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No banks linked yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border text-sm">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-2.5">
                      <span>{item.institutionName}</span>
                      {item.status === "active" ? (
                        <Badge variant="outline" className="text-positive">
                          <CheckCircle2 className="size-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="size-3" />
                          {item.status}
                          {item.error ? ` — ${item.error}` : ""}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Categories marked <span className="text-muted-foreground">(excluded)</span> represent money moving
                between your own accounts — transfers and credit card payments — and are left out of dashboard
                totals to avoid double-counting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between">
                    <span>
                      {category.name}
                      {category.excludeFromTotals && (
                        <span className="ml-1 text-xs text-muted-foreground">(excluded)</span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{category._count.transactions}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
