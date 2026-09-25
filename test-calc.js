// Tests für core-calc.js – laufen auf tests.html
import { num, liqDistancePct, unrealizedPnl, markFromPosition } from './core-calc.js';

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
];
