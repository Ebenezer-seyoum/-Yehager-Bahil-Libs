"use client";

import Link from "next/link";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/events", label: "Events" },
  { href: "/my-orders", label: "My Orders" },
  { href: "/care-and-info", label: "Care & Info" },
  { href: "/about", label: "About" },
];

export function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user?.id);
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-primary/40 bg-primary/10" />
          <span className="font-heading text-xl font-semibold tracking-wide text-foreground">Yehager Bahil</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
          <Link
            href="/create-family-group"
            className="ml-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Group Order
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="rounded-full p-2 transition-colors hover:bg-secondary" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
          </Link>
          {isAuthed ? (
            <>
              <Link href="/my-account" className="rounded-full p-2 transition-colors hover:bg-secondary" aria-label="Account">
                <User className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary sm:inline-block"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/signin" className="hidden rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary sm:inline-block">
              Sign In
            </Link>
          )}
          <button
            type="button"
            className="rounded-md p-2 transition-colors hover:bg-secondary lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Admin
              </Link>
            ) : null}
            <Link
              href="/create-family-group"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Group Order
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
