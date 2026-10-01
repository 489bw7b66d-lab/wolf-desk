import { toWeekly, reversalCandle, reversalPoint, liquiditySweep, fibZone, impulse, engine2, e2ShortGate } from './core-engine2.js';
import { splitPeriods, byRegime, benchmarkFromSlices } from './core-backtest.js';
import { adx } from './core-indicators.js';
import { compactTrade } from './core-btstore.js';

const DAY = 864e5, T0 = Date.UTC(2026, 0, 5); // ein Montag
const K = (t, o, h, l, c) => ({ t, T: t + DAY - 1, o, h, l, c, v: 1 });
// Tageskerzen entlang von Wegpunkten (Tag, Kurs), kleine Dochte
function daily(points) {
  const out = [];
  for (let s = 0; s < points.length - 1; s++) {
    const [d0, p0] = points[s], [d1, p1] = points[s + 1];
    for (let d = d0; d < d1; d++) {
      const a = p0 + (p1 - p0) * (d - d0) / (d1 - d0), b = p0 + (p1 - p0) * (d + 1 - d0) / (d1 - d0);
      const pr = points[s - 1]?.[1], turnLow = d === d0 && pr != null && p0 < pr && p1 > p0, turnHigh = d === d0 && pr != null && p0 > pr && p1 < p0;
      out.push(K(T0 + d * DAY, a, Math.max(a, b) + 0.6 + (turnHigh ? 1 : 0), Math.min(a, b) - 0.6 - (turnLow ? 1 : 0), b)); // Wendepunkte mit deutlichem Docht
    }
  }
  return out;
}
const D = daily([[0, 60], [30, 80], [50, 70], [80, 95], [100, 85], [140, 105], [150, 100], [190, 150], [200, 120]]);
// 4H: ruhige Kerzen um 122, dann rote Kerze, Hammer in der Zone, Bestätigung über den Körper der roten Kerze
const H4 = 4 * 36e5, g0 = D.at(-1).T - 40 * H4;
const G = Array.from({ length: 37 }, (_, i) => { const c = 124 - i * 0.03; return { t: g0 + i * H4, T: g0 + (i + 1) * H4 - 1, o: c + 0.2, h: c + 0.8, l: c - 0.8, c }; });
G.push({ t: g0 + 37 * H4, T: g0 + 38 * H4 - 1, o: 123, h: 123.2, l: 119.8, c: 120 });   // rot
G.push({ t: g0 + 38 * H4, T: g0 + 39 * H4 - 1, o: 119.6, h: 120.2, l: 117.9, c: 120 }); // Hammer
G.push({ t: g0 + 39 * H4, T: g0 + 40 * H4 - 1, o: 120, h: 123.8, l: 119.9, c: 123.5 }); // Bestätigung

