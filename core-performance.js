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

// Ehrlicher Gewinn (seit 4d): Hyperliquids PnL-Verlauf rechnet Ein- und Auszahlungen heraus.
// Gewinn = letzter Wert des Gesamt-PnL (inkl. offener Positionen), Einsatz = Kontowert − Gewinn (= deine Einzahlungen netto).
// Ohne Verlauf (noch nicht geladen) vorläufig wie bisher: Kontowert − Startkapital.
export function honestSplit(equity, lifePnl, openPnl, startCapital) {
  const book = openPnl || 0;
  if (equity != null && Number.isFinite(lifePnl)) {
    const invested = equity - lifePnl;
    return { total: lifePnl, pct: invested > 0 ? (lifePnl / invested) * 100 : null, book, realized: lifePnl - book, invested, source: 'hl' };
  }
  if (!(startCapital > 0) || equity == null) return null;
  const total = equity - startCapital;
  return { total, pct: (total / startCapital) * 100, book, realized: total - book, invested: startCapital, source: 'start' };
}

// PnL der letzten 24 Std. aus dem Verlauf (realisiert + offen, ohne Einzahlungen)
export const dayPnlOf = (portfolio) => {
  const d = portfolio ? parsePortfolio(portfolio).day?.pnl : null;
  return d?.length ? d.at(-1)[1] - d[0][1] : null;
};
export const lifePnlOf = (portfolio) => {
  const l = portfolio ? parsePortfolio(portfolio).allTime?.pnl : null;
  return l?.length ? l.at(-1)[1] : null;
};
