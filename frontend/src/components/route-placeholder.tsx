type RoutePlaceholderProps = {
  title: string;
  path: string;
};

export function RoutePlaceholder({ title, path }: RoutePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-primary">Phase 3 Route Scaffold</p>
      <h1 className="font-heading text-4xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground">
        This route is now mapped in Next App Router and ready for feature-porting from the Base44 React page.
      </p>
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground">
        <span className="text-muted-foreground">Path:</span> <code>{path}</code>
      </div>
    </div>
  );
}
