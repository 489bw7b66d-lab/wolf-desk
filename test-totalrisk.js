// Tests für core-totalrisk.js (8a)
import { totalRisk, totalRiskStatus } from './core-totalrisk.js';
const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const L = (o) => ({ coin: 'A', side: 'long', size: 10, entry: 100, mark: 110, stop: 95, liq: 80, marginUsed: 200, ...o });

export const tests = [
  ['Gesamt-Risiko: ohne Positionen = null', () => totalRisk([], 1000) === null && totalRisk(null, 1000) === null],
  ['Gesamt-Risiko: Long, Stop unter Einstieg → −50 ab Einstieg, −150 ab jetzt', () => { const t = totalRisk([L()], 1000); return near(t.fromEntry, -50) && near(t.fromNow, -150); }],
  ['Gesamt-Risiko: Prozent vom Konto', () => { const t = totalRisk([L()], 1000); return near(t.pctNow, -15) && near(t.pctEntry, -5); }],
  ['Gesamt-Risiko: Stop im Gewinn zählt als gesicherter Gewinn ab Einstieg, aber Rückgabe ab jetzt', () => { const t = totalRisk([L({ stop: 105 })], 1000); return near(t.fromEntry, 50) && near(t.fromNow, -50); }],
  ['Gesamt-Risiko: Short spiegelbildlich', () => { const t = totalRisk([L({ side: 'short', size: -10, mark: 90, stop: 105, liq: 120 })], 1000); return near(t.fromEntry, -50) && near(t.fromNow, -150); }],
  ['Gesamt-Risiko: Summe über mehrere Positionen', () => near(totalRisk([L(), L({ coin: 'B', stop: 90 })], 1000).fromEntry, -150)],
  ['Gesamt-Risiko: Liquidation vor dem Stop → ganze Margin', () => near(totalRisk([L({ stop: 70 })], 1000).fromEntry, -200)],
  ['Gesamt-Risiko: ohne Stop zählt der Weg bis zur Liquidation und wird gezählt', () => { const t = totalRisk([L({ stop: null })], 1000); return t.noStop === 1 && near(t.fromEntry, -200); }],
  ['Gesamt-Risiko: ohne Stop und ohne Liquidation = unbekannt, kein Absturz', () => { const t = totalRisk([L({ stop: null, liq: null })], 1000); return t.unknown === 1 && t.fromEntry === 0; }],
  ['Gesamt-Risiko: zählt long und short', () => { const t = totalRisk([L(), L({ coin: 'B' }), L({ coin: 'C', side: 'short', size: -10, mark: 90, stop: 105, liq: 120 })], 1000); return t.long === 2 && t.short === 1 && t.n === 3; }],
  ['Gesamt-Risiko: Positionsgröße gesamt und Hebel aufs Konto', () => { const t = totalRisk([L(), L({ coin: 'B' })], 1000); return near(t.notional, 2200) && near(t.leverage, 2.2); }],
  ['Gesamt-Risiko: alles long = +100 % netto, gemischt entsprechend', () => totalRisk([L()], 1000).netPct === 100 && near(totalRisk([L(), L({ coin: 'C', side: 'short', size: -10, mark: 110, stop: 115, liq: 130 })], 1000).netPct, 0)],
  ['Gesamt-Risiko: ohne Kontowert keine Prozente', () => { const t = totalRisk([L()], null); return t.pctNow === null && t.leverage === null && near(t.fromNow, -150); }],
  ['Gesamt-Risiko: ohne Live-Kurs zählt der Einstieg als Kurs', () => near(totalRisk([L({ mark: null })], 1000).fromNow, -50)],
  ['Ampel: unter der Hälfte des Limits grün, ab Hälfte gelb, ab Limit rot', () => totalRiskStatus({ pctNow: -5 }, 15) === 'ok' && totalRiskStatus({ pctNow: -8 }, 15) === 'warn' && totalRiskStatus({ pctNow: -15 }, 15) === 'bad'],
  ['Ampel: richtet sich nach dem eingestellten Limit', () => totalRiskStatus({ pctNow: -8 }, 30) === 'ok' && totalRiskStatus({ pctNow: -8 }, 8) === 'bad' && totalRiskStatus(null) === 'ok'],
];
