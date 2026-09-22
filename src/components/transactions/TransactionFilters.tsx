"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export function TransactionFilters({
  accounts,
  categories,
  defaultQuery,
  defaultAccount,
  defaultCategory,
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  defaultQuery?: string;
  defaultAccount?: string;
  defaultCategory?: string;
}) {
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
