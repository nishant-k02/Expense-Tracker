import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyReportData } from "@/lib/reports";
import { buildMonthlyReportPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  let reference = new Date();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split("-").map(Number);
    reference = new Date(Date.UTC(year, month - 1, 1));
  }

  const data = await getMonthlyReportData(reference);
  const buffer = await buildMonthlyReportPdf(data);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="expense-report-${data.start.toISOString().slice(0, 7)}.pdf"`,
    },
  });
}
