import { planFromSeries } from './core-autoplan.js';
import { targetsFor } from './core-plans.js';
import { tradePath } from './core-path.js';

// Kerzenreihe: Aufwärtstrend mit Rücksetzern (bzw. gespiegelt für Abwärts)
const serie = (n, up = true, start = 100) => {
  const out = []; let p = start;
  for (let i = 0; i < n; i++) {
    const o = p; p = p * (1 + (up ? 1 : -1) * (0.004 + 0.012 * Math.sin(i / 6)));
    out.push({ t: i, T: i + 1, o, h: Math.max(o, p) * 1.003, l: Math.min(o, p) * 0.997, c: p, v: 100 });
  }
  return out;
};
const PLAN3 = [{ label: 'TP1', pct: 30 }, { label: 'TP2', pct: 30 }, { label: 'TP3', pct: 25 }, { label: 'TP4', pct: 0 }, { label: 'Runner', pct: 15 }];

export const tests = [
  ['Auto-Plan: Long hat Stop unter und Ziele über dem Einstieg', () => {
    const s = serie(260), e = s.at(-1).c, p = planFromSeries('long', e, [s, s]);
    return p && p.stop < e && p.tps.length >= 3 && p.tps.every((x, i) => x > e && (i === 0 || x > p.tps[i - 1]));
  }],
  ['Auto-Plan: Short gespiegelt', () => {
    const s = serie(260, false), e = s.at(-1).c, p = planFromSeries('short', e, [s, s]);
    return p && p.stop > e && p.tps.every((x) => x < e);
  }],
  ['Auto-Plan: späterer Einstieg weit über dem Setup = ATR-Plan ab Einstieg', () => {
    const s = serie(260), e = s.at(-1).c * 1.5, p = planFromSeries('long', e, [s, s]);
    return p.method === 'ATR' && p.tps.length === 4 && p.stop < e && p.tps[0] > e;
  }],
  ['Auto-Plan: zu wenig Kerzen = kein Plan', () => planFromSeries('long', 100, [serie(30), serie(30)]) === null],
  ['Ziele: automatischer Plan erst nach eigenem Plan und Signal', () => {
    const a = { tps: [1], stop: 0.5, style: 'swing', method: 'ATR' };
    return targetsFor({ auto: a }).source === 'auto' && targetsFor({ signal: { tps: [2], at: 0 }, auto: a }).source === 'signal';
  }],
  ['Trade-Weg: nachgezogener Stop, Balken beginnt weiter beim ursprünglichen SL', () => {
    const p = tradePath({ coin: 'X', side: 'long', entry: 100, stop: 105, mark: 112 }, [], [], PLAN3, { tps: [110, 120, 130], stop: 90, label: 'x' });
    return p.left.price === 90 && p.origStop.at === 0 && p.stop.inProfit && Math.abs(p.stop.at - 15 / 40) < 1e-9;
  }],
  ['Trade-Weg: Stop weiter weg als geplant = Balken beginnt dort', () => {
    const p = tradePath({ coin: 'X', side: 'long', entry: 100, stop: 85, mark: 102 }, [], [], PLAN3, { tps: [110, 120, 130], stop: 90, label: 'x' });
    return p.left.price === 85 && p.origStop.at > 0;
  }],
];
