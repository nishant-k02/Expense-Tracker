"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton({ itemId, label = "Refresh" }: { itemId?: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemId ? { itemId } : {}),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
    >
      {loading ? "Syncing..." : label}
    </button>
  );
}
