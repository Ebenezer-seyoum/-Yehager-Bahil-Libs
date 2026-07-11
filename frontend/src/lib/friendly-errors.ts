type FriendlyErrorOptions = {
  fallback?: string;
  context?: "upload" | "save" | "load" | "delete" | "auth" | "default";
};

const DEFAULT_MESSAGES = {
  default: "Something went wrong. Please try again.",
  upload: "We could not upload your file. Please check your connection and try again.",
  save: "We could not save your changes. Please try again.",
  load: "We could not load the latest information. Please refresh and try again.",
  delete: "We could not delete this item. Please try again.",
  auth: "Please sign in again to continue.",
};

function contextFallback(context: FriendlyErrorOptions["context"], fallback?: string) {
  return fallback ?? DEFAULT_MESSAGES[context ?? "default"];
}

function extractBackendMessage(raw: string) {
  const apiMatch = raw.match(/^API error\s+(\d{3}):\s*([\s\S]*)$/i);
  if (!apiMatch) return { status: null, message: raw.trim() };

  const status = Number(apiMatch[1]);
  const body = apiMatch[2]?.trim() ?? "";
  if (!body) return { status, message: "" };

  try {
    const parsed = JSON.parse(body) as {
      error?: string | { message?: string };
      message?: string;
    };
    const nested = typeof parsed.error === "object" ? parsed.error?.message : parsed.error;
    return { status, message: (parsed.message ?? nested ?? "").trim() };
  } catch {
    return { status, message: body };
  }
}

function isTechnicalMessage(message: string) {
  return (
    /^internal server error$/i.test(message) ||
    /^unknown error$/i.test(message) ||
    /^something went wrong$/i.test(message) ||
    /^failed to fetch$/i.test(message) ||
    /^fetch failed$/i.test(message) ||
    /BACKEND_API_URL|DATABASE_URL|NEXTAUTH_SECRET|AUTH_SHARED_JWT/i.test(message) ||
    /EPERM|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(message) ||
    message.includes("[object Object]") ||
    message.trim().startsWith("{")
  );
}

function statusMessage(status: number | null, fallback: string) {
  switch (status) {
    case 400:
      return "Please check the information and try again.";
    case 401:
      return "Please sign in again to continue.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "We could not find the requested item. It may have been moved or deleted.";
    case 409:
      return "This action conflicts with existing information. Please review and try again.";
    case 413:
      return "One or more files are too large. Please upload smaller files.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The service is temporarily unavailable. Please try again in a moment.";
    default:
      return fallback;
  }
}

export function friendlyErrorMessage(error: unknown, options: FriendlyErrorOptions = {}) {
  const fallback = contextFallback(options.context, options.fallback);
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = raw.trim();
  if (!normalized) return fallback;

  const { status, message } = extractBackendMessage(normalized);
  const candidate = message || normalized;
  const statusFromPlainText = candidate.match(/\bstatus\s+(\d{3})\b/i);
  const effectiveStatus = status ?? (statusFromPlainText ? Number(statusFromPlainText[1]) : null);

  if (/^Failed to fetch$/i.test(candidate) || /^Load failed$/i.test(candidate) || /^NetworkError/i.test(candidate)) {
    return "We could not connect to the server. Please check your connection and try again.";
  }

  if (isTechnicalMessage(candidate)) {
    return statusMessage(effectiveStatus, fallback);
  }

  if (effectiveStatus && (effectiveStatus >= 500 || statusFromPlainText)) {
    return statusMessage(effectiveStatus, fallback);
  }

  return candidate;
}

export function friendlyUploadErrorMessage(error: unknown) {
  return friendlyErrorMessage(error, {
    context: "upload",
    fallback: "We could not upload your file. Please try a smaller file or check your connection.",
  });
}
