// Tests für core-btmetrics.js (8d: Funding-Schätzung, Pareto-Anteil, Haltedauer)
import { fundingR, afterFunding, paretoShare, avgHoldDays, FUNDING } from './core-btmetrics.js';
import { exitVariants } from './core-exitcompare.js';
import { simulateTrade } from './core-backtest.js';
import { btDigest } from './ui-export.js';

const DAY = 864e5;
const near = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;
const sim = (days, entryPx = 100, R = 10) => ({ filled: true, entryPx, R, fillTime: 0, exitTime: days * DAY, r: 1, grossR: 1.01 });
const T = (rs) => rs.map((r, i) => ({ r, time: i }));

export const tests = [
  ['Funding: 10 Tage Long bei 10 % Stop-Abstand kosten 0,03R', () => near(fundingR(sim(10), 'long', 0.03), 0.03)],
  ['Funding: doppelte Haltedauer = doppelte Kosten, engerer Stop = mehr R', () => near(fundingR(sim(20), 'long', 0.03), 0.06) && near(fundingR(sim(10, 100, 5), 'long', 0.03), 0.06)],
  ['Funding: Shorts bekommen nichts gutgeschrieben und zahlen nichts', () => fundingR(sim(10), 'short', 0.03) === 0],
  ['Funding: unvollständige Angaben oder Satz 0 = keine Kosten', () => fundingR(null, 'long') === 0 && fundingR({ ...sim(10), R: 0 }, 'long') === 0 && fundingR({ ...sim(10), exitTime: 0 }, 'long') === 0 && fundingR(sim(10), 'long', 0) === 0],
  ['Funding: Standardsatz ist die Hyperliquid-Grundrate (0,03 % je Tag)', () => FUNDING.pctPerDay === 0.03 && near(fundingR(sim(10), 'long'), 0.03)],
  ['Funding: Ergebnis sinkt, Brutto bleibt', () => { const x = afterFunding(sim(10), 'long', 0.03); return near(x.r, 0.97) && x.grossR === 1.01 && afterFunding(sim(10), 'short', 0.03).r === 1; }],
  ['Funding: fließt in die Ausstiegs-Varianten ein', () => {
    const C = (t, o, h, l, c) => ({ t, T: t + 9, o, h, l, c });
    const P = { dir: 'long', zone: [100, 100], entry: 100, stop: 90, tps: [120, 130, 140, 160] }, path = [C(0, 100, 105, 89, 90)];
    const o = { fillNow: true, nowPx: 100, splits: [0.2, 0.25, 0.25, 0.15] };
    const a = exitVariants(simulateTrade, P, path, o), b = exitVariants(simulateTrade, P, path, o, () => 0.25);
    return near(a.b - b.b, 0.25) && near(a.c - b.c, 0.25);
  }],
  ['Pareto: Anteil der besten 15 % am Gewinn', () => { const p = paretoShare(T([10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])); return p.k === 3 && p.n === 20 && near(p.pct, (12 / 29) * 100); }],
  ['Pareto: über 100 %, wenn der Rest Geld kostet', () => { const p = paretoShare(T([10, -1, -1, -1, -1, -1, -1])); return p.k === 1 && near(p.pct, 250); }],
  ['Pareto: mindestens ein Trade zählt als „beste“', () => paretoShare(T([2, 1])).k === 1],
  ['Pareto: ohne Gewinn insgesamt keine Angabe', () => paretoShare(T([1, -1])) === null && paretoShare(T([-2, -1])) === null && paretoShare([]) === null && paretoShare(null) === null],
  ['Pareto: Reihenfolge der Trades ist egal', () => near(paretoShare(T([1, 5, 1, 1, 1, 1, 1])).pct, paretoShare(T([1, 1, 1, 1, 1, 1, 5])).pct)],
  ['Haltedauer: Mittel in Tagen, Trades ohne Zeiten bleiben außen vor', () => near(avgHoldDays([{ fillTime: 0, exitTime: 2 * DAY }, { fillTime: DAY, exitTime: 5 * DAY }, { r: 1 }]), 3) && avgHoldDays([]) === null && avgHoldDays(null) === null],
  ['Export: Pareto, Haltedauer und Funding-Hinweis stehen in der Zusammenfassung', () => {
    const tr = [{ time: 1, r: 3, coin: 'A', dir: 'long', fillTime: 0, exitTime: 4 * DAY }, { time: 5, r: -1, coin: 'A', dir: 'long', fillTime: 0, exitTime: 2 * DAY }];
    const d = btDigest({ trades: tr, from: 0, to: 6, fundingPctDay: 0.03 }, 'swing:dc'), old = btDigest({ trades: tr, from: 0, to: 6 }, 'swing');
    return near(d.pareto.pct, 150) && near(d.holdDays, 3) && d.fundingPctDay === 0.03 && old.fundingPctDay === null;
  }],
];
