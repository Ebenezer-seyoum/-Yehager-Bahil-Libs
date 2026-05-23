import type { FilterValues } from "./report-filters";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function buildOrderExportUrl(filters: FilterValues) {
  const params = new URLSearchParams();
  params.set("format", "csv");

  if (filters.status && filters.status !== "All Status") {
    params.set("status", filters.status);
  }

  if (filters.paymentMethod && filters.paymentMethod !== "All Methods") {
    params.set("paymentStatus", filters.paymentMethod);
  }

  if (filters.country && filters.country !== "All Countries") {
    params.set("country", filters.country);
  }

  if (filters.customerSearch?.trim()) {
    params.set("customer", filters.customerSearch.trim());
  }

  return `/api/backend/admin/reports/orders/export?${params.toString()}`;
}

export function canUseOrderApiExport(dataSource: "orders" | "products" | "customers" | "support") {
  return dataSource === "orders";
}

export function downloadTableCsv(
  filename: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const escape = (cell: string | number) =>
    `"${String(cell ?? "").replaceAll('"', '""')}"`;

  const lines = [
    columns.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTableXlsx(
  filename: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(filename, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export function downloadTablePdf(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const pdf = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  pdf.setFontSize(16);
  pdf.text(title, 14, 16);
  pdf.setFontSize(10);
  pdf.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

  autoTable(pdf, {
    startY: 28,
    head: [columns],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  pdf.save(filename);
}

export function slugifyReportName(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}
