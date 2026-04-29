import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Listen for Chrome/Android install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show for iOS users too (they need manual steps)
    if (ios) {
      const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
      if (!dismissed) setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setShow(false);
    setShowIOSSteps(false);
  };

  if (!show || isInstalled) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={handleDismiss}
      />

      {/* Banner — slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-500">
        <div className="bg-card border-t border-border rounded-t-3xl shadow-2xl p-6 pb-8 max-w-lg mx-auto">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* App icon + branding */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <img src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/2b2011b33_Screenshot2026-04-03170742.png" alt="YBL" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold leading-tight">Yehager Bahil Libs</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Custom Ethiopian Cultural Attire</p>
              <div className="flex items-center gap-1 mt-1">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-primary text-xs">{s}</span>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">Free App</span>
              </div>
            </div>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: "📦", text: "Track Orders" },
              { icon: "📏", text: "Save Measurements" },
              { icon: "🛍️", text: "Shop Faster" },
            ].map(({ icon, text }) => (
              <div key={text} className="bg-secondary/50 rounded-xl p-3 text-center">
                <p className="text-xl mb-1">{icon}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          {!showIOSSteps ? (
            <>
              <button
                onClick={handleInstall}
                className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                {isIOS ? "Add to Home Screen" : "Install App — It's Free"}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground text-center py-1"
              >
                Continue in browser
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-center">How to install on iPhone / iPad:</p>
              {[
                { step: "1", text: "Tap the Share button  at the bottom of Safari" },
                { step: "2", text: "Scroll down and tap \"Add to Home Screen\"" },
                { step: "3", text: "Tap \"Add\" — the app icon will appear on your home screen!" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
              <button
                onClick={handleDismiss}
                className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground text-center py-1"
              >
                Got it, close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}