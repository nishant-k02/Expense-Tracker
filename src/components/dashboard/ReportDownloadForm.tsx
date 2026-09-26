import { FileDown } from "lucide-react";

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

export function ReportDownloadForm() {
  const options = monthOptions();
  return (
    <form action="/api/reports/monthly" method="GET" className="flex items-center gap-2">
      <select
        name="month"
        defaultValue={options[0].value}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        aria-label="Report month"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        <FileDown className="size-4" />
        Download report
      </button>
    </form>
  );
}
