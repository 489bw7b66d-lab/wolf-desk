import { stopNoise } from './core-guard.js';
import { trailStop } from './core-trail.js';
import { blockReason } from './core-alerts.js';
import { btDigest, buildReport, saveBacktest } from './ui-export.js';

export const tests = [
  ['Stop-Check: Vorschlag hinter der Liquidation wird erkannt (ALGO-Fall)', () => {
    const n = stopNoise(0.12428, 0.122, 0.0059, undefined, 0.11965);
    return n.status === 'bad' && n.suggest.beyondLiq === true && n.suggest.stop < 0.11965;
  }],
  ['Stop-Check: ohne Liquidation oder mit Luft normaler Vorschlag', () => !stopNoise(100, 99, 2).suggest.beyondLiq && !stopNoise(100, 99, 2, undefined, 90).suggest.beyondLiq],
  ['Stop-Check: Short gespiegelt', () => stopNoise(100, 101, 2, undefined, 102).suggest.beyondLiq === true],
  ['Nachziehen: nie hinter die Liquidation', () => trailStop({ side: 'long', entry: 100, stop: 90, mark: 115, hits: 2, liq: 101 }) === null && trailStop({ side: 'long', entry: 100, stop: 90, mark: 115, hits: 2, liq: 80 }) !== null],
  ['Kein Signal bei offener Position oder laufendem Signal', () => blockReason('ALGO', ['ALGO'], []) === 'Position offen'
    && blockReason('CRV', [], [{ coin: 'CRV', status: 'offen' }]) === 'Signal läuft noch'
    && blockReason('CRV', [], [{ coin: 'CRV', status: 'tp1' }]) === null && blockReason('SOL', ['ALGO'], []) === null],
  ['Export: Backtest-Zusammenfassung mit Short-Filter, Nachziehen und Märkten', () => {
    const trades = [{ coin: 'A', dir: 'long', r: 1, hits: 1, score: 80, events: [], seal: true, alt: { r: 1.2 } }, { coin: 'B', dir: 'short', r: -1, hits: 0, score: 76, events: [], seal: false, gate: { mild: false, mittel: false, streng: false }, alt: { r: -1 } }];
    const d = btDigest({ label: 'Test', trades, missed: 2 }, 'swing');
    return d.summary.n === 2 && !('curve' in d.summary) && d.gate.length === 4 && d.trail.n === 2 && d.perMarket[0].coin === 'A' && d.missed === 2;
  }],
  ['Export: Bericht ist lesbarer Text mit allen Abschnitten', () => {
    const mem = {}; const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
    saveBacktest({ label: 'Handelbare Märkte · Swing · 180 Tage', trades: [{ coin: 'A', dir: 'long', r: 1, hits: 1, score: 80, events: ['Hammer'], seal: true }], missed: 0 }, 'swing', st);
    const t = buildReport({}, Date.now(), st);
    return t.startsWith('# Wolf Desk') && t.includes('## Einstellungen') && t.includes('## Letzte Signale') && t.includes('## Backtests') && t.includes('Handelbare Märkte · Swing') && !/0x[0-9a-f]{20,}/i.test(t);
  }],
];
