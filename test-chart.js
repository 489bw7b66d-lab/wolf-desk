import { liveCandle } from './ui-chart.js';
import { tipKey, tipInline, rememberTip } from './ui-parts.js';

const C = (T, c) => ({ T, o: c, h: c, l: c, c });

export const tests = [
  ['Chart: Live-Kerze je Markt getrennt (kein fremder Kurs beim Öffnen)', () => {
    const t = 1_700_000_000_000;
    const link = liveCandle([C(t, 15)], '4h', 15.2, 'LINK');
    const pump = liveCandle([C(t, 0.0052)], '4h', 0.00521, 'PUMP');
    return link.h === 15.2 && pump.o === 0.0052 && pump.h === 0.00521 && pump.l === 0.0052;
  }],
  ['Chart: Live-Kerze läuft je Markt weiter (Hoch/Tief)', () => {
    const t = 1_700_000_100_000;
    liveCandle([C(t, 10)], '1h', 10.5, 'SOL');
    const x = liveCandle([C(t, 10)], '1h', 9.8, 'SOL');
    return x.h === 10.5 && x.l === 9.8 && x.c === 9.8;
  }],
  ['Chart: neue fertige Kerze startet neue Live-Kerze', () => {
    liveCandle([C(1, 10)], '15m', 12, 'ETH');
    const x = liveCandle([C(2, 11)], '15m', 11.1, 'ETH');
    return x.o === 11 && x.h === 11.1;
  }],
  ['Chart: unplausibler Live-Kurs (über 50 % daneben) wird ignoriert', () => liveCandle([C(3, 0.005)], '4h', 15, 'PUMP') === null],
  ['ⓘ: Schlüssel ohne Zahlen (Betrag ändert sich, Erklärung bleibt dieselbe)', () => tipKey('Netto 96,22 $ nach Gebühren') === tipKey('Netto 101,50 $ nach Gebühren')],
  ['ⓘ: gemerkte Erklärung bleibt nach dem Neuzeichnen offen', () => {
    const closed = !/ open/.test(tipInline('Testtext A'));
    rememberTip(tipKey('Testtext A'), true);
    const open = / open/.test(tipInline('Testtext A 2'));
    rememberTip(tipKey('Testtext A'), false);
    return closed && open && !/ open/.test(tipInline('Testtext A'));
  }],
];
