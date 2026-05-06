import Link from "next/link";

const careItems = [
  {
    fabric: "Cotton / Woven Cotton (Default)",
    instructions: [
      "Hand wash in cold water with mild, color-safe detergent",
      "Do not bleach",
      "Tumble dry on low or lay flat to dry",
      "Iron on medium heat; use pressing cloth on embroidered sections",
    ],
  },
  {
    fabric: "Silk",
    instructions: [
      "Dry clean only",
      "If hand washing, use cool water with silk-specific detergent",
      "Never wring or twist",
      "Iron inside-out on lowest silk setting while slightly damp",
    ],
  },
  {
    fabric: "Chiffon",
    instructions: [
      "Hand wash gently in cold water or dry clean",
      "Use a mesh laundry bag if machine washing",
      "Never tumble dry",
      "Iron at the lowest temperature on the reverse side",
    ],
  },
];

export default function CareAndInfoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.4em] text-primary">Yehager Bahil Libs</p>
      <h1 className="font-heading text-4xl font-bold">Care & Product Information</h1>
      <p className="mb-10 mt-2 text-sm leading-relaxed text-muted-foreground">
        Everything you need to know about caring for your garment and our production process.
      </p>

      <section className="mb-12">
        <h2 className="mb-5 font-heading text-2xl font-semibold">Care Instructions</h2>
        <div className="space-y-4">
          {careItems.map(({ fabric, instructions }) => (
            <div key={fabric} className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">{fabric}</p>
              <ul className="space-y-1.5">
                {instructions.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-primary">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-heading text-2xl font-semibold">Production to Delivery Time</h2>
        <p className="text-sm text-muted-foreground">
          Typical total timeline is <strong className="text-foreground">25–45 days</strong>, including tailoring,
          quality checks, and international shipping.
        </p>
      </section>

      <div className="mt-10 border-t border-border pt-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">Ready to find your perfect garment?</p>
        <Link href="/catalog" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Browse the Collection
        </Link>
      </div>
    </div>
  );
}
