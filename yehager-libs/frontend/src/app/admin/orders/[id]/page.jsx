import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CreditCard, FileCheck, MapPin, Package, Truck, UserRound } from "lucide-react";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

const ORDER_STATUS_OPTIONS = [
  "pending",
  "processing",
  "fulfilled",
  "tailoring",
  "quality_check",
  "shipped",
  "delivered",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
];
const PAYMENT_STATUS_OPTIONS = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-slate-100 text-slate-700",
  fulfilled: "bg-green-100 text-green-800",
  tailoring: "bg-blue-100 text-blue-700",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-emerald-100 text-emerald-800",
  delivered: "bg-green-200 text-green-900",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_verification: "bg-yellow-100 text-yellow-900",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
  unpaid: "bg-orange-100 text-orange-800",
};

function prettyJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function prettyLabel(value) {
  return String(value ?? "pending").replaceAll("_", " ");
}

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function InfoCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-base font-black">{value}</p>
          {helper ? <p className="mt-1 text-sm text-muted-foreground">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;
  const query = (await searchParams) ?? {};

  async function updateAdminState(formData) {
    "use server";
    const status = String(formData.get("status") ?? "").trim();
    const paymentStatus = String(formData.get("paymentStatus") ?? "").trim();
    const fulfillmentType = String(formData.get("fulfillmentType") ?? "").trim();

    try {
      await apiRequest(`/api/v1/orders/${id}/admin-state`, {
        method: "PATCH",
        body: {
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          fulfillmentType: fulfillmentType || undefined,
        },
      });

      revalidatePath(`/admin/orders/${id}`);
      revalidatePath("/admin/orders");
      revalidatePath("/admin");
      revalidatePath("/admin/audit");
      redirect(`/admin/orders/${id}?saved=1`);
    } catch {
      redirect(`/admin/orders/${id}?error=1`);
    }
  }

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? null;
  } catch {
    order = null;
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Order {order.orderNumber ?? order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Detailed order review, payment state, fulfillment, and documents.</p>
        </div>
        <Link href="/admin/orders" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-primary hover:bg-secondary">
          Back to Orders
        </Link>
      </div>

      {query.saved === "1" ? <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-primary">Order state updated successfully.</div> : null}
      {query.error === "1" ? <div className="rounded-xl border border-destructive/40 bg-card p-3 text-sm text-destructive">Could not update order state. Verify values and try again.</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={UserRound} label="Customer" value={order.customerName ?? "Customer"} helper={order.userEmail ?? "No email"} />
        <InfoCard icon={Package} label="Order total" value={formatUsd(order.totalUsd)} helper={order.paymentCurrency === "ETB" && order.totalEtb ? `${Number(order.totalEtb).toLocaleString()} ETB` : "USD order"} />
        <InfoCard icon={CreditCard} label="Payment" value={prettyLabel(order.paymentStatus)} helper={`${order.paymentMethod ?? "method pending"} · ${order.paymentCurrency ?? "USD"}`} />
        <InfoCard icon={Truck} label="Fulfillment" value={prettyLabel(order.fulfillmentType ?? "mail")} helper={`Order status: ${prettyLabel(order.status)}`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Order status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black capitalize ${STATUS_STYLES[order.status ?? "pending"] ?? "bg-slate-100 text-slate-700"}`}>
            {prettyLabel(order.status)}
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Payment status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black capitalize ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? "bg-slate-100 text-slate-700"}`}>
            {prettyLabel(order.paymentStatus)}
          </span>
          {order.paymentStatus === "awaiting_verification" ? (
            <p className="mt-3 text-sm font-medium text-amber-700">This remains in notifications until payment is approved or rejected.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold">Admin Actions</h2>
        <form action={updateAdminState} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Order Status</span>
            <select name="status" defaultValue={order.status ?? "pending"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              {ORDER_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{prettyLabel(option)}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Payment Status</span>
            <select name="paymentStatus" defaultValue={order.paymentStatus ?? "pending"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{prettyLabel(option)}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Fulfillment</span>
            <select name="fulfillmentType" defaultValue={order.fulfillmentType ?? "mail"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              <option value="mail">Mail</option>
              <option value="pickup">Pickup</option>
            </select>
          </label>
          <button type="submit" className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Save Changes
          </button>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-xl font-semibold">Items</h2>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {order.items.map((item, index) => (
                <div key={`${item.productId ?? item.id ?? index}`} className="rounded-xl border border-border bg-background p-3">
                  <p className="font-bold">{item.productName ?? item.name ?? `Item ${index + 1}`}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity ?? 1}{item.price ? ` · ${formatUsd(item.price)}` : ""}</p>
                  {item.measurements ? <pre className="mt-2 overflow-auto rounded-lg bg-secondary/50 p-2 text-xs">{prettyJson(item.measurements)}</pre> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No items found.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-xl font-semibold">Shipping / Fulfillment</h2>
          {order.fulfillmentType === "pickup" ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-primary" /> Pickup order</p>
              <p><span className="text-muted-foreground">Location:</span> {order.pickupLocation ?? "Not set"}</p>
              <p><span className="text-muted-foreground">Pickup person:</span> {order.pickupPersonName ?? "Not set"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {order.pickupPersonPhone ?? "Not set"}</p>
            </div>
          ) : (
            <pre className="mt-3 overflow-auto rounded-md bg-secondary/40 p-3 text-xs">{prettyJson(order.shippingAddress)}</pre>
          )}
        </div>
      </div>

      {order.paymentCurrency === "ETB" || order.paymentProofUrl ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <h2 className="font-heading text-xl font-semibold">Payment Proof</h2>
          <p className="mt-1 text-sm text-amber-800">Review uploaded bank transfer proof here, then use Admin Actions to approve or reject the payment.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white px-3 py-1 font-bold">Method: {order.paymentMethod ?? "ETB transfer"}</span>
            <span className="rounded-full bg-white px-3 py-1 font-bold">Amount: {order.totalEtb ? `${Number(order.totalEtb).toLocaleString()} ETB` : formatUsd(order.totalUsd)}</span>
            {order.etbExchangeRate ? <span className="rounded-full bg-white px-3 py-1 font-bold">Rate: 1 USD = {Number(order.etbExchangeRate).toLocaleString()} ETB</span> : null}
          </div>
          {order.paymentProofUrl ? (
            <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              <FileCheck className="h-4 w-4" />
              View payment proof
            </a>
          ) : (
            <p className="mt-4 text-sm font-bold text-amber-800">No proof uploaded yet.</p>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">Document upload and verification is managed from the dedicated Order Documents page.</p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Pickup ID:</span> {order.pickupIdUrl ? <a href={order.pickupIdUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}</p>
          <p><span className="text-muted-foreground">Signed Pickup:</span> {order.pickupSignedDocUrl ? <a href={order.pickupSignedDocUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}</p>
          <p><span className="text-muted-foreground">Pickup Proof:</span> {order.pickupProofUrl ? <a href={order.pickupProofUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}</p>
          <p><span className="text-muted-foreground">Shipping Docs:</span> {(order.shippingDocuments ?? []).length}</p>
        </div>
        {(order.shippingDocuments ?? []).length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {(order.shippingDocuments ?? []).map((doc, index) => (
              <a key={`${doc.url}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary hover:underline">
                {doc.label ?? `Document ${index + 1}`}
              </a>
            ))}
          </div>
        ) : null}
        <Link href="/admin/orders/documents" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Manage Order Documents
        </Link>
      </div>
    </div>
  );
}
