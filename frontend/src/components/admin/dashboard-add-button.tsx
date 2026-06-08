"use client";

import { Plus, type LucideIcon } from "lucide-react";
import { DASHBOARD_ADD_BUTTON_CLASS } from "@/lib/admin/admin-design-system";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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
