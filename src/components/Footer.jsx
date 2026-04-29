import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube } from "lucide-react";
import PartnersMarquee from "./PartnersMarquee";
import { useT } from "@/lib/i18n/I18nContext";

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">

        {/* Main grid: logo+contact | quick links | company | social */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-12 mb-10">

          {/* Column 1: Logo + contact details */}
          <div>
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="YeHagerBahilLibs Logo"
              className="h-32 w-32 object-cover mb-5 rounded-full"
            />
            <div className="space-y-2 text-base text-white/70">
              <p>📧 <a href="mailto:naomiinvestments2100@gmail.com" className="hover:text-white transition-colors">naomiinvestments2100@gmail.com</a></p>
              <p>📞 <a href="tel:+16127024651" className="hover:text-white transition-colors">USA +1 612-702-4651</a></p>
              <p>📞 <a href="tel:+251911465030" className="hover:text-white transition-colors">Ethiopia +251 911 46 5030</a></p>
              <p>🌐 <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.yehagerbahillibs.com</a></p>
              <p className="text-white/50 text-xs pt-1">United States (Minnesota) &amp; Multiple Locations in Ethiopia</p>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-5">{t("footer.quickLinks")}</h4>
            <div className="space-y-2.5">
              {[
                { label: t("nav.home"), to: "/" },
                { label: t("footer.shop"), to: "/catalog" },
                { label: t("footer.customOrders"), to: "/catalog" },
                { label: t("footer.sizeGuide"), to: "/care-and-info" },
                { label: t("footer.careInstructions"), to: "/care-and-info" },
                { label: t("footer.production"), to: "/care-and-info" },
              ].map(({ label, to }) => (
                <Link key={label} to={to} className="block text-sm text-white/70 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-5">{t("footer.company")}</h4>
            <div className="space-y-2.5">
              {[
                { label: t("nav.about"), to: "/about" },
                { label: t("nav.followUs"), to: "/follow-us" },
                { label: t("nav.myOrders"), to: "/my-orders" },
                { label: t("footer.eventGroups"), to: "/events" },
                { label: t("nav.myAccount"), to: "/my-account" },
                { label: t("footer.policy"), to: "/terms" },
              ].map(({ label, to }) => (
                <Link key={label} to={to} className="block text-sm text-white/70 hover:text-white transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Social Media */}
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-widest mb-5">{t("footer.followUs")}</h4>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/profile.php?id=61559444502598" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#1877F2] hover:opacity-80 transition-opacity">
                <Facebook className="w-5 h-5 text-white" />
              </a>
              <a href="https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#555] hover:opacity-80 transition-opacity">
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a href="https://x.com/yehagerbah54327" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-black border border-white/20 hover:opacity-80 transition-opacity">
                <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.youtube.com/@YehagerbahilLibs" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#FF0000] hover:opacity-80 transition-opacity">
                <Youtube className="w-5 h-5 text-white" />
              </a>
              <a href="https://www.tiktok.com/@yehager.bahil.lib" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-[#555] hover:opacity-80 transition-opacity">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/></svg>
              </a>
            </div>
          </div>

        </div>

        {/* Shipping & Handling Section */}
        <div className="border-t border-white/10 pt-10 mb-10">
          <div className="text-center mb-8">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] mb-1">{t("footer.logistics")}</p>
            <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-white">{t("footer.shippingHandling")}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

            {/* Personal Pickup */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-white/5 p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-6 translate-x-6" />
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl mb-4">✈️</div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">{t("footer.option1Label")}</span>
              <h4 className="font-heading text-lg font-semibold text-white mt-1 mb-2">{t("footer.personalPickup")}</h4>
              <p className="text-sm text-white/60 leading-relaxed">{t("footer.personalPickupDesc")}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {t("footer.noShippingCost")}
              </div>
            </div>

            {/* EMS Shipping */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl mb-4">📦</div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">{t("footer.option2Label")}</span>
              <h4 className="font-heading text-lg font-semibold text-white mt-1 mb-2">{t("footer.emsShipping")}</h4>
              <p className="text-sm text-white/60 leading-relaxed mb-4">{t("footer.emsDesc")}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-white/50">{t("footer.avgWeight")}</span>
                  <span className="text-xs font-bold text-white">~1.25 kg</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-white/50">{t("footer.1item")}</span>
                  <span className="text-xs font-bold text-primary">~$45</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-white/50">{t("footer.2to5items")}</span>
                  <span className="text-xs font-bold text-primary">~$100 total</span>
                </div>
                <div className="mt-1 text-[10px] text-green-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {t("footer.groupSave")}
                </div>
              </div>
            </div>

            {/* Packaging */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl mb-4">🎁</div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">{t("footer.packagingTips")}</span>
              <h4 className="font-heading text-lg font-semibold text-white mt-1 mb-3">{t("footer.optimizedPacking")}</h4>
              <ul className="space-y-2.5">
                {[
                  t("footer.packTip1"),
                  t("footer.packTip2"),
                  t("footer.packTip3"),
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Important note */}
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 max-w-2xl mx-auto">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              <span className="font-semibold text-amber-300">Important:</span> Shipping costs may vary depending on global conditions, logistics, and carrier pricing at the time of shipment. Weight and cost estimates are standard averages and may differ slightly by item.
            </p>
          </div>
        </div>

        {/* Partners marquee */}
        <PartnersMarquee />

        <div className="border-t border-white/10 pt-8 mt-8 text-center text-xs text-white/30">
          <p>© 2024 Yehager Bahil Libs · Naomi Investments LLC. {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}