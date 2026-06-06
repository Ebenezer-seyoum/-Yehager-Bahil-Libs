import { Inbox } from "lucide-react";

export function EmptyState({ title = "No records found", description = "Try adjusting filters or search." }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
