"use client";

import { CalendarDays, Loader2, Tag, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

type CreateGroupOrderModalProps = {
  onClose: () => void;
};

export function CreateGroupOrderModal({ onClose }: CreateGroupOrderModalProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const trimmedGroupName = groupName.trim();
    if (!trimmedGroupName) {
      setError("Please enter a group name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/backend/family-groups/create-group-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupName: trimmedGroupName,
          eventCode: eventCode.trim().toUpperCase(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: { id?: string }; error?: string } | null;

      if (response.status === 401) {
        const callbackUrl = `/create-family-group?groupName=${encodeURIComponent(trimmedGroupName)}${eventCode.trim() ? `&eventCode=${encodeURIComponent(eventCode.trim().toUpperCase())}` : ""}`;
        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      if (!response.ok || !payload?.data?.id) {
        setError(payload?.error ?? "Could not create group order.");
        setLoading(false);
        return;
      }

      onClose();
      router.push(`/family-group/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("Could not create group order. Please try again.");
      setLoading(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid min-h-dvh place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Create Group Order</h2>
              <p className="text-xs text-muted-foreground">Dress your whole family together</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Group Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. The Johnson Family"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreate();
                }}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Event Code <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 font-mono text-sm uppercase transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. WED2025"
                value={eventCode}
                onChange={(event) => setEventCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreate();
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Enter an event code if you&apos;re ordering for a wedding, graduation, or group event.
            </p>
          </div>

          <div className="rounded-xl bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> After creating your group, you&apos;ll add each family member with their name, gender, and measurements. Then browse and assign outfits, and checkout together in one order.
          </div>

          {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">{error}</p> : null}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Create Group
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
