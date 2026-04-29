import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "../components/ProductCard";
import { TAXONOMY, REGIONS } from "@/lib/taxonomy";
import { useT } from "@/lib/i18n/I18nContext";

export default function ProductCatalog() {
  const { t } = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState("all");
  const [etbRate, setEtbRate] = useState(null);

  const activeRegion = searchParams.get("region") || null;
  const activeSub = searchParams.get("sub") || null;
  const eventId = searchParams.get("event") || null;

  useEffect(() => {
    base44.entities.ExchangeRate.filter({ currency_pair: "USD_ETB" }).then(rates => {
      if (rates.length > 0) setEtbRate(rates[0].rate);
    });
  }, []);

  useEffect(() => {
    setGender("all");
  }, [activeRegion, activeSub]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const filters = { is_active: true };
      if (activeRegion) filters.region = activeRegion;
      if (activeSub) filters.subcategory = activeSub;
      if (gender !== "all") filters.gender = gender;
      const data = await base44.entities.Product.filter(filters, "unique_id", 80);
      setProducts(data);
      setLoading(false);
    };
    load();
  }, [activeRegion, activeSub, gender]);

  const handleRegion = (r) => {
    const next = new URLSearchParams();
    if (r && r !== activeRegion) next.set("region", r);
    if (eventId) next.set("event", eventId);
    setSearchParams(next);
  };

  const handleSub = (sub) => {
    const next = new URLSearchParams();
    if (activeRegion) next.set("region", activeRegion);
    if (sub && sub !== activeSub) next.set("sub", sub);
    if (eventId) next.set("event", eventId);
    setSearchParams(next);
  };

  const subs = activeRegion ? TAXONOMY[activeRegion] || [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>{t("catalog.collection")}</span>
          {activeRegion && <><ChevronRight className="w-3 h-3" /><span>{activeRegion}</span></>}
          {activeSub && <><ChevronRight className="w-3 h-3" /><span>{activeSub}</span></>}
        </div>
        <h1 className="font-heading text-4xl font-bold">
          {activeSub || activeRegion || t("catalog.allCollections")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{products.length} {t("catalog.pieces")}</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("catalog.region")}</p>
              <div className="space-y-1">
                <button
                  onClick={() => handleRegion(null)}
                  className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${!activeRegion ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  {t("catalog.allRegions")}
                </button>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRegion(r)}
                    className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${activeRegion === r ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {subs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("catalog.subCollection")}</p>
                <div className="space-y-1">
                  {subs.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => handleSub(sub)}
                      className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${activeSub === sub ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("catalog.gender")}</p>
              <div className="space-y-1">
                {["all", "female", "male", "unisex"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg capitalize transition-colors ${gender === g ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                  >
                    {g === "all" ? t("catalog.all") : g === "female" ? t("catalog.women") : g === "male" ? t("catalog.men") : t("catalog.unisex")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {/* Mobile filters */}
          <div className="lg:hidden flex flex-wrap gap-2 mb-6">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => handleRegion(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeRegion === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
              >
                {r}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center py-32">
              <p className="text-muted-foreground">{t("catalog.noProducts")}</p>
              <Button variant="ghost" className="mt-4" onClick={() => setSearchParams({})}>
                {t("catalog.clearFilters")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} eventId={eventId} etbRate={etbRate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}