"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Boxes, ClipboardList, DollarSign, Search, ShoppingCart, TrendingUp, UserRound, UsersRound } from "lucide-react";

const REPORT_ORDER = ["orders", "sales", "delivery", "product", "customer", "financial", "employee", "support", "marketing", "activity"];

const REPORT_META = {
  orders: {
    label: "Order Reports",
    source: "orders",
    tone: "slate",
    description: "Operational order tracking with payment and delivery context.",
  },
  sales: {
    label: "Sales Reports",
    source: "orders",
    tone: "emerald",
    description: "Revenue and paid-order performance view.",
  },
  delivery: {
    label: "Delivery Reports",
    source: "orders",
    tone: "blue",
    description: "Shipping and fulfillment status overview.",
  },
  product: {
    label: "Product Reports",
    source: "products",
    tone: "violet",
    description: "Catalog coverage, pricing, and product activation overview.",
  },
  customer: {
    label: "Customer Reports",
    source: "users",
    tone: "amber",
    description: "Customer account activity and status view.",
  },
  financial: {
    label: "Financial Reports",
    source: "orders",
    tone: "rose",
    description: "Paid order and revenue performance summary.",
  },
  employee: {
    label: "Employee Reports",
    source: "users",
    tone: "cyan",
    description: "Employee account and access overview.",
  },
  support: {
    label: "Support Reports",
    source: "alerts",
    tone: "red",
    description: "System and support alert tracking.",
  },
  marketing: {
    label: "Marketing Reports",
    source: "audit",
    tone: "fuchsia",
    description: "Campaign and admin activity lens using audit data.",
  },
  activity: {
    label: "Activity Logs",
    source: "audit",
    tone: "slate",
    description: "Full admin activity and audit timeline.",
  },
};

const REPORT_FILTERS = {
  orders: { search: "", status: "all", paymentStatus: "all", country: "", period: "all" },
  sales: { search: "", status: "all", paymentStatus: "paid", country: "", period: "all" },
  delivery: { search: "", status: "all", fulfillment: "all", country: "", period: "all" },
  product: { search: "", category: "all", active: "all", featured: "all", gender: "all", period: "all" },
  customer: { search: "", role: "customer", status: "all", period: "all" },
  financial: { search: "", status: "all", paymentStatus: "paid", country: "", period: "all" },
  employee: { search: "", role: "employee", status: "all", period: "all" },
  support: { search: "", severity: "all", resolved: "all", period: "all" },
  marketing: { search: "", category: "all", severity: "all", period: "all" },
  activity: { search: "", category: "all", severity: "all", period: "all" },
};

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function textValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function safeLower(value) {
  return textValue(value).toLowerCase();
}

function getOrderCountry(row) {
  const country = row?.shippingAddress?.country;
  return typeof country === "string" ? country : "";
}

function getAlertState(row) {
  return row.isResolved ? "Resolved" : "Open";
}

function getToneClasses(tone) {
  const palette = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-900",
    red: "border-red-200 bg-red-50 text-red-900",
    fuchsia: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  };
  return palette[tone] ?? palette.slate;
}

function getCardWrapperClasses(accent) {
  const map = {
    slate: "border-l-4 border-slate-300 bg-gradient-to-r from-slate-50/40 to-transparent",
    emerald: "border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-50/40 to-transparent",
    blue: "border-l-4 border-blue-400 bg-gradient-to-r from-blue-50/40 to-transparent",
    violet: "border-l-4 border-violet-400 bg-gradient-to-r from-violet-50/40 to-transparent",
    amber: "border-l-4 border-amber-400 bg-gradient-to-r from-amber-50/40 to-transparent",
    rose: "border-l-4 border-rose-400 bg-gradient-to-r from-rose-50/40 to-transparent",
    cyan: "border-l-4 border-cyan-400 bg-gradient-to-r from-cyan-50/40 to-transparent",
    red: "border-l-4 border-red-400 bg-gradient-to-r from-red-50/40 to-transparent",
    fuchsia: "border-l-4 border-fuchsia-400 bg-gradient-to-r from-fuchsia-50/40 to-transparent",
  };
  return map[accent] ?? map.slate;
}

function getCardGradient(accent) {
  const map = {
    slate: "from-slate-800 to-slate-700",
    emerald: "from-emerald-800 to-emerald-600",
    blue: "from-blue-800 to-blue-600",
    violet: "from-violet-800 to-violet-600",
    amber: "from-amber-700 to-orange-600",
    rose: "from-rose-800 to-rose-600",
    cyan: "from-sky-800 to-cyan-700",
    red: "from-rose-800 to-rose-600",
    fuchsia: "from-fuchsia-800 to-fuchsia-600",
  };
  return map[accent] ?? map.slate;
}

