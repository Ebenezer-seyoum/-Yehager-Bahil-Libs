"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

const NOTICE_KEYS = ["created", "updated", "deleted", "error"] as const;

export function DashboardQueryToasts({
  entity = "record",
  messages,
}: {
  entity?: string;
  messages?: Partial<Record<(typeof NOTICE_KEYS)[number], { title: string; text: string }>>;
}) {
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = useSearchParams()!;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || handled.current === signature) return;

    const created = searchParams.get("created");
    const updated = searchParams.get("updated");
    const deleted = searchParams.get("deleted");
    const error = searchParams.get("error");
    const tab = searchParams.get("tab");

    let fired = false;
    const params = new URLSearchParams(searchParams.toString());

    if (created === "1") {
      const msg = messages?.created ?? {
        title: "Success",
        text: `${entity} created successfully.`,
      };
      void dashboardSuccess(msg.title, msg.text);
      params.delete("created");
      fired = true;
    } else if (updated) {
      const msg = messages?.updated ?? {
        title: "Success",
        text: `${entity} updated successfully.`,
      };
      void dashboardSuccess(msg.title, msg.text);
      params.delete("updated");
      fired = true;
    } else if (deleted === "1") {
      const msg = messages?.deleted ?? {
        title: "Success",
        text: `${entity} deleted successfully.`,
      };
      void dashboardSuccess(msg.title, msg.text);
      params.delete("deleted");
      fired = true;
    } else if (error && tab !== "create") {
      const msg = messages?.error ?? {
        title: "Error",
        text: `Please review the ${entity.toLowerCase()} details and try again.`,
      };
      void dashboardError(msg.title, msg.text);
      params.delete("error");
      fired = true;
    }

    if (fired) {
      handled.current = signature;
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [entity, messages, pathname, router, searchParams]);

  return null;
}
