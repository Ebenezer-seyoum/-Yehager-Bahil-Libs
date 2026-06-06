const icons = {
  Facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.93-1.955 1.885v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M7.8 2h8.4A5.806 5.806 0 0 1 22 7.8v8.4a5.806 5.806 0 0 1-5.8 5.8H7.8A5.806 5.806 0 0 1 2 16.2V7.8A5.806 5.806 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  ),
  X: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.831L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.292 19.491h2.039L6.486 3.24H4.298l13.311 17.404Z" />
    </svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 fill-current">
      <path d="M23.5 6.19a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.509A3.016 3.016 0 0 0 .5 6.19C0 8.073 0 12 0 12s0 3.927.5 5.81a3.016 3.016 0 0 0 2.123 2.136c1.872.509 9.377.509 9.377.509s7.505 0 9.378-.509A3.016 3.016 0 0 0 23.5 17.81C24 15.927 24 12 24 12s0-3.927-.5-5.81ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
    </svg>
  ),
  TikTok: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .593.045.88.13V9.4a6.337 6.337 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.17a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52V6.82c-.35 0-.699-.043-1.04-.13Z" />
    </svg>
  ),
};

const socials = [
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61559444502598", className: "bg-[#1877F2] text-white" },
  {
    name: "Instagram",
    url: "https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0",
    className: "bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fdf497_18%,#fd5949_43%,#d6249f_62%,#285AEB_100%)] text-white",
  },
  { name: "X", label: "X (Twitter)", url: "https://x.com/yehagerbah54327", className: "border border-white/20 bg-black text-white" },
  { name: "YouTube", url: "https://www.youtube.com/@YehagerbahilLibs", className: "bg-[#FF0000] text-white" },
  { name: "TikTok", url: "https://www.tiktok.com/@yehager.bahil.lib", className: "bg-black text-white ring-1 ring-white/15" },
];

export default function FollowUsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">Follow us on</h1>
      <div className="mb-10 h-0.5 w-10 bg-primary" />

      <div className="flex flex-wrap gap-4">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={social.label ?? social.name}
            aria-label={social.label ?? social.name}
            className={`flex h-16 w-16 items-center justify-center rounded-xl transition-transform hover:scale-110 hover:opacity-90 ${social.className}`}
          >
            {icons[social.name]}
          </a>
        ))}
      </div>
    </div>
  );
}
