"use client";

import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type ConfirmTone = "danger" | "success" | "warning";

function confirmClass(tone: ConfirmTone) {
  if (tone === "danger") return "dashboard-swal-confirm dashboard-swal-confirm-danger";
  if (tone === "success") return "dashboard-swal-confirm dashboard-swal-confirm-success";
  return "dashboard-swal-confirm dashboard-swal-confirm-warning";
}

export function dashboardSwalOptions(options: SweetAlertOptions = {}): SweetAlertOptions {
  return {
    width: 448,
    background: "#ffffff",
    color: "#111827",
    buttonsStyling: false,
    reverseButtons: true,
    showClass: { popup: "swal2-show" },
    hideClass: { popup: "swal2-hide" },
    customClass: {
      popup: "dashboard-swal-popup",
      icon: "dashboard-swal-icon",
      title: "dashboard-swal-title",
      htmlContainer: "dashboard-swal-text",
      actions: "dashboard-swal-actions",
      confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
      cancelButton: "dashboard-swal-cancel",
      ...(options.customClass ?? {}),
    },
    ...options,
  };
}

export async function dashboardConfirm({
  title,
  text,
  confirmButtonText,
  cancelButtonText = "No, cancel",
  tone = "danger",
  icon = "warning",
}: {
  title: string;
  text: string;
  confirmButtonText: string;
  cancelButtonText?: string;
  tone?: ConfirmTone;
  icon?: SweetAlertIcon;
}) {
  const result = await Swal.fire(
    dashboardSwalOptions({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        confirmButton: confirmClass(tone),
        cancelButton: "dashboard-swal-cancel",
      },
    }),
  );
  return result.isConfirmed;
}

export function dashboardSuccess(title: string, text?: string) {
  return Swal.fire(
    dashboardSwalOptions({
      icon: "success",
      title,
      text,
      confirmButtonText: "OK",
      customClass: {
        icon: "dashboard-swal-icon dashboard-swal-icon-success",
        confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
      },
    }),
  );
}

export function dashboardError(title: string, text?: string) {
  return Swal.fire(
    dashboardSwalOptions({
      icon: "error",
      title,
      text,
      confirmButtonText: "OK",
      customClass: {
        icon: "dashboard-swal-icon dashboard-swal-icon-danger",
        confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-danger",
      },
    }),
  );
}
