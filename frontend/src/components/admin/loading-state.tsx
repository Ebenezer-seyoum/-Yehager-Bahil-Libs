import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
