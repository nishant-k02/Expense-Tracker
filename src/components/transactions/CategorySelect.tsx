"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CategorySelect({
  transactionId,
  categoryId,
  categories,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(nextCategoryId: string) {
    setPending(true);
    try {
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: nextCategoryId }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      items={categories.map((c) => ({ label: c.name, value: c.id }))}
      value={categoryId ?? undefined}
      onValueChange={(v) => handleChange(String(v))}
      disabled={pending}
    >
      <SelectTrigger size="sm" className="w-full sm:w-40">
        <SelectValue placeholder="Uncategorized" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
