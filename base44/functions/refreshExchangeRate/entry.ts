import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Fetch live rate from open.er-api.com (free, no key needed)
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  const data = await response.json();

  if (!data.rates || !data.rates.ETB) {
    return Response.json({ error: 'Failed to fetch ETB rate' }, { status: 500 });
  }

  const rate = data.rates.ETB;
  const lastUpdated = new Date().toISOString();

  // Check if record exists
  const existing = await base44.asServiceRole.entities.ExchangeRate.filter({ currency_pair: 'USD_ETB' });

  if (existing.length > 0) {
    await base44.asServiceRole.entities.ExchangeRate.update(existing[0].id, {
      rate,
      source: 'open.er-api.com',
      last_updated: lastUpdated,
    });
  } else {
    await base44.asServiceRole.entities.ExchangeRate.create({
      currency_pair: 'USD_ETB',
      rate,
      source: 'open.er-api.com',
      last_updated: lastUpdated,
    });
  }

  return Response.json({ success: true, rate, last_updated: lastUpdated });
});