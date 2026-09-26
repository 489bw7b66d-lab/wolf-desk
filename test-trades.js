import { tradeHistory, openTradeFor, closedTrades, perfSplit, change24h, entryDistance } from './core-trades.js';
import { ladder } from './ui-parts.js';
import * as f from './core-format.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const F = (time, side, sz, px, start, pnl = 0, fee = 0, coin = 'ETH') => ({ coin, time, side, sz: String(sz), px: String(px), startPosition: String(start), closedPnl: String(pnl), fee: String(fee) });
// Long eröffnet, zwei Teilverkäufe, Rest bleibt offen
const OPEN = [F(1, 'B', 10, 100, 0, 0, 1), F(2, 'A', 2, 110, 10, 20, 0.5), F(3, 'A', 3, 120, 8, 60, 0.5)];
// Kompletter Trade: rein, zwei Mal raus
const CLOSED = [F(1, 'B', 4, 50, 0, 0, 0, 'SOL'), F(2, 'A', 2, 55, 4, 10, 0, 'SOL'), F(3, 'A', 2, 45, 2, -10, 0, 'SOL')];
const plan = { dir: 'long', zone: [99, 101], entry: 100, stop: 90, tps: [110, 120, 130, 140], R: 10, stopLabel: 'x', tpLabels: [], method: 'atr' };

export const tests = [
  ['Trades: offene Position mit 2 Teilverkäufen', () => { const t = openTradeFor(tradeHistory(OPEN), 'ETH'); return t && t.exits.length === 2 && t.exits[1].px === 120; }],
  ['Trades: realisiert = PnL minus Gebühren', () => near(openTradeFor(tradeHistory(OPEN), 'ETH').realized, 20 + 60 - 2)],
  ['Trades: Teilverkauf-PnL ohne Gebühr', () => near(openTradeFor(tradeHistory(OPEN), 'ETH').exits[0].pnl, 19.5)],
  ['Trades: Position auf 0 = abgeschlossen', () => { const t = closedTrades(tradeHistory(CLOSED)); return t.length === 1 && t[0].closedAt === 3 && near(t[0].realized, 0); }],
  ['Trades: Seitenwechsel schließt und eröffnet neu', () => {
    const t = tradeHistory([F(1, 'B', 1, 100, 0), F(2, 'A', 3, 90, 1, -10)]);
    return t.length === 2 && t.some((x) => x.side === 'short' && x.closedAt == null) && t.some((x) => x.side === 'long' && x.closedAt === 2);
  }],
  ['Trades: vor dem Zeitraum eröffnet = als Teilstück markiert', () => tradeHistory([F(5, 'A', 1, 100, 2, 5)])[0].partial === true],
  ['Trades: Anteil je Verkauf an der Gesamtposition (2 von 10 = 20 %)', () => { const t = openTradeFor(tradeHistory(OPEN), 'ETH'); return near(t.exits[0].sharePct, 20) && near(t.exits[1].sharePct, 30) && near(t.soldPct, 50); }],
  ['Trades: Anteil auch bei vor dem Zeitraum eröffneter Position', () => near(tradeHistory([F(5, 'A', 1, 100, 4, 5)])[0].exits[0].sharePct, 25)],
  ['Trades: kaputte Daten = leer', () => tradeHistory(null).length === 0],
  ['Performance-Split: realisiert = gesamt minus Buchgewinn', () => { const p = perfSplit(2400, 1500, 300); return near(p.total, 900) && near(p.realized, 600) && near(p.pct, 60); }],
  ['24h: 100 → 105 = +5 %', () => near(change24h(105, 100), 5)],
  ['Entry-Abstand: in der Zone = 0', () => entryDistance(plan, 100) === 0],
  ['Entry-Abstand: über der Zone positiv', () => near(entryDistance(plan, 102.01), 1)],
  ['Entry-Abstand: unter der Zone negativ', () => near(entryDistance(plan, 98.01), -1)],
  ['Privatmodus: Beträge und Stückzahlen verborgen', () => { f.setPrivate(true); const ok = !/\d/.test(f.usd(2423.86) + f.signedUsd(-40) + f.usdShort(150) + f.size(2.26)); f.setPrivate(false); return ok; }],
  ['Privatmodus: Prozente und Kurse bleiben', () => { f.setPrivate(true); const ok = f.pct(61.6) === '61,6 %' && f.price(2697.6) === '2.697,6'; f.setPrivate(false); return ok; }],
  ['Privatmodus: Plan kopieren nutzt echte Zahlen', () => { f.setPrivate(true); const ok = f.raw(() => f.usd(5)) === '5,00 $' && f.usd(5).includes('••'); f.setPrivate(false); return ok; }],
  ['Privatmodus aus: normale Anzeige', () => f.usd(5) === '5,00 $'],
  ['Trade-Karte: Einstieg → TP1–TP4 → Stop-Loss', () => {
    const h = ladder(plan), i = (s) => h.indexOf(s);
    return i('Einstieg') < i('TP1') && i('TP1') < i('TP4') && i('TP4') < i('Stop-Loss');
  }],
  ['Trade-Karte: gleiche Reihenfolge bei Short', () => {
    const h = ladder({ ...plan, dir: 'short', stop: 110, tps: [90, 80, 70, 60] }), i = (s) => h.indexOf(s);
    return i('Einstieg') < i('TP1') && i('TP4') < i('Stop-Loss');
  }],
];
