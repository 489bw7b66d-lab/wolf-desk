// Zahlenformatierung im deutschen Format.
const nf = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

export function price(v) {
  if (v == null) return '–';
  const a = Math.abs(v);
  const d = a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 4 : 5;
  return nf(d).format(v);
}
export const usd = (v) => (v == null ? '–' : nf(2).format(v) + ' $');
export const signedUsd = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(2).format(Math.abs(v)) + ' $');
export const pct = (v, d = 1) => (v == null ? '–' : nf(d).format(v) + ' %');
export const size = (v) => (v == null ? '–' : nf(4).format(Math.abs(v)));

export function age(ms) {
  if (ms == null) return 'nie';
  if (ms < 2000) return 'gerade eben';
  if (ms < 60000) return `vor ${Math.round(ms / 1000)} s`;
  return `vor ${Math.round(ms / 60000)} min`;
}
export const lev = (v) => (v == null ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(v) + '×');
export const usdShort = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + new Intl.NumberFormat('de-DE', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2, minimumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 }).format(Math.abs(v)) + ' $');
