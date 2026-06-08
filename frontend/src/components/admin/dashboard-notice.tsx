"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardNoticeTone = "success" | "error" | "warning" | "info";

const toneClass: Record<DashboardNoticeTone, string> = {
  success: "bg-[#829276]",
  error: "bg-[#c15b5d]",
  warning: "bg-[#efbd62]",
  info: "bg-[#778899]",
};

export function DashboardNotice({
  tone = "info",
  children,
  className,
  autoDismissMs = 3000,
}: {
  tone?: DashboardNoticeTone;
  children: ReactNode;
  className?: string;
  autoDismissMs?: number;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open || autoDismissMs <= 0) return;
    const timeout = window.setTimeout(() => setOpen(false), autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "relative flex min-h-[70px] items-center rounded-md px-6 py-5 pr-16 text-xl font-bold leading-tight text-white",
        toneClass[tone],
        className,
      )}
    >
      <span>{children}</span>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl font-light leading-none text-white/70 hover:text-white"
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  );
}
