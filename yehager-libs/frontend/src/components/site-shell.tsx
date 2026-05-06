import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNavbar />
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary">
          Language/i18n banner placeholder (Phase 3 scaffold)
        </div>
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