const REPORT_ICONS = {
  orders: ShoppingCart,
  sales: DollarSign,
  delivery: Boxes,
  product: Boxes,
  customer: UserRound,
  financial: TrendingUp,
  employee: UsersRound,
  support: BellRing,
  marketing: TrendingUp,
  activity: ClipboardList,
};

function getSourceRows(reports, reportKey) {
  const meta = REPORT_META[reportKey];
  return reports[meta.source]?.rows ?? [];
}

function getBaseRows(reports, reportKey) {
  const rows = getSourceRows(reports, reportKey);
  if (reportKey === "sales" || reportKey === "financial") {
    return rows.filter((row) => row.paymentStatus === "paid");
  }
  if (reportKey === "delivery") {
    return rows.filter((row) => ["shipped", "delivered", "picked_up", "ready_for_pickup"].includes(row.status));
  }
  if (reportKey === "customer") {
    return rows.filter((row) => row.role === "customer");
  }
  if (reportKey === "employee") {
    return rows.filter((row) => row.role === "employee");
  }
  return rows;
}

function rowCreatedAt(row) {
  return row.createdAt ?? row.updatedAt ?? row.created_at ?? null;
}

function withinPeriod(row, period) {
  if (!period || period === "all") return true;
  const created = rowCreatedAt(row);
  if (!created) return false;
  const createdDate = new Date(created);
  if (Number.isNaN(createdDate.getTime())) return false;
  const days = Number(period);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return createdDate >= cutoff;
}

function filterRows(reportKey, rows, filters) {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const searchFields = [
      row.orderNumber,
      row.customerName,
      row.userEmail,
      row.name,
      row.email,
      row.title,
      row.message,
      row.action,
      row.category,
      row.status,
      row.paymentStatus,
      row.severity,
      row.region,
      row.subcategory,
      row.role,
      row.type,
    ];

    const matchesSearch = !needle || searchFields.some((value) => safeLower(value).includes(needle));
    const matchesPeriod = withinPeriod(row, filters.period);

    if (reportKey === "orders" || reportKey === "sales" || reportKey === "financial") {
      const matchesStatus = filters.status === "all" || (row.status ?? "pending") === filters.status;
      const matchesPayment = filters.paymentStatus === "all" || (row.paymentStatus ?? "pending") === filters.paymentStatus;
      const matchesCountry = !filters.country || getOrderCountry(row).toLowerCase().includes(filters.country.toLowerCase());
      return matchesSearch && matchesPeriod && matchesStatus && matchesPayment && matchesCountry;
    }

    if (reportKey === "delivery") {
      const matchesStatus = filters.status === "all" || (row.status ?? "pending") === filters.status;
      const matchesFulfillment = filters.fulfillment === "all" || (row.fulfillmentType ?? "").toLowerCase() === filters.fulfillment;
      const matchesCountry = !filters.country || getOrderCountry(row).toLowerCase().includes(filters.country.toLowerCase());
      return matchesSearch && matchesPeriod && matchesStatus && matchesFulfillment && matchesCountry;
    }

    if (reportKey === "product") {
      const matchesCategory = filters.category === "all" || safeLower(row.category).includes(filters.category.toLowerCase());
      const matchesActive = filters.active === "all" || String(Boolean(row.isActive)) === filters.active;
      const matchesFeatured = filters.featured === "all" || String(Boolean(row.isFeatured)) === filters.featured;
      const matchesGender = filters.gender === "all" || safeLower(row.gender) === filters.gender;
      return matchesSearch && matchesPeriod && matchesCategory && matchesActive && matchesFeatured && matchesGender;
    }

    if (reportKey === "customer" || reportKey === "employee") {
      const matchesRole = filters.role === "all" || safeLower(row.role) === filters.role;
      const matchesStatus = filters.status === "all" || safeLower(row.status) === filters.status;
      return matchesSearch && matchesPeriod && matchesRole && matchesStatus;
    }

    if (reportKey === "support") {
      const matchesSeverity = filters.severity === "all" || safeLower(row.severity) === filters.severity;
      const matchesResolved = filters.resolved === "all" || String(Boolean(row.isResolved)) === filters.resolved;
      return matchesSearch && matchesPeriod && matchesSeverity && matchesResolved;
    }

    if (reportKey === "marketing" || reportKey === "activity") {
      const matchesCategory = filters.category === "all" || safeLower(row.category) === filters.category;
      const matchesSeverity = filters.severity === "all" || safeLower(row.severity) === filters.severity;
      return matchesSearch && matchesPeriod && matchesCategory && matchesSeverity;
    }

    return matchesSearch && matchesPeriod;
  });
}

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

