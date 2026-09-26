"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

function monthOptions(count = 12) {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
    options.push({ value, label });
  }
  return options;
}

export function TransactionFilters({
  accounts,
  categories,
  defaultQuery,
  defaultAccount,
  defaultCategory,
  defaultMonth,
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  defaultQuery?: string;
  defaultAccount?: string;
  defaultCategory?: string;
  defaultMonth?: string;
}) {
  const months = monthOptions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", query);
          }}
          onBlur={() => updateParam("q", query)}
          placeholder="Search merchant or description"
          className="pl-8"
        />
      </div>
      <Select
        items={[{ label: "All time", value: ALL }, ...months.map((m) => ({ label: m.label, value: m.value }))]}
        value={defaultMonth ?? ALL}
        onValueChange={(v) => updateParam("month", String(v))}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All time</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={[{ label: "All accounts", value: ALL }, ...accounts.map((a) => ({ label: a.name, value: a.id }))]}
        value={defaultAccount ?? ALL}
        onValueChange={(v) => updateParam("account", String(v))}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={[
          { label: "All categories", value: ALL },
          ...categories.map((c) => ({ label: c.name, value: c.id })),
        ]}
        value={defaultCategory ?? ALL}
        onValueChange={(v) => updateParam("category", String(v))}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
