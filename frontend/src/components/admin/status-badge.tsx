"use client";

import {
  Ban,
  Check,
  Clock,
  Sparkles,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatusBadgeTone = "success" | "pending" | "danger" | "info" | "neutral" | "new";

const TONE_META: Record<
  StatusBadgeTone,
  { bg: string; text: string; icon: LucideIcon }
> = {
  success: { bg: "bg-[#E6F4EA]", text: "text-[#166534]", icon: Check },
  pending: { bg: "bg-amber-50", text: "text-amber-800", icon: Clock },
  danger: { bg: "bg-red-50", text: "text-red-800", icon: XCircle },
  info: { bg: "bg-blue-50", text: "text-blue-800", icon: UserCheck },
  neutral: { bg: "bg-slate-100", text: "text-slate-700", icon: Ban },
  new: { bg: "bg-sky-50", text: "text-sky-800", icon: Sparkles },
};

function toneFromValue(value?: string | null): StatusBadgeTone {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (
    ["active", "completed", "complete", "approved", "paid", "verified", "enabled", "delivered"].some(
      (k) => s.includes(k),
    )
  ) {
    return "success";
  }
  if (
    ["pending", "processing", "in progress", "invited", "awaiting", "review", "open"].some((k) =>
      s.includes(k),
    )
  ) {
    return s.includes("invited") ? "info" : "pending";
  }
  if (["new", "recent"].some((k) => s.includes(k))) return "new";
  if (
    ["inactive", "blocked", "cancelled", "canceled", "failed", "rejected", "declined", "suspended"].some(
      (k) => s.includes(k),
    )
  ) {
    return "danger";
  }
  return "neutral";
}

export function StatusBadge({
  value,
  tone,
  showIcon = true,
  className,
  children,
}: {
  value?: string | null;
  tone?: StatusBadgeTone;
  showIcon?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const label = children ?? (value ? String(value) : "—");
  const resolvedTone = tone ?? toneFromValue(typeof label === "string" ? label : value);
  const meta = TONE_META[resolvedTone];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize",
        meta.bg,
        meta.text,
        className,
      )}
    >
      {label}
      {showIcon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
    </span>
  );
}
