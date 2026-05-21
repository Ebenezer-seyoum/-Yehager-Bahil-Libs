"use client";

import { Check, Copy, Mail, MessageCircle, Send, Share2, X } from "lucide-react";
import { useState } from "react";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, className: "bg-[#22c55e] text-white" },
    { label: "Facebook", icon: Share2, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, className: "bg-[#2563eb] text-white" },
    { label: "Messenger", icon: MessageCircle, href: `https://www.facebook.com/dialog/send?link=${encodedUrl}`, className: "bg-[#3b82f6] text-white" },
    { label: "X / Twitter", icon: X, href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, className: "bg-black text-white" },
    { label: "Pinterest", icon: Share2, href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`, className: "bg-[#dc2626] text-white" },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, className: "bg-[#0ea5e9] text-white" },
    { label: "Snapchat", icon: Share2, href: `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`, className: "bg-[#facc15] text-white" },
    { label: "TikTok", icon: Share2, href: `https://www.tiktok.com/`, className: "bg-[#18181b] text-white" },
    { label: "Instagram", icon: Share2, href: `https://www.instagram.com/`, className: "bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white" },
    { label: "SMS", icon: MessageCircle, href: `sms:?&body=${encodedTitle}%20${encodedUrl}`, className: "bg-slate-600 text-white" },
    { label: "Email", icon: Mail, href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`, className: "bg-[#dc2626] text-white" },
  ];

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        aria-label="Share this piece"
      >
        <Share2 className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4" onClick={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="w-full max-w-3xl rounded-xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-7 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Share This Piece</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close share dialog">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-xl bg-secondary px-4 py-4">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">{url}</span>
              <button type="button" onClick={() => void copy()} className="rounded-lg p-1.5 text-foreground hover:bg-border" aria-label="Copy share link">
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90 ${link.className}`}>
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
