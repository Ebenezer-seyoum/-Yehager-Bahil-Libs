"use client";

import { useRouter } from "next/navigation";

export function RefreshLink() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
      Refresh dashboard
    </button>
  );
}
