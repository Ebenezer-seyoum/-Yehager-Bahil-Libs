import Link from "next/link";
import { backendPublicRequest } from "@/lib/backend-public";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { ShareLinks } from "@/components/share-links";
import { RefreshLink } from "@/components/refresh-link";

type Event = {
  id: string;
  name: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  eventCode?: string | null;
  eventDate?: string | null;
  message?: string | null;
  productId?: string | null;
  productName?: string | null;
  selectionType?: string | null;
  uploadedDesignId?: string | null;
};

type Participant = {
  id: string;
  participantName?: string | null;
  participantEmail?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
};

type FamilyGroup = {
  id: string;
  groupName?: string | null;
  leadEmail?: string | null;
  leadName?: string | null;
};

type FamilyMember = {
  id: string;
  familyGroupId?: string | null;
  name?: string | null;
  relation?: string | null;
};

type Order = {
  id: string;
  userEmail?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
};
type SelectedDesign = {
  status?: string | null;
  submissionNumber?: string | null;
  quotedPriceUsd?: number | string | null;
  estimatedDeliveryLabel?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  browsing: "bg-gray-100 text-gray-700",
  added_to_cart: "bg-yellow-100 text-yellow-700",
  ordered: "bg-blue-100 text-blue-700",
  tailoring: "bg-purple-100 text-purple-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
};

const PAYMENT_STYLES: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800",
};

