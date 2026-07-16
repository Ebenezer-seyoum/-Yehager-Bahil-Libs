"use client";

import { hardRefreshPage } from "@/lib/hard-refresh";

export function RefreshLink() {
  return (
    <button type="button" onClick={() => hardRefreshPage()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
      Refresh dashboard
    </button>
  );
}
