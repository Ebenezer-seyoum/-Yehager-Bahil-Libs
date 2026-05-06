export type CheckoutLineInput = {
  cartItemId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  trustedUnitPriceUsd: string;
  measurementId?: string | null;
};

export type CheckoutLine = {
  cartItemId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceUsd: number;
  lineTotalUsd: number;
  measurementId?: string | null;
};

export function moneyToNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

export function numberToMoney(value: number) {
  return value.toFixed(2);
}

export function buildCheckoutLines(inputs: CheckoutLineInput[]) {
  return inputs.map((item) => {
    const unitPriceUsd = moneyToNumber(item.trustedUnitPriceUsd);
    const quantity = item.quantity > 0 ? item.quantity : 1;

    return {
      cartItemId: item.cartItemId,
      productId: item.productId,
      productName: item.productName,
      quantity,
      unitPriceUsd,
      lineTotalUsd: unitPriceUsd * quantity,
      measurementId: item.measurementId,
    } satisfies CheckoutLine;
  });
}

export function computeTotals(lines: CheckoutLine[], shippingCostUsd = 0) {
  const subtotalUsd = lines.reduce((acc, line) => acc + line.lineTotalUsd, 0);
  const totalUsd = subtotalUsd + shippingCostUsd;
  return {
    subtotalUsd,
    shippingCostUsd,
    totalUsd,
  };
}

export function generateOrderNumber(date = new Date(), randomPart = Math.floor(1000 + Math.random() * 9000)) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `YH-${yyyy}${mm}${dd}-${randomPart}`;
}

/** Converts USD basket total to ETB using stored USD→ETB multiplier (same semantics as Base44 open.er-api). */
export function computeEtbTotals(totalUsd: number, usdToEtbRate: number) {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new RangeError("totalUsd must be a finite non-negative number");
  }
  if (!Number.isFinite(usdToEtbRate) || usdToEtbRate <= 0) {
    throw new RangeError("usdToEtbRate must be a finite positive number");
  }
  const totalEtb = totalUsd * usdToEtbRate;
  return {
    totalEtb: numberToMoney(totalEtb),
    etbExchangeRate: usdToEtbRate.toFixed(4),
  };
}
