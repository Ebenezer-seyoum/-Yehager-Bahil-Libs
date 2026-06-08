"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetailModalSectionItem = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
};

export function DetailModalProfileHeader({
  avatar,
  title,
  subtitle,
  meta,
  badges,
}: {
  avatar: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        {badges ? <div className="mt-2 flex flex-wrap gap-2">{badges}</div> : null}
        {meta ? <div className="mt-3 text-sm text-slate-700">{meta}</div> : null}
      </div>
    </div>
  );
}

export function DetailModalActions({
  children,
  vertical = true,
  className,
}: {
  children: ReactNode;
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        vertical ? "flex flex-col gap-2 lg:min-w-[11rem]" : "flex flex-wrap gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailModalActionButton({
  children,
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "dark";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition disabled:opacity-50",
        variant === "primary" && "bg-blue-900 text-white hover:bg-blue-950",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "dark" && "bg-slate-950 text-white hover:bg-slate-900",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DetailModalSectionNav({
  sections,
  activeSection,
  onSectionChange,
  title = "Sections",
}: {
  sections: DetailModalSectionItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  title?: string;
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <nav className="mt-3 space-y-1">
        {sections.map((item) => {
          const Icon = item.icon;
          const selected = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                selected
                  ? "border-blue-200 bg-blue-50 shadow-sm"
                  : "border-transparent hover:border-blue-100 hover:bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                {item.hint ? <span className="block text-xs text-slate-600">{item.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function DetailModalSectionPanel({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {title ? <h3 className="text-base font-bold text-slate-900">{title}</h3> : null}
      <div className={title ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

export function DetailModalLayout({
  header,
  actions,
  sections,
  activeSection,
  onSectionChange,
  sectionNavTitle,
  children,
}: {
  header: ReactNode;
  actions?: ReactNode;
  sections: DetailModalSectionItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  sectionNavTitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">{header}</div>
          {actions ? <DetailModalActions>{actions}</DetailModalActions> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <DetailModalSectionNav
          sections={sections}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          title={sectionNavTitle}
        />
        <main className="min-w-0 space-y-4">{children}</main>
      </div>
    </div>
  );
}
