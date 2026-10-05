import { stopNoise, lossAtStop } from './core-guard.js';
import { trailStop } from './core-trail.js';
import { blockReason } from './core-alerts.js';
import { btDigest, buildReport, saveBacktest } from './ui-export.js';
import { metaOf } from './core-btstore.js';

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
  ['Stop-Check: Verlust bei Auslösung (ALGO: Einstieg 0,13439, Stop 0,122, 5.617 Stück)', () => {
    const L = lossAtStop({ side: 'long', size: 5617, entry: 0.13439, stop: 0.122, mark: 0.1238, liq: 0.11967, marginUsed: 90.31 });
    return !L.liqFirst && Math.abs(L.pnl + 69.59) < 0.05 && Math.abs(L.fromNow + 10.11) < 0.05;
  }],
  ['Stop-Check: liegt der Stop hinter der Liquidation, ist die ganze Margin weg', () => {
    const L = lossAtStop({ side: 'long', size: 5617, entry: 0.13439, stop: 0.11671, mark: 0.1238, liq: 0.11967, marginUsed: 109.64 });
    return L.liqFirst && L.pnl === -109.64 && L.exit === 0.11967;
  }],
  ['Stop-Check: Short und Stop im Gewinn', () => { const L = lossAtStop({ side: 'short', size: -10, entry: 100, stop: 95, mark: 90, liq: 120 }); return L.pnl === 50 && L.fromNow === -50; }],
  // 8b1: gespeicherte Backtests (Verzeichnis) und Zeiträume im Export
  ['Backtest-Verzeichnis: kleine Zeile je Ergebnis, ohne die Trades', () => { const m = metaOf('swing:bf', { at: 5, label: 'X', complete: true, done: 3, total: 3, trades: [{}, {}] }); return m.style === 'swing:bf' && m.at === 5 && m.n === 2 && m.complete && m.trades === undefined && JSON.stringify(m).length < 200; }],
  ['Backtest-Verzeichnis: abgebrochener Lauf wird als unvollständig geführt, fehlende Felder ohne Absturz', () => metaOf('swing', { complete: false, trades: [] }).complete === false && metaOf('swing', {}).n === 0],
  ['Export: Zusammenfassung enthält Entwicklung und Bestätigung', () => { const tr = [0, 1, 2, 3, 4, 5].map((i) => ({ time: i * 10, r: i < 4 ? -0.5 : 1, dir: 'long', coin: 'A', hits: 0, outcome: 'stop', events: [] })); const d = btDigest({ trades: tr, from: 0, to: 60, label: 'T' }, 'swing:bf'); return d.periods.dev.n === 4 && d.periods.conf.n === 2 && d.periods.dev.avgR === -0.5 && d.periods.conf.avgR === 1; }],
  ['Export: ohne Zeitraum-Angabe keine Zeiträume, kein Absturz', () => btDigest({ trades: [], label: 'T' }, 'swing').periods === null],
  ['Export: Bericht nennt beide Zeiträume', () => { const mem = {}, st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } }; saveBacktest({ trades: [0, 1, 2].map((i) => ({ time: i * 10, r: 1, dir: 'long', coin: 'A', hits: 1, outcome: 'tp4', events: [] })), from: 0, to: 30, label: 'T' }, 'swing:bf', st); const t = buildReport({}, Date.now(), st); return t.includes('Zeiträume: Entwicklung 2 Trades') && t.includes('Bestätigung 1 Trades'); }],
];
