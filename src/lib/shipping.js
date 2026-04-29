/**
 * EMS Shipping calculation rules:
 * - 1 item in a package  → $45
 * - 2–5 items in a package → $100
 * - Packages cycle every 5 items
 */
export function calcEMSShipping(itemCount) {
  if (itemCount <= 0) return 0;
  const fullPacks = Math.floor(itemCount / 5);
  const remainder = itemCount % 5;
  let cost = fullPacks * 100;
  if (remainder === 1) cost += 45;
  else if (remainder > 1) cost += 100;
  return cost;
}