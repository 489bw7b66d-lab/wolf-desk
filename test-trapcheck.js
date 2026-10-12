// Tests für den Bullenfallen-Detektor (8u): core-trapcheck.js
import { detailRow, splitStats } from './core-tradedetail.js';
import { TRAP, findBreakout, newHigh, trapSigns, trapHead, trapAtEntry, fibZone } from './core-trapcheck.js';

const DAY = 864e5, T0 = Date.UTC(2026, 0, 5);
const K = (i, o, c, x = {}) => ({ t: T0 + i * DAY, T: T0 + (i + 1) * DAY - 1, o, c, h: x.h ?? Math.max(o, c) + 0.3, l: x.l ?? Math.min(o, c) - 0.3, v: x.v ?? 100 });
// 40 Tage Seitwärts mit einem Körper-Hoch bei 110 (Tag 20), danach Ausbruch an Tag 40
function base() {
  const D = [];
  for (let i = 0; i < 40; i++) { const o = 100 + (i % 3), c = 101 + (i % 3); D.push(K(i, o, c)); }
  D[20] = K(20, 105, 110);
  return D;
}
const up = (n, from = 100) => Array.from({ length: n }, (_, i) => K(i, from + i, from + i + 0.5));
const flat = (n, px = 100) => Array.from({ length: n }, (_, i) => K(i, px, px + 0.1));

export const tests = [
  ['Falle: Ausbruch über ein bestätigtes Körper-Hoch wird gefunden', () => { const D = [...base(), K(40, 108, 113, { v: 200 })]; const b = findBreakout(D); return b && b.L === 110 && b.bi === 40; }],
  ['Falle: Ausbruch älter als 5 Tage zählt nicht', () => { const D = [...base(), K(40, 108, 113)]; for (let i = 41; i < 47; i++) D.push(K(i, 113, 114)); return findBreakout(D) === null; }],
  ['Falle: Zeichen 1 „zugeschnappt“, wenn ein Tagesschluss zurück unter das Level fällt', () => { const D = [...base(), K(40, 108, 113), K(41, 113, 109)]; const r = trapSigns({ D, L: 110, bi: 40 }); return r.snapped && r.signs[0].on && r.backAt === D[41].t; }],
  ['Falle: Zeichen 2 bei langem oberen Docht oder knappem Schluss', () => { const a = trapSigns({ D: [...base(), K(40, 108, 111, { h: 116 })], L: 110, bi: 40 }); const b = trapSigns({ D: [...base(), K(40, 108, 113)], L: 110, bi: 40 }); return a.signs[1].on && !b.signs[1].on; }],
  ['Falle: Zeichen 3 bei Volumen unter dem 20-Tage-Schnitt', () => { const a = trapSigns({ D: [...base(), K(40, 108, 113, { v: 50 })], L: 110, bi: 40 }); const b = trapSigns({ D: [...base(), K(40, 108, 113, { v: 300 })], L: 110, bi: 40 }); return a.signs[2].on === true && b.signs[2].on === false; }],
  ['Falle: Zeichen 5 nur prüfbar mit BTC und Alt-Index', () => { const D = [...base(), K(40, 108, 113)]; const r = trapSigns({ D, L: 110, bi: 40, btc: flat(45) }); const btc = flat(45).map((x, i) => ({ ...x, t: D[0].t + i * DAY })), alt = btc; const r2 = trapSigns({ D, L: 110, bi: 40, btc, alt }); return r.signs[4].on === null && r2.signs[4].on === true; }],
  ['Falle: neues 20-Tage-Hoch erkannt', () => { const S = up(40); return newHigh(S, S[30].t) === true && newHigh(flat(40), flat(40)[30].t) === false && newHigh(up(10), up(10)[5].t) === null; }],
  ['Falle: Zeichen 6 ist nie prüfbar und zählt nicht mit', () => { const r = trapSigns({ D: [...base(), K(40, 108, 113)], L: 110, bi: 40 }); return r.signs[5].on === null && r.of === r.signs.filter((x) => x.on !== null).length && r.of <= 6; }],
  ['Falle: Kopfzeile „x von y Warnzeichen“', () => { const r = trapSigns({ D: [...base(), K(40, 108, 111, { h: 116, v: 50 }), K(41, 111, 109)], L: 110, bi: 40 }); return /^Fallen-Check: \d von \d Warnzeichen$/.test(trapHead(r)) && r.count >= 3; }],
  ['Falle: beim Einstieg nur Kerzen davor', () => { const D = [...base(), K(40, 108, 113), K(41, 113, 109)]; const e1 = trapAtEntry(D, D[41].t), e2 = trapAtEntry(D, D[38].t); return e1.group !== 'kein' && e1.r.snapped === false && e2.group === 'kein'; }],
  ['Falle: Fib-Rücklauf eines großen Rückgangs (0,618 bis 0,786)', () => {
    const D = []; for (let i = 0; i < 30; i++) D.push(K(i, 139, 140)); D.push(K(30, 140, 150));
    for (let k = 0; k < 20; k++) D.push(K(31 + k, 148 - k * 2.4, 148 - (k + 1) * 2.4)); // Rückgang bis 100
    [108, 117, 126, 135].forEach((c, k) => D.push(K(51 + k, c - 9, c)));                 // Erholung bis 135 (0,7 des Rückgangs)
    const z = fibZone(D, D.length - 1, 'Tag'); return z && z.kind === 'retr' && /0,618–0,786/.test(z.text) && /\(Tag\)/.test(z.text); }],
  ['Falle: Trades im Detail teilen Longs nach Warnzeichen beim Einstieg', () => {
    const D = [...base(), K(40, 108, 111, { h: 116, v: 50 }), K(41, 111, 112), K(42, 112, 113)];
    const tr = (t, side = 'long') => ({ coin: 'X', side, openedAt: t, closedAt: t + 2 * DAY, entryAvg: 112, exits: [{ px: 113, sz: 1, time: t + 2 * DAY }], entries: [{ px: 112, sz: 1, time: t }], maxSz: 1 });
    const a = detailRow(tr(D[42].t), { daily: { X: D } }), b = detailRow(tr(D[30].t), { daily: { X: D } }), c = detailRow(tr(D[42].t, 'short'), { daily: { X: D } });
    const st = splitStats([a, b]);
    return a.trap === 'mit' && b.trap === 'kein' && c.trap === null && st.trap.mit.n === 1 && st.trap.kein.n === 1; }],
  ['Falle: ohne Daten kein Ergebnis', () => trapSigns({ D: [], L: 1, bi: 0 }) === null && findBreakout([]) === null && TRAP.days === 5],
];
