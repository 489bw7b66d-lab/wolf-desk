import { simulateTrade, summarize } from './core-backtest.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const C = (t, o, h, l, c) => ({ t, T: t + 9, o, h, l, c });
const L = { dir: 'long', zone: [99, 101], entry: 100, stop: 90, tps: [110, 120, 130, 140] };
const S = { dir: 'short', zone: [99, 101], entry: 100, stop: 110, tps: [90, 80, 70, 60] };
const now = { fillNow: true, nowPx: 100 };

export const tests = [
  ['Backtest: Stop getroffen = −1R (vor Gebühren)', () => near(simulateTrade(L, [C(0, 100, 105, 89, 90)], now).grossR, -1)],
  ['Backtest: Gebühren werden abgezogen', () => { const x = simulateTrade(L, [C(0, 100, 105, 89, 90)], now); return x.r < x.grossR; }],
  ['Backtest: TP1 + TP2, Rest auf Einstieg = +0,7R', () => near(simulateTrade(L, [C(0, 100, 111, 99, 110), C(10, 110, 121, 109, 120), C(20, 120, 121, 99, 100)], now).grossR, 0.2 + 0.5)],
  ['Backtest: Stop und Ziel in einer Kerze = Stop zählt', () => simulateTrade(L, [C(0, 100, 111, 89, 100)], now).outcome === 'stop'],
  ['Backtest: alle Ziele + Runner nachgezogen = +2,5R', () => near(simulateTrade(L, [C(0, 100, 141, 99.5, 140), C(10, 140, 141, 119, 120)], now).grossR, 0.2 + 0.5 + 0.75 + 0.6 + 0.45)],
  ['Backtest: Short gewinnt bei fallenden Kursen', () => simulateTrade(S, [C(0, 100, 101, 89, 90), C(10, 90, 101, 89, 100)], now).grossR > 0],
  ['Backtest: Limit ohne Berührung = nicht ausgelöst', () => simulateTrade(L, [C(0, 105, 108, 104, 106), C(20, 106, 108, 104, 106)], { validUntil: 15 }).filled === false],
  ['Backtest: Ziel ohne Einstieg erreicht = verpasst', () => simulateTrade(L, [C(0, 105, 111, 104, 110)], {}).reason === 'ohne Einstieg gelaufen'],
  ['Backtest: Zeitlimit schließt zum Kurs', () => simulateTrade(L, [C(0, 100, 105, 95, 104), C(100, 104, 105, 95, 104)], { ...now, maxUntil: 50 }).outcome === 'zeit'],
  ['Auswertung: Trefferquote und Summe', () => { const s = summarize([{ r: 2 }, { r: -1 }, { r: 1 }, { r: -1 }]); return s.winRate === 50 && near(s.totalR, 1); }],
  ['Auswertung: Profit-Faktor 3 / 2 = 1,5', () => near(summarize([{ r: 2 }, { r: -1 }, { r: 1 }, { r: -1 }]).profitFactor, 1.5)],
  ['Auswertung: max. Drawdown in R', () => near(summarize([{ r: 2 }, { r: -1 }, { r: -2 }, { r: 1 }]).maxDdR, 3)],
  ['Auswertung: Ereignis mit Vorteil wird erkannt', () => {
    const t = [...Array(4)].map(() => ({ r: 2, events: ['Golden Cross'] })).concat([...Array(4)].map(() => ({ r: -1, events: [] })));
    return near(summarize(t).byEvent[0].edge, 3);
  }],
  ['Auswertung: leer = n 0', () => summarize([]).n === 0],
];
