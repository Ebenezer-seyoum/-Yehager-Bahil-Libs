"use client";

import { useState } from "react";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
  ];

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Share this product</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            {link.label}
          </a>
        ))}
        <button type="button" onClick={() => void copy()} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
