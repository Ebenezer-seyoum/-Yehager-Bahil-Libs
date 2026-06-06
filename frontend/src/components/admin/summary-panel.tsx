"use client";

export function SummaryPanel({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" }>;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              item.tone === "good"
                ? "text-emerald-700"
                : item.tone === "warn"
                  ? "text-amber-700"
                  : item.tone === "bad"
                    ? "text-rose-700"
                    : "text-foreground"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