export default async function EventDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  let event: Event | null = null;
  let participants: Participant[] = [];
  let familyGroups: FamilyGroup[] = [];
  let familyMembers: FamilyMember[] = [];
  let orders: Order[] = [];
  let authRequired = false;
  let selectedDesign: SelectedDesign | null = null;

  try {
    const eventRes = await backendPublicRequest(`/api/v1/events/${id}`);
    event = eventRes?.data ?? null;
  } catch {
    event = null;
  }

  try {
    await ensureBackendUserSynced();
    const dashboardRes = await apiRequest<{
      data: {
        participants: Participant[];
        familyGroups: FamilyGroup[];
        familyMembers: FamilyMember[];
        orders: Order[];
        selectedDesign?: SelectedDesign | null;
      };
    }>(`/api/v1/events/${id}/dashboard`);
    participants = Array.isArray(dashboardRes?.data?.participants) ? dashboardRes.data.participants : [];
    familyGroups = Array.isArray(dashboardRes?.data?.familyGroups) ? dashboardRes.data.familyGroups : [];
    familyMembers = Array.isArray(dashboardRes?.data?.familyMembers) ? dashboardRes.data.familyMembers : [];
    orders = Array.isArray(dashboardRes?.data?.orders) ? dashboardRes.data.orders : [];
    selectedDesign = dashboardRes?.data?.selectedDesign ?? null;
  } catch {
    authRequired = true;
    participants = [];
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  const eventLink = `/join/${event.id}`;
  const publicEventUrl = `${process.env.NEXTAUTH_URL ?? ""}${eventLink}`;
  const ordered = participants.filter((p) => ["ordered", "tailoring", "shipped", "delivered"].includes(p.orderStatus ?? "")).length;
  const paid = participants.filter((p) => p.paymentStatus === "paid").length;
  const pendingMembers = participants.filter((participant) => {
    const order = orders.find((entry) => entry.userEmail === participant.participantEmail);
    return !(participant.paymentStatus === "paid" || order?.paymentStatus === "paid");
  });

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-3xl bg-[#f4f4f4] p-8 text-black sm:p-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">Event Dashboard</p>
        <h1 className="font-heading text-4xl font-bold sm:text-6xl">{event.name}</h1>
        <div className="mt-5 flex flex-wrap gap-6 text-sm text-slate-600">
          {event.eventCode ? <span className="rounded bg-white/10 px-2 py-1 font-mono text-xs">{event.eventCode}</span> : null}
          {event.eventDate ? <span>{new Date(event.eventDate).toLocaleDateString()}</span> : null}
          <span>{participants.length} joined</span>
        </div>
        {event.productName && event.productId ? (
          <p className="mt-5 text-lg text-slate-700">
            Featured:{" "}
            <Link href={`/product/${event.productId}`} className="font-medium text-primary hover:underline">
              {event.productName}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Participant and order data refreshes on demand in the new system.</p>
        <RefreshLink />
      </div>

      <div className="grid gap-4 rounded-3xl bg-[#f4f4f4] p-7 text-black sm:grid-cols-4">
        {[
          ["1", "Choose outfit", Boolean(event.productId || event.uploadedDesignId)],
          ["2", "Share invite link", Boolean(event.productId || event.uploadedDesignId)],
          ["3", "Members join", participants.length > 0],
          ["4", "Track orders", ordered > 0],
        ].map(([number, label, complete]) => (
          <div key={String(label)} className={`rounded-xl px-3 py-4 text-center text-sm ${complete ? "bg-primary/15 text-black" : "bg-white text-slate-500"}`}>
            <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-black">{number}</span>
            {label}
          </div>
        ))}
      </div>

      <div id="event-outfit" className="scroll-mt-24 rounded-xl border border-blue-950/15 bg-white p-5 text-slate-900 shadow-sm">
        {typeof query?.selected === "string" ? (
          <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {query.selected === "custom-design" ? "Custom design submitted successfully." : "Catalog product selected successfully."}
          </div>
        ) : null}
        <p className="text-xs font-bold uppercase tracking-widest text-blue-950">Event Match-Up Outfit</p>
        <h2 className="mt-1 text-xl font-semibold">{event.productName ?? "Choose what everyone will order"}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {event.selectionType === "custom_design"
            ? selectedDesign?.status === "awaiting_payment"
              ? "Custom design approved and ready for participant payments."
              : "Custom design selected and awaiting admin review and price quote."
            : event.productId
              ? "Catalog product selected successfully. Participants who join inherit this selection automatically."
              : "Choose one catalog product or submit a custom design. Participants who join inherit this selection automatically."}
        </p>
        {event.productId || event.uploadedDesignId ? (
          <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            {event.selectionType === "custom_design" ? "Custom Design Submitted Successfully" : "Catalog Product Selected Successfully"}
          </span>
        ) : null}
        {selectedDesign ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 font-semibold ${selectedDesign.status === "awaiting_payment" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {selectedDesign.status === "awaiting_payment" ? "Ready for Payment" : "Awaiting Design Review"}
            </span>
            {selectedDesign.submissionNumber ? <span className="rounded-full bg-slate-100 px-3 py-1">{selectedDesign.submissionNumber}</span> : null}
            {selectedDesign.quotedPriceUsd ? <span className="rounded-full bg-slate-100 px-3 py-1">${Number(selectedDesign.quotedPriceUsd).toFixed(2)} per member</span> : null}
            {selectedDesign.estimatedDeliveryLabel ? <span className="rounded-full bg-slate-100 px-3 py-1">{selectedDesign.estimatedDeliveryLabel}</span> : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/catalog?selectionMode=event&eventId=${event.id}`} className="rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Select Catalog Product
          </Link>
          <Link href={`/upload-your-design?eventId=${event.id}`} className="rounded-lg border border-blue-950 px-4 py-2.5 text-sm font-semibold text-blue-950 hover:bg-blue-50">
            Submit Custom Design
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          ["Participants", participants.length],
          ["Orders Placed", ordered],
          ["Paid", paid],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-heading text-3xl font-bold">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div id="share-event" className="scroll-mt-24 rounded-2xl border border-border bg-card p-7">
        <h3 className="font-heading text-2xl font-semibold">Share Your Event</h3>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicEventUrl)}`}
              alt="Event QR code"
              className="h-40 w-40"
            />
          </div>
          <div className="flex-1">
            <ShareLinks url={publicEventUrl} title={`Join ${event.name}`} inline />
          </div>
        </div>
      </div>

      {pendingMembers.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h3 className="text-sm font-semibold text-amber-700">{pendingMembers.length} participant(s) have not completed payment yet</h3>
          <div className="mt-3 space-y-2">
            {pendingMembers.map((member) => {
              const group = familyGroups.find((entry) => entry.leadEmail === member.participantEmail);
              const order = orders.find((entry) => entry.userEmail === member.participantEmail);
              return (
                <div key={member.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{member.participantName}</span>
                  <span className="text-muted-foreground">{member.participantEmail}</span>
                  <span className={`rounded-full px-2 py-0.5 ${group ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {group ? "Family group created" : "No family group"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${order ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {order ? "Order placed" : "No order"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {familyGroups.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h3 className="font-heading text-lg font-semibold">Family Groups</h3>
            <p className="mt-1 text-xs text-muted-foreground">{familyGroups.length} household(s) joined this event.</p>
          </div>
          <div className="divide-y divide-border">
            {familyGroups.map((group) => {
              const members = familyMembers.filter((member) => member.familyGroupId === group.id);
              const order = orders.find((entry) => entry.userEmail === group.leadEmail);
              return (
                <div key={group.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{group.groupName}</p>
                      <p className="text-xs text-muted-foreground">Lead: {group.leadName} · {members.length} member(s)</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${order?.paymentStatus === "paid" ? "bg-green-100 text-green-700" : order ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {order?.paymentStatus === "paid" ? "Paid" : order ? "Order placed" : "Pending"}
                    </span>
                  </div>
                  {members.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {members.map((member) => (
                        <span key={member.id} className="rounded-lg bg-secondary px-2.5 py-1 text-xs">
                          {member.name}{member.relation ? ` (${member.relation})` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div id="member-tracking" className="scroll-mt-24 rounded-2xl border border-border bg-card p-7">
        <h3 className="font-heading text-2xl font-semibold">Member Tracking</h3>
        {authRequired ? (
          <p className="mt-2 text-sm text-muted-foreground">Sign in to see participant details.</p>
        ) : participants.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No participants yet. Share your event link above.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Member</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Order Status</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Payment</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, index) => (
                  <tr key={participant.id} className={`border-b border-border last:border-0 ${index % 2 === 0 ? "" : "bg-secondary/20"}`}>
                    <td className="p-3">
                      <p className="text-sm font-medium">{participant.participantName}</p>
                      <p className="text-xs text-muted-foreground">{participant.participantEmail}</p>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[participant.orderStatus ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                        {participant.orderStatus ?? "browsing"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STYLES[participant.paymentStatus ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                        {participant.paymentStatus ?? "unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
