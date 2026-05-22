import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { TAXONOMY, REGIONS } from "@/lib/taxonomy";
import CreateGroupOrderModal from "./CreateGroupOrderModal";
import MobileMenu from "./MobileMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import { useT } from "@/lib/i18n/I18nContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const timeoutRef = useRef(null);
  const { t } = useT();

  const regionKey = (r) => {
    const map = { "Amhara": "region.amhara", "Oromo": "region.oromo", "Tigre": "region.tigre", "Debub": "region.debub", "Islamic": "region.islamic", "Men": "region.men", "Bride & Groom": "region.brideGroom", "Mila's Choice": "region.milasChoice" };
    return map[r] ? t(map[r]) : r;
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        const items = await base44.entities.CartItem.filter({ user_email: me.email });
        setCartCount(items.length);
      }
    });
  }, []);

  const handleMouseEnter = (region) => {
    clearTimeout(timeoutRef.current);
    setActiveMenu(region);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="YeHagerBahilLibs Logo"
              className="h-12 sm:h-14 w-12 sm:w-14 object-cover rounded-full"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
              {t("nav.home")}
            </Link>
            {REGIONS.map((region) => (
                <div
                  key={region}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(region)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    to={`/catalog?region=${encodeURIComponent(region)}`}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                    onClick={() => setActiveMenu(null)}
                  >
                    {regionKey(region)}
                    {TAXONOMY[region].length > 0 && <ChevronDown className="w-3 h-3" />}
                  </Link>
                  {activeMenu === region && TAXONOMY[region].length > 0 && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-3 min-w-[180px] z-50"
                      onMouseEnter={() => handleMouseEnter(region)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {TAXONOMY[region].map((sub) => (
                        <Link
                          key={sub}
                          to={`/catalog?region=${encodeURIComponent(region)}&sub=${encodeURIComponent(sub)}`}
                          className="block px-3 py-2 text-sm rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setActiveMenu(null)}
                        >
                          {sub}
                        </Link>
                      ))}
                      <div className="border-t border-border mt-2 pt-2">
                        <Link
                          to={`/catalog?region=${encodeURIComponent(region)}`}
                          className="block px-3 py-2 text-xs font-medium text-primary hover:underline"
                          onClick={() => setActiveMenu(null)}
                        >
                          {t("nav.viewAll")} {regionKey(region)} →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
            ))}

            <button onClick={() => setShowGroupModal(true)} className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              {t("nav.ourHomeCart")}
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/cart" className="relative p-2 hover:bg-secondary rounded-full transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                {t("nav.signIn")}
              </button>
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("nav.createAccount")}
              </button>
            </div>
            <button className="lg:hidden p-2 hover:bg-secondary rounded-md" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <MobileMenu taxonomy={TAXONOMY} regions={REGIONS} onClose={() => setOpen(false)} onGroupOrder={() => { setOpen(false); setShowGroupModal(true); }} />
      )}
    </header>
    {showGroupModal && <CreateGroupOrderModal onClose={() => setShowGroupModal(false)} />}
    </>  
  );
}
