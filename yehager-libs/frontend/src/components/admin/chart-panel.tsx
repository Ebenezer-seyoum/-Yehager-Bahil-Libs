"use client";

import type { ReactNode } from "react";

export function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
