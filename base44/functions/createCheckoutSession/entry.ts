import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { items, total, shippingCost, shippingAddress, eventData, shipChoice, orderNumber, fulfillmentType, carrier, pickupLocation, pickupPersonName, pickupPersonPhone, currency } = await req.json();

  const stripeCurrency = (currency || 'usd').toLowerCase();

  // FX rates vs USD for converting Stripe line items to non-USD currencies
  const FX = { usd: 1, eur: 0.92, gbp: 0.79, aed: 3.67, sar: 3.75, cad: 1.37, aud: 1.54, ils: 3.71 };
  const fxRate = FX[stripeCurrency] || 1;

  // Create a pending order first
  const order = await base44.entities.Order.create({
    order_number: orderNumber,
    user_email: user.email,
    customer_name: user.full_name,
    items: items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      price: i.price,
      measurement_snapshot: i.measurement_snapshot,
    })),
    total,
    shipping_cost: shippingCost || 0,
    status: "pending",
    payment_status: "pending",
    payment_method: "stripe_usd",
    payment_currency: stripeCurrency.toUpperCase(),
    fulfillment_type: fulfillmentType || "mail",
    carrier: carrier || "DHL",
    pickup_location: pickupLocation || null,
    pickup_person_name: pickupPersonName || null,
    pickup_person_phone: pickupPersonPhone || null,
    event_id: eventData?.id || "",
    event_name: eventData?.name || "",
    shipping_address: shippingAddress,
    use_event_owner_address: shipChoice === "event_owner",
  });

  const appUrl = req.headers.get('origin') || 'https://app.base44.com';

  const lineItems = items.map((item) => ({
    price_data: {
      currency: stripeCurrency,
      product_data: {
        name: item.product_name,
        description: 'Custom-tailored Ethiopian cultural garment',
      },
      unit_amount: Math.round((item.price || 0) * fxRate * 100),
    },
    quantity: item.quantity || 1,
  }));

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: stripeCurrency,
        product_data: {
          name: 'Shipping & Handling (EMS)',
          description: `Ethiopian Mail Service — ${items.length} item${items.length !== 1 ? 's' : ''}`,
        },
        unit_amount: Math.round(shippingCost * fxRate * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${appUrl}/order-confirmation?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout`,
    customer_email: user.email,
    metadata: {
      order_id: order.id,
      order_number: orderNumber,
      user_email: user.email,
    },
    billing_address_collection: 'auto',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'NL', 'SE', 'NO', 'ET', 'KE', 'NG', 'GH', 'ZA'],
    },
  });

  return Response.json({ url: session.url, orderId: order.id });
});