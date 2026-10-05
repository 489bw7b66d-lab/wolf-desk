// Ausstiegsrechner (8a): Wie viel Stück sind X % der noch offenen Position? Reine Rechnung, keine Anzeige.
// Ledger-Perpetuals werden von Hand geschlossen, deshalb wird die Menge auf die Nachkommastellen des Marktes abgerundet.

// Nachkommastellen einer Zahl (Ersatz, wenn die Stellen des Marktes nicht bekannt sind: die Positionsgröße hält sie ein)
export function decimalsOf(v) {
  const s = String(Math.abs(Number(v) || 0));
  if (s.includes('e-')) return Number(s.split('e-')[1]) || 0;
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

// Abrunden auf feste Nachkommastellen (nie mehr verkaufen als gewollt)
export function floorTo(v, dec) {
  const m = 10 ** Math.max(0, dec);
  return Math.floor(v * m + 1e-7) / m;
}

// size: offene Stückzahl (Vorzeichen egal) · pct: Anteil der NOCH OFFENEN Position in Prozent
export function exitCalc({ size, entry, mark, side, pct, szDecimals } = {}) {
  const q = Math.abs(Number(size) || 0), p = Number(pct);
  if (!(q > 0) || !(mark > 0) || !(entry > 0) || !Number.isFinite(p) || p <= 0) return null;
  const dec = Number.isInteger(szDecimals) && szDecimals >= 0 ? szDecimals : decimalsOf(q);
  const qty = p >= 100 ? q : floorTo((q * p) / 100, dec);
  if (!(qty > 0)) return { qty: 0, dec, tooSmall: true };
  const sg = side === 'short' ? -1 : 1;
  const rest = Math.max(0, floorTo(q - qty, Math.max(dec, decimalsOf(q))));
  return { qty, dec, value: qty * mark, pnl: (mark - entry) * sg * qty, rest, restPct: (rest / q) * 100, realPct: (qty / q) * 100, capped: p > 100 };
}

// Menge als Text zum Kopieren (Punkt als Dezimalzeichen, ohne Tausender-Trennung, ohne überflüssige Nullen)
export function qtyText(qty, dec) {
  if (!(qty > 0)) return '';
  const s = qty.toFixed(Math.max(0, dec));
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

// „Laut Plan wären bis TPx y % verkauft“: umgerechnet auf den Rest, der noch offen ist.
// exitPlan: [{ label: 'TP1', pct }, …] · reached: Anzahl schon erreichter Ziele · soldPct: schon verkaufter Anteil der Ausgangsposition
export function planHint(exitPlan, reached = 0, soldPct = 0) {
  const tps = (exitPlan || []).filter((x) => /^TP\d/.test(x.label) && Number(x.pct) > 0);
  const next = tps[reached];
  if (!next) return null;
  const cum = tps.slice(0, reached + 1).reduce((s, x) => s + Number(x.pct), 0);
  const sold = Math.max(0, Math.min(100, Number(soldPct) || 0));
  if (sold >= 100 || cum <= sold) return null;
  return { label: next.label, cum, ofOpen: Math.min(100, Math.round(((cum - sold) / (100 - sold)) * 100)) };
}
