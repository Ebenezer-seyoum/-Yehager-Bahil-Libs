import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Upload, FileCheck, Truck, MapPin, Search, RefreshCw,
  User, Package, ChevronDown, ChevronRight,
  CreditCard, FileSignature, FileText, PlusCircle, Trash2
} from "lucide-react";

const FULFILLMENT_COLORS = {
  pickup: "bg-purple-100 text-purple-800",
  mail: "bg-blue-100 text-blue-700",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  tailoring: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
};

const SHIPPING_DOC_LABELS = [
  "Waybill / Airway Bill",
  "Postal Receipt",
  "Customs Declaration Form",
  "Commercial Invoice",
  "Packing List",
  "Insurance Certificate",
  "Certificate of Origin",
  "Delivery Confirmation",
  "Other Document",
];

export default function DocumentsManagement({ orders, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState({});

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.fulfillment_type === filter;
    return matchSearch && matchFilter;
  });

  const pickupOrders = filtered.filter((o) => o.fulfillment_type === "pickup");
  const mailOrders = filtered.filter((o) => o.fulfillment_type !== "pickup");

  const handleUpload = async (orderId, file, docType, shippingLabel) => {
    setUploading(`${orderId}:${docType}`);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const now = new Date().toISOString();
    const updates = {};

    if (docType === "pickup_id") {
      updates.pickup_id_url = file_url;
      updates.pickup_id_uploaded_at = now;
    } else if (docType === "pickup_signed") {
      updates.pickup_signed_doc_url = file_url;
      updates.pickup_signed_doc_uploaded_at = now;
      updates.status = "picked_up";
      updates.pickup_completed_at = now;
    } else if (docType === "shipping_doc") {
      const current = orders.find((o) => o.id === orderId);
      const existing = current?.shipping_documents || [];
      updates.shipping_documents = [
        ...existing,
        { url: file_url, label: shippingLabel || "Document", uploaded_at: now },
      ];
      // Auto-update status to shipped when first doc is uploaded
      if (!existing.length && current?.status !== "delivered") {
        updates.status = "shipped";
        updates.shipped_at = now;
      }
    }

    await base44.entities.Order.update(orderId, updates);
    await base44.entities.AuditLog.create({
      action: `Document uploaded (${docType}) for order`,
      entity_type: "Order",
      entity_id: orderId,
      category: "order",
      severity: "info",
      performed_by: "admin",
    });

    onRefresh();
    setUploading(null);
  };

  const handleDeleteShippingDoc = async (orderId, index) => {
    const current = orders.find((o) => o.id === orderId);
    const updated = (current?.shipping_documents || []).filter((_, i) => i !== index);
    await base44.entities.Order.update(orderId, { shipping_documents: updated });
    await base44.entities.AuditLog.create({
      action: `Shipping document removed from order`,
      entity_type: "Order",
      entity_id: orderId,
      category: "order",
      severity: "info",
      performed_by: "admin",
    });
    onRefresh();
  };

  const UploadBtn = ({ orderId, docType, label, ShippingIcon, shippingLabel }) => {
    const key = `${orderId}:${docType}`;
    const isLoading = uploading === key;
    return (
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-primary text-primary text-xs font-medium cursor-pointer hover:bg-primary/5 transition-colors">
        {isLoading ? (
          <><span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" /> Uploading...</>
        ) : (
          <>{ShippingIcon ? <ShippingIcon className="w-3 h-3" /> : <Upload className="w-3 h-3" />} {label}</>
        )}
        <input
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          disabled={isLoading}
          onChange={(e) => e.target.files[0] && handleUpload(orderId, e.target.files[0], docType, shippingLabel)}
        />
      </label>
    );
  };

  const DocSlot = ({ url, uploadedAt, label, SlotIcon, orderId, docType, replaceLabel }) => (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        {SlotIcon && <SlotIcon className="w-3.5 h-3.5" />} {label}
      </p>
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-green-500 hover:underline font-medium">
            <FileCheck className="w-3.5 h-3.5" /> View Document
          </a>
          {uploadedAt && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(uploadedAt).toLocaleDateString()}
            </span>
          )}
          <UploadBtn orderId={orderId} docType={docType} label={replaceLabel || "Replace"} />
        </div>
      ) : (
        <UploadBtn orderId={orderId} docType={docType} label={`Upload ${label}`} ShippingIcon={Upload} />
      )}
    </div>
  );

  const OrderRow = ({ order }) => {
    const isPickup = order.fulfillment_type === "pickup";
    const isOpen = expanded === order.id;
    const shippingDocs = order.shipping_documents || [];
    const chosenLabel = selectedLabel[order.id] || SHIPPING_DOC_LABELS[0];

    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/20 transition-colors text-left"
          onClick={() => setExpanded(isOpen ? null : order.id)}
        >
          {isOpen
            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold">{order.order_number}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${FULFILLMENT_COLORS[order.fulfillment_type] || "bg-gray-100 text-gray-700"}`}>
                {isPickup ? "In-Store Pickup" : "Mailed"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
                {order.status?.replace(/_/g, " ")}
              </span>
              {isPickup && order.pickup_id_url && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                  <CreditCard className="w-2.5 h-2.5" /> ID on file
                </span>
              )}
              {isPickup && order.pickup_signed_doc_url && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                  <FileSignature className="w-2.5 h-2.5" /> Signed doc on file
                </span>
              )}
              {!isPickup && shippingDocs.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5" /> {shippingDocs.length} shipping doc{shippingDocs.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.customer_name}</span>
              <span>{order.user_email}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-primary">${order.total?.toFixed(2)}</span>
        </button>

        {isOpen && (
          <div className="border-t border-border bg-secondary/10 px-5 py-5 space-y-5">
            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items</p>
              <div className="space-y-1">
                {order.items?.map((item, i) => (
                  <p key={i} className="text-sm flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {item.product_name} — <strong>${item.price?.toFixed(2)}</strong>
                    {item.family_member_name && <span className="text-xs text-muted-foreground">(for {item.family_member_name})</span>}
                  </p>
                ))}
              </div>
            </div>

            {/* PICKUP documents */}
            {isPickup && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pickup Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />{order.pickup_location}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pickup Person</p>
                    <p className="font-medium">{order.pickup_person_name} · {order.pickup_person_phone}</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Documents for Pickup Verification</p>
                  <DocSlot
                    url={order.pickup_id_url}
                    uploadedAt={order.pickup_id_uploaded_at}
                    label="Customer ID (National ID, Passport, or Driver's License)"
                    SlotIcon={CreditCard}
                    orderId={order.id}
                    docType="pickup_id"
                    replaceLabel="Replace ID"
                  />
                  <div className="border-t border-border" />
                  <DocSlot
                    url={order.pickup_signed_doc_url}
                    uploadedAt={order.pickup_signed_doc_uploaded_at}
                    label="Signed Pickup Authorization Form"
                    SlotIcon={FileSignature}
                    orderId={order.id}
                    docType="pickup_signed"
                    replaceLabel="Replace Signed Doc"
                  />
                  {(!order.pickup_id_url || !order.pickup_signed_doc_url) && (
                    <p className="text-[11px] text-amber-500">
                      ⚠ Both documents are required. Uploading the signed form auto-marks the order as Picked Up.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* MAIL documents */}
            {!isPickup && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Carrier</p>
                    <p className="font-medium flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-primary" />{order.carrier || "Not specified"}
                    </p>
                  </div>
                  {order.shipping_address && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Destination</p>
                      <p className="font-medium">{order.shipping_address.city}, {order.shipping_address.country}</p>
                      <p className="text-xs text-muted-foreground">{order.shipping_address.street}</p>
                    </div>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shipping Documents</p>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{shippingDocs.length} uploaded</span>
                  </div>

                  {/* Existing docs */}
                  {shippingDocs.length > 0 && (
                    <div className="space-y-2">
                      {shippingDocs.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 bg-secondary/40 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{doc.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-500 hover:underline flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5" /> View
                            </a>
                            <button
                              onClick={() => handleDeleteShippingDoc(order.id, i)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new doc */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Add New Document</p>
                    <div className="flex flex-wrap gap-2">
                      {SHIPPING_DOC_LABELS.map((lbl) => (
                        <button
                          key={lbl}
                          onClick={() => setSelectedLabel((s) => ({ ...s, [order.id]: lbl }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                            chosenLabel === lbl
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <UploadBtn
                      orderId={order.id}
                      docType="shipping_doc"
                      label={`Upload "${chosenLabel}"`}
                      ShippingIcon={PlusCircle}
                      shippingLabel={chosenLabel}
                    />
                    <p className="text-[11px] text-muted-foreground">Accepted: JPG, PNG, PDF — unlimited documents allowed per order.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search by order #, customer, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          {[["all", "All Orders"], ["pickup", "In-Store Pickup"], ["mail", "Mailed"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, color: "text-foreground" },
          { label: "Pickup Orders", value: orders.filter((o) => o.fulfillment_type === "pickup").length, color: "text-purple-400" },
          { label: "Mailed Orders", value: orders.filter((o) => o.fulfillment_type !== "pickup").length, color: "text-blue-400" },
          {
            label: "Pickup Docs Missing",
            value: orders.filter((o) => o.fulfillment_type === "pickup" && (!o.pickup_id_url || !o.pickup_signed_doc_url)).length,
            color: "text-amber-400",
          },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pickup section */}
      {(filter === "all" || filter === "pickup") && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">In-Store Pickup Orders</h3>
            <span className="text-xs text-muted-foreground">({pickupOrders.length})</span>
          </div>
          {pickupOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">No pickup orders found.</p>
          ) : (
            <div className="space-y-2">
              {pickupOrders.map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          )}
        </div>
      )}

      {/* Mail section */}
      {(filter === "all" || filter === "mail") && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Mailed / Shipped Orders</h3>
            <span className="text-xs text-muted-foreground">({mailOrders.length})</span>
          </div>
          {mailOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">No mailed orders found.</p>
          ) : (
            <div className="space-y-2">
              {mailOrders.map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}