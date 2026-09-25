// Tests für core-calc.js – laufen auf tests.html
import { num, liqDistancePct, unrealizedPnl, markFromPosition, accountSummary } from './core-calc.js';

const near = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;

export const tests = [
  ['num: Text wird Zahl', () => num('63120.5') === 63120.5],
  ['num: leer/ungültig ergibt null', () => num('') === null && num(null) === null && num('abc') === null],
  ['Liq-Abstand Long: 100 → 90 = 10 %', () => near(liqDistancePct('long', 100, 90), 10)],
  ['Liq-Abstand Short: 100 → 125 = 25 %', () => near(liqDistancePct('short', 100, 125), 25)],
  ['Liq-Abstand ohne Liq-Preis = null', () => liqDistancePct('long', 100, null) === null],
  ['Liq-Abstand negativ wenn schon überschritten', () => liqDistancePct('long', 80, 90) < 0],
  ['PnL Long: 2 Stk. von 100 auf 110 = +20', () => near(unrealizedPnl(2, 100, 110), 20)],
  ['PnL Short: −2 Stk. von 100 auf 110 = −20', () => near(unrealizedPnl(-2, 100, 110), -20)],
  ['Mark aus Positionswert: 6300 / 0,1 = 63000', () => near(markFromPosition(6300, 0.1), 63000)],
  ['Mark bei Short (negative Größe) positiv', () => near(markFromPosition(6300, -0.1), 63000)],
  // Echte Werte aus Buddys Konto, abgeglichen mit der Ledger-Anzeige
  ['Unified: Kontowert = Spot 2.423,86', () => near(accountSummary({ accountValue: 1270.15, spotUsdc: 2423.86, notional: 10000 }).equity, 2423.86)],
  ['Unified: Verfügbar = 1.153,71 (wie bei Ledger)', () => near(accountSummary({ accountValue: 1270.15, spotUsdc: 2423.86, notional: 10000 }).available, 1153.71, 1e-6)],
  ['Unified: Auslastung ≈ 52,4 %', () => near(accountSummary({ accountValue: 1270.15, spotUsdc: 2423.86, notional: 10000 }).usagePct, 1270.15 / 2423.86 * 100)],
  ['Classic: Perps + Spot addiert', () => near(accountSummary({ accountValue: 1000, spotUsdc: 200, withdrawable: 600, notional: 0 }, 'classic').equity, 1200)],
  ['Ohne Kontodaten = null', () => accountSummary(null) === null],
];
