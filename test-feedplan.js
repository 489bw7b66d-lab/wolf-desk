import { planFromSignal, freshCheck, signalResult } from './core-feedplan.js';

const SIG = { coin: 'PUMP', dir: 'long', style: 'intraday', score: 80, at: 1000, px: 0.00518, zone: [0.00516, 0.00538], stop: 0.00459, tps: [0.00595, 0.0065, 0.007, 0.0075], status: 'offen' };
const near = (a, b, e = 1e-12) => Math.abs(a - b) < e;
const FRESH = (dir, plan = true, mode = 'swing') => ({ coin: 'PUMP', mode, dir, plan: plan ? { dir } : null, tfs: ['1d', '4h', '1h'], total: { long: 60, short: 20 },
  candles: { '4h': [1] }, analyses: [{}, { atr: 1 }], events: [], waves: [], styles: {}, best: mode,
  all: { intraday: { coin: 'PUMP', mode: 'intraday', tfs: ['4h', '1h', '15m'], total: { long: 55, short: 30 }, analyses: [{}, { atr: 0.0002 }], events: [], waves: [] } } });
const sw = (r, k) => (r.all?.[k] ? { ...r.all[k], styles: r.styles, all: r.all, best: r.best } : null);

export const tests = [
  ['Signal-Karte: Plan aus Zone, Stop und Zielen', () => {
    const p = planFromSignal(SIG);
    return p.method === 'signal' && near(p.entry, 0.00527) && p.stop === 0.00459 && p.tps.length === 4 && near(p.R, 0.00068) && Math.abs(p.stopDistPct - 12.9) < 0.1;
  }],
  ['Signal-Karte: Zone wird sortiert (Short)', () => {
    const p = planFromSignal({ ...SIG, dir: 'short', zone: [110, 100], stop: 120, tps: [90, 80] });
    return p.zone[0] === 100 && p.zone[1] === 110 && p.entry === 105;
  }],
  ['Signal-Karte: ohne Zone gilt der Meldekurs', () => planFromSignal({ ...SIG, zone: null, px: 0.0052 }).entry === 0.0052],
  ['Signal-Karte: Stop auf der falschen Seite = kein Plan', () => planFromSignal({ ...SIG, stop: 0.006 }) === null],
  ['Signal-Karte: Ziele auf der falschen Seite fallen raus', () => planFromSignal({ ...SIG, tps: [0.004, 0.006] }).tps.join() === '0.006'],
  ['Signal-Karte: ohne Ziele oder ohne Stop kein Plan', () => planFromSignal({ ...SIG, tps: [] }) === null && planFromSignal({ ...SIG, stop: null }) === null],
  ['Signal-Karte: Vergleich mit jetzt', () => freshCheck(SIG, FRESH('long')).state === 'bestaetigt' && freshCheck(SIG, FRESH('short')).state === 'gedreht'
    && freshCheck(SIG, FRESH('neutral', false)).state === 'weg' && freshCheck(SIG, null).state === 'unbekannt'],
  ['Signal-Karte: Stil des Signals, Kerzen/ATR aus frischer Analyse', () => {
    const r = signalResult(SIG, FRESH('short'), sw);
    return r.mode === 'intraday' && r.dir === 'long' && r.plan.method === 'signal' && r.tfs[1] === '1h' && r.analyses[1].atr === 0.0002
      && r.total.long === 80 && r.fromSignal.check.state === 'gedreht' && !!r.all && !!r.styles;
  }],
  ['Signal-Karte: geht auch ohne frische Analyse', () => {
    const r = signalResult(SIG, null, sw);
    return r.plan && r.tfs.length === 3 && r.events.length === 0 && r.waves.length === 0 && r.fromSignal.check.state === 'unbekannt';
  }],
  ['Signal-Karte: unbekannter Stil wird Swing', () => signalResult({ ...SIG, style: 'xyz' }, null, sw).mode === 'swing'],
  ['Signal-Karte: frische Analyse ohne diesen Stil behält Stil-Auswahl', () => {
    const f = FRESH('long'); f.all = { swing: {} };
    const r = signalResult(SIG, f, () => null);
    return r.mode === 'intraday' && r.styles === f.styles && r.analyses.length === 0;
  }],
];
