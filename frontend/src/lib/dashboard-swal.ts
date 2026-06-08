"use client";

import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type ConfirmTone = "danger" | "success" | "warning" | "primary";
type NoticeTone = "success" | "error" | "warning" | "info";

function confirmClass(tone: ConfirmTone) {
  if (tone === "danger") return "dashboard-swal-confirm dashboard-swal-confirm-danger";
  if (tone === "success") return "dashboard-swal-confirm dashboard-swal-confirm-success";
  if (tone === "primary") return "dashboard-swal-confirm dashboard-swal-confirm-primary";
  return "dashboard-swal-confirm dashboard-swal-confirm-warning";
}

function iconClass(icon?: SweetAlertIcon) {
  if (icon === "success") return "dashboard-swal-icon dashboard-swal-icon-success";
  if (icon === "error") return "dashboard-swal-icon dashboard-swal-icon-danger";
  if (icon === "warning") return "dashboard-swal-icon dashboard-swal-icon-warning";
  return "dashboard-swal-icon";
}

function noticeClass(tone: NoticeTone) {
  if (tone === "success") return "dashboard-notice dashboard-notice-success";
  if (tone === "error") return "dashboard-notice dashboard-notice-error";
  if (tone === "warning") return "dashboard-notice dashboard-notice-warning";
  return "dashboard-notice dashboard-notice-info";
}

function noticeTitle(prefix: string, text?: string) {
  if (!text) return prefix;
  return `${prefix}! ${text}`;
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
      toast: true,
      position: "top-end",
      title: noticeTitle(title, text),
      timer: 30000,
      timerProgressBar: true,
      showConfirmButton: false,
      showCloseButton: true,
      target: options?.target,
      customClass: {
        popup: noticeClass("success"),
        title: "dashboard-notice-title",
        closeButton: "dashboard-notice-close",
      },
    }),
  );
}

export function dashboardError(title: string, text?: string, options?: { target?: HTMLElement | string }) {
  return Swal.fire(
    dashboardSwalOptions({
      toast: true,
      position: "top-end",
      title: noticeTitle(title, text),
      timer: 30000,
      timerProgressBar: true,
      showConfirmButton: false,
      showCloseButton: true,
      target: options?.target,
      customClass: {
        popup: noticeClass("error"),
        title: "dashboard-notice-title",
        closeButton: "dashboard-notice-close",
      },
    }),
  );
}

export function dashboardWarning(title: string, text?: string, options?: { target?: HTMLElement | string }) {
  return Swal.fire(
    dashboardSwalOptions({
      toast: true,
      position: "top-end",
      title: noticeTitle(title, text),
      timer: 3000,
      timerProgressBar: false,
      showConfirmButton: false,
      showCloseButton: true,
      target: options?.target,
      customClass: {
        popup: noticeClass("warning"),
        title: "dashboard-notice-title",
        closeButton: "dashboard-notice-close",
      },
    }),
  );
}

export function dashboardInfo(title: string, text?: string, options?: { target?: HTMLElement | string }) {
  return Swal.fire(
    dashboardSwalOptions({
      toast: true,
      position: "top-end",
      title: noticeTitle(title, text),
      timer: 3000,
      timerProgressBar: false,
      showConfirmButton: false,
      showCloseButton: true,
      target: options?.target,
      customClass: {
        popup: noticeClass("info"),
        title: "dashboard-notice-title",
        closeButton: "dashboard-notice-close",
      },
    }),
  );
}

export function dashboardAlert(
  title: string,
  text?: string,
  options?: { target?: HTMLElement | string; icon?: SweetAlertIcon; confirmButtonText?: string; tone?: ConfirmTone },
) {
  return Swal.fire(
    dashboardSwalOptions({
      icon: options?.icon ?? "info",
      title,
      text,
      showCancelButton: false,
      showConfirmButton: true,
      confirmButtonText: options?.confirmButtonText ?? "OK",
      target: options?.target,
      customClass: {
        popup: "dashboard-swal-popup",
        icon: iconClass(options?.icon),
        htmlContainer: "dashboard-swal-text",
        actions: "dashboard-swal-actions",
        confirmButton: options?.tone ? confirmClass(options.tone) : "dashboard-swal-confirm dashboard-swal-confirm-primary",
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
        htmlContainer: "dashboard-swal-text",
      },
    }),
  );
}

dashboardLoading.close = () => {
  Swal.close();
};

export function dashboardValidationError(
  target: HTMLElement | string,
  message: string,
  options?: { persistent?: boolean; id?: string },
) {
  if (typeof window === "undefined") return null;
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el || !(el instanceof HTMLElement)) return null;

  // remove existing with same id
  if (options?.id) {
    const prev = el.parentElement?.querySelector(`#${options.id}`);
    if (prev) prev.remove();
  }

  const wrapper = document.createElement("div");
  if (options?.id) wrapper.id = options.id;
  wrapper.className = "dashboard-validation-error";
  wrapper.textContent = message;

  // insert just after the target element
  if (el.nextSibling) el.parentElement?.insertBefore(wrapper, el.nextSibling);
  else el.parentElement?.appendChild(wrapper);

  if (!options?.persistent) {
    setTimeout(() => wrapper.remove(), 5000);
  }

  return wrapper;
}

export function dashboardClearValidationError(target: HTMLElement | string, id?: string) {
  if (typeof window === "undefined") return;
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el || !(el instanceof HTMLElement)) return;
  if (id) {
    const prev = el.parentElement?.querySelector(`#${id}`);
    if (prev) prev.remove();
    return;
  }
  const next = el.parentElement?.querySelector(".dashboard-validation-error");
  if (next) next.remove();
}
