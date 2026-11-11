// Tests für die Stop-Loss-Empfehlung offener Positionen (8z): core-stopadvice.js
import { SA, dailyAtr, stopAdvice, stopVerdict } from './core-stopadvice.js';

const DAY = 864e5, T0 = Date.UTC(2026, 0, 5);
const days = (n, range = 4) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * DAY, T: T0 + (i + 1) * DAY - 1, o: 100, c: 100, h: 100 + range / 2, l: 100 - range / 2, v: 1 }));
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const L = (o) => stopAdvice({ side: 'long', entry: 100, price: 104, atrDay: 4, size: 10, ...o });

export const tests = [
  ['Stop-Empfehlung: Tages-ATR nur aus abgeschlossenen Tagen', () => { const D = days(30); return near(dailyAtr(D, T0 + 30 * DAY), 4) && near(dailyAtr([...D, { t: T0 + 30 * DAY, T: T0 + 31 * DAY - 1, o: 100, c: 100, h: 200, l: 50 }], T0 + 30 * DAY + 5), 4) && dailyAtr(days(10)) === null; }],
  ['Stop-Empfehlung Long: Rahmen-Stop 2 × Tages-ATR unter dem Einstieg', () => { const a = L({}); return a.rec.kind === 'rahmen' && near(a.rec.price, 92) && near(a.fromEntryPct, -8) && near(a.pnlAtStop, -80) && a.state === 'fehlt' && SA.atrMult === 2; }],
  ['Stop-Empfehlung Short: Rahmen-Stop 2 × Tages-ATR über dem Einstieg', () => { const a = stopAdvice({ side: 'short', entry: 100, price: 97, atrDay: 4, size: 10 }); return near(a.rec.price, 108) && near(a.pnlAtStop, -80) && near(a.fromEntryPct, 8); }],
  ['Stop-Empfehlung: Vergleich mit dem jetzigen Stop (passt, enger, weiter)', () => L({ stop: 92.5 }).state === 'passt' && L({ stop: 97 }).state === 'enger' && L({ stop: 85 }).state === 'weiter' && /Tagesrauschen/.test(stopVerdict(L({ stop: 97 }))) && /keinen Stop/.test(stopVerdict(L({})))],
  ['Stop-Empfehlung: nachgezogener Stop geht vor, wenn er besser schützt', () => { const a = L({ price: 115, trail: 106 }), b = L({ price: 115, trail: 90 }); return a.rec.kind === 'trail' && near(a.pnlAtStop, 60) && b.rec.kind === 'rahmen'; }],
  ['Stop-Empfehlung: Kurs hinter dem Rahmen-Stop → keine Empfehlung, „gerissen“', () => { const a = L({ price: 90 }); return a.rec === null && a.broken && a.state === 'gerissen' && /gescheitert/.test(stopVerdict(a)); }],
  ['Stop-Empfehlung: Liquidation vor dem Stop wird erkannt', () => L({ liq: 95 }).liqFirst === true && L({ liq: 80 }).liqFirst === false && L({ liq: 95, stop: 93 }).curLiqFirst === true && stopAdvice({ side: 'short', entry: 100, price: 97, atrDay: 4, liq: 105 }).liqFirst === true],
  ['Stop-Empfehlung: ohne Tages-ATR der Struktur-Stop, sonst als zweite Marke', () => { const a = L({ atrDay: null, planStop: 95 }), b = L({ planStop: 95 }), c = L({ atrDay: null }); return a.rec.kind === 'struktur' && b.rec.kind === 'rahmen' && b.alt.price === 95 && c.rec === null && c.state === 'ohne'; }],
  ['Stop-Empfehlung: unbrauchbare Eingaben → null', () => stopAdvice(null) === null && stopAdvice({ side: 'long', entry: 0, price: 1 }) === null && stopAdvice({ side: 'x', entry: 1, price: 1 }) === null],
  ['Stop-Empfehlung: Stop schon am Einstieg oder im Gewinn → „gesichert“, außer der nachgezogene wäre besser', () => { const a = L({ price: 115, stop: 100.5 }), b = L({ price: 115, stop: 100.5, trail: 106 }), c = L({ price: 115, stop: 107, trail: 106 }); return a.state === 'gesichert' && a.rec === null && /nichts zu tun/.test(stopVerdict(a)) && b.rec.kind === 'trail' && b.state === 'weiter' && c.state === 'gesichert'; }],
];
