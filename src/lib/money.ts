/**
 * Money is always stored as integer cents plus an ISO 4217 currency code (AGENTS.md §5).
 * Never use floats for amounts.
 */

export const CURRENCIES = ["EUR", "RSD", "BAM", "MKD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  cents: number;
  currency: Currency;
}

export function money(cents: number, currency: Currency): Money {
  if (!Number.isInteger(cents)) {
    throw new Error(`Money must be integer cents, got ${cents}`);
  }
  return { cents, currency };
}

/** Format for display, e.g. formatMoney(money(39000, "EUR"), "sl") → "390,00 €". */
export function formatMoney(value: Money, locale: string = "sl"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
  }).format(value.cents / 100);
}

/** Provider costs are integer micro-USD (1 USD = 1,000,000). formatUsdMicros(2000, "sl") → "0,002 USD". */
export function formatUsdMicros(micros: number, locale: string = "sl"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(micros / 1_000_000);
}
