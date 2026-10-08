// Tests für „Deine Trades im Detail“ (8n): core-tradedetail.js
import { TD, closedBefore, atrAt, exitAvg, entryKind, stopFor, bestPrice, biasAt, withBias, detailRow, groupStats, splitStats, compareText, atrTxt, holdTxt, prepH4, lastBefore, moveAtr, diceCompare, diceText, DICE } from './core-tradedetail.js';
import { tradeHistory } from './core-trades.js';

const DAY = 864e5, H = 36e5, T0 = Date.UTC(2026, 0, 1), near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) < eps;
// Tageskerzen mit fester Spanne 2 (ATR = 2), Schluss steigt oder fällt je Tag um `step`
const days = (n, step = 0, p = 100) => Array.from({ length: n }, (_, k) => { const c = p + step * k; return { t: T0 + k * DAY, T: T0 + (k + 1) * DAY - 1, o: c, h: c + 1, l: c - 1, c }; });
const D = days(200), ENTRY = T0 + 150 * DAY + 10 * H;
// Fills wie von Hyperliquid: Long auf 100, Teilverkauf 104, Rest 106
const F = [
  { coin: 'AAA', side: 'B', sz: '10', px: '100', time: ENTRY, startPosition: '0', fee: '0', closedPnl: '0', crossed: true },
  { coin: 'AAA', side: 'A', sz: '5', px: '104', time: ENTRY + 20 * H, startPosition: '10', fee: '0', closedPnl: '20', crossed: false },
  { coin: 'AAA', side: 'A', sz: '5', px: '106', time: ENTRY + 30 * H, startPosition: '5', fee: '0', closedPnl: '30', crossed: false },
];
const TR = tradeHistory(F)[0];
const hours = (from, n, hi) => Array.from({ length: n }, (_, k) => ({ t: from + k * H, T: from + (k + 1) * H - 1, o: 100, c: 100, h: k === 5 ? hi : 101, l: 99 }));
const HR = hours(ENTRY - H, 40, 110);
const ORD = [
  { order: { coin: 'AAA', side: 'A', triggerPx: '97', orderType: 'Stop Market', timestamp: ENTRY + 1000, reduceOnly: true } },
  { order: { coin: 'AAA', side: 'A', triggerPx: '101', orderType: 'Stop Market', timestamp: ENTRY + 10 * H } },
  { order: { coin: 'AAA', side: 'A', triggerPx: '108', orderType: 'Take Profit Market', timestamp: ENTRY + 2000 } },
  { order: { coin: 'BBB', side: 'A', triggerPx: '50', orderType: 'Stop Market', timestamp: ENTRY + 3000 } },
];
const UP = days(200, 1), DOWN = days(200, -0.3, 200);
const CTX = { fills: F, orders: ORD, daily: { AAA: D }, hourly: { ['AAA|' + ENTRY]: HR }, btc: UP, alt: UP, now: ENTRY + 40 * H };
const ROW = detailRow(TR, CTX);
const r = (o) => ({ closed: true, resAtr: 1, bestAtr: 2, leftAtr: 1, holdH: 10, resPct: 2, fit: 'mit', kind: 'Kurs', coinUp: true, side: 'long', ...o });

