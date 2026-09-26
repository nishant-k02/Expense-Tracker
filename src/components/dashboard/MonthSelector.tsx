"use client";

import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function MonthSelector({ selectedMonth }: { selectedMonth: string }) {
  const router = useRouter();
  const options = monthOptions();
  // Guard against a selectedMonth outside the dropdown's own range (e.g. a
  // stale bookmarked URL) so the <select> always has a matching option.
  if (!options.some((o) => o.value === selectedMonth)) {
    options.unshift({
      value: selectedMonth,
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${selectedMonth}-01T00:00:00Z`)
      ),
    });
  }

  return (
    <>
      <select
        value={selectedMonth}
        onChange={(e) => router.push(`/dashboard?month=${e.target.value}`)}
        className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        aria-label="Dashboard month"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        className="justify-center"
        render={<a href={`/api/reports/monthly?month=${selectedMonth}`} />}
      >
        <FileDown className="size-4" />
        Download report
      </Button>
    </>
  );
}
