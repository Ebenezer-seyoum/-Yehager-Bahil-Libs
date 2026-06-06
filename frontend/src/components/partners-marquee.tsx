"use client";

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

export function PartnersMarquee() {
  const loop = [...PARTNERS, ...PARTNERS];

  return (
    <div className="border-t border-white/10 pb-2 pt-10">
      <div className="mb-6 text-center">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Our Partners</p>
        <h3 className="font-heading text-2xl font-semibold text-white sm:text-3xl">Trusted Collaborators</h3>
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent" />

        <div className="partners-track flex w-max items-center gap-8 py-2 sm:gap-12">
          {loop.map((partner, index) => (
            <a
              key={`${partner.name}-${index}`}
              href={partner.url}
              target="_blank"
              rel="noreferrer"
              title={partner.name}
              className="group flex-shrink-0"
            >
              <div className="flex h-20 w-40 items-center justify-center rounded-xl bg-white px-4 py-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(251,163,20,0.4)] sm:h-24 sm:w-48">
                <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/50 transition-colors group-hover:text-white">{partner.name}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
