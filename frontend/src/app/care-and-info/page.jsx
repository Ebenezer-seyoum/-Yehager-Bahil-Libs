import Link from "next/link";
import { Award, ChevronRight, Clock, Droplets } from "lucide-react";

const careItems = [
  {
    fabric: "Cotton / Woven Cotton (Default)",
    instructions: [
      "Hand wash in cold water with mild, color-safe detergent",
      "Do not bleach — may cause discoloration of natural dyes",
      "Tumble dry on low or lay flat to dry",
      "Iron on medium heat; use pressing cloth on embroidered sections",
      "For best results, dry clean the first time to set natural dyes",
      "Store folded in a breathable cotton bag away from direct sunlight",
    ],
  },
  {
    fabric: "Silk",
    instructions: [
      "Dry clean only — silk is extremely delicate",
      "If hand washing, use cool water with silk-specific detergent",
      "Never wring or twist — roll in a towel to remove excess water",
      "Iron inside-out on lowest silk setting while slightly damp",
      "Store hanging in a cool, dark place in a breathable garment bag",
    ],
  },
  {
    fabric: "Chiffon",
    instructions: [
      "Hand wash gently in cold water or dry clean",
      "Use a mesh laundry bag if machine washing on delicate cycle",
      "Never tumble dry — hang or lay flat to air dry",
      "Iron at the lowest temperature on the reverse side",
      "Store folded with tissue paper to prevent creasing",
    ],
  },
  {
    fabric: "Wool",
    instructions: [
      "Dry clean preferred to maintain shape and texture",
      "If hand washing, use cold water and wool wash detergent",
      "Reshape while damp and dry flat — never hang wool to dry",
      "Steam rather than iron; use a pressing cloth on embroidered areas",
      "Store folded with cedar blocks to deter moths",
    ],
  },
];

export default function CareAndInfoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>Care & Product Info</span>
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-[0.4em] text-primary">Yehager Bahil Libs</p>
      <h1 className="mb-2 font-heading text-4xl font-bold">Care & Product Information</h1>
      <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
        Everything you need to know about caring for your garment, our production process, and the authenticity of every
        piece we create.
      </p>

      <section className="mb-12">
        <div className="mb-5 flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Care Instructions</h2>
        </div>
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

      <section className="mb-12">
        <div className="mb-5 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Production to Delivery Time</h2>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4 rounded-xl bg-primary/5 p-4">
            <div className="font-heading text-4xl font-bold text-primary">25–45</div>
            <div>
              <p className="text-sm font-semibold">Days from Order to Your Door</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This includes tailoring, quality inspection, and international shipping.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            {[
              { label: "Tailoring", time: "15–25 days", desc: "Master artisans cut, embroider, and assemble your garment by hand." },
              { label: "Quality Inspection", time: "3–5 days", desc: "Every stitch, measurement, and embroidery detail is carefully verified." },
              { label: "International Shipping", time: "7–15 days", desc: "Shipped via trusted international carriers with full tracking." },
            ].map(({ label, time, desc }) => (
              <div key={label} className="rounded-xl bg-secondary p-4">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="mt-1 font-bold text-primary">{time}</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
            All garments are <strong>100% custom-tailored</strong> to your exact measurements. Once production begins
            (within 1–3 business days of order), cancellations or changes are not possible. Please ensure your
            measurements are accurate before placing an order.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Certificate of Authenticity</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Every garment from <strong className="text-foreground">Yehager Bahil Libs</strong> is handwoven and
            embroidered by certified Ethiopian master tailors with deep roots in their regional craft traditions.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: "🧵", title: "Handcrafted", desc: "Each piece is individually hand-tailored, not mass-produced." },
              { icon: "📜", title: "Authenticity Card", desc: "Ships with a signed card noting the artisan's region and craft guild." },
              { icon: "🌍", title: "Regional Heritage", desc: "Designs are rooted in Oromo, Amhara, Tigre, Debub, and Mila's traditions." },
              { icon: "✅", title: "Quality Verified", desc: "Every garment passes a multi-point inspection before shipment." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl bg-secondary p-4">
                <span className="shrink-0 text-xl">{icon}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 border-t border-border pt-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">Ready to find your perfect garment?</p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse the Collection
        </Link>
      </div>
    </div>
  );
}
