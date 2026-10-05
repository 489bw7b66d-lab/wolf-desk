// Zusätzliche Backtest-Kennzahlen und -Kosten (8d). Reine Funktionen, Tests in test-btmetrics.js.
//   Funding: geschätzte Haltekosten für Longs. Pauschale statt echter Verlauf je Coin (der wäre je Lauf zu viele Abrufe).
//   Pareto:  Welcher Anteil des Gewinns kommt aus den besten 15 % der Trades? (Anlass: Tabelle von Peter Brandt)
//   Haltedauer: Tage vom Einstieg bis zum Ausstieg.

// 0,03 % am Tag = Hyperliquids Grundsatz von 0,01 % je 8 Stunden (rund 11 % im Jahr). Schätzung: der echte Satz schwankt je Coin und Phase.
export const FUNDING = { pctPerDay: 0.03 };

// Funding eines Trades in R. Longs zahlen; Shorts bekommen in dieser Rechnung nichts gutgeschrieben (vorsichtig).
export function fundingR(sim, dir, pctPerDay = FUNDING.pctPerDay) {
  if (dir !== 'long' || !sim || !(sim.R > 0) || !(sim.entryPx > 0) || !(sim.exitTime > sim.fillTime) || !(pctPerDay > 0)) return 0;
  return (pctPerDay / 100) * ((sim.exitTime - sim.fillTime) / 864e5) * sim.entryPx / sim.R;
}
// Ergebnis nach Funding (r sinkt, grossR bleibt)
export const afterFunding = (sim, dir, pctPerDay) => { const fr = fundingR(sim, dir, pctPerDay); return fr ? { ...sim, r: sim.r - fr } : sim; };

// Anteil des Netto-Gewinns aus den besten 15 % der Trades (in Prozent). Über 100 % heißt: der Rest hat zusammen Geld gekostet.
// null, wenn es insgesamt keinen Gewinn gibt (dann sagt der Anteil nichts).
export function paretoShare(trades, share = 0.15) {
  const n = trades?.length || 0;
  if (!n) return null;
  const total = trades.reduce((s, t) => s + t.r, 0);
  if (!(total > 0)) return null;
  const k = Math.max(1, Math.round(n * share));
  const top = [...trades].sort((a, b) => b.r - a.r).slice(0, k).reduce((s, t) => s + t.r, 0);
  return { pct: (top / total) * 100, k, n, top, total };
}

// Mittlere Haltedauer in Tagen (nur Trades mit bekannter Ein- und Ausstiegszeit)
export function avgHoldDays(trades) {
  const l = (trades || []).filter((t) => t.exitTime > t.fillTime);
  return l.length ? l.reduce((s, t) => s + (t.exitTime - t.fillTime), 0) / l.length / 864e5 : null;
}
