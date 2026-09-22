"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UnlinkButton({ itemId, institutionName }: { itemId: string; institutionName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnlink() {
    setLoading(true);
    try {
      await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}>
        <Unlink className="size-3.5" />
        Unlink
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink {institutionName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the connection and deletes its accounts and transactions from Expense Tracker. Your bank
            account itself is not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleUnlink} disabled={loading}>
            {loading ? "Unlinking..." : "Unlink"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
