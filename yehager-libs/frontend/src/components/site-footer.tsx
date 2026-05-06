import Link from "next/link";

const quickLinks = [
  { href: "/catalog", label: "Shop" },
  { href: "/events", label: "Event Groups" },
  { href: "/my-orders", label: "My Orders" },
  { href: "/terms", label: "Terms & Policy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-black text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-3">
          <p className="font-heading text-2xl font-semibold">Yehager Bahil</p>
          <p className="text-sm text-white/70">Traditional Ethiopian attire with modern digital ordering.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Quick Links</p>
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block text-sm text-white/70 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="space-y-2 text-sm text-white/70">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
          <p>naomiinvestments2100@gmail.com</p>
          <p>USA +1 612-702-4651</p>
          <p>Ethiopia +251 911 46 5030</p>
        </div>
        <div className="space-y-2 text-sm text-white/70">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Coverage</p>
          <p>United States (Minnesota)</p>
          <p>Multiple locations in Ethiopia</p>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40 sm:px-6 lg:px-8">
        © 2024 Yehager Bahil Libs · Naomi Investments LLC. All rights reserved.
      </div>
    </footer>
  );
}
