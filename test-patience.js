import { earlyExit, patienceStats } from './core-patience.js';
import { patienceText } from './core-alerts.js';

const D = 864e5;
const trade = (px, side = 'long') => ({ coin: 'SOL', side, closedAt: 0, partial: false, exits: [{ px, sz: 10, time: 0 }] });
const C = (t, h, l) => ({ t, T: t + 1, o: (h + l) / 2, h, l, c: (h + l) / 2 });
const PLAN = { stop: 90, tps: [110, 120] };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Geduld: Ausstieg zwischen Stop und TP1 = vorzeitig', () => earlyExit(trade(102), PLAN, [], 20 * D).early === true],
  ['Geduld: Ausstieg am TP1 = nicht vorzeitig', () => earlyExit(trade(110), PLAN, [], 20 * D).early === false],
  ['Geduld: Ausstieg am Stop = nicht vorzeitig', () => earlyExit(trade(90.1), PLAN, [], 20 * D).early === false],
  ['Geduld: später TP2 erreicht = verpasst 10 × (120 − 102)', () => { const r = earlyExit(trade(102), PLAN, [C(D, 111, 101), C(2 * D, 121, 108)], 20 * D); return r.outcome === 'tp2' && near(r.missed, 180); }],
  ['Geduld: zuerst Stop = gespart 10 × (102 − 90)', () => { const r = earlyExit(trade(102), PLAN, [C(D, 105, 89)], 20 * D); return r.outcome === 'stop' && near(r.saved, 120); }],
  ['Geduld: TP1 erreicht, dann Stop = verpasst bis TP1', () => { const r = earlyExit(trade(102), PLAN, [C(D, 111, 101), C(2 * D, 100, 89)], 20 * D); return r.outcome === 'tp1' && near(r.missed, 80); }],
  ['Geduld: Stop und Ziel in derselben Kerze = Stop zählt', () => earlyExit(trade(102), PLAN, [C(D, 125, 89)], 20 * D).outcome === 'stop'],
  ['Geduld: Short gespiegelt', () => { const r = earlyExit(trade(98, 'short'), { stop: 110, tps: [90, 80] }, [C(D, 99, 79)], 20 * D); return r.outcome === 'tp2' && near(r.missed, 180); }],
  ['Geduld: Beobachtung läuft noch = offen', () => earlyExit(trade(102), PLAN, [C(D, 105, 100)], 3 * D, 14).outcome === 'offen'],
  ['Geduld: nach Ablauf ohne Treffer = weder noch', () => earlyExit(trade(102), PLAN, [C(D, 105, 100)], 20 * D, 14).outcome === 'keins'],
  ['Geduld: Summe verpasst, gespart, netto', () => {
    const g = patienceStats([{ early: true, outcome: 'tp2', missed: 180, saved: 0 }, { early: true, outcome: 'stop', missed: 0, saved: 120 }, { early: true, outcome: 'offen', missed: 0, saved: 0 }, { early: false }]);
    return g.n === 3 && g.done === 2 && g.pending === 1 && g.later === 1 && g.stopFirst === 1 && near(g.net, -60);
  }],
  ['Geduld: Wochenbericht-Text', () => patienceText({ n: 2, done: 2, pending: 0, later: 1, stopFirst: 1, missed: 180, saved: 120, net: -60 }).includes('Geduld')],
];
