import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Scissors, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProductCard from "../components/ProductCard";
import { useT } from "@/lib/i18n/I18nContext";

export default function Home() {
  const { t } = useT();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etbRate, setEtbRate] = useState(null);

  useEffect(() => {
    base44.entities.ExchangeRate.filter({ currency_pair: "USD_ETB" }).then(rates => {
      if (rates.length > 0) setEtbRate(rates[0].rate);
    });
    Promise.all([
      base44.entities.Product.filter({ is_active: true, region: "Oromo", subcategory: "Wollega" }, "-updated_date", 20),
      base44.entities.Product.filter({ is_active: true, region: "Oromo", subcategory: "Arsi" }, "-updated_date", 20),
      base44.entities.Product.filter({ is_active: true, region: "Mila's Choice" }, "-updated_date", 20),
    ]).then(([w, a, m]) => {
      const excluded = ["ORO-ARS-002", "ORO-ARS-003"];
      const all = [...w, ...a, ...m].filter(p => !excluded.includes(p.unique_id)).sort(() => Math.random() - 0.5);
      setProducts(all);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden">

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{products.map((p) => <ProductCard key={p.id} product={p} etbRate={etbRate} />)}</div>
        )}
      </section>

      {/* ─── WHY US ─── */}
      <section className="border-t border-border py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: Scissors, title: t("home.whyUs.tailored.title"), desc: t("home.whyUs.tailored.desc") },
              { icon: Globe, title: t("home.whyUs.shipping.title"), desc: t("home.whyUs.shipping.desc") },
              { icon: Star, title: t("home.whyUs.guarantee.title"), desc: t("home.whyUs.guarantee.desc") },
            ].map((f, i) => (
              <div key={i} className="px-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}