import { dashboardConfirm } from "@/lib/dashboard-swal";

export async function hardRefreshPage(confirmMessage?: string) {
  if (typeof window === "undefined") return false;
  if (confirmMessage) {
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: confirmMessage,
      confirmButtonText: "Yes, Refresh",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return false;
  }
  window.location.reload();
  return true;
}

export const UNSAVED_REFRESH_WARNING = "Your unsaved changes will be lost.";
