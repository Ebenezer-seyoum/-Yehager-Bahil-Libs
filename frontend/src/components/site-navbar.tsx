"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Menu, ShoppingBag, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CreateGroupOrderModal } from "@/components/create-group-order-modal";
import { defaultPublicRegions, normalizePublicRegionsForTopBar, type PublicRegion } from "@/lib/public-collections";

export function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<PublicRegion[]>(() => defaultPublicRegions());
  const [regionWindow, setRegionWindow] = useState(0);
  const [groupOrderOpen, setGroupOrderOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user?.id);
  const uploadDesignHref = isAuthed ? "/upload-your-design" : "/signin?callbackUrl=/upload-your-design";

  useEffect(() => {
    if (!isAuthed) return;
    fetch("/api/backend/cart")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setCartCount(Array.isArray(payload?.data) ? payload.data.length : 0))
      .catch(() => setCartCount(0));
  }, [isAuthed]);

  useEffect(() => {
    fetch("/api/backend/products/sections")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (Array.isArray(payload?.data)) {
          setRegions(normalizePublicRegionsForTopBar(payload.data));
          setRegionWindow(0);
        }
      })
      .catch(() => setRegions(defaultPublicRegions()));
  }, []);

  useEffect(() => {
    if (regions.length <= 9) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setRegionWindow((current) => (current + 9) % regions.length);
      setActiveMenu(null);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [regions.length]);

  const topBarRegions = useMemo(() => {
    if (regions.length <= 9) return regions;
    const doubled = [...regions, ...regions];
    return doubled.slice(regionWindow, regionWindow + 9);
  }, [regionWindow, regions]);
  const desktopRegions = topBarRegions;

  function handleMouseEnter(region: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(region);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between sm:h-[76px]">
          <Link href="/" className="flex shrink-0 items-center xl:mr-5">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="h-11 w-11 rounded-full object-cover sm:h-12 sm:w-12"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex">
            <div className="flex min-w-0 items-center justify-center gap-1.5">
              <div className="flex min-w-0 items-center justify-center gap-1.5 overflow-visible">
                <Link href="/" className="shrink-0 rounded-md px-2 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  Home
                </Link>
                {desktopRegions.map((region) => {
                  const subs = region.collections?.map((collection) => collection.name) ?? [];
                  const label = region.name === "Mila's Choice" ? "Designer's Choice" : region.name;
                  return (
                    <div key={region.id} className="relative shrink-0" onMouseEnter={() => handleMouseEnter(region.name)} onMouseLeave={handleMouseLeave}>
                      <Link
                        href={`/catalog?region=${encodeURIComponent(region.name)}`}
                        onClick={() => setActiveMenu(null)}
                        className="flex min-h-9 max-w-[92px] items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-semibold leading-tight text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <span className="whitespace-normal text-center">{label}</span>
                        {subs.length > 0 ? <ChevronDown className="h-3 w-3 shrink-0" /> : null}
                      </Link>
                      {activeMenu === region.name && subs.length > 0 ? (
                        <div
                          className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-card p-3 shadow-xl"
                          onMouseEnter={() => handleMouseEnter(region.name)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {subs.map((sub) => (
                            <Link
                              key={sub}
                              href={`/catalog?region=${encodeURIComponent(region.name)}&sub=${encodeURIComponent(sub)}`}
                              onClick={() => setActiveMenu(null)}
                              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            >
                              {sub}
                            </Link>
                          ))}
                          <div className="mt-2 border-t border-border pt-2">
                            <Link href={`/catalog?region=${encodeURIComponent(region.name)}`} className="block px-3 py-2 text-xs font-medium text-primary hover:underline">
                              View All {label}
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <Link
              href={uploadDesignHref}
              className="inline-flex h-11 w-[88px] shrink-0 items-center justify-center gap-1 rounded-lg border border-primary bg-primary/10 px-2 text-center text-[11px] font-black leading-tight text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[54px]">Upload Design</span>
            </Link>
            <button
              type="button"
              onClick={() => setGroupOrderOpen(true)}
              className="inline-flex h-11 w-[98px] shrink-0 items-center justify-center rounded-lg bg-primary px-2 text-center text-xs font-bold leading-tight text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Group Order
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-1 xl:ml-1">
            <LanguageSwitcher navbar />
            <Link href="/cart" className="relative inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary" aria-label="Your Cart">
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden sm:inline">Your Cart</span>
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            <div className="hidden items-center gap-1.5 sm:flex">
              {isAuthed ? (
                <>
                  <Link href="/my-account" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-bold leading-tight text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signin" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    Sign In
                  </Link>
                  <Link href="/register" className="inline-flex h-11 w-[96px] items-center justify-center rounded-lg bg-primary px-2 text-center text-xs font-bold leading-tight text-primary-foreground transition-colors hover:bg-primary/90">
                    Create Account
                  </Link>
                </>
              )}
            </div>
            <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-2 hover:bg-secondary xl:hidden">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="max-h-[calc(100vh-80px)] overflow-y-auto border-t border-border bg-background xl:hidden">
          <nav className="px-3 py-2">
            <div className="mb-1 flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Language</span>
              <LanguageSwitcher compact />
            </div>
            <Link href="/" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
              Home
            </Link>
            {regions.map((region) => {
              const subs = region.collections?.map((collection) => collection.name) ?? [];
              const hasSubs = subs.length > 0;
              const isOpen = openRegion === region.name;
              const label = region.name === "Mila's Choice" ? "Designer's Choice" : region.name;
              return (
                <div key={region.id}>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => setOpenRegion(isOpen ? null : region.name)}
                      className="flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold hover:bg-secondary"
                    >
                      <span>{label}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ) : (
                    <Link href={`/catalog?region=${encodeURIComponent(region.name)}`} onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                      {label}
                    </Link>
                  )}
                  {isOpen && hasSubs ? (
                    <div className="mb-1 ml-4 border-l border-border pl-2">
                      <Link href={`/catalog?region=${encodeURIComponent(region.name)}`} onClick={() => setOpen(false)} className="flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-secondary">
                        View All {label}
                      </Link>
                      {subs.map((sub) => (
                        <Link
                          key={sub}
                          href={`/catalog?region=${encodeURIComponent(region.name)}&sub=${encodeURIComponent(sub)}`}
                          onClick={() => setOpen(false)}
                          className="flex h-9 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="my-2 border-t border-border" />
            <Link href="/cart" onClick={() => setOpen(false)} className="mb-2 flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
              <ShoppingBag className="h-4 w-4" />
              Your Cart
              {cartCount > 0 ? <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{cartCount}</span> : null}
            </Link>
            <Link
              href={uploadDesignHref}
              onClick={() => setOpen(false)}
              className="mb-2 flex min-h-12 items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-3 text-sm font-black text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Upload Your Design
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setGroupOrderOpen(true);
              }}
              className="flex h-11 w-full items-center rounded-lg bg-primary px-3 text-left text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Create Group Order
            </button>
            {isAuthed ? (
              <>
                <Link href="/my-account" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold hover:bg-secondary"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
      {groupOrderOpen ? <CreateGroupOrderModal onClose={() => setGroupOrderOpen(false)} /> : null}
    </header>
  );
}
