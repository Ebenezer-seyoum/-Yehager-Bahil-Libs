export default function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      {/* Brand Header Card */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-12">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-1">Yehager Bahil Libs</h1>
        <p className="text-xs text-muted-foreground mb-5">Est. 2018 · Naomi Investments LLC</p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          A global Ethiopian cultural clothing brand specializing in custom-tailored, high-quality traditional garments. Proudly serving customers worldwide since 2018.
        </p>
        <div className="mb-2">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Our Promise</h4>
          <ul className="space-y-2">
            {[
              "Authentic Ethiopian cultural clothing",
              "Custom tailoring with high-quality standards",
              "Fast and reliable global delivery (25–45 days)",
              "Professional service and customer satisfaction",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-bold mt-0.5">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-10">
        <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-3">Our Story</p>
        <h2 className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6">Read Our Full Story</h2>
        <div className="w-16 h-1 bg-primary rounded-full mb-8" />
      </div>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Who We Are</h2>
          <p>
            Yehager Bahil Libs — meaning <em>"Traditional Cultural Clothing"</em> in Amharic — is a globally recognized Ethiopian cultural clothing brand with deep roots in heritage and craftsmanship. Founded in <strong className="text-foreground">2018</strong>, we have been proudly serving customers across Ethiopia and around the world for over six years, growing from a local cultural fashion initiative into a full-scale international brand.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Our Mission</h2>
          <p>
            Our mission is to preserve, celebrate, and share Ethiopia's rich cultural heritage through beautifully crafted traditional garments. Every piece we create is a testament to the artistry, diversity, and pride of Ethiopian culture — from the highlands of Amhara and Tigray, to the lowlands of Oromia and the southern regions.
          </p>
          <p className="mt-3">
            We specialize in <strong className="text-foreground">custom-tailored, high-quality traditional garments</strong>, designed and produced with precision and care. Whether you're dressing for a wedding, graduation, baptism, holiday celebration, or cultural event, we ensure every customer looks and feels authentically Ethiopian.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Our Operations</h2>
          <p>
            Yehager Bahil Libs proudly operates under <strong className="text-foreground">Naomi Investments LLC</strong>, a registered company in the United States (Minnesota), with strong production and operational presence across <strong className="text-foreground">multiple locations in Ethiopia</strong>. This dual presence allows us to combine the cultural authenticity of Ethiopian master artisans with the efficiency of a modern global business.
          </p>
          <p className="mt-3">
            Our skilled tailors and craftspeople work with premium fabrics — including handwoven cotton, silk, and chiffon — to produce garments that meet the highest standards of quality. Each order is custom-made to the exact measurements of the customer, ensuring a perfect, personal fit.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Global Reach</h2>
          <p>
            Since 2018, we have delivered thousands of garments to customers in the United States, Canada, Europe, Australia, and across the African continent. We ship worldwide through trusted international logistics partners including <strong className="text-foreground">DHL, UPS, USPS</strong>, and verified Ethiopian couriers, ensuring your order arrives safely and on time.
          </p>
          <p className="mt-3">
            Our production-to-delivery timeline is <strong className="text-foreground">25–45 days</strong>, reflecting our commitment to quality craftsmanship — not mass production. Every garment is individually tailored, quality-inspected, and packaged with care before it reaches your door.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">Our Promise to You</h2>
          <ul className="space-y-2">
            {[
              "Authentic Ethiopian cultural clothing — no shortcuts, no imitations",
              "Custom tailoring to your exact measurements",
              "High-quality fabrics sourced and crafted in Ethiopia",
              "Reliable global delivery with tracking",
              "Professional customer service from order to delivery",
              "Satisfaction guaranteed — if it's not right, we make it right",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mt-8">
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-4">Get In Touch</h2>
          <div className="space-y-2 text-sm">
            <p>📧 <a href="mailto:naomiinvestments2100@gmail.com" className="text-primary hover:underline">naomiinvestments2100@gmail.com</a></p>
            <p>📞 USA: <a href="tel:+16127024651" className="text-primary hover:underline">+1 612-702-4651</a></p>
            <p>📞 Ethiopia: <a href="tel:+251911465030" className="text-primary hover:underline">+251 911 46 5030</a></p>
            <p>🌐 <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.yehagerbahillibs.com</a></p>
            <p>📍 United States (Minnesota) &amp; Multiple Locations in Ethiopia</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-6">
          © 2018–{new Date().getFullYear()} Yehager Bahil Libs · Naomi Investments LLC · All Rights Reserved.
        </p>
      </div>
    </div>
  );
}