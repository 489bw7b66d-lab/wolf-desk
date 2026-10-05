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
  // Erfundene Beispielwerte (8c: keine echten Kontobeträge im öffentlichen Repository)
  ['Unified: Kontowert = Spot 2.000', () => near(accountSummary({ accountValue: 1000, spotUsdc: 2000, notional: 8000 }).equity, 2000)],
  ['Unified: Verfügbar = Spot minus Perps = 1.000', () => near(accountSummary({ accountValue: 1000, spotUsdc: 2000, notional: 8000 }).available, 1000, 1e-6)],
  ['Unified: Auslastung = 50 %', () => near(accountSummary({ accountValue: 1000, spotUsdc: 2000, notional: 8000 }).usagePct, 50)],
  ['Classic: Perps + Spot addiert', () => near(accountSummary({ accountValue: 1000, spotUsdc: 200, withdrawable: 600, notional: 0 }, 'classic').equity, 1200)],
  ['Ohne Kontodaten = null', () => accountSummary(null) === null],
];
