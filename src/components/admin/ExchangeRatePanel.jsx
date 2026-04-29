import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function ExchangeRatePanel({ rateRecord, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [manualRate, setManualRate] = useState("");

  const handleRefreshFromAPI = async () => {
    setRefreshing(true);
    const res = await base44.functions.invoke("refreshExchangeRate", {});
    if (res.data?.success) {
      toast.success(`Rate updated: 1 USD = ${res.data.rate.toFixed(2)} ETB`);
      onRefresh();
    } else {
      toast.error("Failed to fetch live rate");
    }
    setRefreshing(false);
  };

  const handleManualSave = async () => {
    const r = parseFloat(manualRate);
    if (isNaN(r) || r <= 0) { toast.error("Enter a valid rate"); return; }
    setSaving(true);
    if (rateRecord) {
      await base44.entities.ExchangeRate.update(rateRecord.id, {
        rate: r,
        source: "Manual override",
        last_updated: new Date().toISOString(),
      });
    } else {
      await base44.entities.ExchangeRate.create({
        currency_pair: "USD_ETB",
        rate: r,
        source: "Manual override",
        last_updated: new Date().toISOString(),
      });
    }
    toast.success(`Rate set to 1 USD = ${r} ETB`);
    setManualRate("");
    onRefresh();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-base">USD ↔ Ethiopian Birr Exchange Rate</h2>
          <p className="text-xs text-muted-foreground">Controls how ETB prices are displayed site-wide</p>
        </div>
      </div>

      {/* Current Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 sm:col-span-2">
          <p className="text-xs text-muted-foreground mb-1">Current Rate</p>
          {rateRecord ? (
            <>
              <p className="text-4xl font-heading font-bold text-primary">
                1 USD = <span>{rateRecord.rate?.toFixed(2)}</span> ETB
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Source: {rateRecord.source} · Last updated: {rateRecord.last_updated ? new Date(rateRecord.last_updated).toLocaleString() : "N/A"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm mt-2">No rate set yet. Fetch from API or enter manually below.</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
          <p className="text-xs text-muted-foreground mb-2">Auto-refresh from live API</p>
          <Button onClick={handleRefreshFromAPI} disabled={refreshing} className="w-full gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Fetching..." : "Fetch Live Rate"}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">Uses open.er-api.com (mirrors NBE interbank rate, updated daily)</p>
        </div>
      </div>

      {/* Manual Override */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3">Manual Override</h3>
        <p className="text-xs text-muted-foreground mb-4">Enter the rate manually if you know the current NBE rate.</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">1 USD =</span>
            <input
              type="number"
              className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm"
              placeholder="e.g. 125.50"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">ETB</span>
          </div>
          <Button onClick={handleManualSave} disabled={saving || !manualRate}>
            {saving ? "Saving..." : "Save Rate"}
          </Button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-secondary/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm mb-2">How it works</p>
        <p>• ETB prices are shown automatically on all product cards and product pages.</p>
        <p>• When you update the rate here, all prices update instantly site-wide.</p>
        <p>• The scheduled automation refreshes the rate from the live API every 6 hours.</p>
        <p>• When admin changes USD price in Inventory, ETB shows automatically. When admin enters ETB price, it converts to USD and saves.</p>
      </div>
    </div>
  );
}