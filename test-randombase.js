// Tests für core-randombase.js (8f: Zufalls-Maßstab, nur Messung)
import { RND, mulberry32, hashStr, drawSeed, rollAt, randomPlan, randomDonchianPlan, runRandomBase, sumDraws, randomSummary, randomVerdict, benchmarks, MIN_TRADES } from './core-randombase.js';
import { donchianSignal, DC } from './core-donchian.js';
import { benchmarkFromSlices, BT } from './core-backtest.js';
import { compactRun } from './core-btstore.js';
import { btDigest } from './ui-export.js';

const DAY = 864e5, H = 36e5;
const near = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;
// Stetiger Kursverlauf: leichter Aufwärtstrend mit Wellen
const px = (t) => 100 * Math.exp(0.002 * t / DAY) * (1 + 0.06 * Math.sin(t / (9 * DAY))) * (1 + 0.01 * Math.sin(t / (7 * H)));
const NOW = Date.now(), END = Math.floor(NOW / DAY) * DAY;
const mk = (step, from, to) => { const out = []; for (let t = Math.floor(from / step) * step; t + step <= to; t += step) { const o = px(t), c = px(t + step); out.push({ t, T: t + step - 1, o, c, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998 }); } return out; };
// Swing: Zeitebenen 1d / 4h / 1h, 180 Tage plus Vorlauf
const series = () => [mk(DAY, END - 460 * DAY, END), mk(4 * H, END - 230 * DAY, END), mk(H, END - 190 * DAY, END)];
const flatDays = [...Array(120)].map((_, i) => ({ t: i * DAY, T: (i + 1) * DAY - 1, o: 100, h: 101, l: 99, c: 100 }));

// Die Läufe brauchen await, die Testseite ruft Tests ohne await auf: deshalb einmal vorab rechnen und unten nur die Ergebnisse prüfen.
const S = series();
const A = await runRandomBase('TST', 'swing', S), B = await runRandomBase('TST', 'swing', S), C = await runRandomBase('ANDERS', 'swing', S);
const N = await runRandomBase('TST', 'swing', [S[0].slice(-60), S[1], S[2]]);
// 8g: Zufalls-Vergleich mit Donchian-Ausstieg
const DA = await runRandomBase('TST', 'swing', S, { engine: 7 }), DB = await runRandomBase('TST', 'swing', S, { exit: 'donchian' });
const SUM = randomSummary([[10, 1, 5, 0, 5, 1], [10, 3, 5, 1, 5, 2]]); // Entw. 0 bis 0,2 · Best. 0,2 bis 0,4

