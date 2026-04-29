import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/i18n/I18nContext";
import LanguageSwitcher from "./LanguageSwitcher";

// Sub-subcategory grouping within each region's subs
const CATEGORY_SUBS = ["Bride & Groom", "Kids", "Apparels"];

export default function MobileMenu({ taxonomy, regions, onClose, onGroupOrder, user }) {
  const [openRegion, setOpenRegion] = useState(null);
  const { t } = useT();
  const regionKey = (r) => {
    const map = { "Amhara": "region.amhara", "Oromo": "region.oromo", "Tigre": "region.tigre", "Debub": "region.debub", "Islamic": "region.islamic", "Men": "region.men", "Bride & Groom": "region.brideGroom", "Mila's Choice": "region.milasChoice" };
    return map[r] ? t(map[r]) : r;
  };

  return (
    <div className="lg:hidden border-t border-border bg-background overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }}>
      <nav className="px-3 py-2">

        {/* Home */}
        <div className="px-3 py-2 mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("lang.label")}</span>
          <LanguageSwitcher />
        </div>

        <Link
          to="/"
          onClick={onClose}
          className="flex items-center h-11 px-3 text-sm font-semibold rounded-lg hover:bg-secondary transition-colors"
        >
          {t("nav.home")}
        </Link>

        {/* Regions */}
        {regions.map((region) => {
          const subs = taxonomy[region] || [];
          const isOpen = openRegion === region;
          const hasSubs = subs.length > 0;

          return (
            <div key={region}>
              {hasSubs ? (
              <button
                onClick={() => setOpenRegion(isOpen ? null : region)}
                className="w-full flex items-center justify-between h-11 px-3 text-sm font-semibold rounded-lg hover:bg-secondary transition-colors"
              >
                <span>{regionKey(region)}</span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-primary" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                }
              </button>
              ) : (
              <Link
                to={`/catalog?region=${encodeURIComponent(region)}`}
                onClick={onClose}
                className="flex items-center h-11 px-3 text-sm font-semibold rounded-lg hover:bg-secondary transition-colors"
              >
                {regionKey(region)}
              </Link>
              )}

              {isOpen && hasSubs && (
                <div className="ml-4 border-l border-border pl-2 mb-1">
                  <Link
                    to={`/catalog?region=${encodeURIComponent(region)}`}
                    onClick={onClose}
                    className="flex items-center h-9 px-3 text-xs font-semibold text-primary rounded-lg hover:bg-secondary transition-colors"
                  >
                    {t("nav.viewAll")} {regionKey(region)} →
                  </Link>
                  {subs.map((sub) => (
                    <Link
                      key={sub}
                      to={`/catalog?region=${encodeURIComponent(region)}&sub=${encodeURIComponent(sub)}`}
                      onClick={onClose}
                      className="flex items-center h-9 px-3 text-sm text-muted-foreground rounded-lg hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-border my-2" />

        {/* Our Home Cart */}
        <button
          onClick={onGroupOrder}
          className="w-full text-left h-11 px-3 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("nav.ourHomeCart")}
        </button>

        {/* Account */}
        {user ? (
          <Link
            to="/my-account"
            onClick={onClose}
            className="flex items-center h-11 px-3 text-sm font-semibold rounded-lg hover:bg-secondary transition-colors"
          >
            {t("nav.myOrders")} & {t("nav.myAccount")}
          </Link>
        ) : (
          <button
            onClick={() => { onClose(); base44.auth.redirectToLogin(); }}
            className="w-full text-left h-11 px-3 text-sm font-semibold rounded-lg hover:bg-secondary transition-colors"
          >
            {t("nav.signIn")} / {t("nav.createAccount")}
          </button>
        )}
      </nav>
    </div>
  );
}