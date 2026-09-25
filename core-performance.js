// Performance-Berechnungen. Reine Funktionen, Tests in test-performance.js.

// Hyperliquid liefert [[zeitraum, { pnlHistory: [[zeit, "wert"]], ... }], ...]
export function parsePortfolio(raw) {
  const out = {};
  (Array.isArray(raw) ? raw : []).forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const [period, data] = entry;
    const pnl = (data?.pnlHistory || []).map(([t, v]) => [Number(t), Number(v)]).filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v));
    out[period] = { pnl };
  });
  return out;
}

export function performance(equity, start) {
  if (!(start > 0) || equity == null) return null;
  return { pnl: equity - start, pct: ((equity - start) / start) * 100 };
}

// Kontowert-Verlauf rückwärts aus dem PnL-Verlauf rekonstruieren:
// Wert(t) = Kontowert jetzt − (PnL am Ende − PnL(t)). So verfälschen Ein-/Auszahlungen die Kurve nicht.
export function equityCurve(pnlSeries, equityNow) {
  if (!pnlSeries?.length || equityNow == null) return [];
  const last = pnlSeries[pnlSeries.length - 1][1];
  return pnlSeries.map(([t, p]) => [t, equityNow - (last - p)]);
}

// Größter Rückgang vom Höchststand in Prozent.
export function maxDrawdown(values) {
  let peak = -Infinity, dd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) dd = Math.max(dd, ((peak - v) / peak) * 100);
  }
  return dd;
}
