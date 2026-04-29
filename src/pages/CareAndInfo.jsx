import { Link } from "react-router-dom";
import { ChevronRight, Droplets, Clock, Award, Truck } from "lucide-react";

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

export default function CareAndInfo() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Care & Product Info</span>
      </div>

      <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-2">Yehager Bahil Libs</p>
      <h1 className="font-heading text-4xl font-bold mb-2">Care & Product Information</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        Everything you need to know about caring for your garment, our production process, and the authenticity of every piece we create.
      </p>

      {/* Care Instructions */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Droplets className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Care Instructions</h2>
        </div>
        <div className="space-y-4">
          {careItems.map(({ fabric, instructions }) => (
            <div key={fabric} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold text-foreground mb-3">{fabric}</p>
              <ul className="space-y-1.5">
                {instructions.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-primary mt-0.5 flex-shrink-0">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Production to Delivery Time */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Production to Delivery Time</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
            <div className="text-4xl font-heading font-bold text-primary">25–45</div>
            <div>
              <p className="font-semibold text-sm">Days from Order to Your Door</p>
              <p className="text-xs text-muted-foreground mt-0.5">This includes tailoring, quality inspection, and international shipping.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: "Tailoring", time: "15–25 days", desc: "Master artisans cut, embroider, and assemble your garment by hand." },
              { label: "Quality Inspection", time: "3–5 days", desc: "Every stitch, measurement, and embroidery detail is carefully verified." },
              { label: "International Shipping", time: "7–15 days", desc: "Shipped via trusted international carriers with full tracking." },
            ].map(({ label, time, desc }) => (
              <div key={label} className="p-4 bg-secondary rounded-xl">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-primary font-bold mt-1">{time}</p>
                <p className="text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
            All garments are <strong>100% custom-tailored</strong> to your exact measurements. Once production begins (within 1–3 business days of order), cancellations or changes are not possible. Please ensure your measurements are accurate before placing an order.
          </p>
        </div>
      </section>

      {/* Certificate of Authenticity */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-2xl font-semibold">Certificate of Authenticity</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Every garment from <strong className="text-foreground">Yehager Bahil Libs</strong> is handwoven and embroidered by certified Ethiopian master tailors with deep roots in their regional craft traditions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: "🧵", title: "Handcrafted", desc: "Each piece is individually hand-tailored, not mass-produced." },
              { icon: "📜", title: "Authenticity Card", desc: "Ships with a signed card noting the artisan's region and craft guild." },
              { icon: "🌍", title: "Regional Heritage", desc: "Designs are rooted in Oromo, Amhara, Tigre, Debub, and Mila's traditions." },
              { icon: "✅", title: "Quality Verified", desc: "Every garment passes a multi-point inspection before shipment." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 bg-secondary rounded-xl">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 pt-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground mb-3">Ready to find your perfect garment?</p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Browse the Collection
        </Link>
      </div>
    </div>
  );
}