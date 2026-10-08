// 8s: Laufende Trades zum Kurs von jetzt bewerten (Jensen, 08.10.2026: „Trades, die gut laufen, tauchen in abgeschlossenen Trades
// gar nicht auf, weil ein Runner offen bleibt. Verzerrt das nicht die Statistik?“ Ja: Ohne sie fehlen genau die besten Trades.)
// Ein laufender Trade wird so behandelt, als würde der Rest jetzt zum aktuellen Kurs geschlossen: Teilverkäufe zählen mit ihrem
// echten Preis, der Rest zum Kurs von jetzt (ohne Ausstiegsgebühr für den Rest). Er bekommt das Kennzeichen marked = true.
// Reine Funktionen, Tests in test-openmark.js. Die Auswertungen zeigen beides: nur abgeschlossene und mit laufenden.
export const remainingSize = (t) => Math.max(0, (t?.entries || []).reduce((s, e) => s + e.sz, 0) - (t?.exits || []).reduce((s, e) => s + e.sz, 0));

export function markTrade(t, price, now = Date.now()) {
  if (!t || t.closedAt != null || t.partial || !(t.entryAvg > 0) || !(price > 0)) return null;
  const rest = remainingSize(t);
  if (!(rest > 0)) return null;
  const sign = t.side === 'short' ? -1 : 1, pnl = sign * rest * (price - t.entryAvg);
  return { ...t, closedAt: now, marked: true, markPx: price, realized: t.realized + pnl, exits: [...t.exits, { time: now, px: price, sz: rest, pnl, mark: true }] };
}
// Liste der Trades: abgeschlossene unverändert, laufende bewertet (ohne Kurs bleiben sie offen und zählen nicht)
export function withOpenMarked(trades, priceOf, now = Date.now()) {
  return (trades || []).map((t) => (t.closedAt == null ? markTrade(t, priceOf(t.coin), now) || t : t));
}
export const countMarked = (trades) => (trades || []).filter((t) => t.marked).length;
