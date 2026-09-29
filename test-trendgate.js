import { trendGate, gatePasses, gateText, compareGate } from './core-trendgate.js';
import { styleCheck } from './core-scanner.js';
import { CONFIG } from './config.js';

const days = (hs) => hs.map((h, i) => ({ t: i, T: i + 1, o: h, h, l: h - 1, c: h - 0.5 }));
const A = (close, e200, structure = 'range', stack = 'mixed') => ({ close, ema200: e200, structure, stack });

export const tests = [
  ['Short-Filter: über EMA 200 = alle Stufen sperren', () => { const g = trendGate(days([100, 101]), A(101, 90)); return g.known && !g.mild && !g.mittel && !g.streng; }],
  ['Short-Filter mild: unter EMA 200 reicht', () => { const g = trendGate(days([80, 81]), A(80, 90)); return g.mild && !g.mittel && !g.streng; }],
  ['Short-Filter mittel: dazu tiefere Hochs/Tiefs ODER EMA-Stapel bärisch', () => trendGate(days([80]), A(80, 90, 'down')).mittel && trendGate(days([80]), A(80, 90, 'range', 'bear')).mittel && !trendGate(days([80]), A(80, 90, 'up', 'bull')).mittel],
  ['Short-Filter streng: dazu Retest der 200er in den letzten 10 Tagen', () => {
    const retest = trendGate(days([85, 89.5, 84, 80]), A(80, 90, 'down'));
    const none = trendGate(days([85, 84, 82, 80]), A(80, 90, 'down'));
    return retest.streng && !none.streng;
  }],
  ['Short-Filter: ohne EMA 200 (zu kurze Historie) wird nicht gesperrt', () => { const g = trendGate(days([80]), A(80, null)); return !g.known && gatePasses(g, 'streng'); }],
  ['Short-Filter: „aus“ lässt alles durch', () => gatePasses({ mild: false }, 'aus') && gatePasses(null, 'mittel') && !gatePasses({ mild: false }, 'mild')],
  ['Short-Filter: klarer Grund im Text', () => gateText({ known: true, mild: false }, 'mild').includes('über der EMA 200')
    && gateText({ known: true, mild: true, mittel: false }, 'mittel').includes('noch nicht bärisch')
    && gateText({ known: true, mild: true, mittel: true, streng: false }, 'streng').includes('Retest')],
  ['Short-Filter: gesperrter Stil zeigt den Grund', () => { const s = styleCheck({ blocked: { text: 'Short gesperrt: Tageskurs über der EMA 200' }, dir: 'neutral' }, CONFIG.signals.modes.swing); return !s.ok && s.reason.includes('gesperrt'); }],
  ['Backtest: Vergleich der Stufen über dieselben Signale', () => {
    const tr = [{ dir: 'long', r: 1 }, { dir: 'short', r: -1, gate: { mild: false, mittel: false, streng: false } }, { dir: 'short', r: 2, gate: { mild: true, mittel: true, streng: false } }, { dir: 'short', r: -0.5, gate: { mild: true, mittel: false, streng: false } }];
    const [aus, mild, mittel, streng] = compareGate(tr);
    return aus.shorts === 3 && aus.total === 1.5 && mild.shorts === 2 && mild.total === 2.5 && mittel.shorts === 1 && mittel.total === 3 && streng.shorts === 0 && streng.total === 1;
  }],
];
