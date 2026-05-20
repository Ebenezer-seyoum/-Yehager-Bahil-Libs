"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CreateGroupOrderModal } from "@/components/create-group-order-modal";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

export function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openRegion, setOpenRegion] = useState<string | null>(null);
  const [groupOrderOpen, setGroupOrderOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user?.id);
  const isAdmin = session?.user?.role === "admin";
  const isEmployee = session?.user?.role === "employee";

  useEffect(() => {
    if (!isAuthed) return;
    fetch("/api/backend/cart")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setCartCount(Array.isArray(payload?.data) ? payload.data.length : 0))
      .catch(() => setCartCount(0));
  }, [isAuthed]);

  function handleMouseEnter(region: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(region);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between sm:h-20">
          <Link href="/" className="flex items-center">
            <img
              src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
              alt="Yehager Bahil Libs"
              className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link href="/" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Home
            </Link>
            {REGIONS.map((region) => {
              const subs = TAXONOMY[region] ?? [];
              return (
                <div key={region} className="relative" onMouseEnter={() => handleMouseEnter(region)} onMouseLeave={handleMouseLeave}>
                  <Link
                    href={`/catalog?region=${encodeURIComponent(region)}`}
                    onClick={() => setActiveMenu(null)}
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {region}
                    {subs.length > 0 ? <ChevronDown className="h-3 w-3" /> : null}
                  </Link>
                  {activeMenu === region && subs.length > 0 ? (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-card p-3 shadow-xl"
                      onMouseEnter={() => handleMouseEnter(region)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {subs.map((sub) => (
                        <Link
                          key={sub}
                          href={`/catalog?region=${encodeURIComponent(region)}&sub=${encodeURIComponent(sub)}`}
                          onClick={() => setActiveMenu(null)}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          {sub}
                        </Link>
                      ))}
                      <div className="mt-2 border-t border-border pt-2">
                        <Link href={`/catalog?region=${encodeURIComponent(region)}`} className="block px-3 py-2 text-xs font-medium text-primary hover:underline">
                          View All {region} →
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setGroupOrderOpen(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-center text-sm font-medium leading-tight text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Our Home Cart
            </button>
            {isAdmin ? (
              <Link href="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                Admin
              </Link>
            ) : null}
            {isEmployee ? (
              <Link href="/employee" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                Employee
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/cart" className="relative rounded-full p-2 transition-colors hover:bg-secondary" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            {isAuthed ? (
              <>
                <Link href="/my-account" className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex">
                  <User className="h-4 w-4" />
                  <span className="max-w-[90px] truncate">{session?.user?.name?.split(" ")[0] ?? "Account"}</span>
                </Link>
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:block">
                  Sign Out
                </button>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/signin" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  Sign In
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-1.5 text-center text-sm font-semibold leading-tight text-primary-foreground transition-colors hover:bg-primary/90">
                  Create Account
                </Link>
              </div>
            )}
            <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-2 hover:bg-secondary lg:hidden">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="max-h-[calc(100vh-80px)] overflow-y-auto border-t border-border bg-background lg:hidden">
          <nav className="px-3 py-2">
            <div className="mb-1 flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Language</span>
              <LanguageSwitcher compact />
            </div>
            <Link href="/" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
              Home
            </Link>
            {REGIONS.map((region) => {
              const subs = TAXONOMY[region] ?? [];
              const hasSubs = subs.length > 0;
              const isOpen = openRegion === region;
              return (
                <div key={region}>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => setOpenRegion(isOpen ? null : region)}
                      className="flex h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold hover:bg-secondary"
                    >
                      <span>{region}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ) : (
                    <Link href={`/catalog?region=${encodeURIComponent(region)}`} onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                      {region}
                    </Link>
                  )}
                  {isOpen && hasSubs ? (
                    <div className="mb-1 ml-4 border-l border-border pl-2">
                      <Link href={`/catalog?region=${encodeURIComponent(region)}`} onClick={() => setOpen(false)} className="flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-secondary">
                        View All {region} →
                      </Link>
                      {subs.map((sub) => (
                        <Link
                          key={sub}
                          href={`/catalog?region=${encodeURIComponent(region)}&sub=${encodeURIComponent(sub)}`}
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
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setGroupOrderOpen(true);
              }}
              className="flex h-11 w-full items-center rounded-lg bg-primary px-3 text-left text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Our Home Cart
            </button>
            {isAuthed ? (
              <Link href="/my-account" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-secondary">
                My Orders & My Account
              </Link>
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
