"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Yearly" },
  { value: "unknown", label: "Unknown" },
];

const KNOWN_EMAILS = ["nishantsk2002@gmail.com", "nishantkhandhar.us@gmail.com"];

const TYPES = [
  { value: "subscription", label: "Subscription" },
  { value: "investment", label: "Recurring investment" },
];

export type SubscriptionFormValues = {
  id?: string;
  name: string;
  billingEmail: string | null;
  amount: number | null;
  frequency: string;
  nextDueDate: string | null; // yyyy-mm-dd
  accountId: string | null;
  isActive: boolean;
  notes: string | null;
  type?: string;
};

export function SubscriptionFormSheet({
  mode,
  initial,
  accounts,
}: {
  mode: "create" | "edit";
  initial?: SubscriptionFormValues;
  accounts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [billingEmail, setBillingEmail] = useState(initial?.billingEmail ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "monthly");
  const [nextDueDate, setNextDueDate] = useState(initial?.nextDueDate ?? "");
  const [accountId, setAccountId] = useState(initial?.accountId ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [type, setType] = useState(initial?.type ?? "subscription");

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name,
        billingEmail: billingEmail || null,
        amount: amount ? Number(amount) : null,
        frequency,
        nextDueDate: nextDueDate || null,
        accountId: accountId || null,
        isActive,
        notes: notes || null,
        type,
      };
      const res = await fetch(mode === "create" ? "/api/subscriptions" : `/api/subscriptions/${initial?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save subscription");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          mode === "create" ? (
            <Button type="button" className="rounded-full" />
          ) : (
            <Button type="button" variant="ghost" size="icon-sm" />
          )
        }
      >
        {mode === "create" ? (
          <>
            <Plus className="size-4" />
            Add subscription
          </>
        ) : (
          <Pencil className="size-3.5" />
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add subscription" : "Edit subscription"}</SheetTitle>
          <SheetDescription>Track a recurring charge, which account pays it, and when it&apos;s next due.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-name">Name</Label>
            <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple Music" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select items={TYPES} value={type} onValueChange={(v) => setType(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-email">Billing email</Label>
            <Input
              id="sub-email"
              list="known-emails"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="Which account is this under?"
            />
            <datalist id="known-emails">
              {KNOWN_EMAILS.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-amount">Amount ($)</Label>
              <Input
                id="sub-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select items={FREQUENCIES} value={frequency} onValueChange={(v) => setFrequency(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-due">Next due date</Label>
            <Input id="sub-due" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Paid with</Label>
            <Select
              items={[{ label: "Not linked", value: "" }, ...accounts.map((a) => ({ label: a.label, value: a.id }))]}
              value={accountId}
              onValueChange={(v) => setAccountId(String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not linked</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sub-active">Active</Label>
            <Switch id="sub-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-notes">Notes</Label>
            <Textarea
              id="sub-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
