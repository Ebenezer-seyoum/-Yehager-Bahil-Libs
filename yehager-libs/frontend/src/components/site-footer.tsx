import Link from "next/link";
import { PartnersMarquee } from "@/components/partners-marquee";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Shop" },
  { href: "/catalog", label: "Custom Orders" },
  { href: "/care-and-info", label: "Size Guide" },
  { href: "/care-and-info", label: "Care Instructions" },
  { href: "/care-and-info", label: "Production" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/follow-us", label: "Follow Us" },
  { href: "/my-orders", label: "My Orders" },
  { href: "/events", label: "Event Groups" },
  { href: "/my-account", label: "My Account" },
  { href: "/terms", label: "Terms & Policy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-12 sm:grid-cols-4">
          <div>
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="mb-5 h-32 w-32 rounded-full object-cover"
            />
            <div className="space-y-2 text-base text-white/70">
              <p>
                📧{" "}
                <a href="mailto:naomiinvestments2100@gmail.com" className="transition-colors hover:text-white">
                  naomiinvestments2100@gmail.com
                </a>
              </p>
              <p>
                📞{" "}
                <a href="tel:+16127024651" className="transition-colors hover:text-white">
                  USA +1 612-702-4651
                </a>
              </p>
              <p>
                📞{" "}
                <a href="tel:+251911465030" className="transition-colors hover:text-white">
                  Ethiopia +251 911 46 5030
                </a>
              </p>
              <p>
                🌐{" "}
                <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                  www.yehagerbahillibs.com
                </a>
              </p>
              <p className="pt-1 text-xs text-white/50">United States (Minnesota) & Multiple Locations in Ethiopia</p>
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">Quick Links</h4>
            <div className="space-y-2.5">
              {quickLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block text-sm text-white/70 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">Company</h4>
            <div className="space-y-2.5">
              {companyLinks.map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block text-sm text-white/70 transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-semibold uppercase tracking-widest text-primary">Follow Us</h4>
            <div className="flex items-center gap-3">
              <SocialLink href="https://www.facebook.com/profile.php?id=61559444502598" className="bg-[#1877F2]">
                <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.05 3.7 9.24 8.54 10v-7.07H7.85v-2.93h2.55V9.84c0-2.52 1.5-3.91 3.79-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.93h-2.34v7.07c4.84-.76 8.46-4.95 8.46-10Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0" className="bg-[#555]">
                <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.25 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://x.com/yehagerbah54327" className="border border-white/20 bg-black">
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.youtube.com/@YehagerbahilLibs" className="bg-[#FF0000]">
                <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.tiktok.com/@yehager.bahil.lib" className="bg-[#555]">
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09Z" />
                </svg>
              </SocialLink>
            </div>
          </div>
        </div>

        <div className="mb-10 border-t border-white/10 pt-10">
          <div className="mb-8 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Logistics</p>
            <h3 className="font-heading text-2xl font-semibold text-white sm:text-3xl">Shipping & Handling</h3>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-white/5 p-6">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-primary/10" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-xl">✈️</div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Option 1</span>
              <h4 className="mb-2 mt-1 font-heading text-lg font-semibold text-white">Personal Pickup</h4>
              <p className="text-sm leading-relaxed text-white/60">Arrange a trusted traveler or in-person pickup where available.</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                No shipping cost
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-white/5" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">📦</div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Option 2</span>
              <h4 className="mb-2 mt-1 font-heading text-lg font-semibold text-white">EMS Shipping</h4>
              <p className="mb-4 text-sm leading-relaxed text-white/60">Grouped international shipping can reduce per-item cost.</p>
              <div className="space-y-2">
                <Metric label="Average weight" value="~1.25 kg" />
                <Metric label="1 item" value="~$45" accent />
                <Metric label="2–5 items" value="~$100 total" accent />
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  Group and save
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-white/5" />
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">🎁</div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Packaging Tips</span>
              <h4 className="mb-3 mt-1 font-heading text-lg font-semibold text-white">Optimized Packing</h4>
              <ul className="space-y-2.5">
                {["Bundle garments together", "Use event or family orders when possible", "Keep pickup details ready"].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="mt-0.5 shrink-0 text-primary">›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <span className="shrink-0 text-lg">⚠️</span>
            <p className="text-xs leading-relaxed text-amber-200/80">
              <span className="font-semibold text-amber-300">Important:</span> Shipping costs may vary depending on global conditions, logistics, and carrier pricing at the time of shipment. Weight and cost estimates are standard averages and may differ slightly by item.
            </p>
          </div>
        </div>

        <PartnersMarquee />

        <div className="mt-8 border-t border-white/10 pt-8 text-center text-xs text-white/30">
          <p>© 2024 Yehager Bahil Libs · Naomi Investments LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`flex h-11 w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-80 ${className}`}>
      {children}
    </a>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="text-xs text-white/50">{label}</span>
      <span className={`text-xs font-bold ${accent ? "text-primary" : "text-white"}`}>{value}</span>
    </div>
  );
}
