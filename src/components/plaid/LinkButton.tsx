"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LinkButton() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plaid/link-token", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setLinkToken(data.link_token ?? null))
      .catch(() => setError("Could not initialize Plaid Link"));
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!publicToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, institution: metadata.institution }),
        });
        if (!res.ok) throw new Error("Failed to link account");
        router.refresh();
      } catch {
        setError("Something went wrong linking your account. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" className="rounded-full" onClick={() => open()} disabled={!ready || loading}>
        <Plus className="size-4" />
        {loading ? "Linking..." : "Link a bank account"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
