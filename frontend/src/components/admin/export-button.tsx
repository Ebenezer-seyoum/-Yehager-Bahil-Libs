"use client";

import { Download } from "lucide-react";

export function ExportButton({ onClick, label = "Export" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-secondary"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
