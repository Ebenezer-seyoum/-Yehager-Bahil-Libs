import { SOCIAL_SHARE_LINKS } from "@/lib/taxonomy";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SocialShare({ url, message, compact = false }) {
  const [copied, setCopied] = useState(false);
  const links = SOCIAL_SHARE_LINKS(url, message);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
          <span className="text-xs font-mono flex-1 truncate text-muted-foreground">{url}</span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 hover:bg-border rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-medium transition-opacity hover:opacity-90 ${link.bg}`}
          >
            <span className="text-base leading-none">{link.icon}</span>
            <span>{link.name}</span>
          </a>
        ))}
        {compact && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-border transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            Copy Link
          </button>
        )}
      </div>
    </div>
  );
}