function sum(rows, accessor) {
  return rows.reduce((total, row) => total + Number(accessor(row) ?? 0), 0);
}

function formatDurationRange(period) {
  if (!period || period === "all") return "All time";
  return `Last ${period} days`;
}

function getCards(reportKey, rows) {
  if (reportKey === "product") {
    const averagePrice = rows.length ? sum(rows, (row) => row.priceUsd) / rows.length : 0;
    return [
      { label: "Total Products", value: rows.length, accent: "slate" },
      { label: "Active", value: countBy(rows, (row) => row.isActive), accent: "emerald" },
      { label: "Featured", value: countBy(rows, (row) => row.isFeatured), accent: "violet" },
      { label: "Avg Price", value: formatCurrency(averagePrice), accent: "blue" },
    ];
  }

  if (reportKey === "customer" || reportKey === "employee") {
    return [
      { label: "Total Accounts", value: rows.length, accent: "slate" },
      { label: "Active", value: countBy(rows, (row) => row.status === "active"), accent: "emerald" },
      { label: "Inactive", value: countBy(rows, (row) => row.status === "inactive"), accent: "amber" },
      { label: "Suspended", value: countBy(rows, (row) => row.status === "suspended"), accent: "rose" },
    ];
  }

  if (reportKey === "support") {
    return [
      { label: "Total Alerts", value: rows.length, accent: "slate" },
      { label: "Open", value: countBy(rows, (row) => !row.isResolved), accent: "red" },
      { label: "Resolved", value: countBy(rows, (row) => row.isResolved), accent: "emerald" },
      { label: "Critical", value: countBy(rows, (row) => row.severity === "critical"), accent: "amber" },
    ];
  }

  if (reportKey === "marketing" || reportKey === "activity") {
    return [
      { label: "Total Events", value: rows.length, accent: "slate" },
      { label: "Info", value: countBy(rows, (row) => row.severity === "info"), accent: "emerald" },
      { label: "Warnings", value: countBy(rows, (row) => row.severity === "warning"), accent: "amber" },
      { label: "Critical", value: countBy(rows, (row) => row.severity === "critical"), accent: "rose" },
    ];
  }

  const paid = countBy(rows, (row) => row.paymentStatus === "paid");
  const pending = countBy(rows, (row) => row.status === "pending" || row.paymentStatus === "pending");
  const revenue = sum(rows.filter((row) => row.paymentStatus === "paid"), (row) => row.totalUsd);
  const shipped = countBy(rows, (row) => ["shipped", "delivered", "picked_up"].includes(row.status));

  if (reportKey === "delivery") {
    return [
      { label: "Delivery Rows", value: rows.length, accent: "slate" },
      { label: "Shipped", value: shipped, accent: "blue" },
      { label: "Delivered", value: countBy(rows, (row) => row.status === "delivered"), accent: "emerald" },
      { label: "Pickup", value: countBy(rows, (row) => row.fulfillmentType === "pickup"), accent: "amber" },
    ];
  }

  if (reportKey === "sales" || reportKey === "financial") {
    return [
      { label: "Paid Orders", value: paid, accent: "emerald" },
      { label: "Revenue", value: formatCurrency(revenue), accent: "rose" },
      { label: "Pending", value: pending, accent: "amber" },
      { label: "Total Rows", value: rows.length, accent: "slate" },
    ];
  }

  return [
    { label: "Total Orders", value: rows.length, accent: "slate" },
    { label: "Paid Orders", value: paid, accent: "emerald" },
    { label: "Pending", value: pending, accent: "amber" },
    { label: "Revenue", value: formatCurrency(revenue), accent: "rose" },
  ];
}

