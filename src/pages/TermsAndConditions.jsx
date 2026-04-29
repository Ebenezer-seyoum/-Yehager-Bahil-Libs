export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Our Policy</h1>
          <h2 className="font-heading text-2xl font-semibold text-primary">Terms & Conditions</h2>
          <p className="text-muted-foreground mt-4">Yehager Bahil Libs</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-6 text-foreground">
          <section>
            <h3 className="font-heading text-xl font-bold mb-3">1. General Overview</h3>
            <p className="text-muted-foreground">
              Welcome to Yehager Bahil Libs. By placing an order through our website, you agree to the following Terms & Conditions. We specialize in custom-tailored Ethiopian cultural clothing, produced based on customer specifications and delivered worldwide.
            </p>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">2. Custom Orders & Production</h3>
            <p className="text-muted-foreground mb-3">All products are custom-made based on the measurements and specifications provided by the customer.</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• Orders are reviewed and confirmed upon successful payment.</li>
              <li>• Customers are responsible for ensuring all measurements and details are accurate before submission.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">3. Production Timeline</h3>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• Production begins within three (3) days after order confirmation.</li>
              <li>• Once production begins, garments are cut and tailored specifically to the customer's measurements.</li>
              <li>• Estimated production and delivery time is 25–45 days.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">4. Cancellation & Refund Policy</h3>
            <p className="text-muted-foreground mb-3">Due to the custom nature of our products:</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• Full refunds are only available within the first 3 days after placing the order.</li>
              <li>• After 3 days, once production has started:
                <ul className="ml-4 mt-2 space-y-2">
                  <li>◦ Full refunds will not be issued</li>
                  <li>◦ Partial adjustments may be considered at the Company's discretion</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">5. Alterations & Adjustments</h3>
            <p className="text-muted-foreground mb-3">We are committed to customer satisfaction:</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• If adjustments are needed after receiving the product, we will support necessary corrections</li>
              <li>• Customers must notify us within a reasonable time after delivery</li>
              <li>• Customers are responsible for all shipping costs related to alterations or returns for adjustments</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">6. Shipping & Delivery</h3>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• We deliver worldwide through reliable international shipping partners</li>
              <li>• Delivery timelines may vary depending on location and logistics</li>
              <li>• The Company is not responsible for delays caused by:
                <ul className="ml-4 mt-2 space-y-2">
                  <li>◦ Shipping carriers</li>
                  <li>◦ Customs clearance</li>
                  <li>◦ External factors beyond our control</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">7. Quality Commitment</h3>
            <p className="text-muted-foreground mb-3">We ensure:</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• High-quality materials</li>
              <li>• Skilled craftsmanship</li>
              <li>• Careful inspection before shipment</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">8. Customer Responsibility</h3>
            <p className="text-muted-foreground mb-3">Customers agree to:</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• Provide accurate measurements and order details</li>
              <li>• Review order confirmation carefully</li>
              <li>• Communicate any issues promptly</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">9. Intellectual Property</h3>
            <p className="text-muted-foreground">
              All designs, images, and content belong to Yehager Bahil Libs and may not be copied or reproduced without permission.
            </p>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">10. Limitation of Liability</h3>
            <p className="text-muted-foreground mb-3">Yehager Bahil Libs shall not be held liable for:</p>
            <ul className="space-y-2 text-muted-foreground ml-4">
              <li>• Measurement errors provided by the customer</li>
              <li>• Minor variations inherent in handmade products</li>
              <li>• Delays caused by third-party shipping providers</li>
            </ul>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">11. Governing Law</h3>
            <p className="text-muted-foreground">
              This Agreement shall be governed by the laws of the State of Minnesota, USA, under Naomi Investments LLC.
            </p>
          </section>

          <section>
            <h3 className="font-heading text-xl font-bold mb-3">12. Contact Information</h3>
            <div className="text-muted-foreground space-y-2">
              <p>📧 <a href="mailto:naomiinvestments2100@gmail.com" className="text-primary hover:underline">naomiinvestments2100@gmail.com</a></p>
              <p>📞 <a href="tel:+16127024651" className="text-primary hover:underline">+1 612-702-4651</a></p>
              <p>🌐 <a href="https://www.yehagerbahillibs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.yehagerbahillibs.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}