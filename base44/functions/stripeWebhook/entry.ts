import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const ADMIN_EMAIL = 'naomiinvestments2100@gmail.com';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const orderNumber = session.metadata?.order_number;
    const userEmail = session.metadata?.user_email;

    if (orderId) {
      // Mark order as paid
      await base44.asServiceRole.entities.Order.update(orderId, {
        payment_status: 'paid',
        status: 'pending',
      });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        action: `Payment received for order #${orderNumber}`,
        entity_type: 'Order',
        entity_id: orderId,
        performed_by: 'stripe',
        category: 'payment',
        severity: 'info',
        metadata: { stripe_session_id: session.id, amount: session.amount_total / 100 },
      });

      // System alert for admin dashboard
      await base44.asServiceRole.entities.SystemAlert.create({
        title: `New Order #${orderNumber}`,
        message: `New paid order from ${userEmail}. Total: $${(session.amount_total / 100).toFixed(2)}. Please update status to Tailoring and notify the Ethiopia team.`,
        type: 'new_order',
        severity: 'info',
        entity_id: orderId,
      });

      if (userEmail) {
        // Clear cart items
        const cartItems = await base44.asServiceRole.entities.CartItem.filter({ user_email: userEmail });
        for (const item of cartItems) {
          await base44.asServiceRole.entities.CartItem.delete(item.id);
        }

        // Update event participants
        const orderList = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        const fullOrder = orderList[0] || null;
        if (fullOrder?.event_id) {
          const parts = await base44.asServiceRole.entities.EventParticipant.filter({
            event_id: fullOrder.event_id,
            participant_email: userEmail,
          });
          for (const part of parts) {
            await base44.asServiceRole.entities.EventParticipant.update(part.id, {
              order_id: orderId,
              order_status: 'ordered',
              payment_status: 'paid',
            });
          }
        }

        const userName = session.customer_details?.name || userEmail;
        const total = session.amount_total / 100;

        // Build shipping address string
        const shippingAddr = fullOrder?.shipping_address;
        const addrStr = shippingAddr?.street
          ? `${shippingAddr.street}, ${shippingAddr.city}${shippingAddr.state ? ', ' + shippingAddr.state : ''} ${shippingAddr.zip || ''}, ${shippingAddr.country} | Phone: ${shippingAddr.phone || 'N/A'}`
          : (session.customer_details?.address
            ? `${session.customer_details.address.line1}, ${session.customer_details.address.city}, ${session.customer_details.address.country}`
            : 'N/A');

        const itemsList = (fullOrder?.items || []).map(i => `• ${i.product_name} — $${i.price?.toFixed(2)}`).join('<br/>') || 'See order details';

        // Measurement details per item
        const measurementDetails = (fullOrder?.items || []).map(i => {
          const m = i.measurement_snapshot || {};
          const hasMeasurements = Object.keys(m).length > 0;
          return `<li><strong>${i.product_name}</strong> — ${hasMeasurements
            ? `Chest: ${m.chest || '?'}" | Waist: ${m.waist || '?'}" | Hips: ${m.hips || '?'}" | Shoulder: ${m.shoulder_width || '?'}" | Arm: ${m.arm_length || '?'}" | Torso: ${m.torso_length || '?'}"`
            : '<em>No measurements provided</em>'}</li>`;
        }).join('');

        // Customer confirmation email
        const orderDate = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: userEmail,
          from_name: 'Yehager Bahil Libs',
          subject: `✅ Order Confirmed — #${orderNumber} | Yehager Bahil Libs`,
          body: buildCustomerEmail(userName, orderNumber, total, fullOrder, orderDate),
        });

        // Admin notification email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          from_name: 'Yehager Bahil Libs Orders',
          subject: `🛒 NEW ORDER #${orderNumber} — $${total.toFixed(2)} — ${userName}`,
          body: buildAdminEmail(userName, userEmail, orderNumber, total, itemsList, measurementDetails, addrStr, fullOrder?.event_name || null),
        });
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;

    await base44.asServiceRole.entities.AuditLog.create({
      action: `Payment failed — PaymentIntent ${pi.id}`,
      entity_type: 'Order',
      entity_id: pi.id,
      performed_by: 'stripe',
      category: 'payment',
      severity: 'error',
      metadata: { reason: pi.last_payment_error?.message },
    });

    await base44.asServiceRole.entities.SystemAlert.create({
      title: 'Payment Failed',
      message: `A payment attempt failed. PaymentIntent: ${pi.id}. Reason: ${pi.last_payment_error?.message || 'Unknown'}`,
      type: 'failed_payment',
      severity: 'error',
      entity_id: pi.id,
    });

    // Notify admin of failed payment
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ADMIN_EMAIL,
      from_name: 'Yehager Bahil Libs Orders',
      subject: `⚠️ Payment Failed — PaymentIntent ${pi.id}`,
      body: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#fff8f8;border:2px solid #f5c6cb;border-radius:8px;">
        <h2 style="color:#c0392b;">⚠️ Payment Failure Alert</h2>
        <p><strong>PaymentIntent:</strong> ${pi.id}</p>
        <p><strong>Reason:</strong> ${pi.last_payment_error?.message || 'Unknown'}</p>
        <p>Please check your <a href="https://dashboard.stripe.com">Stripe Dashboard</a> for full details.</p>
        <p style="color:#888;font-size:12px;">Yehager Bahil Libs · ${ADMIN_EMAIL}</p>
      </div>`,
    });
  }

  return Response.json({ received: true });
});

function buildCustomerEmail(name, orderNumber, total, order, orderDate) {
  const items = order?.items || [];
  const itemRows = items.map((item, idx) => {
    const m = item.measurement_snapshot || {};
    const hasMeasurements = Object.keys(m).length > 0;
    return `
      <tr style="border-bottom:1px solid #e8ddd0;">
        <td style="padding:14px 10px;">
          <p style="margin:0;font-weight:bold;font-size:14px;">${item.product_name}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;">Item #${String(idx + 1).padStart(3, '0')} · Qty: ${item.quantity || 1}</p>
          ${hasMeasurements ? `<p style="margin:4px 0 0;font-size:11px;color:#aaa;">Chest ${m.chest || '?'}" · Waist ${m.waist || '?'}" · Hips ${m.hips || '?'}" · Shoulder ${m.shoulder_width || '?'}" · Arm ${m.arm_length || '?'}" · Torso ${m.torso_length || '?'}"</p>` : ''}
        </td>
        <td style="padding:14px 10px;text-align:right;font-weight:bold;font-size:14px;">$${item.price?.toFixed(2)}</td>
      </tr>`;
  }).join('');

  const shippingAddr = order?.shipping_address;
  const addrStr = shippingAddr?.street
    ? `${shippingAddr.street}, ${shippingAddr.city}${shippingAddr.state ? ', ' + shippingAddr.state : ''} ${shippingAddr.zip || ''}, ${shippingAddr.country}`
    : 'See order details';

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f0eb;font-family:Georgia,serif;">
<div style="max-width:640px;margin:0 auto;background:#fffdf9;">

  <!-- HEADER -->
  <div style="background:#1a1410;padding:28px 32px;text-align:center;">
    <img src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png" alt="Yehager Bahil Libs" style="height:80px;width:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;display:block;margin:0 auto 12px;"/>
    <h1 style="margin:0;color:#c9882e;font-size:24px;letter-spacing:1px;">Yehager Bahil Libs</h1>
    <p style="margin:6px 0 0;color:#ffffff70;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Where Tradition Meets Your Perfect Fit</p>
  </div>

  <!-- ORDER CONFIRMED BANNER -->
  <div style="background:#27ae60;padding:18px 32px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">✅ Order Confirmed!</p>
    <p style="margin:6px 0 0;color:#ffffff90;font-size:13px;">Your custom garment is being prepared</p>
  </div>

  <div style="padding:32px;">

    <!-- A. ORDER IDENTIFICATION -->
    <div style="background:#f8f5ef;border-left:4px solid #c9882e;padding:20px 24px;border-radius:8px;margin-bottom:28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Order Number</td><td style="font-size:15px;font-weight:bold;color:#c9882e;text-align:right;">#${orderNumber}</td></tr>
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Order Date</td><td style="font-size:13px;text-align:right;">${orderDate}</td></tr>
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Customer</td><td style="font-size:13px;font-weight:bold;text-align:right;">${name}</td></tr>
        <tr><td style="font-size:13px;color:#888;padding:3px 0;">Total Paid</td><td style="font-size:16px;font-weight:bold;color:#1a1410;text-align:right;">$${total.toFixed(2)}</td></tr>
      </table>
    </div>

    <!-- B. ORDER DETAILS -->
    <h3 style="color:#c9882e;border-bottom:2px solid #e8ddd0;padding-bottom:8px;margin-bottom:0;">🧵 Your Order Details</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#f8f5ef;">
          <th style="padding:12px 10px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;">Item / Measurements</th>
          <th style="padding:12px 10px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr style="background:#1a1410;">
          <td style="padding:14px 10px;color:#fff;font-weight:bold;">Total</td>
          <td style="padding:14px 10px;color:#c9882e;font-size:18px;font-weight:bold;text-align:right;">$${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Shipping Address -->
    ${shippingAddr?.street ? `<p style="font-size:13px;color:#666;margin-bottom:24px;">📦 <strong>Ships to:</strong> ${addrStr}</p>` : ''}
    ${order?.event_name ? `<p style="font-size:13px;background:#fff3cd;padding:10px 14px;border-radius:6px;">🎉 Linked to event: <strong>${order.event_name}</strong></p>` : ''}

    <!-- C. CONTACT POLICY -->
    <div style="background:#fff8e1;border:2px solid #f39c12;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#e67e22;">📞 For Order Adjustments — Contact ONLY:</p>
      <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#1a1410;">Production Manager (Ethiopia)</p>
      <p style="margin:0 0 12px;font-size:20px;font-weight:bold;color:#c9882e;">+251 92 394 0978</p>
      <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
        Please contact the Production Manager <strong>only</strong> for: order adjustments, size corrections, design or customization clarification, and product-related questions.<br/>
        <strong>Do not use other numbers for order-related inquiries.</strong>
      </p>
    </div>

    <!-- D. PRODUCTION & CANCELLATION POLICY -->
    <div style="background:#fdf0f0;border:2px solid #e74c3c;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#c0392b;">⚠️ IMPORTANT — Production & Cancellation Policy</p>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:2;">
        <li><strong>Production begins shortly after order confirmation.</strong></li>
        <li>You have <strong>3 days (72 hours)</strong> from this confirmation to request cancellations or adjustments.</li>
        <li>Once the cutting stage begins, <strong>no changes or cancellations are possible under any circumstances.</strong></li>
      </ul>
    </div>

    <!-- E. CANCELLATION INSTRUCTIONS -->
    <h3 style="color:#c9882e;border-bottom:2px solid #e8ddd0;padding-bottom:8px;">❌ How to Request a Cancellation</h3>
    <p style="font-size:13px;color:#555;line-height:1.8;">If you need to cancel, you must submit your request <strong>via email within 3 days</strong> of this confirmation. Include:</p>
    <ul style="font-size:13px;color:#555;line-height:2;">
      <li>Your <strong>Order Number:</strong> #${orderNumber}</li>
      <li>Your <strong>Full Name:</strong> ${name}</li>
    </ul>
    <p style="font-size:13px;color:#555;">Send cancellation requests to: <a href="mailto:naomiinvestments2100@gmail.com" style="color:#c9882e;">naomiinvestments2100@gmail.com</a></p>
    <p style="font-size:13px;color:#555;">For clarification before cancelling, contact the Production Manager at <strong>+251 92 394 0978</strong>.</p>

    <!-- F. CUSTOMER PORTAL -->
    <div style="background:#f0f4ff;border-radius:10px;padding:18px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#1a1410;">🔐 Track Your Order Online</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">Log in to your account at <a href="https://www.yehagerbahillibs.com" style="color:#c9882e;font-weight:bold;">YehagerBahilLibs.com</a> to:</p>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#555;line-height:2;">
        <li>Track your order status in real time</li>
        <li>View full order details & measurements</li>
        <li>Monitor production progress</li>
      </ul>
    </div>

    <!-- G. ORDER JOURNEY -->
    <h3 style="color:#c9882e;border-bottom:2px solid #e8ddd0;padding-bottom:8px;">📦 Your Order Journey</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <tr>
        ${[
          ['🔍', 'Order Review', '1–2 days'],
          ['✂️', 'Production', '20–35 days'],
          ['🔎', 'Quality Check', '3–5 days'],
          ['🚚', 'Shipping', '5–15 days'],
          ['🎉', 'Delivery', 'At your door'],
        ].map(([icon, label, time]) =>
          `<td style="text-align:center;padding:10px 4px;">
            <div style="font-size:22px;">${icon}</div>
            <div style="font-size:11px;font-weight:bold;color:#1a1410;margin-top:4px;">${label}</div>
            <div style="font-size:10px;color:#999;margin-top:2px;">${time}</div>
          </td>`
        ).join('<td style="text-align:center;color:#c9882e;font-size:16px;">→</td>')}
      </tr>
    </table>

    <!-- LEGAL DISCLAIMER -->
    <div style="background:#f8f8f8;border:1px solid #ddd;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#999;line-height:1.8;">
        <strong>Legal Notice:</strong> By completing this purchase, you acknowledge and agree that all garments are custom-made to your measurements. No changes are permitted after production begins. This email serves as your binding acknowledgment of our cancellation and production policies. Yehager Bahil Libs operates in compliance with U.S. consumer protection standards (Minnesota jurisdiction). This confirmation is timestamped and stored as proof of your agreement.
      </p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#1a1410;padding:24px 32px;text-align:center;">
    <p style="margin:0 0 8px;font-style:italic;color:#c9882e;font-size:14px;">Thank you for choosing us.</p>
    <p style="margin:0 0 12px;color:#ffffff80;font-size:12px;">Wear your culture with pride.</p>
    <div style="margin-bottom:12px;">
      <a href="https://www.yehagerbahillibs.com" style="color:#c9882e;font-size:13px;text-decoration:none;">🌐 YehagerBahilLibs.com</a>
    </div>
    <p style="margin:0;font-size:10px;color:#ffffff40;">© 2024 Yehager Bahil Libs · Naomi Investments LLC · Minnesota, USA</p>
  </div>

</div>
</body>
</html>`;
}

