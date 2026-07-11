"use client";

import { toast } from "sonner";

export function customerToast(message: string, description?: string, type: "error" | "success" = "error") {
  toast(message, {
    description,
    duration: type === "error" ? 4200 : 3200,
    className:
      type === "error"
        ? "!border-red-950 !bg-[#4a0505] !text-red-50"
        : "!border-emerald-900 !bg-emerald-950 !text-emerald-50",
    descriptionClassName: type === "error" ? "!text-red-100" : "!text-emerald-100",
  });
}
