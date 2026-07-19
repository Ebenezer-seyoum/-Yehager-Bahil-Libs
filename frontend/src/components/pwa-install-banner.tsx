"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// sessionStorage intentionally resets when the customer closes the tab/browser.
// This makes the banner appear again in a new browsing session, while keeping
// it from repeatedly covering the same tab after dismissal.
const PWA_INSTALL_PROMPT_SHOWN_KEY = "pwa-install-prompt-shown-this-session";

function isPhoneOrTablet() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isAppleTabletInDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return (
    /android|iphone|ipad|ipod|windows phone|webos|blackberry|mobile/i.test(userAgent) ||
    isAppleTabletInDesktopMode
  );
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIos] = useState(() =>
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent),
  );
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!isPhoneOrTablet()) return;

    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone) return;
    if (window.sessionStorage.getItem(PWA_INSTALL_PROMPT_SHOWN_KEY)) return;

    function handlePrompt(event: Event) {
      event.preventDefault();
      if (window.sessionStorage.getItem(PWA_INSTALL_PROMPT_SHOWN_KEY)) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      window.sessionStorage.setItem(PWA_INSTALL_PROMPT_SHOWN_KEY, "1");
      setShow(true);
    }

    function handleInstalled() {
      window.sessionStorage.setItem(PWA_INSTALL_PROMPT_SHOWN_KEY, "1");
      setShow(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    let iosShowTimer: number | undefined;
    if (isIos) {
      window.sessionStorage.setItem(PWA_INSTALL_PROMPT_SHOWN_KEY, "1");
      iosShowTimer = window.setTimeout(() => setShow(true), 0);
    }
    return () => {
      if (iosShowTimer !== undefined) window.clearTimeout(iosShowTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [isIos]);

  async function install() {
    window.sessionStorage.setItem(PWA_INSTALL_PROMPT_SHOWN_KEY, "1");
    if (isIos) {
      setShowIosSteps(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  function dismiss() {
    window.sessionStorage.setItem(PWA_INSTALL_PROMPT_SHOWN_KEY, "1");
    setShow(false);
    setShowIosSteps(false);
  }

  if (!show) return null;

  return (
    <>
      <button type="button" aria-label="Dismiss install prompt" onClick={dismiss} className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" />
      <div className="fixed bottom-0 left-0 right-0 z-[9999]">
        <div className="relative mx-auto max-w-lg rounded-t-3xl border-t border-border bg-card p-6 pb-8 shadow-2xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
          <button type="button" onClick={dismiss} className="absolute right-4 top-4 rounded-full p-2 hover:bg-secondary">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="mb-5 flex items-center gap-4">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
            <div>
              <h2 className="font-heading text-xl font-bold">Yehager Bahil Libs</h2>
              <p className="text-xs text-muted-foreground">Custom Ethiopian cultural attire</p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2 text-center">
            {[
              ["📦", "Track orders"],
              ["📏", "Save measurements"],
              ["🛍️", "Shop faster"],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-xl bg-secondary/50 p-3">
                <p className="text-xl">{icon}</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {!showIosSteps ? (
            <>
              <button
                type="button"
                onClick={() => void install()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                {isIos ? "Add to Home Screen" : "Install App"}
              </button>
              <button type="button" onClick={dismiss} className="mt-3 w-full py-1 text-center text-sm text-muted-foreground hover:text-foreground">
                Continue in browser
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm font-semibold">How to install on iPhone / iPad</p>
              {[
                "Tap the Share button in Safari.",
                'Scroll down and tap "Add to Home Screen".',
                'Tap "Add" to finish.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
              <button type="button" onClick={dismiss} className="w-full py-1 text-center text-sm text-muted-foreground hover:text-foreground">
                Got it, close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
