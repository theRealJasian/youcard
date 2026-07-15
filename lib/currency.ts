export function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Not used on the home screen -- the balance circle shows the real,
// separately-tracked balance for each currency you hold, not a converted
// estimate. This is here in case you want an FX estimate somewhere else
// later (e.g. "what's my total net worth in USD" on a stats page).
export const FALLBACK_RATES_PER_USD: Record<string, number> = {
  USD: 1,
  THB: 36.2,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.5,
};

export function convert(amount: number, from: string, to: string) {
  const rates = FALLBACK_RATES_PER_USD;
  if (!rates[from] || !rates[to]) return amount;
  const usd = amount / rates[from];
  return usd * rates[to];
}

export async function fetchLiveRates(base: string = "USD") {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error("Failed to fetch FX rates");
  const data = await res.json();
  return data.rates as Record<string, number>;
}
