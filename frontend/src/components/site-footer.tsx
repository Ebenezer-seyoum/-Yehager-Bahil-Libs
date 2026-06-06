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
              <SocialLink href="https://www.facebook.com/profile.php?id=61559444502598" label="Facebook" className="bg-[#1877F2] text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.93-1.955 1.885v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0" label="Instagram" className="bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fdf497_18%,#fd5949_43%,#d6249f_62%,#285AEB_100%)] text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                  <path d="M7.8 2h8.4A5.806 5.806 0 0 1 22 7.8v8.4a5.806 5.806 0 0 1-5.8 5.8H7.8A5.806 5.806 0 0 1 2 16.2V7.8A5.806 5.806 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://x.com/yehagerbah54327" label="X (Twitter)" className="border border-white/20 bg-black text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.831L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.292 19.491h2.039L6.486 3.24H4.298l13.311 17.404Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.youtube.com/@YehagerbahilLibs" label="YouTube" className="bg-[#FF0000] text-white">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M23.5 6.19a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.509A3.016 3.016 0 0 0 .5 6.19C0 8.073 0 12 0 12s0 3.927.5 5.81a3.016 3.016 0 0 0 2.123 2.136c1.872.509 9.377.509 9.377.509s7.505 0 9.378-.509A3.016 3.016 0 0 0 23.5 17.81C24 15.927 24 12 24 12s0-3.927-.5-5.81ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.tiktok.com/@yehager.bahil.lib" label="TikTok" className="bg-black text-white ring-1 ring-white/15">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .593.045.88.13V9.4a6.337 6.337 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.17a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52V6.82c-.35 0-.699-.043-1.04-.13Z" />
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
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={`flex h-11 w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-80 ${className}`}>
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
