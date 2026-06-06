export default function AboutPage() {
  const summaryPromiseItems = [
    "Authentic Ethiopian cultural clothing",
    "Custom tailoring with high-quality standards",
    "Fast and reliable global delivery (25–45 days)",
    "Professional service and customer satisfaction",
  ];

  const promiseItems = [
    "Authentic Ethiopian cultural clothing — no shortcuts, no imitations",
    "Custom tailoring to your exact measurements",
    "High-quality fabrics sourced and crafted in Ethiopia",
    "Reliable global delivery with tracking",
    "Professional customer service from order to delivery",
    "Satisfaction guaranteed — if it's not right, we make it right",
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mb-12 rounded-2xl border border-border bg-card p-8">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Yehager Bahil Libs</h1>
        <p className="mb-5 mt-1 text-xs text-muted-foreground">Est. 2018 · Naomi Investments LLC</p>
        <p className="mb-6 max-w-4xl leading-relaxed text-muted-foreground">
          A global Ethiopian cultural clothing brand specializing in custom-tailored, high-quality traditional garments.
          Proudly serving customers worldwide since 2018.
        </p>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Our Promise</h4>
        <ul className="space-y-2">
          {summaryPromiseItems.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 font-bold text-primary">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.4em] text-primary">Our Story</p>
        <h2 className="font-heading text-4xl font-bold leading-tight sm:text-5xl">Read Our Full Story</h2>
        <div className="mb-8 mt-6 h-1 w-16 rounded-full bg-primary" />
      </div>

      <article className="mx-auto max-w-[1270px] text-lg leading-[1.65] text-muted-foreground sm:text-xl">
        <section className="space-y-7">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Who We Are</h2>
          <p>
            Yehager Bahil Libs — meaning <strong className="font-bold text-foreground">&quot;Traditional Cultural Clothing&quot;</strong> in Amharic — is a globally
            recognized Ethiopian cultural clothing brand with deep roots in heritage and craftsmanship. Founded in 2018,
            we have been proudly serving customers across Ethiopia and around the world for over six years, growing from a
            local cultural fashion initiative into a full-scale international brand.
          </p>
        </section>

        <section className="mt-14 space-y-7">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Our Mission</h2>
          <p>
            Our mission is to preserve, celebrate, and share Ethiopia&apos;s rich cultural heritage through beautifully
            crafted traditional garments. Every piece we create is a testament to the artistry, diversity, and pride of
            Ethiopian culture — from the highlands of Amhara and Tigray, to the lowlands of Oromia and the southern
            regions.
          </p>
          <p>
            We specialize in <strong className="font-bold text-foreground">custom-tailored, high-quality traditional garments</strong>, designed and produced with
            precision and care. Whether you&apos;re dressing for a wedding, graduation, baptism, holiday celebration, or
            cultural event, we ensure every customer looks and feels authentically Ethiopian.
          </p>
        </section>

        <section className="mt-14 space-y-7">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Our Operations</h2>
          <p>
            Yehager Bahil Libs proudly operates under <strong className="font-bold text-foreground">Naomi Investments LLC</strong>, a registered company in the
            United States (Minnesota), with strong production and operational presence across{" "}
            <strong className="font-bold text-foreground">multiple locations in Ethiopia</strong>. This dual presence allows us to combine the cultural authenticity
            of Ethiopian master artisans with the efficiency of a modern global business.
          </p>
          <p>
            Our skilled tailors and craftspeople work with premium fabrics — including handwoven cotton, silk, and
            chiffon — to produce garments that meet the highest standards of quality. Each order is custom-made to the
            exact measurements of the customer, ensuring a perfect, personal fit.
          </p>
        </section>

        <section className="mt-14 space-y-7">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Global Reach</h2>
          <p>
            Since 2018, we have delivered thousands of garments to customers in the United States, Canada, Europe,
            Australia, and across the African continent. We ship worldwide through trusted international logistics
            partners including <strong className="font-bold text-foreground">DHL, UPS, USPS</strong>, and verified Ethiopian couriers, ensuring your order arrives
            safely and on time.
          </p>
          <p>
            Our production-to-delivery timeline is <strong className="font-bold text-foreground">25–45 days</strong>, reflecting our commitment to quality
            craftsmanship — not mass production. Every garment is individually tailored, quality-inspected, and packaged
            with care before it reaches your door.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Our Promise to You</h2>
          <ul className="mt-7 space-y-5">
            {promiseItems.map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="mt-1 text-3xl font-bold leading-none text-primary">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-3xl border border-border bg-card p-9 sm:p-10">
          <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">Get In Touch</h2>
          <div className="mt-7 space-y-4 text-lg leading-tight sm:text-xl">
            <p>
              <span className="mr-3">📧</span>
              <a href="mailto:naomiinvestments2100@gmail.com" className="font-medium text-primary hover:underline">
                naomiinvestments2100@gmail.com
              </a>
            </p>
            <p>
              <span className="mr-3">📞</span>
              USA:{" "}
              <a href="tel:+16127024651" className="font-medium text-primary hover:underline">
                +1 612-702-4651
              </a>
            </p>
            <p>
              <span className="mr-3">📞</span>
              Ethiopia:{" "}
              <a href="tel:+251911465030" className="font-medium text-primary hover:underline">
                +251 911 46 5030
              </a>
            </p>
            <p>
              <span className="mr-3">🌐</span>
              <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                www.yehagerbahillibs.com
              </a>
            </p>
            <p>
              <span className="mr-3">📍</span>
              United States (Minnesota) &amp; Multiple Locations in Ethiopia
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
