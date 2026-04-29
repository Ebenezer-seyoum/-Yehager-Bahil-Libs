import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check for orders stuck in pending for more than 2 days
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 200);
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    let alertsCreated = 0;

    for (const order of orders) {
      const age = now - new Date(order.created_date).getTime();
      if (order.status === 'pending' && order.payment_status === 'paid' && age > twoDaysMs) {
        // Check if alert already exists for this order
        const existing = await base44.asServiceRole.entities.SystemAlert.filter({
          entity_id: order.id,
          is_resolved: false,
          type: 'system_error'
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.SystemAlert.create({
            title: 'Order Stuck in Pending',
            message: `Order ${order.order_number} for ${order.customer_name} has been paid but stuck in pending for over 2 days.`,
            type: 'system_error',
            severity: 'warning',
            entity_id: order.id
          });
          alertsCreated++;
        }
      }
    }

    // Check for failed payments
    const failedPayments = orders.filter(o => o.payment_status === 'failed');
    for (const order of failedPayments) {
      const existing = await base44.asServiceRole.entities.SystemAlert.filter({
        entity_id: order.id,
        type: 'failed_payment',
        is_resolved: false
      });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.SystemAlert.create({
          title: 'Failed Payment Detected',
          message: `Order ${order.order_number} for ${order.customer_name} ($${order.total}) has a failed payment.`,
          type: 'failed_payment',
          severity: 'error',
          entity_id: order.id
        });
        alertsCreated++;
      }
    }

    // Log this system check
    await base44.asServiceRole.entities.AuditLog.create({
      action: `System health check completed. ${alertsCreated} new alerts created.`,
      category: 'system',
      severity: 'info',
      performed_by: 'system'
    });

    return Response.json({ success: true, alerts_created: alertsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});