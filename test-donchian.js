// Tests für core-donchian.js (8d: Donchian-Ausbruch 20/10, nur Backtest)
import { donchianSignal, donchianFromSlices, simulateDonchian, DC, DC_EVENT } from './core-donchian.js';

const DAY = 864e5, H4 = 4 * 36e5;
const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
// Tageskerze i: Schluss c, Hoch/Tief ±1 um den Schluss (ATR also rund 2)
const day = (i, c, h = c + 1, l = c - 1) => ({ t: i * DAY, T: (i + 1) * DAY - 1, o: c, h, l, c });
// 30 ruhige Tage um 100 (Hoch höchstens 101), dann ein Tag mit Schluss 104
const flat = [...Array(30)].map((_, i) => day(i, 100));
const breakout = [...flat, day(30, 104, 105, 100)];
const T = (list) => list.at(-1).T;
// Stundenkerzen ab Zeit t0: [Hoch, Tief, Schluss] je Stunde
const hours = (t0, rows) => rows.map(([h, l, c], i) => ({ t: t0 + i * 36e5, T: t0 + (i + 1) * 36e5 - 1, o: c, h, l, c }));

export const tests = [
  ['Donchian: festgelegte Regel 20 / 10 / ATR 14 × 2', () => DC.entry === 20 && DC.exit === 10 && DC.atr === 14 && DC.atrMult === 2],
  ['Donchian: Tagesschluss über dem 20-Tage-Hoch = Long zum Schluss', () => { const p = donchianSignal(breakout, T(breakout), H4); return p && p.dir === 'long' && p.entry === 104 && p.channelHigh === 101 && p.tps.length === 0; }],
  ['Donchian: Stop liegt 2 × ATR unter dem Einstieg', () => { const p = donchianSignal(breakout, T(breakout), H4); return p.stop < 104 && near(p.entry - p.stop, p.R) && p.R > 3 && p.R < 6; }],
  ['Donchian: Schluss genau auf dem Hoch reicht nicht', () => donchianSignal([...flat, day(30, 101, 102, 100)], 31 * DAY - 1, H4) === null],
  ['Donchian: nur der Schluss zählt, ein Docht über das Hoch nicht', () => donchianSignal([...flat, day(30, 100.5, 110, 100)], 31 * DAY - 1, H4) === null],
  ['Donchian: der Ausbruchstag selbst gehört nicht zum Kanal', () => donchianSignal([...flat, day(30, 104, 200, 100)], 31 * DAY - 1, H4) !== null],
  ['Donchian: Hoch vor mehr als 20 Tagen zählt nicht mehr', () => { const old = [day(0, 100, 150, 99), ...[...Array(25)].map((_, i) => day(i + 1, 100)), day(26, 104, 105, 100)]; return donchianSignal(old, T(old), H4) !== null; }],
  ['Donchian: Hoch innerhalb der 20 Tage sperrt den Ausbruch', () => { const l = [...[...Array(20)].map((_, i) => day(i, 100)), day(20, 100, 150, 99), ...[...Array(9)].map((_, i) => day(21 + i, 100)), day(30, 104, 105, 100)]; return donchianSignal(l, T(l), H4) === null; }],
  ['Donchian: Signal nur an der ersten Setup-Kerze nach Tagesschluss', () => donchianSignal(breakout, T(breakout), H4) !== null && donchianSignal(breakout, T(breakout) + H4, H4) === null && donchianSignal(breakout, T(breakout) + 5 * H4, H4) === null],
  ['Donchian: zu wenig Tageskerzen = kein Signal', () => donchianSignal(breakout.slice(-15), T(breakout), H4) === null && donchianSignal(null, 0, H4) === null],
  ['Donchian: Rückgabeform für den Backtest', () => { const r = donchianFromSlices(['1d', '4h', '1h'], [breakout, [], []], T(breakout), H4); return r.plan.method === 'donchian' && r.events[0].name === DC_EVENT && r.analyses[1].close === 104 && donchianFromSlices(['1d', '4h', '1h'], [flat, [], []], T(flat), H4).plan === null; }],
  ['Donchian-Trade: Stop greift', () => {
    const p = donchianSignal(breakout, T(breakout), H4), t0 = 31 * DAY;
    const x = simulateDonchian(p, hours(t0, [[105, 103, 104], [104, p.stop - 0.5, p.stop]]), breakout, { t: T(breakout) });
    return x.filled && x.outcome === 'stop' && near(x.grossR, -1) && x.hits === 0;
  }],
  ['Donchian-Trade: Ausstieg bei Tagesschluss unter dem 10-Tage-Tief', () => {
    // Nach dem Einstieg steigt der Kurs 12 Tage (Tief je Tag steigt mit), dann schließt ein Tag unter dem tiefsten Tief der 10 Tage davor
    const p = donchianSignal(breakout, T(breakout), H4);
    const up = [...Array(12)].map((_, i) => day(31 + i, 106 + 2 * i));           // Schlüsse 106 … 128, Tiefs 105 … 127
    const drop = day(43, 108, 128, 107.5);                                       // Schluss 108 < tiefstes Tief der 10 Tage davor (109)
    const daily = [...breakout, ...up, drop, day(44, 90)];
    const path = [...up, drop, day(44, 90)].map((d) => ({ ...d }));              // Tageskerzen als „feine“ Kerzen reichen für den Test
    const x = simulateDonchian(p, path, daily, { t: T(breakout) });
    return x.outcome === 'kanal' && x.exitTime === drop.T && near(x.grossR, (108 - 104) / p.R);
  }],
  ['Donchian-Trade: Schluss über dem 10-Tage-Tief hält die Position', () => {
    const p = donchianSignal(breakout, T(breakout), H4);
    const up = [...Array(12)].map((_, i) => day(31 + i, 106 + 2 * i));
    const dip = day(43, 112, 128, 110);                                          // Schluss 112 > 109: kein Ausstieg, und der Stop ist weit weg
    const x = simulateDonchian(p, [...up, dip], [...breakout, ...up, dip], { t: T(breakout) });
    return x.outcome === 'offen' && near(x.grossR, (112 - 104) / p.R);
  }],
  ['Donchian-Trade: Stop geht vor Kanal-Ausstieg in derselben Kerze', () => {
    const p = donchianSignal(breakout, T(breakout), H4);
    const crash = day(31, 80, 104, 79);
    return simulateDonchian(p, [crash], [...breakout, crash], { t: T(breakout) }).outcome === 'stop';
  }],
  ['Donchian-Trade: Gebühren werden abgezogen', () => {
    const p = donchianSignal(breakout, T(breakout), H4), path = [day(31, 106)];
    const a = simulateDonchian(p, path, [...breakout, ...path], { t: T(breakout) }), b = simulateDonchian(p, path, [...breakout, ...path], { t: T(breakout), feePct: 0.045 });
    return near(a.r, a.grossR) && near(a.r - b.r, (2 * 0.045 / 100) * 104 / p.R);
  }],
  ['Donchian-Trade: ohne Kerzen kein Trade', () => simulateDonchian(donchianSignal(breakout, T(breakout), H4), [], breakout, { t: T(breakout) }).filled === false],
];
