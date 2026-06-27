"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type DetailSectionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export function AdminDetailHeader({
  icon: Icon,
  iconTheme,
  category,
  title,
  subtitle,
  onRefresh,
  onBack,
  backLabel = "Back",
}: {
  icon: LucideIcon;
  iconTheme?: string;
  category: string;
  title: string;
  subtitle: string;
  onRefresh: () => void;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={cn("h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center shadow-sm", iconTheme || "bg-blue-50 text-blue-600")}>
            <Icon className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{category}</p>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase truncate">
              {title}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-row gap-3 shrink-0 items-center">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-all group"
          >
            <RefreshCw className="h-4 w-4 text-slate-600 group-hover:rotate-180 transition-transform duration-500" />
            Refresh
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-all group"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:-translate-x-1 transition-transform" />
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDetailLayout({
  topHeader,
  topNotice,
  profileCard,
  sections,
  activeSection,
  onSectionChange,
  children,
  embedded = false,
  navigationVariant = "side",
}: {
  topHeader?: ReactNode;
  topNotice?: ReactNode;
  profileCard?: ReactNode;
  sections: DetailSectionItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  children: ReactNode;
  embedded?: boolean;
  navigationVariant?: "side" | "top";
}) {
  const sectionNav = (
    <nav className={cn(navigationVariant === "top" ? "flex gap-2 overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm" : "space-y-1")}>
      {sections.map((item) => {
        const Icon = item.icon;
        const selected = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              navigationVariant === "top"
                ? "flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-left transition-all duration-200"
                : "flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-200",
              selected
                ? "bg-[#0B132B] text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-blue-400" : "text-slate-400")} />
            <span className={cn("block text-xs font-bold tracking-wide uppercase", selected ? "text-white" : "text-slate-700")}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="space-y-4">
      {!embedded && topHeader}
      {topNotice}

      {profileCard && (
        <section className="rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          {profileCard}
        </section>
      )}

      {navigationVariant === "top" ? (
        <>
          {sectionNav}
          <main className="min-w-0 space-y-4">
            {children}
          </main>
        </>
      ) : (
        <div className={cn("grid gap-4", embedded ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[280px_1fr]")}>
          <aside className="rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm h-fit sticky top-24">
            {sectionNav}
          </aside>
        <main className="min-w-0 space-y-4">
          {children}
        </main>
      </div>
      )}
    </div>
  );
}