function buildAdminEmail(customerName, customerEmail, orderNumber, total, itemsList, measurementDetails, shippingAddress, eventName) {
  return `
<div style="font-family:Georgia,serif;max-width:660px;margin:0 auto;color:#1a1410;background:#fffdf9;">
  <div style="background:#1a1410;padding:24px 32px;text-align:center;">
    <h1 style="margin:0;color:#c9882e;font-size:22px;">🛒 New Order Received</h1>
    <p style="margin:6px 0 0;color:#ffffff80;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Yehager Bahil Libs — Admin Notification</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#f0f8f0;border-left:4px solid #27ae60;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;font-size:20px;font-weight:bold;color:#27ae60;">✅ Payment Confirmed — $${total.toFixed(2)}</p>
      <p style="margin:4px 0 0;color:#555;font-size:13px;">Order #${orderNumber}</p>
    </div>

    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:6px;">👤 Customer Details</h3>
    <p style="font-size:14px;"><strong>Name:</strong> ${customerName}</p>
    <p style="font-size:14px;"><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
    ${eventName ? `<p style="font-size:14px;"><strong>Event:</strong> ${eventName}</p>` : ''}

    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:6px;">🧵 Items Ordered</h3>
    <p style="font-size:14px;line-height:2;">${itemsList}</p>
    <p style="font-size:16px;font-weight:bold;color:#1a1410;">Total Paid: $${total.toFixed(2)}</p>

    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:6px;">📏 Customer Measurements</h3>
    <ul style="font-size:13px;line-height:2.2;">
      ${measurementDetails || '<li>No measurements on file</li>'}
    </ul>

    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:6px;">📦 Shipping Address</h3>
    <p style="font-size:14px;">${shippingAddress}</p>

    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:6px;">📋 Action Checklist</h3>
    <ol style="font-size:14px;line-height:2.2;">
      <li>✅ <strong>Log in to Admin Dashboard</strong> → Orders → Find #${orderNumber}</li>
      <li>🔄 <strong>Change status to "Tailoring"</strong> to notify customer</li>
      <li>📏 <strong>Send measurements above</strong> to your Ethiopia tailoring team</li>
      <li>🔍 <strong>Change to "Quality Check"</strong> when tailoring is complete</li>
      <li>🚚 <strong>Change to "Shipped"</strong> and update customer with tracking info</li>
      <li>✅ <strong>Change to "Delivered"</strong> once confirmed received</li>
    </ol>

    <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e8ddd0;">
      <p style="font-size:11px;color:#999;">Yehager Bahil Libs · naomiinvestments2100@gmail.com</p>
    </div>
  </div>
</div>`;
}