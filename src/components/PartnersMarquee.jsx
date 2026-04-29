const PARTNERS = [
  {
    name: "Ethiopian Postal Service",
    url: "https://ethio.post/",
    logo: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/81f984fce_Screenshot2026-04-27180417.png",
  },
  {
    name: "Ethiopian Airlines",
    url: "https://www.ethiopianairlines.com/",
    logo: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/da9eb00f6_Screenshot2026-04-27180954.png",
  },
  {
    name: "Abyssinia Remit",
    url: "https://apps.apple.com/sl/app/abyssinia-remit/id6756968384",
    logo: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/6818a8fef_Screenshot2026-04-27181807.png",
  },
  {
    name: "Visiting Ethiopia",
    url: "https://visitingethiopia.com/",
    logo: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/193dee992_Screenshot2026-04-27182054.png",
  },
  {
    name: "Learn Ethiopian Languages",
    url: "https://learnethiopianlanguages.online/",
    logo: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5267b9594_Screenshot2026-02-15205632.png",
  },
];

export default function PartnersMarquee() {
  // Duplicate the list so the marquee loops seamlessly
  const loop = [...PARTNERS, ...PARTNERS];

  return (
    <div className="border-t border-white/10 pt-10 pb-2">
      <div className="text-center mb-6">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] mb-1">Our Partners</p>
        <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-white">Trusted Collaborators</h3>
      </div>

      <style>{`
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .partners-track {
          animation: partners-scroll 30s linear infinite;
        }
        .partners-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="relative overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10" />

        <div className="partners-track flex items-center gap-8 sm:gap-12 w-max py-2">
          {loop.map((p, idx) => (
            <a
              key={`${p.name}-${idx}`}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={p.name}
              className="flex-shrink-0 group"
            >
              <div className="h-20 sm:h-24 w-40 sm:w-48 bg-white rounded-xl flex items-center justify-center px-4 py-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(251,163,20,0.4)]">
                <img
                  src={p.logo}
                  alt={p.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-center text-[11px] text-white/50 group-hover:text-white mt-2 transition-colors">{p.name}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}