// Tests für core-exitcompare.js (8c: Ausstiegs-Vergleich, nur Messung)
import { simulateTrade, BT } from './core-backtest.js';
import { exitVariants, planWithTp1AtR, compareExits, breakevenTrail } from './core-exitcompare.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const C = (t, o, h, l, c) => ({ t, T: t + 9, o, h, l, c });
const SPLITS = [0.2, 0.25, 0.25, 0.15]; // feste Aufteilung, unabhängig von deinen Einstellungen
// Maßstab-artiger Plan: Einstieg 100, Stop 90 (1R = 10), Ziele 2R / 3R / 4R / 6R
const P = { dir: 'long', zone: [100, 100], entry: 100, stop: 90, tps: [120, 130, 140, 160] };
const S = { dir: 'short', zone: [100, 100], entry: 100, stop: 110, tps: [80, 70, 60, 40] };
const now = { fillNow: true, nowPx: 100, splits: SPLITS };
const fee = (2 * BT.feePct / 100) * 100 / 10; // Gebühren in R bei Einstieg 100, 1R = 10
// TP1 (120) erreicht, danach zurück unter den Einstieg bis 95, am Ende 96
const backDown = [C(0, 100, 121, 99, 120), C(10, 120, 120, 95, 96)];

export const tests = [
  ['Ausstieg: TP1 bei 1R liegt eine Stop-Distanz über dem Einstieg', () => { const p = planWithTp1AtR(P, 100); return p.tps[0] === 110 && p.tps[1] === 130 && p.tps.length === 4; }],
  ['Ausstieg: TP1 bei 1R im Short spiegelbildlich', () => planWithTp1AtR(S, 100).tps[0] === 90],
  ['Ausstieg: Einstieg auf dem Stop = keine Variante', () => planWithTp1AtR({ ...P, stop: 100 }, 100) === null],
  ['Ausstieg: Stop auf Einstieg greift erst nach dem ersten Ziel', () => { const f = breakevenTrail(); return f({}, 0, 90, 100) === null && f({}, 1, 90, 100) === 100; }],
  ['Ausstieg: heutiger Plan hält nach TP1 den alten Stop (Rest läuft weiter)', () => { const x = simulateTrade(P, backDown, now); return x.outcome === 'offen' && near(x.grossR, 0.2 * 2 + 0.8 * -0.4); }],
  ['Ausstieg: nach TP1 Stop auf Einstieg = Rest geht bei null raus', () => near(exitVariants(simulateTrade, P, backDown, now).b, 0.2 * 2 - fee)],
  ['Ausstieg: TP1 bei 1R wird früher erreicht als das Plan-Ziel', () => {
    // Kurs läuft nur bis 112: der Plan sieht kein Ziel, die 1R-Variante verkauft 20 % bei 110 und sichert den Rest am Einstieg
    const path = [C(0, 100, 112, 99, 111), C(10, 111, 111, 92, 93)];
    const plan = simulateTrade(P, path, now), v = exitVariants(simulateTrade, P, path, now);
    return plan.hits === 0 && near(v.c, 0.2 * 1 - fee) && near(v.b, plan.r);
  }],
  ['Ausstieg: voller Stop trifft alle drei Varianten gleich', () => { const path = [C(0, 100, 105, 89, 90)]; const v = exitVariants(simulateTrade, P, path, now); return near(v.b, simulateTrade(P, path, now).r) && near(v.c, v.b); }],
  ['Ausstieg: Short funktioniert spiegelbildlich', () => near(exitVariants(simulateTrade, S, [C(0, 100, 101, 79, 80), C(10, 80, 105, 80, 104)], now).b, 0.2 * 2 - fee)],
  ['Ausstieg: Variante ohne Einstieg = null', () => {
    // Limit bei 100, Kurs läuft ohne Rücksetzer über 1R (110), aber nicht bis zum Plan-Ziel 120, und fällt dann in die Zone
    const lim = { ...P, zone: [99, 101] };
    const path = [C(0, 105, 111, 104, 110), C(10, 110, 110, 99, 101), C(20, 101, 103, 100.5, 102)];
    const v = exitVariants(simulateTrade, lim, path, { splits: SPLITS });
    return simulateTrade(lim, path, { splits: SPLITS }).filled === true && Number.isFinite(v.b) && v.c === null;
  }],
  ['Ausstiegs-Tabelle: nur Trades mit allen drei Varianten', () => {
    const g = compareExits([{ time: 1, r: 1, ex: { b: 0.5, c: 0.2 } }, { time: 2, r: -1, ex: { b: -1, c: 0.1 } }, { time: 3, r: 2, ex: { b: 1, c: null } }, { time: 4, r: 2 }], 0, 6);
    return g.n === 2 && g.skipped === 2 && g.rows[0].avgR === 0 && g.rows[0].winRate === 50 && near(g.rows[1].avgR, -0.25) && near(g.rows[2].avgR, 0.15) && g.rows[2].winRate === 100;
  }],
  ['Ausstiegs-Tabelle: beide Zeiträume je Zeile', () => {
    const g = compareExits([{ time: 1, r: 1, ex: { b: 2, c: 3 } }, { time: 5, r: -1, ex: { b: -2, c: -3 } }], 0, 6);
    return g.rows[1].dev.avgR === 2 && g.rows[1].conf.avgR === -2 && g.rows[2].dev.n === 1;
  }],
  ['Ausstiegs-Tabelle: ohne Varianten keine Tabelle', () => compareExits([{ time: 1, r: 1 }], 0, 6) === null && compareExits([], 0, 6) === null],
];
