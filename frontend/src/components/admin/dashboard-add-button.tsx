"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const DASHBOARD_ADD_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/30 transition-all hover:bg-blue-950 active:scale-95";

export function DashboardAddButton({
  label,
  icon: Icon = Plus,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={cn(DASHBOARD_ADD_BUTTON_CLASS, className)} {...props}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{children ?? label}</span>
    </button>
  );
}
