import PDFDocument from "pdfkit";
import type { MonthlyReportData } from "@/lib/reports";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#84cc16", "#ec4899", "#14b8a6", "#f97316"];

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function drawPieSlice(
  doc: InstanceType<typeof PDFDocument>,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  color: string
) {
  const steps = Math.max(2, Math.ceil(((endAngle - startAngle) / Math.PI) * 60));
  doc.save();
  doc.moveTo(cx, cy);
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    doc.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  doc.closePath();
  doc.fill(color);
  doc.restore();
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function sectionHeading(doc: InstanceType<typeof PDFDocument>, text: string) {
  ensureSpace(doc, 40);
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.x = left;
  doc.moveDown(0.75);
  doc.fontSize(14).fillColor("#111827").font("Helvetica-Bold").text(text, left, doc.y, { width });
  doc
    .moveTo(left, doc.y + 4)
    .lineTo(left + width, doc.y + 4)
    .strokeColor("#e5e7eb")
    .stroke();
  doc.moveDown(0.5);
  doc.x = left;
  doc.font("Helvetica").fillColor("#111827");
}

export async function buildMonthlyReportPdf(data: MonthlyReportData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

  // --- Header ---
  doc.fontSize(20).font("Helvetica-Bold").fillColor("#111827").text("Expense Tracker");
  doc.fontSize(14).font("Helvetica").fillColor("#374151").text(`Monthly Report — ${data.monthLabel}`);
  doc.fontSize(9).fillColor("#9ca3af").text(`Generated ${new Date().toLocaleString("en-US")}`);
  if (data.isCurrentMonth) {
    doc
      .fontSize(9)
      .fillColor("#b45309")
      .text("This month is still in progress — figures reflect data as of the generation time above, not a final month-end total.");
  }
  doc.fillColor("#111827");

  // --- Summary ---
  sectionHeading(doc, "Summary");
  const summaryY = doc.y;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 3;
  const summaryItems: [string, string, string][] = [
    ["Spent", money(data.spend), "#ef4444"],
    ["Credited", money(data.income), "#22c55e"],
    ["Net", money(data.net), data.net >= 0 ? "#22c55e" : "#ef4444"],
  ];
  summaryItems.forEach(([label, value, color], i) => {
    const x = doc.page.margins.left + i * colWidth;
    doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(label, x, summaryY, { width: colWidth });
    doc.fontSize(18).font("Helvetica-Bold").fillColor(color).text(value, x, summaryY + 14, { width: colWidth });
  });
  doc.y = summaryY + 45;
  doc.fillColor("#111827").font("Helvetica");

  // --- Account balances ---
  sectionHeading(doc, data.isCurrentMonth ? "Account Balances (as of report generation)" : "Account Balances (month end)");
  const balCols = [220, 220, 100];
  const balStartX = doc.page.margins.left;
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280");
  doc.text("Institution", balStartX, doc.y, { width: balCols[0], continued: false });
  doc.text("Account", balStartX + balCols[0], doc.y - doc.currentLineHeight(), { width: balCols[1] });
  doc.text("Balance", balStartX + balCols[0] + balCols[1], doc.y - doc.currentLineHeight(), { width: balCols[2], align: "right" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fillColor("#111827");
  for (const acc of data.accountBalances) {
    ensureSpace(doc, 16);
    const rowY = doc.y;
    doc.fontSize(10).text(acc.institutionName, balStartX, rowY, { width: balCols[0] });
    doc.text(`${acc.name}${acc.mask ? ` ••${acc.mask}` : ""}`, balStartX + balCols[0], rowY, { width: balCols[1] });
    doc.text(acc.balance !== null ? money(acc.balance) : "—", balStartX + balCols[0] + balCols[1], rowY, {
      width: balCols[2],
      align: "right",
    });
    doc.moveDown(0.2);
  }

  // --- Category breakdown (table + pie chart) ---
  sectionHeading(doc, "Spend by Category");
  if (data.categoryBreakdown.length === 0) {
    doc.fontSize(10).fillColor("#6b7280").text("No spending recorded this month.");
  } else {
    const total = data.categoryBreakdown.reduce((s, c) => s + c.total, 0);
    const chartTop = doc.y;
    const cx = doc.page.margins.left + 70;
    const cy = chartTop + 70;
    const r = 65;
    let angle = -Math.PI / 2;
    data.categoryBreakdown.forEach((cat, i) => {
      const slice = (cat.total / total) * 2 * Math.PI;
      drawPieSlice(doc, cx, cy, r, angle, angle + slice, COLORS[i % COLORS.length]);
      angle += slice;
    });

    const legendX = doc.page.margins.left + 170;
    let legendY = chartTop;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#6b7280");
    doc.text("Category", legendX + 14, legendY, { width: 180 });
    doc.text("Amount", legendX + 200, legendY, { width: 80, align: "right" });
    doc.text("%", legendX + 280, legendY, { width: 50, align: "right" });
    legendY += 16;
    doc.font("Helvetica").fillColor("#111827");
    data.categoryBreakdown.forEach((cat, i) => {
      doc.rect(legendX, legendY + 2, 8, 8).fill(COLORS[i % COLORS.length]);
      doc.fillColor("#111827").fontSize(9);
      doc.text(cat.name, legendX + 14, legendY, { width: 180 });
      doc.text(money(cat.total), legendX + 200, legendY, { width: 80, align: "right" });
      doc.text(`${((cat.total / total) * 100).toFixed(1)}%`, legendX + 280, legendY, { width: 50, align: "right" });
      legendY += 15;
    });
    doc.y = Math.max(chartTop + 150, legendY + 10);
  }

  // --- Spend by bank (horizontal bar chart) ---
  sectionHeading(doc, "Spend by Bank");
  if (data.spendByInstitution.length === 0) {
    doc.fontSize(10).fillColor("#6b7280").text("No spending recorded this month.");
  } else {
    const maxSpend = Math.max(...data.spendByInstitution.map((s) => s.spend));
    const barMaxWidth = 300;
    const labelWidth = 120;
    data.spendByInstitution.forEach((inst, i) => {
      ensureSpace(doc, 22);
      const rowY = doc.y;
      doc.fontSize(9).fillColor("#111827").text(inst.institutionName, doc.page.margins.left, rowY + 3, { width: labelWidth });
      const barWidth = maxSpend > 0 ? (inst.spend / maxSpend) * barMaxWidth : 0;
      doc.rect(doc.page.margins.left + labelWidth, rowY, barWidth, 14).fill(COLORS[i % COLORS.length]);
      doc.fillColor("#111827").fontSize(9).text(money(inst.spend), doc.page.margins.left + labelWidth + barMaxWidth + 8, rowY + 3);
      doc.y = rowY + 20;
    });
  }

  // --- Transactions ---
  sectionHeading(doc, `Transactions (${data.transactions.length})`);
  const txCols = { date: 60, desc: 160, account: 100, category: 100, amount: 80 };
  const txStartX = doc.page.margins.left;
  function txHeader() {
    ensureSpace(doc, 20);
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280");
    let x = txStartX;
    doc.text("Date", x, doc.y, { width: txCols.date });
    x += txCols.date;
    doc.text("Description", x, doc.y - doc.currentLineHeight(), { width: txCols.desc });
    x += txCols.desc;
    doc.text("Account", x, doc.y - doc.currentLineHeight(), { width: txCols.account });
    x += txCols.account;
    doc.text("Category", x, doc.y - doc.currentLineHeight(), { width: txCols.category });
    x += txCols.category;
    doc.text("Amount", x, doc.y - doc.currentLineHeight(), { width: txCols.amount, align: "right" });
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor("#111827");
  }
  txHeader();
  for (const tx of data.transactions) {
    ensureSpace(doc, 14);
    if (doc.y === doc.page.margins.top) txHeader();
    const rowY = doc.y;
    let x = txStartX;
    doc.fontSize(8).fillColor(tx.isTransfer ? "#9ca3af" : "#111827");
    const cell = { height: 11, ellipsis: true, lineBreak: false } as const;
    doc.text(tx.date.toISOString().slice(0, 10), x, rowY, { width: txCols.date, ...cell });
    x += txCols.date;
    doc.text(tx.description, x, rowY, { width: txCols.desc, ...cell });
    x += txCols.desc;
    doc.text(tx.accountName, x, rowY, { width: txCols.account, ...cell });
    x += txCols.account;
    doc.text(tx.isTransfer ? "Transfer" : tx.categoryName, x, rowY, { width: txCols.category, ...cell });
    x += txCols.category;
    doc.text(`${tx.amount > 0 ? "-" : "+"}${money(Math.abs(tx.amount))}`, x, rowY, { width: txCols.amount, align: "right", ...cell });
    doc.y = rowY + 13;
  }

  return pdfToBuffer(doc);
}