function getColumns(reportKey) {
  if (reportKey === "product") {
    return [
      { label: "Product", render: (row) => row.name ?? row.uniqueId ?? row.id },
      { label: "Category", render: (row) => row.category ?? "-" },
      { label: "Region", render: (row) => row.region ?? "-" },
      { label: "Price", render: (row) => formatCurrency(row.priceUsd) },
      { label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
      { label: "Featured", render: (row) => (row.isFeatured ? "Yes" : "No") },
      { label: "Created", render: (row) => formatDate(row.createdAt) },
    ];
  }

  if (reportKey === "customer" || reportKey === "employee") {
    return [
      { label: "Name", render: (row) => row.name ?? row.email ?? row.id },
      { label: "Email", render: (row) => row.email ?? "-" },
      { label: "Role", render: (row) => row.role ?? "-" },
      { label: "Status", render: (row) => row.status ?? "-" },
      { label: "Last Login", render: (row) => formatDateTime(row.lastLoginAt) },
      { label: "Created", render: (row) => formatDate(row.createdAt) },
    ];
  }

  if (reportKey === "support") {
    return [
      { label: "Title", render: (row) => row.title ?? row.message ?? row.id },
      { label: "Severity", render: (row) => row.severity ?? "-" },
      { label: "Type", render: (row) => row.type ?? "-" },
      { label: "State", render: (row) => getAlertState(row) },
      { label: "Resolved By", render: (row) => row.resolvedBy ?? "-" },
      { label: "Created", render: (row) => formatDate(row.createdAt) },
    ];
  }

  if (reportKey === "marketing" || reportKey === "activity") {
    return [
      { label: "Action", render: (row) => row.action ?? row.id },
      { label: "Category", render: (row) => row.category ?? "-" },
      { label: "Severity", render: (row) => row.severity ?? "-" },
      { label: "Entity", render: (row) => [row.entityType, row.entityId].filter(Boolean).join(" / ") || "-" },
      { label: "By", render: (row) => row.performedBy ?? "-" },
      { label: "Created", render: (row) => formatDateTime(row.createdAt) },
    ];
  }

  return [
    { label: "Order #", render: (row) => row.orderNumber ?? row.id },
    { label: "Customer", render: (row) => row.customerName ?? row.userEmail ?? "-" },
    { label: "Status", render: (row) => row.status ?? "-" },
    { label: "Payment", render: (row) => row.paymentStatus ?? "-" },
    { label: "Country", render: (row) => getOrderCountry(row) || "-" },
    { label: "Total", render: (row) => formatCurrency(row.totalUsd) },
    { label: "Created", render: (row) => formatDate(row.createdAt) },
  ];
}

function escapeHtml(value) {
  return textValue(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildHtmlTable(title, cards, columns, rows) {
  const cardMarkup = cards
    .map(
      (card) => `
        <div style="border:1px solid #e5e7eb;border-radius:16px;padding:16px;background:#fff;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${escapeHtml(card.label)}</div>
          <div style="margin-top:8px;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(card.value)}</div>
        </div>`,
    )
    .join("");

  const header = columns.map((column) => `<th style="text-align:left;padding:12px;border-bottom:1px solid #d1d5db;">${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map(
      (row) => `
        <tr>
          ${columns
            .map(
              (column) => `<td style="padding:12px;border-bottom:1px solid #eef2f7;vertical-align:top;">${escapeHtml(column.render(row))}</td>`,
            )
            .join("")}
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; background: #f8fafc; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 18px; color: #6b7280; }
      .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
      thead { background: #f3f4f6; }
      tbody tr:nth-child(even) { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated from the selected report view.</p>
    <div class="cards">${cardMarkup}</div>
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`;
}

function buildWordDoc(title, cards, columns, rows) {
  return buildHtmlTable(title, cards, columns, rows);
}

function buildExcelDoc(title, cards, columns, rows) {
  return buildHtmlTable(title, cards, columns, rows);
}

function buildPdfFromLines(lines) {
  const pages = [];
  const chunkSize = 36;
  for (let index = 0; index < lines.length; index += chunkSize) {
    pages.push(lines.slice(index, index + chunkSize));
  }

  const objects = [];
  const pageObjects = [];
  const contentObjects = [];
  let objectId = 1;
  const catalogId = objectId++;
  const pagesId = objectId++;
  const fontId = objectId++;

  for (const pageLines of pages) {
    const pageId = objectId++;
    const contentId = objectId++;
    pageObjects.push(pageId);
    contentObjects.push({ pageId, contentId, lines: pageLines });
  }

  const pageRefs = pageObjects.map((id) => `${id} 0 R`).join(" ");
  objects.push(`${catalogId} 0 obj << /Type /Catalog /Pages ${pagesId} 0 R >> endobj`);
  objects.push(`${pagesId} 0 obj << /Type /Pages /Kids [${pageRefs}] /Count ${pageObjects.length} >> endobj`);
  objects.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  for (const page of contentObjects) {
    const escapePdf = (value) => textValue(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
    let stream = "BT\n/F1 10 Tf\n50 750 Td\n";
    page.lines.forEach((line, index) => {
      const escaped = escapePdf(line);
      stream += index === 0 ? `(${escaped}) Tj\n` : `T* (${escaped}) Tj\n`;
    });
    stream += "ET";
    objects.push(
      `${page.pageId} 0 obj << /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${page.contentId} 0 R >> endobj`,
    );
    objects.push(`${page.contentId} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportRows(rows, columns, reportLabel, format, cards) {
  const filenameBase = reportLabel.replaceAll(" ", "-").toLowerCase();
  const values = rows.map((row) => columns.map((column) => column.render(row)));

  if (format === "pdf") {
    const summaryLines = cards.map((card) => `${card.label}: ${textValue(card.value)}`);
    const lines = [reportLabel, "", ...summaryLines, "", columns.map((column) => column.label).join(" | "), ...values.map((row) => row.join(" | "))];
    downloadTextFile(buildPdfFromLines(lines), `${filenameBase}.pdf`, "application/pdf");
    return;
  }

  if (format === "doc") {
    downloadTextFile(buildWordDoc(reportLabel, cards, columns, rows), `${filenameBase}.doc`, "application/msword");
    return;
  }

  if (format === "xls") {
    downloadTextFile(buildExcelDoc(reportLabel, cards, columns, rows), `${filenameBase}.xls`, "application/vnd.ms-excel");
  }
}

function defaultFiltersFor(reportKey) {
  return { ...REPORT_FILTERS[reportKey] };
}

function filterSummaryLabel(filters) {
  return filters.period && filters.period !== "all" ? `Last ${filters.period} days` : "All time";
}

export default function AdminReportsDashboard({ reports, initialReportKey = "orders" }) {
  const [reportKey, setReportKey] = useState("");
  const [filters, setFilters] = useState(() => defaultFiltersFor(initialReportKey));
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setFilters(defaultFiltersFor(reportKey || initialReportKey));
    setSelectedIds([]);
  }, [reportKey, initialReportKey]);

  const activeReportKey = reportKey || initialReportKey;
  const meta = REPORT_META[activeReportKey];
  const rows = useMemo(() => filterRows(activeReportKey, getBaseRows(reports, activeReportKey), filters), [activeReportKey, filters, reports]);
  const cards = useMemo(() => getCards(activeReportKey, rows), [activeReportKey, rows]);
  const columns = useMemo(() => getColumns(activeReportKey), [activeReportKey]);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

  function toggleSelection(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-blue-500/20 bg-card shadow-sm shadow-blue-950/10">
        <div className="rounded-[30px] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-700 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="max-w-2xl space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">Reports</p>
              <h1 className="mt-1 text-[22px] font-semibold leading-tight sm:text-[24px]">Reports Center</h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-white/75">Select a report to update the cards, filters, and table below.</p>
            </div>
            <div className="w-full max-w-[430px] space-y-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Select report</span>
                <select
                  value={reportKey}
                  onChange={(event) => setReportKey(event.target.value)}
                  className="h-10 w-full rounded-xl border border-amber-400/70 bg-white px-3 text-sm font-medium text-slate-900 outline-none shadow-[0_0_0_1px_rgba(251,191,36,0.15)] transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/35"
                >
                  <option value="" disabled className="text-slate-500">
                    Choose reports
                  </option>
                  {REPORT_ORDER.map((key) => (
                    <option key={key} value={key} className="text-slate-900">
                      {REPORT_META[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Current view</span>
                <div className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/95 shadow-sm backdrop-blur">
                  {reportKey ? meta.label : "Choose reports"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = REPORT_ICONS[activeReportKey] || REPORT_ICONS[Object.keys(REPORT_ICONS)[idx % Object.keys(REPORT_ICONS).length]];
          const gradient = getCardGradient(card.accent || "slate");
          return (
            <button
              key={card.label}
              type="button"
              className={`group rounded-3xl bg-gradient-to-br ${gradient} p-5 text-left text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.22)]`}
              onClick={() => {}}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">{card.label}</p>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-white">{card.value}</p>
                  <p className="mt-2 text-sm font-medium text-white/82">{card.helper ?? meta.label}</p>
                </div>
                <span className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15 transition group-hover:bg-white/18">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Selected report</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{meta.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Showing {rows.length} row{rows.length === 1 ? "" : "s"} · {filterSummaryLabel(filters)}
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Search</span>
              <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search within this report..." className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>

            {reportKey === "orders" || reportKey === "sales" || reportKey === "financial" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
                  <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All statuses</option>
                    {["pending", "processing", "tailoring", "quality_check", "shipped", "delivered", "picked_up", "cancelled"].map((status) => (
                      <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payment</span>
                  <select value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All payments</option>
                    {["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"].map((status) => (
                      <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Country</span>
                  <input value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))} placeholder="Filter by country" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
              </>
            ) : null}

            {reportKey === "delivery" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
                  <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All statuses</option>
                    {["pending", "tailoring", "quality_check", "ready_for_pickup", "shipped", "delivered", "picked_up"].map((status) => (
                      <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fulfillment</span>
                  <select value={filters.fulfillment} onChange={(event) => setFilters((current) => ({ ...current, fulfillment: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All types</option>
                    <option value="mail">Mail / EMS</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Country</span>
                  <input value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))} placeholder="Filter by country" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
              </>
            ) : null}

            {reportKey === "product" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
                  <input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active</span>
                  <select value={filters.active} onChange={(event) => setFilters((current) => ({ ...current, active: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Featured</span>
                  <select value={filters.featured} onChange={(event) => setFilters((current) => ({ ...current, featured: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="true">Featured</option>
                    <option value="false">Not featured</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Gender</span>
                  <select value={filters.gender} onChange={(event) => setFilters((current) => ({ ...current, gender: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </label>
              </>
            ) : null}

            {reportKey === "customer" || reportKey === "employee" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Role</span>
                  <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All roles</option>
                    <option value="customer">Customer</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</span>
                  <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              </>
            ) : null}

            {reportKey === "support" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Severity</span>
                  <select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resolved</span>
                  <select value={filters.resolved} onChange={(event) => setFilters((current) => ({ ...current, resolved: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="true">Resolved</option>
                    <option value="false">Open</option>
                  </select>
                </label>
              </>
            ) : null}

            {reportKey === "marketing" || reportKey === "activity" ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Category</span>
                  <input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Admin, inventory, report..." className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Severity</span>
                  <select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="all">All</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </>
            ) : null}

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Period</span>
              <select value={filters.period} onChange={(event) => setFilters((current) => ({ ...current, period: event.target.value }))} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option value="all">All time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <button type="button" onClick={() => setFilters(defaultFiltersFor(reportKey))} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
              Reset filters
            </button>
            <button type="button" onClick={() => exportRows(rows, columns, meta.label, "pdf", cards)} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90">
              Download PDF
            </button>
            <button type="button" onClick={() => exportRows(rows, columns, meta.label, "doc", cards)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
              Download Word
            </button>
            <button type="button" onClick={() => exportRows(rows, columns, meta.label, "xls", cards)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
              Download Excel
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/80 text-muted-foreground backdrop-blur">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input type="checkbox" checked={allVisibleSelected} onChange={(event) => setSelectedIds(event.target.checked ? rows.map((row) => row.id) : [])} />
                  </th>
                  {columns.map((column) => (
                    <th key={column.label} className="px-4 py-3 font-semibold whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                      No rows match the selected report filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-border transition hover:bg-secondary/30">
                      <td className="px-4 py-4 align-top">
                        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} />
                      </td>
                      {columns.map((column) => (
                        <td key={column.label} className="px-4 py-4 align-top text-foreground">
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Selection cart</h3>
            <p className="mt-1 text-sm text-muted-foreground">Collect rows from the table and export them in one grouped file.</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : "No rows selected"}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedIds.length > 0 ? (
            selectedRows.slice(0, 8).map((row) => (
              <span key={row.id} className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                {row.orderNumber ?? row.name ?? row.title ?? row.action ?? row.id}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Use the checkboxes above to build your cart.</span>
          )}
          {selectedIds.length > 8 ? <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">+{selectedIds.length - 8} more</span> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={selectedIds.length === 0} onClick={() => exportRows(selectedRows, columns, meta.label, "pdf", cards)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            Download selected PDF
          </button>
          <button type="button" disabled={selectedIds.length === 0} onClick={() => exportRows(selectedRows, columns, meta.label, "doc", cards)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
            Download selected Word
          </button>
          <button type="button" disabled={selectedIds.length === 0} onClick={() => exportRows(selectedRows, columns, meta.label, "xls", cards)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
            Download selected Excel
          </button>
        </div>
      </section>
    </div>
  );
}
