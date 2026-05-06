export default function AboutPage() {
  const promiseItems = [
    "Authentic Ethiopian cultural clothing",
    "Custom tailoring with high-quality standards",
    "Fast and reliable global delivery (25–45 days)",
    "Professional service and customer satisfaction",
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-12 rounded-2xl border border-border bg-card p-8">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Yehager Bahil Libs</h1>
        <p className="mb-5 mt-1 text-xs text-muted-foreground">Est. 2018 · Naomi Investments LLC</p>
        <p className="mb-6 leading-relaxed text-muted-foreground">
          A global Ethiopian cultural clothing brand specializing in custom-tailored, high-quality traditional garments.
          Proudly serving customers worldwide since 2018.
        </p>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Our Promise</h4>
        <ul className="space-y-2">
          {promiseItems.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 font-bold text-primary">✓</span> {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.4em] text-primary">Our Story</p>
        <h2 className="font-heading text-4xl font-bold leading-tight sm:text-5xl">Read Our Full Story</h2>
        <div className="mb-8 mt-6 h-1 w-16 rounded-full bg-primary" />
      </div>

      <div className="space-y-8 leading-relaxed text-muted-foreground">
        <section>
          <h3 className="mb-3 font-heading text-2xl font-semibold text-foreground">Who We Are</h3>
          <p>
            Yehager Bahil Libs means traditional cultural clothing in Amharic. Founded in 2018, the brand has grown
            from a local initiative into a global Ethiopian cultural fashion business.
          </p>
        </section>

        <section>
          <h3 className="mb-3 font-heading text-2xl font-semibold text-foreground">Our Mission</h3>
          <p>
            We preserve and celebrate Ethiopian heritage through beautifully crafted garments for weddings, graduations,
            holidays, and cultural events.
          </p>
          <p className="mt-3">
            Every order is custom-tailored to customer measurements with quality-focused craftsmanship and fabric
            selection.
          </p>
        </section>

        <section>
          <h3 className="mb-3 font-heading text-2xl font-semibold text-foreground">Get In Touch</h3>
          <div className="space-y-2 rounded-2xl border border-border bg-card p-6 text-sm">
            <p>
              📧{" "}
              <a href="mailto:naomiinvestments2100@gmail.com" className="text-primary hover:underline">
                naomiinvestments2100@gmail.com
              </a>
            </p>
            <p>
              📞 USA:{" "}
              <a href="tel:+16127024651" className="text-primary hover:underline">
                +1 612-702-4651
              </a>
            </p>
            <p>
              📞 Ethiopia:{" "}
              <a href="tel:+251911465030" className="text-primary hover:underline">
                +251 911 46 5030
              </a>
            </p>
            <p>
              🌐{" "}
              <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.yehagerbahillibs.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
