import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this data. Please refresh and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-rose-950">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-rose-800">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
