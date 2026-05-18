import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { LearnLanguagesBanner } from "@/components/learn-languages-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { ScrollToTop } from "@/components/scroll-to-top";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScrollToTop />
      <SiteNavbar />
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <LearnLanguagesBanner />
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <PwaInstallBanner />
    </div>
  );
}
