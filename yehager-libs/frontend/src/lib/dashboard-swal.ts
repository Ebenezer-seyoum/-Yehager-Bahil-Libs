"use client";

import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type ConfirmTone = "danger" | "success" | "warning";

function confirmClass(tone: ConfirmTone) {
  if (tone === "danger") return "dashboard-swal-confirm dashboard-swal-confirm-danger";
  if (tone === "success") return "dashboard-swal-confirm dashboard-swal-confirm-success";
  return "dashboard-swal-confirm dashboard-swal-confirm-warning";
}

function iconClass(icon?: SweetAlertIcon) {
  if (icon === "success") return "dashboard-swal-icon dashboard-swal-icon-success";
  if (icon === "error") return "dashboard-swal-icon dashboard-swal-icon-danger";
  if (icon === "warning") return "dashboard-swal-icon dashboard-swal-icon-warning";
  return "dashboard-swal-icon";
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
  variant = "default",
  target,
}: {
  title: string;
  text: string;
  confirmButtonText: string;
  cancelButtonText?: string;
  tone?: ConfirmTone;
  icon?: SweetAlertIcon;
  variant?: "default" | "payment";
  target?: HTMLElement | string;
}) {
  const isPayment = variant === "payment";
  const result = await Swal.fire(
    dashboardSwalOptions({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      target,
      customClass: {
        popup: isPayment ? "payment-swal-popup" : "dashboard-swal-popup",
        icon: isPayment ? "dashboard-swal-icon dashboard-swal-icon-warning" : iconClass(icon),
        title: isPayment ? "payment-swal-title" : "dashboard-swal-title",
        htmlContainer: isPayment ? "payment-swal-text" : "dashboard-swal-text",
        actions: isPayment ? "payment-swal-popup swal2-actions" : "dashboard-swal-actions",
        confirmButton: confirmClass(tone),
        cancelButton: "dashboard-swal-cancel",
      },
    }),
  );
  return result.isConfirmed;
}

export function dashboardSuccess(
  title: string,
  text?: string,
  options?: { target?: HTMLElement | string; iconHtml?: string },
) {
  return Swal.fire(
    dashboardSwalOptions({
      icon: "success",
      iconHtml: options?.iconHtml,
      title,
      text,
      confirmButtonText: "OK",
      target: options?.target,
      customClass: {
        popup: "dashboard-swal-popup",
        icon: "dashboard-swal-icon dashboard-swal-icon-success",
        title: "dashboard-swal-title",
        htmlContainer: "dashboard-swal-text",
        actions: "dashboard-swal-actions",
        confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-success",
        cancelButton: "dashboard-swal-cancel",
      },
    }),
  );
}

export function dashboardError(title: string, text?: string, options?: { target?: HTMLElement | string }) {
  return Swal.fire(
    dashboardSwalOptions({
      icon: "error",
      title,
      text,
      confirmButtonText: "OK",
      target: options?.target,
      customClass: {
        popup: "dashboard-swal-popup",
        icon: "dashboard-swal-icon dashboard-swal-icon-danger",
        title: "dashboard-swal-title",
        htmlContainer: "dashboard-swal-text",
        actions: "dashboard-swal-actions",
        confirmButton: "dashboard-swal-confirm dashboard-swal-confirm-danger",
        cancelButton: "dashboard-swal-cancel",
      },
    }),
  );
}

export function dashboardLoading(title: string, text?: string, options?: { target?: HTMLElement | string }) {
  return Swal.fire(
    dashboardSwalOptions({
      title,
      text,
      target: options?.target,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      showCancelButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: "dashboard-swal-popup",
        title: "dashboard-swal-title",
        htmlContainer: "dashboard-swal-text",
      },
    }),
  );
}

dashboardLoading.close = () => {
  Swal.close();
};
