"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextCategoryId = e.target.value;
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
    <select
      value={categoryId ?? ""}
      onChange={handleChange}
      disabled={pending}
      className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm disabled:opacity-50 dark:border-white/15"
    >
      <option value="" disabled>
        Uncategorized
      </option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
