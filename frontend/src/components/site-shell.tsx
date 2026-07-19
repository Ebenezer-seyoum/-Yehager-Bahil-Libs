import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { LearnLanguagesBanner } from "@/components/learn-languages-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import { ScrollToTop } from "@/components/scroll-to-top";
import { StaffPreviewModeBanner } from "@/components/staff-preview-mode";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScrollToTop />
      <PwaServiceWorker />
      <Suspense fallback={null}>
        <StaffPreviewModeBanner />
      </Suspense>
      <SiteNavbar />
      <div className="w-full px-6 pt-5 sm:px-8 lg:px-12">
        <LearnLanguagesBanner />
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <PwaInstallBanner />
    </div>
  );
}