export const tests = [
  ['Zufall: festgelegt sind 20 Durchgänge, Stop 2 × ATR 14, Ziele 2R / 3R / 4R / 6R, mind. 110 Tage Historie', () => RND.draws === 20 && RND.atrMult === 2 && RND.atrPeriod === 14 && RND.tps.join() === '2,3,4,6' && RND.minDays === 110],
  ['Zufall: gleicher Startwert = gleiche Zahlenfolge, anderer Startwert = andere', () => { const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43); const x = [a(), a(), a()], y = [b(), b(), b()], z = [c(), c(), c()]; return x.join() === y.join() && x.join() !== z.join() && x.every((v) => v >= 0 && v < 1); }],
  ['Zufall: Zahlen sind gleichmäßig verteilt (Mittel nahe 0,5)', () => { const r = mulberry32(7); let s = 0; for (let i = 0; i < 20000; i++) s += r(); return Math.abs(s / 20000 - 0.5) < 0.01; }],
  ['Zufall: der Würfel einer Kerze hängt nur von Startwert und Kerzenzeit ab', () => { const T = 1760000000000; let s = 0; for (let i = 0; i < 20000; i++) s += rollAt(99, T + i * 14400000); return rollAt(5, T) === rollAt(5, T) && rollAt(5, T) !== rollAt(6, T) && rollAt(5, T) !== rollAt(5, T + 14400000) && Math.abs(s / 20000 - 0.5) < 0.01; }],
  ['Zufall: Trefferquote des Würfels passt zur eingestellten Häufigkeit (1 von 280)', () => { const T = 1760000000000; let n = 0; for (let i = 0; i < 280000; i++) if (rollAt(123, T + i * 3600000) < 1 / 280) n++; return n > 850 && n < 1150; }],
  ['Zufall: Startwert hängt von Markt, Stil und Durchgang ab', () => { const s = new Set([drawSeed('BTC', 'swing', 0), drawSeed('BTC', 'swing', 1), drawSeed('ETH', 'swing', 0), drawSeed('BTC', 'intraday', 0)]); return s.size === 4 && drawSeed('BTC', 'swing', 3) === drawSeed('BTC', 'swing', 3) && hashStr('a') !== hashStr('b'); }],
  ['Zufalls-Plan: derselbe Stop und dieselben Ziele wie der Maßstab', () => {
    // Steigende Tageskerzen, damit auch der Maßstab einen Plan liefert
    const D = [...Array(130)].map((_, i) => ({ t: i * DAY, T: (i + 1) * DAY - 1, o: 100 + i, h: 102 + i, l: 99 + i, c: 101 + i }));
    const p = randomPlan(D, 240), b = benchmarkFromSlices(['1d', '4h', '1h'], [D, [{ c: 240 }], []]).plan;
    return b && near(p.stop, b.stop) && p.tps.every((x, i) => near(x, b.tps[i])) && p.dir === 'long';
  }],
  ['Zufalls-Plan: braucht keinen Trend, aber genug Historie', () => randomPlan(flatDays, 100) !== null && randomPlan(flatDays.slice(0, 100), 100) === null && randomPlan(null, 100) === null && randomPlan(flatDays, 0) === null],
  ['Zufalls-Lauf: 20 Durchgänge je Markt, Entwicklung plus Bestätigung = alle Trades', () => A.rnd.length === 20 && A.rnd.every((a) => a[0] === a[2] + a[4] && near(a[1], a[3] + a[5], 1e-6)) && A.rnd.some((a) => a[0] > 0)],
  ['Zufalls-Lauf: wiederholbar (gleiche Daten = gleiches Ergebnis), anderer Markt würfelt anders', () => JSON.stringify(A.rnd) === JSON.stringify(B.rnd) && JSON.stringify(A.rnd) !== JSON.stringify(C.rnd)],
  ['Zufalls-Lauf: etwa so viele Trades wie „Neu im Trend“ (rund 3 je Markt in 180 Tagen)', () => { const n = A.rnd.reduce((s, a) => s + a[0], 0) / 20; return n > 1.5 && n < 6; }],
  ['Zufalls-Lauf: nur Long, mit Funding, Beispiel-Trades stammen aus dem ersten Durchgang', () => A.trades.length === A.rnd[0][0] && A.trades.every((t) => t.dir === 'long' && t.exitTime > t.fillTime && t.r < t.grossR) && A.engine === 6 && A.fundingPctDay > 0],
  ['Zufalls-Lauf: kein Trade läuft länger als das Zeitlimit von 60 Setup-Kerzen', () => A.trades.every((t) => t.exitTime - t.time <= BT.maxBars * 4 * H + H)],
  ['Zufalls-Lauf: mit zu wenig Tages-Historie keine Trades', () => N.rnd.length === 20 && N.rnd.every((a) => a[0] === 0) && N.trades.length === 0],
  ['Zusammenzählen: Durchgänge mehrerer Märkte werden je Durchgang addiert', () => { const s = sumDraws([[[1, 2, 1, 2, 0, 0], [2, -1, 1, 1, 1, -2]], [[3, 1, 2, 0, 1, 1], [0, 0, 0, 0, 0, 0]], undefined]); return s.length === 2 && s[0].join() === '4,3,3,2,1,1' && s[1].join() === '2,-1,1,1,1,-2'; }],
  ['Auswertung: Schnitt und Spanne je Zeitraum', () => { const s = randomSummary([[10, 5, 5, 5, 5, 0], [10, -5, 5, -5, 5, 0], [10, 0, 0, 0, 10, 0]]); return s.draws === 3 && near(s.all.mean, 0) && near(s.all.min, -0.5) && near(s.all.max, 0.5) && near(s.dev.max, 1) && near(s.dev.min, -1) && near(s.conf.mean, 0) && near(s.all.n, 10); }],
  ['Auswertung: Durchgänge ohne Trades in einem Zeitraum zählen dort nicht mit', () => randomSummary([[4, 2, 0, 0, 4, 2]]).dev === null && randomSummary([]) === null && randomSummary(null) === null],
  ['Urteil: bestanden nur, wenn die Regel in beiden Zeiträumen über der Spanne liegt', () => {
    const s = randomSummary([[10, 1, 5, 0, 5, 1], [10, 3, 5, 1, 5, 2]]); // Entw. 0 bis 0,2 · Best. 0,2 bis 0,4
    return randomVerdict(s, { dev: 0.3, conf: 0.5 }).pass === true && randomVerdict(s, { dev: 0.1, conf: 0.5 }).pass === false && randomVerdict(s, { dev: 0.3, conf: 0.4 }).pass === false;
  }],
  ['Urteil: genau auf der Obergrenze zählt nicht als darüber; darunter wird erkannt', () => { const s = randomSummary([[10, 1, 5, 0, 5, 1], [10, 3, 5, 1, 5, 2]]); const v = randomVerdict(s, { dev: 0.2, conf: 0.1 }); return v.above.dev === false && v.below.dev === false && v.below.conf === true; }],
  ['Urteil: ohne Vergleichswerte keines', () => randomVerdict(null, { dev: 1, conf: 1 }) === null && randomVerdict(randomSummary([[10, 1, 5, 0, 5, 1]]), { dev: null, conf: 1 }) === null],
  ['Speicher: Durchgänge bleiben beim Zwischenspeichern erhalten, andere Läufe bekommen kein leeres Feld', () => compactRun({ coin: 'A', trades: [], rnd: [[1, 2, 3, 4, 5, 6]] }).rnd[0].join() === '1,2,3,4,5,6' && !('rnd' in compactRun({ coin: 'A', trades: [] }))],
  ['Export: Zufalls-Maßstab steht mit Schnitt und Spanne in der Zusammenfassung', () => { const d = btDigest({ trades: [{ time: 1, r: 1, coin: 'A', dir: 'long' }], from: 0, to: 6, rnd: [[10, 5, 5, 5, 5, 0], [10, -5, 5, -5, 5, 0]] }, 'swing:rn'); return d.random.draws === 2 && near(d.random.all.max, 0.5) && btDigest({ trades: [], from: 0, to: 6 }, 'swing').random === null; }],
  // ---- 8g: Zufalls-Vergleich zu Donchian und beide Messlatten ----
  ['Zufall Donchian: derselbe Stop wie ein Donchian-Signal am selben Tag, keine Ziele', () => {
    const D = [...Array(60)].map((_, i) => ({ t: i * DAY, T: (i + 1) * DAY - 1, o: 100 + i, h: 102 + i, l: 99 + i, c: 101 + i }));
    D.at(-1).c += 5; D.at(-1).h += 5; // letzter Tag schließt über dem 20-Tage-Hoch, damit Donchian ein Signal hat
    const p = randomDonchianPlan(D), d = donchianSignal(D, D.at(-1).T + 1, 4 * H);
    return d && near(p.stop, d.stop) && near(p.entry, d.entry) && p.tps.length === 0 && randomDonchianPlan(D.slice(0, 10)) === null;
  }],
  ['Zufall Donchian: 20 Durchgänge, wiederholbar, als Engine 7 gekennzeichnet', () => DA.rnd.length === 20 && DA.engine === 7 && JSON.stringify(DA.rnd) === JSON.stringify(DB.rnd) && DA.rnd.every((a) => a[0] === a[2] + a[4])],
  ['Zufall Donchian: würfelt anders als der Zufall mit Zeit-Ausstieg', () => JSON.stringify(DA.rnd) !== JSON.stringify(A.rnd)],
  ['Zufall Donchian: etwa so viele Trades wie Donchian (rund 3 je Markt), nur Long, mit Funding', () => { const n = DA.rnd.reduce((s, a) => s + a[0], 0) / 20; return n > 1 && n < 6 && DA.trades.every((t) => t.dir === 'long' && t.r < t.grossR && t.hits === 0); }],
  ['Zufall Donchian: Einstieg nur direkt nach einem Tagesschluss', () => DA.trades.length > 0 && DA.trades.every((t) => ((t.time + 1) % DAY) < 4 * H)],
  ['Zufall Donchian: Ausstieg nur über Stop, Kanal oder Ende der Daten (kein Zeitlimit)', () => DA.trades.every((t) => ['stop', 'kanal', 'offen'].includes(t.outcome))],
  ['Messlatten: A und B bestanden = scharf', () => { const b = benchmarks(SUM, { all: 0.4, dev: 0.3, conf: 0.5, n: 400 }); return b.A.pass && b.B.pass && b.pass && b.A.dev === 'above'; }],
  ['Messlatten: über der Spanne, aber in der Entwicklung im Minus = A ja, B nein', () => { const s = randomSummary([[10, -6, 5, -4, 5, -2], [10, -4, 5, -3, 5, -1]]); const b = benchmarks(s, { all: 0.1, dev: -0.3, conf: 0.5, n: 400 }); return b.A.pass && !b.B.pass && !b.pass && b.B.dev === false && b.B.conf === true; }],
  ['Messlatten: im Plus, aber innerhalb der Spanne = B ja, A nein', () => { const b = benchmarks(SUM, { all: 0.2, dev: 0.1, conf: 0.3, n: 400 }); return !b.A.pass && b.B.pass && !b.pass && b.A.dev === 'inside' && b.A.conf === 'inside'; }],
  ['Messlatten: unter der Spanne wird als „darunter“ erkannt', () => benchmarks(SUM, { all: 0.1, dev: -0.3, conf: 0.5, n: 400 }).A.dev === 'below'],
  ['Messlatten: zu wenige Trades = B nicht bestanden', () => { const b = benchmarks(SUM, { all: 0.4, dev: 0.3, conf: 0.5, n: MIN_TRADES - 1 }); return !b.B.pass && b.B.enough === false && MIN_TRADES === 300; }],
  ['Messlatten: ohne Zufalls-Lauf gibt es B, aber kein A; ohne Regel gar nichts', () => { const b = benchmarks(null, { all: 0.4, dev: 0.3, conf: 0.5, n: 400 }); return b.A === null && b.B.pass && b.pass === false && benchmarks(SUM, null) === null; }],
  ['Zufall Donchian: Häufigkeit ist vorab festgelegt (1 Einstieg je 40 freien Tagen)', () => RND.everyDays === 40 && DC.exit === 10],
];
