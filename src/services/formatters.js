export function normalizeFiniteNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function formatCurrencyAmount(value, currency = "USD", language = "en") {
  const amount = normalizeFiniteNumber(value);
  const code = String(currency || "USD").toUpperCase();
  const locale = "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      currency: code,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      style: "currency",
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

export function formatUsdAmount(value, language = "en") {
  return formatCurrencyAmount(value, "USD", language);
}
