// Zahlenformatierung im deutschen Format.
// Privatmodus: Geldbeträge und Stückzahlen werden als •••• angezeigt, Prozente und Kurse bleiben sichtbar.
let hidden = false;
export const setPrivate = (on) => { hidden = !!on; };
export const isPrivate = () => hidden;
// Führt fn mit echten Zahlen aus (z. B. für „Plan kopieren“)
export function raw(fn) { const was = hidden; hidden = false; try { return fn(); } finally { hidden = was; } }
const MASK = '••••';
const nf = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

export function price(v) {
  if (v == null) return '–';
  const a = Math.abs(v);
  const d = a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 4 : 5;
  return nf(d).format(v);
}
export const usd = (v) => (v == null ? '–' : hidden ? MASK + ' $' : nf(2).format(v) + ' $');
export const signedUsd = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + (hidden ? MASK : nf(2).format(Math.abs(v))) + ' $');
export const pct = (v, d = 1) => (v == null ? '–' : nf(d).format(v) + ' %');
export const size = (v) => (v == null ? '–' : hidden ? MASK : nf(4).format(Math.abs(v)));

export function age(ms) {
  if (ms == null) return 'nie';
  if (ms < 2000) return 'gerade eben';
  if (ms < 60000) return `vor ${Math.round(ms / 1000)} s`;
  return `vor ${Math.round(ms / 60000)} min`;
}
export const lev = (v) => (v == null ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(v) + '×');
export const usdShort = (v) => {
  if (v == null) return '–';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  if (hidden) return sign + MASK + ' $';
  const d = Math.abs(v) >= 100 ? 0 : 2;
  return sign + new Intl.NumberFormat('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d }).format(Math.abs(v)) + ' $';
};
