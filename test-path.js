import { tradePath, plannedTargets, targetOrders } from './core-path.js';

const PLAN4 = [{ label: 'TP1', pct: 20 }, { label: 'TP2', pct: 25 }, { label: 'TP3', pct: 25 }, { label: 'TP4', pct: 15 }, { label: 'Runner', pct: 15 }];
const PLAN3 = [{ label: 'TP1', pct: 30 }, { label: 'TP2', pct: 30 }, { label: 'TP3', pct: 25 }, { label: 'TP4', pct: 0 }, { label: 'Runner', pct: 15 }];
const TP = (px, coin = 'SOL', side = 'A') => ({ coin, side, orderType: 'Take Profit Market', triggerPx: String(px), reduceOnly: true });
const SL = (px) => ({ coin: 'SOL', side: 'A', orderType: 'Stop Market', triggerPx: String(px), reduceOnly: true });
const L = { coin: 'SOL', side: 'long', entry: 100, stop: 90, liq: 80, mark: 105 };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Trade-Weg: TP4 auf 0 % = nur 3 Ziele', () => plannedTargets(PLAN3) === 3 && plannedTargets(PLAN4) === 4],
  ['Trade-Weg: Stops zählen nicht als Ziel', () => targetOrders(L, [SL(90), TP(110)]).join() === '110'],
  ['Trade-Weg: Ziele aus Orders, Stop links, Einstieg dazwischen', () => {
    const p = tradePath(L, [TP(110), TP(120), TP(130), TP(140)], [], PLAN4);
    return p.tps.length === 4 && p.left.kind === 'stop' && near(p.entry.at, 0.2) && near(p.mark.at, 0.3);
  }],
  ['Trade-Weg: mit TP4 = 0 % endet der Balken bei TP3', () => { const p = tradePath(L, [TP(110), TP(120), TP(130), TP(140)], [], PLAN3); return p.tps.length === 3 && p.tps.at(-1).price === 130; }],
  ['Trade-Weg: ausgeführter Teilverkauf zählt als erreichtes TP1', () => {
    const p = tradePath({ ...L, mark: 115 }, [TP(120), TP(130)], [{ px: 110 }], PLAN3);
    return p.tps[0].reached && p.tps[0].price === 110 && p.next.n === 2 && near(p.next.pct, (120 - 115) / 115 * 100);
  }],
  ['Trade-Weg: Short läuft nach unten', () => {
    const p = tradePath({ coin: 'SOL', side: 'short', entry: 100, stop: 110, liq: 120, mark: 95 }, [TP(90, 'SOL', 'B'), TP(80, 'SOL', 'B'), TP(70, 'SOL', 'B')], [], PLAN3);
    return p.tps.map((t) => t.price).join() === '90,80,70' && near(p.entry.at, 0.25) && near(p.mark.at, 0.375);
  }],
  ['Trade-Weg: ohne Stop beginnt er bei der Liquidation', () => tradePath({ ...L, stop: null }, [TP(110)], [], PLAN3).left.kind === 'liq'],
  ['Trade-Weg: ohne TP-Orders = Hinweis statt Balken', () => tradePath(L, [SL(90)], [], PLAN3).empty === true],
  ['Trade-Weg: Kurs unter dem Einstieg liegt links vom Einstieg', () => { const p = tradePath({ ...L, mark: 95 }, [TP(110), TP(120)], [], PLAN3); return p.mark.at < p.entry.at; }],
  ['Trade-Weg: fremde Coins werden ignoriert', () => tradePath(L, [TP(110, 'ETH')], [], PLAN3).empty === true],
];
