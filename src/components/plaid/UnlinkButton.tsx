"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnlinkButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Unlink this bank connection? Its accounts and transactions will be removed.")) {
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/items/${itemId}`, { method: "DELETE" });
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
      className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
    >
      {loading ? "Unlinking..." : "Unlink"}
    </button>
  );
}
