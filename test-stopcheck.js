// Tests für den Stop-Check gegen die Tages-ATR (8p): core-stopcheck.js
import { frameCfg, stopNoiseDaily } from './core-stopcheck.js';

const near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) < eps;
const C = { guard: { stopNoiseAtr: 1, stopTightAtr: 1.5, suggestAtr: 1.5 }, benchmark: { atrMult: 2 } };

export const tests = [
  ['Stop-Check: Vorschlag ist der Rahmen-Stop 2 × Tages-ATR, die Grenzen bleiben die Einstellungen', () => { const c = frameCfg(C); return c.suggestAtr === 2 && c.stopNoiseAtr === 1 && c.stopTightAtr === 1.5 && frameCfg({ guard: C.guard }).suggestAtr === 2; }],
  ['Stop-Check: 0,9 Tages-ATR ist rot (im Rauschen), mit Rahmen-Stop als Vorschlag', () => { const n = stopNoiseDaily(100, 95.5, 5, null, frameCfg(C)); return n.status === 'bad' && near(n.ratio, 0.9) && near(n.suggest.stop, 90) && n.suggest.atrMult === 2 && /0,9× Tages-ATR/.test(n.text) && n.daily; }],
  ['Stop-Check: 1,2 Tages-ATR ist gelb, ab 1,5 grün ohne Vorschlag', () => { const a = stopNoiseDaily(100, 94, 5, null, frameCfg(C)), b = stopNoiseDaily(100, 92.5, 5, null, frameCfg(C)); return a.status === 'warn' && b.status === 'ok' && b.suggest === null && /genug Luft \(1,5× Tages-ATR\)/.test(b.text); }],
  ['Stop-Check: Short spiegelt den Vorschlag über den Einstieg', () => near(stopNoiseDaily(100, 103, 5, null, frameCfg(C)).suggest.stop, 110)],
  ['Stop-Check: ohne Tages-ATR oder Stop kein Urteil', () => stopNoiseDaily(100, 95, null, null, frameCfg(C)) === null && stopNoiseDaily(100, null, 5, null, frameCfg(C)) === null],
  ['Stop-Check: liegt der Rahmen-Stop hinter der Liquidation, wird das markiert', () => stopNoiseDaily(100, 97, 5, 92, frameCfg(C)).suggest.beyondLiq === true && stopNoiseDaily(100, 97, 5, 85, frameCfg(C)).suggest.beyondLiq === false],
];
