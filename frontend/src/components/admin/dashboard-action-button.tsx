"use client";

import { Check, Eye, KeyRound, Pencil, Plus, Trash2, UserCheck, UserX, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type DashboardActionKind =
  | "view"
  | "create"
  | "update"
  | "approve"
  | "unblock"
  | "block"
  | "reset-password"
  | "delete"
  | "decline";

const ACTION_META: Record<DashboardActionKind, { icon: LucideIcon; label: string; className: string }> = {
  view: { icon: Eye, label: "View", className: "bg-[#475569] text-white hover:bg-[#334155] focus-visible:ring-[#475569] rounded-xl" },
  create: { icon: Plus, label: "Create", className: "bg-[#16A34A] text-white hover:bg-[#15803D] focus-visible:ring-[#16A34A]" },
  update: { icon: Pencil, label: "Edit", className: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus-visible:ring-[#2563EB]" },
  approve: { icon: Check, label: "Approve", className: "bg-[#16A34A] text-white hover:bg-[#15803D] focus-visible:ring-[#16A34A]" },
  unblock: { icon: UserCheck, label: "Unblock", className: "bg-[#16A34A] text-white hover:bg-[#15803D] focus-visible:ring-[#16A34A]" },
  block: { icon: UserX, label: "Block", className: "bg-[#F97316] text-white hover:bg-[#EA580C] focus-visible:ring-[#F97316]" },
  "reset-password": { icon: KeyRound, label: "Reset Password", className: "bg-[#64748B] text-white hover:bg-[#475569] focus-visible:ring-[#64748B]" },
  delete: { icon: Trash2, label: "Delete", className: "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]" },
  decline: { icon: XCircle, label: "Decline", className: "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]" },
};

export function DashboardActionButton({
  action,
  children,
  className,
  compact = true,
  href,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  action: DashboardActionKind;
  children?: ReactNode;
  compact?: boolean;
  href?: string;
}) {
  const meta = ACTION_META[action];
  const Icon = meta.icon;

  const btnClass = cn(
    "inline-flex items-center justify-center font-bold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    compact ? "h-9 gap-2 rounded-xl px-4 text-xs" : "h-11 gap-2.5 rounded-2xl px-6 text-sm",
    meta.className,
    className,
  );

  const content = (
    <>
      <Icon className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      <span>{children ?? meta.label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={btnClass} onClick={props.onClick as any} aria-label={props["aria-label"]}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      {...props}
    >
      {content}
    </button>
  );
}

export function DashboardTableActions({ children, className }: { children: ReactNode; className?: string }) {
  // Render actions horizontally by default for compact action buttons
  return <div className={cn("flex min-w-[88px] flex-row flex-nowrap items-center gap-1.5 whitespace-nowrap", className)}>{children}</div>;
}
