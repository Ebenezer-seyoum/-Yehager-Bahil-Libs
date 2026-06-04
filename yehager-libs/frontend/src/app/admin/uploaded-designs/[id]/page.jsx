import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminUploadedDesignReviewActions } from "@/components/admin-uploaded-design-review-actions";
import { AdminUploadedDesignViewedRefresh } from "@/components/admin-uploaded-design-viewed-refresh";

export default async function AdminUploadedDesignDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/uploaded-designs");
  if (session.user.role !== "admin") redirect("/");

  const { id } = await params;
  let design = null;
  try {
    const response = await apiRequest(`/api/v1/uploaded-designs/admin/${id}`);
    design = response?.data ?? null;
  } catch {
    design = null;
  }

  if (!design) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-muted-foreground">Custom design not found.</p>
      </div>
    );
  }

  const imageUrls = [design.frontImageUrl, design.sideImageUrl, design.backImageUrl, design.detailImageUrl].filter(Boolean);
  const measurement = design.measurementSnapshot ?? {};
  const contactAddress = design.contactAddress ?? {};

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <AdminUploadedDesignViewedRefresh />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{design.submissionNumber}</p>
          <h1 className="font-heading text-3xl font-bold">{design.designTitle}</h1>
        </div>
        <Link href="/admin/uploaded-designs" className="rounded-md border border-border px-3 py-2 text-sm">
          Back to list
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Uploaded references</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                  <img src={url} alt="Custom design reference" className="h-48 w-full object-cover" />
                </a>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Design details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Fabric Type" value={design.fabricType} />
              <Field label="Embroidery Style" value={design.embroideryStyle} />
              <Field label="Color Preference" value={design.colorPreference} />
              <Field label="Status" value={design.status} />
              <Field label="Quoted Price" value={design.quotedPriceUsd ? `$${Number(design.quotedPriceUsd).toFixed(2)}` : "—"} />
              <Field label="Customer" value={design.customerName} />
              <Field label="Email" value={design.userEmail} />
              <Field label="Cart Item" value={design.approvedCartItemId} />
              <Field label="Order" value={design.approvedOrderId} />
            </div>
            <Field label="Tailor Notes" value={design.inspirationNote} multiline />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Measurements</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Object.entries(measurement).map(([key, value]) => (
                <Field key={key} label={key} value={String(value)} />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Contact</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Phone:</span> {design.contactPhone ?? "—"}</div>
              <div><span className="text-muted-foreground">Telegram:</span> {design.contactTelegram ?? "—"}</div>
              <div><span className="text-muted-foreground">Street:</span> {contactAddress.street ?? "—"}</div>
              <div><span className="text-muted-foreground">City:</span> {contactAddress.city ?? "—"}</div>
              <div><span className="text-muted-foreground">Country:</span> {contactAddress.country ?? "—"}</div>
            </div>
          </section>

          <AdminUploadedDesignReviewActions designId={design.id} currentStatus={design.status} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, multiline = false }) {
  return (
    <div className={multiline ? "mt-3" : ""}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${multiline ? "rounded-md border border-border bg-secondary/30 p-3 whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
