import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Star, Search } from "lucide-react";

export default function InventoryManagement({ products, onRefresh, etbRate }) {
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.unique_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.region?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (product, field) => {
    setUpdating(product.id + field);
    await base44.entities.Product.update(product.id, { [field]: !product[field] });
    await base44.entities.AuditLog.create({
      action: `Product ${field} toggled to ${!product[field]}`,
      entity_type: "Product", entity_id: product.id,
      category: "inventory", severity: "info", performed_by: "admin"
    });
    onRefresh();
    setUpdating(null);
  };

  const updatePrice = async (product, usdPrice) => {
    const p = parseFloat(usdPrice);
    if (!isNaN(p) && p > 0) {
      await base44.entities.Product.update(product.id, { price: p });
      onRefresh();
    }
  };

  const updatePriceFromETB = async (product, etbPrice) => {
    if (!etbRate) return;
    const etb = parseFloat(etbPrice);
    if (!isNaN(etb) && etb > 0) {
      const usd = Math.round((etb / etbRate) * 100) / 100;
      await base44.entities.Product.update(product.id, { price: usd });
      onRefresh();
    }
  };

  const regionColor = {
    "Oromo": "bg-amber-100 text-amber-800",
    "Amhara": "bg-rose-100 text-rose-800",
    "Tigre": "bg-blue-100 text-blue-700",
    "Debub": "bg-green-100 text-green-800",
    "Mila's Choice": "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {products.filter(p => p.is_active).length} active · {products.filter(p => !p.is_active).length} inactive
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Product", "ID", "Region", "USD Price", etbRate ? "ETB Price" : null, "Status", "Featured", "Actions"].filter(Boolean).map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(product => (
              <tr key={product.id} className={`hover:bg-secondary/30 transition-colors ${!product.is_active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-medium text-xs">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.subcategory}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{product.unique_id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${regionColor[product.region] || "bg-gray-100 text-gray-700"}`}>
                    {product.region}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={product.price}
                    className="w-20 bg-secondary border border-border rounded px-2 py-1 text-xs"
                    onBlur={e => updatePrice(product, e.target.value)}
                  />
                </td>
                {etbRate && (
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={Math.round(product.price * etbRate)}
                      key={`${product.id}-${etbRate}`}
                      className="w-24 bg-secondary border border-border rounded px-2 py-1 text-xs"
                      onBlur={e => updatePriceFromETB(product, e.target.value)}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${product.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${product.is_featured ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-700"}`}>
                    {product.is_featured ? "Featured" : "Normal"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2"
                      disabled={updating === product.id + "is_active"}
                      onClick={() => toggle(product, "is_active")}
                      title={product.is_active ? "Deactivate" : "Activate"}
                    >
                      {product.is_active ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className="w-3.5 h-3.5 text-green-400" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2"
                      disabled={updating === product.id + "is_featured"}
                      onClick={() => toggle(product, "is_featured")}
                      title="Toggle Featured"
                    >
                      <Star className={`w-3.5 h-3.5 ${product.is_featured ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No products found.</div>
        )}
      </div>
    </div>
  );
}