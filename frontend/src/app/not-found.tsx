import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#120f09] px-6 py-20 text-[#fff7df]">
      <section className="w-full max-w-xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#d6a43d]">Page not found</p>
        <h1 className="mt-5 font-heading text-4xl font-bold sm:text-5xl">This page has moved</h1>
        <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-7 text-[#c8b98b]">
          The link may be from an older search result. Continue to the homepage or browse the current catalog.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#d6a43d] px-5 py-3 text-sm font-black text-[#18130a] transition hover:bg-[#e6b957]"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#6f511f] px-5 py-3 text-sm font-black text-[#fff7df] transition hover:bg-[#241b0c]"
          >
            <Search className="h-4 w-4" />
            Browse catalog
          </Link>
        </div>
      </section>
    </main>
  );
}
