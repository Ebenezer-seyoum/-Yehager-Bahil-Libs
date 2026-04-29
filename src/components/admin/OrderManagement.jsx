import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ban, CheckCircle, Truck, Search, MapPin, Upload, FileCheck } from "lucide-react";

const STATUS_OPTIONS = ["pending", "tailoring", "quality_check", "shipped", "delivered", "ready_for_pickup", "picked_up"];
const PAYMENT_OPTIONS = ["pending", "paid", "failed", "refunded"];

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  tailoring: "bg-blue-100 text-blue-700",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
};
const PAYMENT_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
};

export default function OrderManagement({ orders, onRefresh }) {
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const handleProofUpload = async (orderId, file) => {
    setUploadingProof(orderId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Order.update(orderId, {
      pickup_proof_url: file_url,
      pickup_proof_uploaded_at: new Date().toISOString(),
      status: "picked_up",
    });
    await base44.entities.AuditLog.create({
      action: "Pickup proof uploaded and order marked as picked up",
      entity_type: "Order", entity_id: orderId,
      category: "order", severity: "info", performed_by: "admin"
    });
    onRefresh();
    setUploadingProof(null);
  };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = async (orderId, field, value) => {
    setUpdating(orderId + field);
    await base44.entities.Order.update(orderId, { [field]: value });
    await base44.entities.AuditLog.create({
      action: `Order ${field} updated to ${value}`,
      entity_type: "Order", entity_id: orderId,
      category: "order", severity: "info",
      performed_by: "admin"
    });
    onRefresh();
    setUpdating(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {["Order #", "Customer", "Total", "Order Status", "Payment", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(order => (
              <>
              <tr key={order.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{order.user_email}</p>
                  {order.fulfillment_type === "pickup" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary mt-0.5"><MapPin className="w-2.5 h-2.5" />Pickup</span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-primary">${order.total?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <select
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}
                    value={order.status}
                    disabled={updating === order.id + "status"}
                    onChange={e => updateStatus(order.id, "status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${PAYMENT_COLORS[order.payment_status] || "bg-gray-100 text-gray-700"}`}
                    value={order.payment_status}
                    disabled={updating === order.id + "payment_status"}
                    onChange={e => updateStatus(order.id, "payment_status", e.target.value)}
                  >
                    {PAYMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, "status", "delivered"); }}>
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, "payment_status", "refunded"); }}>
                      <Ban className="w-3 h-3 text-red-400" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, "status", "shipped"); }}>
                      <Truck className="w-3 h-3 text-blue-400" />
                    </Button>
                  </div>
                </td>
              </tr>
              {/* Expanded pickup details */}
              {expandedOrder === order.id && order.fulfillment_type === "pickup" && (
                <tr key={order.id + "-expand"} className="bg-secondary/20">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pickup Details</p>
                      <p className="text-sm"><span className="font-medium">Location:</span> {order.pickup_location}</p>
                      <p className="text-sm"><span className="font-medium">Pickup Person:</span> {order.pickup_person_name} · {order.pickup_person_phone}</p>
                      {order.pickup_proof_url ? (
                        <a href={order.pickup_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline">
                          <FileCheck className="w-4 h-4" /> View Signed Proof Document
                        </a>
                      ) : (
                        <div>
                          <p className="text-xs text-amber-600 mb-2">No proof uploaded yet. Upload signed document + ID proof below:</p>
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary text-primary text-xs font-medium cursor-pointer hover:bg-primary/5 transition-colors">
                            {uploadingProof === order.id ? <><span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload Pickup Proof</>}
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && handleProofUpload(order.id, e.target.files[0])} />
                          </label>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No orders found.</div>
        )}
      </div>
    </div>
  );
}