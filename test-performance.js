import { parsePortfolio, performance, equityCurve, maxDrawdown } from './core-performance.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;

export const tests = [
  ['Performance: 1.500 → 2.391,45 = +59,43 %', () => near(performance(2391.45, 1500).pct, (891.45 / 1500) * 100)],
  ['Performance: Gewinn in $', () => near(performance(2391.45, 1500).pnl, 891.45)],
  ['Performance ohne Startkapital = null', () => performance(2000, 0) === null],
  ['Portfolio lesen', () => parsePortfolio([['week', { pnlHistory: [[1, '0'], [2, '12.5']] }]]).week.pnl[1][1] === 12.5],
  ['Portfolio: kaputte Daten ergeben leeres Ergebnis', () => Object.keys(parsePortfolio(null)).length === 0],
  ['Kurve endet beim aktuellen Kontowert', () => equityCurve([[1, 0], [2, 50], [3, 30]], 1000).at(-1)[1] === 1000],
  ['Kurve: Startpunkt = jetzt minus Periodengewinn', () => equityCurve([[1, 0], [2, 50], [3, 30]], 1000)[0][1] === 970],
  ['Max. Drawdown: 100 → 120 → 90 = 25 %', () => near(maxDrawdown([100, 120, 90, 110]), 25)],
  ['Max. Drawdown nur steigend = 0', () => maxDrawdown([1, 2, 3]) === 0],
];
