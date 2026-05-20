import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function prettyJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

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

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

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
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Order {order.orderNumber ?? order.id}</h1>
        </div>
        <Link href="/admin/orders" className="text-sm text-primary hover:underline">
          Back to Orders
        </Link>
      </div>
      {query.saved === "1" ? (
        <div className="rounded-md border border-border bg-card p-3 text-sm text-primary">Order state updated successfully.</div>
      ) : null}
      {query.error === "1" ? (
        <div className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">
          Could not update order state. Verify values and try again.
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Customer:</span> {order.customerName ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span> {order.userEmail ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Status:</span> {order.status ?? "pending"}
        </p>
        <p>
          <span className="text-muted-foreground">Payment:</span> {order.paymentStatus ?? "pending"}
        </p>
        <p>
          <span className="text-muted-foreground">Method:</span> {order.paymentMethod ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Currency:</span> {order.paymentCurrency ?? "USD"}
        </p>
        {order.paymentCurrency === "ETB" ? (
          <>
            <p>
              <span className="text-muted-foreground">ETB Total:</span> {Number(order.totalEtb ?? 0).toLocaleString()} ETB
            </p>
            <p>
              <span className="text-muted-foreground">Exchange Rate:</span>{" "}
              {order.etbExchangeRate ? `1 USD = ${Number(order.etbExchangeRate).toLocaleString()} ETB` : "—"}
            </p>
          </>
        ) : null}
        {order.paymentProofUrl ? (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">ETB Proof:</span>{" "}
            <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
              View payment proof
            </a>
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Admin Actions</h2>
        <form action={updateAdminState} className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Order Status</span>
            <select name="status" defaultValue={order.status ?? "pending"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Payment Status</span>
            <select name="paymentStatus" defaultValue={order.paymentStatus ?? "pending"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Fulfillment</span>
            <select name="fulfillmentType" defaultValue={order.fulfillmentType ?? "mail"} className="h-10 w-full rounded-md border border-input bg-background px-3">
              <option value="mail">mail</option>
              <option value="pickup">pickup</option>
            </select>
          </label>
          <button type="submit" className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Save Changes
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Items</h2>
        {Array.isArray(order.items) && order.items.length > 0 ? (
          <pre className="mt-3 overflow-auto rounded-md bg-secondary/40 p-3 text-xs">{prettyJson(order.items)}</pre>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No items found.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Shipping / Fulfillment</h2>
        <pre className="mt-3 overflow-auto rounded-md bg-secondary/40 p-3 text-xs">{prettyJson(order.shippingAddress)}</pre>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">Document upload and verification is managed from the dedicated Order Documents page.</p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Pickup ID:</span>{" "}
            {order.pickupIdUrl ? <a href={order.pickupIdUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}
          </p>
          <p>
            <span className="text-muted-foreground">Signed Pickup:</span>{" "}
            {order.pickupSignedDocUrl ? <a href={order.pickupSignedDocUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}
          </p>
          <p>
            <span className="text-muted-foreground">Pickup Proof:</span>{" "}
            {order.pickupProofUrl ? <a href={order.pickupProofUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "Not uploaded"}
          </p>
          <p>
            <span className="text-muted-foreground">Shipping Docs:</span> {(order.shippingDocuments ?? []).length}
          </p>
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
