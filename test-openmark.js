// Tests für laufende Trades zum Kurs von jetzt (8s): core-openmark.js und die Auswertungen, die es nutzen
import { remainingSize, markTrade, withOpenMarked, countMarked } from './core-openmark.js';
import { tradeHistory, tradeStats } from './core-trades.js';
import { detailRow, groupStats, splitStats } from './core-tradedetail.js';

const NOW = Date.UTC(2026, 9, 8, 12), H = 36e5, DAY = 864e5;
const fill = (coin, side, sz, px, time, start, pnl = '0') => ({ coin, side, sz: String(sz), px: String(px), time, startPosition: String(start), fee: '0', closedPnl: pnl, crossed: true });
// Runner: Long 10 @100, Teilverkauf 4 @110 (+40), Rest 6 läuft
const RUN = [fill('JTO', 'B', 10, 100, NOW - 5 * DAY, 0), fill('JTO', 'A', 4, 110, NOW - 2 * DAY, 10, '40')];
// Ausgestoppt: Long 10 @50, Verkauf 10 @45 (−50)
const LOSS = [fill('XRP', 'B', 10, 50, NOW - 6 * DAY, 0), fill('XRP', 'A', 10, 45, NOW - 5 * DAY, 10, '-50')];
const T = tradeHistory([...RUN, ...LOSS]), run = T.find((t) => t.coin === 'JTO');
const near = (a, b, e = 1e-9) => a != null && b != null && Math.abs(a - b) < e;

export const tests = [
  ['Laufend: Restgröße = gekauft minus verkauft', () => remainingSize(run) === 6 && remainingSize({}) === 0],
  ['Laufend: zum Kurs von jetzt bewertet, Teilverkauf mit echtem Preis, Rest zum aktuellen Kurs', () => { const m = markTrade(run, 120, NOW); return m.marked && m.closedAt === NOW && near(m.realized, 40 + 6 * 20) && m.exits.length === 2 && m.exits[1].mark && m.exits[1].sz === 6 && m.markPx === 120; }],
  ['Laufend: Short rechnet umgekehrt', () => { const s = tradeHistory([fill('SOL', 'A', 10, 100, NOW - DAY, 0)])[0]; return near(markTrade(s, 90, NOW).realized, 100); }],
  ['Laufend: ohne Kurs, abgeschlossen oder mit unvollständiger Historie keine Bewertung', () => markTrade(run, null) === null && markTrade(T.find((t) => t.coin === 'XRP'), 100) === null && markTrade({ ...run, partial: true }, 120) === null],
  ['Statistik: ohne laufende fehlt der Runner (nur der Verlust zählt), mit laufenden zählt er', () => { const a = tradeStats(T), b = tradeStats(withOpenMarked(T, (c) => (c === 'JTO' ? 120 : null), NOW)); return a.n === 1 && a.winRate === 0 && b.n === 2 && b.winRate === 50 && near(b.total, 160 - 50) && countMarked(withOpenMarked(T, () => 120, NOW)) === 1; }],
  ['Statistik: ein Runner mit Teilverkauf zählt als „in Teilen verkauft“', () => { const b = tradeStats(withOpenMarked(T, () => 120, NOW)); return b.split.n === 1 && b.single.n === 1; }],
  ['Trades im Detail: laufender Trade bekommt ein Ergebnis zum Kurs von jetzt, bleibt aber „läuft“', () => { const D = Array.from({ length: 30 }, (_, k) => ({ t: NOW - (30 - k) * DAY, T: NOW - (29 - k) * DAY - 1, o: 100, h: 101, l: 99, c: 100 })); const r = detailRow(run, { daily: { JTO: D }, priceOf: () => 120, now: NOW }); return r.marked && !r.closed && near(r.resAtr, (0.4 * 110 + 0.6 * 120 - 100) / 2) && near(r.holdH, 5 * 24); }],
  ['Trades im Detail: Gruppen mit oder ohne laufende', () => { const rows = [{ closed: true, resAtr: -1, side: 'long' }, { closed: false, marked: true, resAtr: 3, side: 'long' }]; return groupStats(rows).n === 1 && groupStats(rows, true).n === 2 && near(groupStats(rows, true).resAtr, 1) && splitStats(rows, true).all.n === 2 && splitStats(rows).all.n === 1; }],
];