// 8o: Würfel. 4H-Kerzen mit Spanne 1 (ATR = 1) und festem Schritt je Kerze
const h4 = (n, step, p = 100) => Array.from({ length: n }, (_, k) => { const c = p + step * k; return { t: T0 + k * 4 * H, T: T0 + (k + 1) * 4 * H - 1, o: c, h: c + 0.5, l: c - 0.5, c }; });
const W = { OWN: h4(100, 0.5), A: h4(100, 0), B: h4(100, 0), C: h4(100, 0.1), D: h4(100, -0.2), E: h4(100, 0), F: h4(100, 0) };
const tr = (coin, k0, k1, side = 'long') => ({ coin, side, openedAt: T0 + k0 * 4 * H + 60e3, closedAt: T0 + k1 * 4 * H + 60e3 });
export const tests = [
  ['Tagesdaten: nur Tage, die vor dem Einstieg abgeschlossen waren', () => closedBefore(D, ENTRY).length === 150 && closedBefore(D, T0).length === 0 && closedBefore(null, ENTRY).length === 0],
  ['Tages-ATR beim Einstieg', () => near(atrAt(D, ENTRY), 2) && atrAt(D.slice(0, 10), ENTRY) === null],
  ['Ausstieg: Durchschnitt über alle Teilverkäufe', () => near(exitAvg(TR), 105) && exitAvg({ exits: [] }) === null],
  ['Einstieg zum Kurs oder per Limit (aus „crossed“ der eröffnenden Fills)', () => entryKind(TR, F) === 'Kurs' && entryKind(TR, F.map((x) => ({ ...x, crossed: false }))) === 'Limit' && entryKind(TR, F.map(({ crossed, ...x }) => x)) === null],
  ['Einstieg gemischt, wenn ein Teil zum Kurs und ein Teil per Limit kam', () => { const f = [{ ...F[0], sz: '5' }, { ...F[0], sz: '5', time: ENTRY + 60e3, startPosition: '5', crossed: false }, { ...F[2], sz: '10', startPosition: '10' }]; return entryKind(tradeHistory(f)[0], f) === 'gemischt'; }],
  ['Stop: der erste Stop zum Schließen für diesen Coin, kein Take-Profit, kein nachgezogener, kein fremder Coin', () => stopFor(TR, ORD) === 97 && stopFor(TR, ORD.slice(1)) === 101 && stopFor(TR, [ORD[2], ORD[3]]) === null && stopFor(TR, null) === null],
  ['Stop: ein Stop, der lange vor dem Trade gesetzt wurde, zählt nicht; fünf Minuten davor schon', () => stopFor(TR, [{ coin: 'AAA', side: 'A', triggerPx: '95', orderType: 'Stop Market', timestamp: ENTRY - 2 * H }]) === null && stopFor(TR, [{ coin: 'AAA', side: 'A', triggerPx: '95', orderType: 'Stop Limit', timestamp: ENTRY - 4 * 60e3 }]) === 95],
  ['Stop beim Short: Kauf-Order über dem Einstieg', () => { const s = { ...TR, side: 'short' }; return stopFor(s, [{ coin: 'AAA', side: 'B', triggerPx: '103', orderType: 'Stop Market', timestamp: ENTRY + 1 }]) === 103 && stopFor(s, ORD) === null; }],
  ['Bester Stand: höchstes Hoch zwischen Einstieg und Ende, Kerzen davor zählen nicht', () => bestPrice(TR, HR) === 110 && bestPrice(TR, hours(ENTRY - 3 * H, 2, 150)) === null && bestPrice(TR, null) === null],
  ['Bester Stand beim Short: tiefstes Tief', () => bestPrice({ ...TR, side: 'short' }, HR) === 99],
  ['Bias beim Einstieg: BTC und Alts aufwärts, abwärts oder gemischt; nur Tage davor', () => biasAt(UP, UP, ENTRY).state === 'aufwärts' && biasAt(DOWN, DOWN, ENTRY).state === 'abwärts' && biasAt(UP, DOWN, ENTRY).state === 'gemischt' && biasAt(UP, [], ENTRY).state === 'aufwärts' && biasAt([], [], ENTRY).state === null && biasAt(UP, UP, T0 + 50 * DAY).state === null],
  ['Mit oder gegen den Bias', () => withBias('long', 'aufwärts') === 'mit' && withBias('short', 'abwärts') === 'mit' && withBias('long', 'abwärts') === 'gegen' && withBias('short', 'aufwärts') === 'gegen' && withBias('long', 'gemischt') === 'gemischt' && withBias('long', null) === null],
  ['Zeile: Ergebnis, bester Stand und liegen gelassen in Tages-ATR, mit R aus dem Stop', () => near(ROW.resAtr, 2.5) && near(ROW.bestAtr, 5) && near(ROW.leftAtr, 2.5) && near(ROW.stopAtr, 1.5) && near(ROW.resR, 5 / 3) && near(ROW.bestR, 10 / 3) && near(ROW.resPct, 5)],
  ['Zeile: Haltedauer, Einstiegsart, Bias, Coin-Trend', () => near(ROW.holdH, 30) && ROW.kind === 'Kurs' && ROW.bias === 'aufwärts' && ROW.fit === 'mit' && ROW.coinUp === false && ROW.closed],
  ['Zeile: keine Beträge in Dollar (weder Gewinn noch Größe)', () => !Object.keys(ROW).some((k) => /pnl|usd|size|sz|realized|fee|notional/i.test(k))],
  ['Zeile: ohne Stop kein R, ohne Kerzen kein bester Stand; ein laufender Trade hat kein Ergebnis', () => { const a = detailRow(TR, { ...CTX, orders: [] }), b = detailRow(TR, { ...CTX, hourly: {} }), c = detailRow({ ...TR, closedAt: null, exits: [] }, CTX); return a.resR === null && a.stopAtr === null && near(a.resAtr, 2.5) && b.bestAtr === null && b.leftAtr === null && c.resAtr === null && !c.closed && near(c.holdH, 40); }],
  ['Zeile: Short rechnet in die andere Richtung', () => { const f = [{ ...F[0], side: 'A' }, { ...F[1], side: 'B', px: '96', startPosition: '-10' }, { ...F[2], side: 'B', px: '94', startPosition: '-5' }]; const x = detailRow(tradeHistory(f)[0], { ...CTX, orders: [{ coin: 'AAA', side: 'B', triggerPx: '103', orderType: 'Stop Market', timestamp: ENTRY }] }); return x.side === 'short' && near(x.resAtr, 2.5) && near(x.bestAtr, 0.5) && near(x.resR, 5 / 3) && x.fit === 'gegen'; }],
  ['Statistik: nur abgeschlossene Trades, Durchschnitt und Anteil im Plus', () => { const g = groupStats([r({ resAtr: 2 }), r({ resAtr: -1 }), r({ closed: false }), r({ resAtr: null })]); return g.n === 2 && g.winPct === 50 && near(g.resAtr, 0.5) && groupStats([]).n === 0 && groupStats([]).resAtr === null; }],
  ['Statistik: Gruppen mit / gegen Bias, Kurs / Limit, Coin im Trend / gegen Trend', () => { const s = splitStats([r({}), r({ fit: 'gegen', kind: 'Limit', coinUp: false }), r({ fit: 'gemischt' }), r({ side: 'short', coinUp: false })]); return s.all.n === 4 && s.bias.mit.n === 2 && s.bias.gegen.n === 1 && s.bias.gemischt.n === 1 && s.kind.Kurs.n === 3 && s.kind.Limit.n === 1 && s.coin.im.n === 3 && s.coin.gegen.n === 1; }],
  ['Vergleich: sagt ehrlich, wenn es zu wenige Trades sind', () => /zu wenige Trades.*mindestens 10/.test(compareText({ n: 3, resAtr: 1 }, { n: 12, resAtr: -1 }, 'A', 'B')) && /fehlen Trades/.test(compareText({ n: 0 }, { n: 5 }, 'A', 'B')) && /noch kein Muster/.test(compareText({ n: 10, resAtr: 1 }, { n: 10, resAtr: 0 }, 'A', 'B')) && TD.minN === 10],
  ['Texte: ATR und Haltedauer', () => atrTxt(-1.26) === '−1,3 ATR' && atrTxt(null) === '–' && holdTxt(5.4) === '5 Std.' && holdTxt(72) === '3,0 Tage' && holdTxt(null) === '–'],
  ['8o Gruppen: Ø Stop-Abstand in ATR (nur wo bekannt) und Ø Haltedauer', () => { const g = groupStats([r({ stopAtr: 2 }), r({ stopAtr: 1 }), r({ stopAtr: null })]); return near(g.stopAtr, 1.5) && near(g.holdH, 10) && groupStats([r({ stopAtr: null })]).stopAtr === null; }],
  ['8o Würfel: Kurs der letzten abgeschlossenen 4H-Kerze vor dem Zeitpunkt', () => { const P = prepH4(W.OWN); return lastBefore(P, T0 + 20 * 4 * H + 60e3) === 19 && lastBefore(P, T0) === -1 && lastBefore(P, T0 + 4 * H) === 0; }],
  ['8o Würfel: Bewegung in 4H-ATR, Short umgekehrt, zu kurz heißt nicht messbar', () => { const P = prepH4(W.OWN); return near(moveAtr(P, 'long', T0 + 20 * 4 * H + 1, T0 + 30 * 4 * H + 1), 5) && near(moveAtr(P, 'short', T0 + 20 * 4 * H + 1, T0 + 30 * 4 * H + 1), -5) && moveAtr(P, 'long', T0 + 20 * 4 * H + 1, T0 + 20 * 4 * H + 3 * H) === null && moveAtr(null, 'long', 0, 1) === null; }],
  ['8o Würfel: ein Coin, der klar besser lief als alle anderen, schlägt fast jeden Durchgang', () => { const d = diceCompare([tr('OWN', 20, 30), tr('OWN', 40, 55)], W); return d.n === 2 && near(d.own, 6.25) && d.beat === 100 && d.p95 < d.own && d.runs === DICE.runs; }],
  ['8o Würfel: ein Coin wie der Durchschnitt liegt in der Mitte; ein schlechter ganz unten', () => { const mid = diceCompare([tr('A', 20, 30)], W), bad = diceCompare([tr('D', 20, 30)], W); return mid.beat > 10 && mid.beat < 90 && bad.beat === 0; }],
  ['8o Würfel: der eigene Coin ist nie unter den Würfel-Märkten; laufende und zu kurze Trades zählen nicht', () => { const d = diceCompare([tr('OWN', 20, 30), { ...tr('OWN', 20, 30), closedAt: null }, tr('OWN', 20, 20)], W); return d.n === 1 && d.skipped === 1 && d.beat === 100; }],
  ['8o Würfel: zu wenige andere Märkte heißt kein Vergleich; fester Würfel, gleiches Ergebnis', () => { const few = diceCompare([tr('OWN', 20, 30)], { OWN: W.OWN, A: W.A }), a = diceCompare([tr('A', 20, 30), tr('C', 40, 50)], W), b = diceCompare([tr('A', 20, 30), tr('C', 40, 50)], W); return few.n === 0 && a.beat === b.beat && a.p50 === b.p50 && diceCompare(null, W).n === 0; }],
  ['8o Würfel: Text mit Urteil (Hürde 95 % wie im Testplan), ehrlich bei wenigen Trades', () => /Noch zu wenige Trades/.test(diceText({ n: 3, own: 1, beat: 99, p5: 0, p50: 0.2, p95: 0.5, runs: 500 })) && /besser als der Zufall/.test(diceText({ n: 30, own: 1, beat: 97, p5: 0, p50: 0.2, p95: 0.5, runs: 500 })) && /nicht zu unterscheiden/.test(diceText({ n: 30, own: 1, beat: 60, p5: 0, p50: 0.2, p95: 0.5, runs: 500 })) && /schlechter als der Zufall/.test(diceText({ n: 30, own: -1, beat: 3, p5: 0, p50: 0.2, p95: 0.5, runs: 500 })) && /Kein Trade/.test(diceText({ n: 0 }))],
  ['8p Gruppen nach Stop-Abstand: unter 1, 1 bis 1,5, ab 1,5 Tages-ATR; unbekannte Stops zählen nicht', () => { const s = splitStats([r({ stopAtr: 0.6 }), r({ stopAtr: 0.99 }), r({ stopAtr: 1 }), r({ stopAtr: 1.49 }), r({ stopAtr: 1.5 }), r({ stopAtr: 2.1 }), r({ stopAtr: null })]); return s.stop.eng.n === 2 && s.stop.mittel.n === 2 && s.stop.weit.n === 2 && s.all.n === 7; }],
];
