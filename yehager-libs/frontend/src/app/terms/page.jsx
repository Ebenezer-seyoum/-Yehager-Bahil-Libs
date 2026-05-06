export default function TermsPage() {
  const sections = [
    {
      title: "1. General Overview",
      body: "By placing an order through our website, you agree to these terms. We produce custom-tailored Ethiopian cultural clothing based on customer specifications.",
    },
    {
      title: "2. Custom Orders & Production",
      body: "All products are custom-made. Customers are responsible for accurate measurements and order details before submission.",
    },
    {
      title: "3. Production Timeline",
      body: "Production starts within 3 days after confirmation. Typical production + delivery takes 25–45 days.",
    },
    {
      title: "4. Cancellation & Refund Policy",
      body: "Full refunds are available only within the first 3 days. After production begins, full refunds are not guaranteed.",
    },
    {
      title: "5. Shipping & Delivery",
      body: "We ship globally. Delivery delays due to carriers, customs, or external factors are outside our direct control.",
    },
    {
      title: "6. Contact Information",
      body: "Email: naomiinvestments2100@gmail.com · USA: +1 612-702-4651 · www.yehagerbahillibs.com",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="space-y-8">
        <header>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">Our Policy</h1>
          <h2 className="font-heading text-2xl font-semibold text-primary">Terms & Conditions</h2>
          <p className="mt-4 text-muted-foreground">Yehager Bahil Libs</p>
        </header>

        <div className="space-y-6 text-foreground">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="mb-3 font-heading text-xl font-bold">{section.title}</h3>
              <p className="text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
