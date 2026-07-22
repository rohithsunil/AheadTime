const CURRENCY_KEY = "aheadtime-currency";

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD – US Dollar" },
  { code: "AED", symbol: "AED", label: "AED – UAE Dirham" },
  { code: "EUR", symbol: "€", label: "EUR – Euro" },
  { code: "GBP", symbol: "£", label: "GBP – British Pound" },
  { code: "SAR", symbol: "SAR", label: "SAR – Saudi Riyal" },
  { code: "INR", symbol: "₹", label: "INR – Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "CAD – Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD – Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY – Japanese Yen" },
  { code: "CHF", symbol: "CHF", label: "CHF – Swiss Franc" },
];

export function getCurrency() {
  const stored = localStorage.getItem(CURRENCY_KEY);
  return CURRENCIES.find((c) => c.code === stored) || CURRENCIES.find((c) => c.code === "AED") || CURRENCIES[0];
}

export function setCurrency(code) {
  localStorage.setItem(CURRENCY_KEY, code);
  window.dispatchEvent(new Event("currency-change"));
}

export function formatCurrency(amount) {
  const { symbol } = getCurrency();
  return `${symbol} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}