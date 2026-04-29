import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PWAInstallBanner from "./PWAInstallBanner";
import ScrollToTop from "./ScrollToTop";
import LearnLanguagesBanner from "./LearnLanguagesBanner";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ScrollToTop />
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3">
        <LearnLanguagesBanner />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <PWAInstallBanner />
    </div>
  );
}