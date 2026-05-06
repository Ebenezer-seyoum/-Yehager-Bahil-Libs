const socials = [
  { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61559444502598", bg: "bg-blue-600" },
  { name: "Instagram", url: "https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0", bg: "bg-neutral-600" },
  { name: "X (Twitter)", url: "https://x.com/yehagerbah54327", bg: "bg-black border border-white/20" },
  { name: "YouTube", url: "https://www.youtube.com/@YehagerbahilLibs", bg: "bg-red-600" },
  { name: "TikTok", url: "https://www.tiktok.com/@yehager.bahil.lib", bg: "bg-neutral-700" },
];

export default function FollowUsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">Follow us on</h1>
      <div className="mb-10 h-0.5 w-10 bg-primary" />

      <div className="flex flex-wrap gap-4">
        {socials.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.name}
            className={`flex h-16 w-16 items-center justify-center rounded-xl text-sm font-semibold text-white transition-transform hover:scale-110 hover:opacity-90 ${s.bg}`}
          >
            {s.name.charAt(0)}
          </a>
        ))}
      </div>
    </div>
  );
}
