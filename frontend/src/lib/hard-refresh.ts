export function hardRefreshPage(confirmMessage?: string) {
  if (typeof window === "undefined") return false;
  if (confirmMessage && !window.confirm(confirmMessage)) return false;
  window.location.reload();
  return true;
}

export const UNSAVED_REFRESH_WARNING = "Refresh this page?\n\nYour unsaved changes will be lost.";