export const tests = [
  ['Engine 2: Wochenkerzen aus Tageskerzen', () => { const w = toWeekly(D.slice(0, 14)); return w.length === 2 && w[0].o === D[0].o && w[0].c === D[6].c && w[1].c === D[13].c; }],
  ['Engine 2: Umkehrkerzen erkannt (Hammer, Doji, Engulfing)', () => reversalCandle({ o: 10, c: 10.2, h: 10.25, l: 9 }, null, 'long') === 'Hammer'
    && reversalCandle({ o: 10, c: 10.01, h: 10.5, l: 9.5 }, null, 'long') === 'Doji'
    && reversalCandle({ o: 9.4, c: 10.6, h: 10.7, l: 9.3 }, { o: 10.5, c: 9.5, h: 10.6, l: 9.4 }, 'long') === 'Bullish Engulfing'],
  ['Engine 2: Umkehrpunkt-Regel nur mit Bestätigung über dem Körper der Kerze davor', () => {
    const base = [{ o: 123, h: 123.2, l: 119.8, c: 120 }, { o: 119.6, h: 120.2, l: 117.9, c: 120 }];
    return !!reversalPoint([...base, { o: 120, h: 123.8, l: 119.9, c: 123.5 }], 'long') && !reversalPoint([...base, { o: 120, h: 122, l: 119.9, c: 121.5 }], 'long');
  }],
  ['Engine 2: Liquiditäts-Sweep (Stich unter das Tief, Schluss darüber)', () => {
    const c = Array.from({ length: 12 }, (_, i) => ({ o: 10, h: 10.5, l: i === 5 ? 9 : 9.6, c: 10 }));
    return !!liquiditySweep([...c, { o: 10, h: 10.4, l: 8.8, c: 9.9 }], 'long') && !liquiditySweep([...c, { o: 10, h: 10.4, l: 9.5, c: 9.9 }], 'long');
  }],
  ['Engine 2: Fib-Zone Golden Pocket / 0,5', () => { const imp = { f50: 125, f618: 119.1, f65: 117.5 }; return fibZone(118, imp, 0.3) === 'gp' && fibZone(122, imp, 0.3) === 'half' && fibZone(130, imp, 0.3) === null; }],
  ['Engine 2: Impuls vom letzten Swing-Tief zum Hoch', () => { const i = impulse(D, 'long'); return i && Math.abs(i.to - 151.6) < 0.5 && i.from < 100; }],
  ['Engine 2: komplettes Long-Setup (Struktur, Golden Pocket, Hammer + Bestätigung, CRV ≥ 2)', () => {
    const e = engine2({ '1d': D, '4h': G }, 'swing');
    return e.ok && e.dir === 'long' && e.trigger === 'Hammer' && e.crv >= 2 && e.plan.stop < 117 && e.plan.stop > 112 && Math.abs(e.plan.tps[0] - (e.plan.entry + 2 * e.plan.R)) < 1e-6 && e.plan.tps.some((x) => Math.abs(x - 151.6) < 0.01) && e.zone === 'gp' && e.score >= 40 && !!e.plan.impulseKey;
  }],
  ['Engine 2: ohne Bestätigung kein Signal, sondern „warte auf Reaktion“ mit Zone', () => {
    const e = engine2({ '1d': D, '4h': G.slice(0, -1) }, 'swing');
    return !e.ok && /Reaktion/.test(e.reason) && e.watch && e.watch.from < e.watch.to;
  }],
  ['Engine 2: Chance/Risiko unter 1 : 2 wird abgelehnt', () => { const e = engine2({ '1d': D, '4h': G }, 'swing', { crvMin: 50 }); return !e.ok && e.reason.includes('Chance/Risiko'); }],
  ['Backtest: Entwicklung (2/3) gegen Bestätigung (1/3)', () => {
    const sp = splitPeriods([{ time: 10, r: 1 }, { time: 50, r: -1 }, { time: 90, r: 2 }], 0, 90);
    return sp.dev.n === 2 && sp.conf.n === 1 && sp.conf.avgR === 2 && sp.dev.avgR === 0;
  }],
  ['Backtest-Speicher: kompakt, ohne unnötige Daten', () => { const t = compactTrade({ time: 1, r: 1, dir: 'long', riesig: new Array(1000).fill(1) }); return t.r === 1 && !('riesig' in t); }],
  ['Engine 2 (A2): Shorts nur mit bärischem Tagestrend (Short-Filter)', () => {
    const up = daily([[0, 50], [260, 150]]), down = daily([[0, 150], [120, 170], [200, 120], [230, 130], [260, 90]]);
    const a = e2ShortGate(up), b = e2ShortGate(down);
    return a.known && !a.mild && !a.mittel && b.mild && b.mittel;
  }],
  ['Engine 2 (A2): Wochen-Struktur Pflicht, sonst kein Signal', () => { const flat = daily([[0, 100], [100, 110], [200, 100], [300, 110]]); const e = engine2({ '1d': flat, '4h': G }, 'swing'); return !e.ok && e.reason === 'Struktur passt nicht'; }],
  ['Backtest (7c): ADX misst Trend (hoch) und Seitwärts (niedrig)', () => {
    const trend = daily([[0, 50], [120, 150]]), side = Array.from({ length: 120 }, (_, i) => { const c = 100 + (i % 2 ? 1 : -1); return { t: i, T: i, o: 100, h: c + 1, l: c - 1, c }; });
    return adx(trend) > 25 && adx(side) < 20;
  }],
  ['Backtest (7c): Auswertung nach Marktphase', () => { const g = byRegime([{ r: 1, adx: 30 }, { r: -1, adx: 10 }, { r: 0.5, adx: 22 }]); return g.trend.n === 1 && g.side.n === 1 && g.mid.n === 1 && g.min20.sum === 1.5 && g.min25.sum === 1; }],
  ['Backtest (7c): Maßstab Trendfolge nur im Aufwärtstrend', () => {
    const up = daily([[0, 50], [200, 150]]), dn = daily([[0, 150], [200, 50]]);
    const a = benchmarkFromSlices(['1d', '4h'], [up, up.slice(-30)]), b = benchmarkFromSlices(['1d', '4h'], [dn, dn.slice(-30)]);
    return a.plan && a.plan.dir === 'long' && a.plan.tps.length === 4 && !b.plan;
  }],
];
