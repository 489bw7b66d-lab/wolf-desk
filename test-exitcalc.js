// Tests für core-exitcalc.js (8a)
import { exitCalc, floorTo, decimalsOf, qtyText, planHint } from './core-exitcalc.js';
const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const PLAN = [{ label: 'TP1', pct: 30 }, { label: 'TP2', pct: 30 }, { label: 'TP3', pct: 0 }, { label: 'TP4', pct: 20 }, { label: 'Runner', pct: 20 }];
const P = { size: 1384.7, entry: 1.19144, mark: 1.2454, side: 'long' };

export const tests = [
  ['Ausstieg: 30 % von 1384,7 bei 1 Nachkommastelle = 415,4 (abgerundet)', () => exitCalc({ ...P, pct: 30, szDecimals: 1 }).qty === 415.4],
  ['Ausstieg: nie mehr als gewollt (abrunden, nicht runden)', () => exitCalc({ size: 10, entry: 1, mark: 1, side: 'long', pct: 33.39, szDecimals: 1 }).qty === 3.3],
  ['Ausstieg: Gegenwert = Menge × Kurs', () => near(exitCalc({ ...P, pct: 30, szDecimals: 1 }).value, 415.4 * 1.2454)],
  ['Ausstieg: Gewinn Long = (Kurs − Einstieg) × Menge', () => near(exitCalc({ ...P, pct: 30, szDecimals: 1 }).pnl, (1.2454 - 1.19144) * 415.4)],
  ['Ausstieg: Short im Gewinn, wenn der Kurs gefallen ist', () => exitCalc({ size: -2, entry: 100, mark: 90, side: 'short', pct: 50, szDecimals: 2 }).pnl === 10],
  ['Ausstieg: Long im Verlust ergibt negativen Betrag', () => exitCalc({ size: 2, entry: 100, mark: 90, side: 'long', pct: 50, szDecimals: 2 }).pnl === -10],
  ['Ausstieg: Rest + Menge = Position', () => { const x = exitCalc({ ...P, pct: 30, szDecimals: 1 }); return near(x.qty + x.rest, 1384.7); }],
  ['Ausstieg: 100 % = alles, Rest 0', () => { const x = exitCalc({ ...P, pct: 100, szDecimals: 1 }); return x.qty === 1384.7 && x.rest === 0 && x.restPct === 0; }],
  ['Ausstieg: über 100 % wird auf alles begrenzt', () => { const x = exitCalc({ ...P, pct: 250, szDecimals: 1 }); return x.qty === 1384.7 && x.capped === true; }],
  ['Ausstieg: negative Positionsgröße (Short) wird als Betrag gerechnet', () => exitCalc({ size: -4, entry: 10, mark: 10, side: 'short', pct: 25, szDecimals: 0 }).qty === 1],
  ['Ausstieg: zu kleiner Anteil ergibt Hinweis statt 0 Stück', () => exitCalc({ size: 3, entry: 10, mark: 10, side: 'long', pct: 10, szDecimals: 0 }).tooSmall === true],
  ['Ausstieg: leere oder ungültige Eingabe = null', () => exitCalc({ ...P, pct: '' }) === null && exitCalc({ ...P, pct: 0 }) === null && exitCalc({ ...P, pct: -5 }) === null && exitCalc({ ...P, pct: 'abc' }) === null],
  ['Ausstieg: ohne Kurs oder Position = null', () => exitCalc({ ...P, mark: null, pct: 30 }) === null && exitCalc({ ...P, size: 0, pct: 30 }) === null && exitCalc() === null],
  ['Ausstieg: Stellen unbekannt → Stellen der Positionsgröße', () => exitCalc({ size: 0.148, entry: 2700, mark: 2731, side: 'long', pct: 50 }).qty === 0.074],
  ['Ausstieg: ganze Stückzahlen (0 Stellen)', () => exitCalc({ size: 18030, entry: 0.05, mark: 0.06, side: 'long', pct: 12.5, szDecimals: 0 }).qty === 2253],
  ['floorTo: 0,29999999 Rechenfehler wird nicht nach unten gerissen', () => floorTo(0.1 * 3, 1) === 0.3],
  ['decimalsOf: 1384,7 → 1 · 13827 → 0 · 0,148 → 3', () => decimalsOf(1384.7) === 1 && decimalsOf(13827) === 0 && decimalsOf(0.148) === 3],
  ['Menge als Text: Punkt, keine überflüssigen Nullen', () => qtyText(415.4, 1) === '415.4' && qtyText(2253, 0) === '2253' && qtyText(0.07, 4) === '0.07' && qtyText(0, 2) === ''],
  ['Plan-Hinweis: nichts verkauft → TP1 mit 30 % vom Rest', () => { const h = planHint(PLAN, 0, 0); return h.label === 'TP1' && h.ofOpen === 30 && h.cum === 30; }],
  ['Plan-Hinweis: 30 % verkauft, nächstes TP2 (60 % gesamt) → 43 % vom Rest', () => { const h = planHint(PLAN, 1, 30); return h.label === 'TP2' && h.ofOpen === 43; }],
  ['Plan-Hinweis: Ziele mit 0 % werden übersprungen (TP3 = 0 → TP4)', () => planHint(PLAN, 2, 60).label === 'TP4'],
  ['Plan-Hinweis: schon mehr verkauft als geplant → kein Hinweis', () => planHint(PLAN, 0, 50) === null],
  ['Plan-Hinweis: alle Ziele erreicht oder alles verkauft → kein Hinweis', () => planHint(PLAN, 3, 80) === null && planHint(PLAN, 0, 100) === null && planHint(null, 0, 0) === null],
];
