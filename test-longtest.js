// Tests für core-longtest.js (8i: Messmaschine für den Testplan, nur Messung)
import { LT, RULES, prepare, entryTime, simAt, fireFlip, fireDonch, fireOf, marketSwitch, runRule, monthOf, monthLabel, randomMatchedOld, randomSameCandle, preOf, canEnter, idxAt, plainFrame, pairedSwitch, pairResult, monthSpan, periodResult, passA, passB, verdict, validResults, runLongTest, resultText, fmtR, mean } from './core-longtest.js';
import { mulberry32 } from './core-randombase.js';
import { pack, periods, periodOf } from './core-binance.js';
import { simulateTrade } from './core-backtest.js';
import { bmFlip } from './core-benchmark.js';
import { donchianSignal } from './core-donchian.js';
import { ema, atr } from './core-indicators.js';

const DAY = 864e5, H4 = 4 * 36e5;
const near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) < eps;
const STICH = Date.UTC(2026, 9, 6), P = periods(STICH), FROM = Date.UTC(2020, 0, 1), END = P.vault[0];
// Stetiger Kurs mit langen Wellen (Trendwechsel) und kurzen Wellen (Stops und Ziele werden erreicht)
const px = (seed) => (t) => 100 * (1 + seed) * Math.exp(0.0006 * (t - FROM) / DAY) * (1 + 0.35 * Math.sin((t - FROM) / (70 * DAY) + seed)) * (1 + 0.08 * Math.sin((t - FROM) / (6 * DAY) + 2 * seed)) * (1 + 0.015 * Math.sin((t - FROM) / (5 * H4)));
const mk = (f, step, from, to) => { const out = []; for (let t = from; t + step <= to; t += step) { const o = f(t), c = f(t + step); out.push({ t, T: t + step - 1, o, c, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, v: 1 }); } return out; };
const market = (coin, seed, from = FROM) => { const f = px(seed), D = mk(f, DAY, from, END), G = mk(f, H4, from, END); return { coin, D, G, M: prepare(coin, D, pack(G)) }; };
const A = market('AAA', 0.1), B = market('BBB', 0.7), C = market('CCC', 1.3, Date.UTC(2024, 2, 1));
const { M, D, G } = A;

const idx = [...Array(M.n).keys()];
const flips = idx.filter((i) => fireFlip(M, i)), donchs = idx.filter((i) => fireDonch(M, i));
// Gegenprobe mit den bestehenden Regeln der App (auf abgeschnittenen Kerzen, wie der Wächter rechnet)
const upTo = (T) => D.filter((c) => c.T <= T);
const sample = [...flips.slice(0, 12), ...idx.filter((i) => i % 397 === 0 && i > 700)];
const flipSame = sample.every((i) => bmFlip(upTo(G[i].T), [G[i - 1], G[i]], { emaFast: 20, emaSlow: 100, atrPeriod: 14, atrMult: 2, minDays: 110 }).flip === fireFlip(M, i));
const dSample = [...donchs.slice(0, 12), ...idx.filter((i) => i % 211 === 5 && i > 200)];
const donchSame = dSample.every((i) => !!donchianSignal(upTo(G[i].T), G[i].T + 1, H4) === fireDonch(M, i));

const ALL = ['dev', 'check'];
const TF = runRule(M, fireFlip, STICH, ALL), TFdev = runRule(M, fireFlip, STICH, ['dev']), TD = runRule(M, fireDonch, STICH, ALL);
const RDEV = randomMatchedOld(M, TFdev, STICH, ['dev'], 12);
// 8j: neuer Vergleich. Alle Einstiege der Regel über drei Märkte, zeitlich sortiert
const Ms3 = [M, B.M, C.M];
const E3 = Ms3.flatMap((X) => runRule(X, fireFlip, STICH, ALL)).sort((a, b) => a.t - b.t);
const SA = randomSameCandle(Ms3, E3, preOf('flip'), ALL, 12), SB = randomSameCandle(Ms3, E3, preOf('flip'), ALL, 12);
const SOLO = randomSameCandle([M], TF, () => true, ALL, 5);           // nur ein Markt: der Würfel kann nur denselben Einstieg treffen
const NONE = randomSameCandle([M], TF, () => false, ALL, 5);          // kein Markt zulässig
const TWICE = randomSameCandle([M], [TF[0], TF[0]], () => true, [TF[0].per], 4); // zwei Einstiege zur selben Kerze, ein Markt
const PF = plainFrame([M], STICH, ALL), simsBefore = M.sims.size, PF2 = plainFrame([M], STICH, ['dev']);
const SWT = marketSwitch({ AAA: D, BBB: B.D, CCC: C.D });
const PA = pairedSwitch(Ms3, SWT, STICH, ALL, 12), PB = pairedSwitch(Ms3, SWT, STICH, ALL, 12);
const allOn = new Map([...SWT.keys()].map((k) => [k, true]));
const PON = pairedSwitch([M], allOn, STICH, ['dev'], 6);
// Nachweis an Zufallskursen (Bedingung der Methoden-Prüfung vom 07.10.): Auf Kursen ohne jeden Vorteil muss eine Regel
// im Schnitt in der Mitte der Zufalls-Verteilung liegen. Der alte Vergleich (Markt und Monat) drückt Donchian ans untere Ende.
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const walk = (seed, days) => { const r = mulberry32(seed), Gw = []; let p = 100; for (let k = 0; k < days * 6; k++) { const t = FROM + k * H4, o = p; p *= Math.exp(0.012 * gauss(r)); const w = Math.abs(gauss(r)) * 0.004; Gw.push({ t, T: t + H4 - 1, o, c: p, h: Math.max(o, p) * (1 + w), l: Math.min(o, p) * (1 - w), v: 1 }); }
  const Dw = []; for (let d = 0; d < days; d++) { const s = Gw.slice(d * 6, d * 6 + 6); Dw.push({ t: s[0].t, T: s[0].t + DAY - 1, o: s[0].o, c: s[5].c, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), v: 6 }); } return prepare('W' + seed, Dw, pack(Gw)); };
const RW = { old: [], neu: [] };
for (let set = 0; set < 6; set++) {
  const W = [...Array(8)].map((_, m) => walk(1000 * set + m + 1, 450)), tr = [], old = { s: new Float64Array(30), n: new Int32Array(30) };
  for (const X of W) { const x = runRule(X, fireDonch, STICH, ['dev']); const r = randomMatchedOld(X, x, STICH, ['dev'], 30); for (let d = 0; d < 30; d++) { old.s[d] += r.dev.s[d]; old.n[d] += r.dev.n[d]; } tr.push(...x); }
  tr.sort((a, b) => a.t - b.t);
  RW.old.push(periodResult(tr, old, P.dev).pct); RW.neu.push(periodResult(tr, randomSameCandle(W, tr, preOf('donch'), ['dev'], 30).dev, P.dev).pct);
}
const cnt = (list, per) => list.filter((t) => t.per === per).length;
const SW = SWT;
const S0 = simAt(M, flips[0]);
const store = { '1d:AAA': pack(D, true), '4h:AAA': pack(G), '1d:BBB': pack(B.D, true), '4h:BBB': pack(B.G), '1d:CCC': pack(C.D, true), '4h:CCC': pack(C.G) };
const metaT = { stichtag: STICH, markets: ['AAA', 'BBB', 'CCC'] };
const load = async (tf, c) => store[`${tf}:${c}`] || null;
const save = { ...LT }; LT.draws = 12; LT.boot = 200; // kleine Zahlen nur für die Tests
let prog = 0;
const L1 = await runLongTest('flip', metaT, { load, onProgress: (k) => { prog = k; } }), L1b = await runLongTest('flip', metaT, { load });
const L2 = await runLongTest('flip', metaT, { load, withCheck: true });
const L5 = await runLongTest('r5', metaT, { load, withCheck: true }), LD = await runLongTest('donch', metaT, { load });
const MISS = await runLongTest('flip', { stichtag: STICH, markets: ['AAA', 'XXX'] }, { load }).then(() => 'ok', (e) => e.message);
Object.assign(LT, save);
const flat = (n, r, t0 = FROM) => [...Array(n)].map((_, i) => ({ t: t0 + i * 3 * DAY, r }));
const rndOf = (avgs) => ({ s: Float64Array.from(avgs.map((a) => a * 10)), n: Int32Array.from(avgs.map(() => 10)) });
const hundred = [...Array(100)].map((_, i) => i / 100); // Durchgänge von 0,00 bis 0,99
const res = (avg, pct, n = 200) => ({ n, avg, pct });

export const tests = [
  ['Langtest: fester Rahmen (20/30/30 %, Rest läuft, Ziele 2R/3R/4R, 10 Tage, 2 × ATR)', () => LT.splits.join() === '0.2,0.3,0.3,0,0.2' && near(LT.splits.reduce((a, b) => a + b, 0), 1) && LT.tps.slice(0, 3).join() === '2,3,4' && LT.holdDays === 10 && LT.atrMult === 2 && LT.atrPeriod === 14],
  ['Langtest: 200 Durchgänge, Bestehen ab 95 %, mindestens 300 Trades', () => LT.draws === 200 && LT.passPct === 95 && LT.minTrades === 300],
  ['Langtest: Tageskerze wird erst nach ihrem Schluss benutzt', () => { const i = 6 * 200 + 2; const d = M.dOf[i]; return D[d].t + DAY <= G[i].t + H4 && (d + 1 >= D.length || D[d + 1].t + DAY > G[i].t + H4) && M.dOf[5] === 0 && M.dOf[4] === -1; }],
  ['Langtest: Indikatoren schauen nicht in die Zukunft (gleich wie auf abgeschnittener Reihe)', () => [150, 400, 999].every((d) => near(M.fast[d], ema(D.slice(0, d + 1).map((c) => c.c), 20).at(-1), 1e-6) && near(M.slow[d], ema(D.slice(0, d + 1).map((c) => c.c), 100).at(-1), 1e-6) && near(M.atr[d], atr(D.slice(0, d + 1), 14).at(-1), 1e-6))],
  ['Langtest: Einstieg zum Schluss der Signalkerze, Stop 2 × Tages-ATR', () => { const i = flips[0], s = S0; const R = 2 * M.atr[M.dOf[i]]; return s.t === G[i].t + H4 && s.t === entryTime(M, i) && R > 0 && s.x > s.t; }],
  ['Langtest: Ergebnis entspricht der bestehenden Simulation minus Gebühr und Funding', () => { const i = flips[0], p = G[i].c, R = 2 * M.atr[M.dOf[i]], t = G[i].t + H4; const sim = simulateTrade({ dir: 'long', entry: p, stop: p - R, zone: [p, p], tps: [2, 3, 4, 6].map((k) => p + k * R) }, G.slice(i + 1, i + 62), { fillNow: true, nowPx: p, maxUntil: t + 10 * DAY - 1, splits: LT.splits }); return near(S0.r, sim.grossR - (2 * 0.045 / 100) * p / R - (0.03 / 100) * ((sim.exitTime - t) / DAY) * p / R, 1e-9); }],
  ['Langtest: spätestens nach 10 Tagen ist jeder Trade zu', () => [...TF, ...TD].every((t) => t.x - t.t <= 10 * DAY) && [...TF, ...TD].some((t) => t.out === 'zeit' && t.x - t.t === 10 * DAY)],
  ['Langtest: kein Einstieg ohne 110 Tage Historie', () => simAt(M, 6 * 108) === null && simAt(M, 6 * 111) !== null && TF.every((t) => t.t >= FROM + 110 * DAY)],
  ['Langtest: kein Einstieg an der letzten Kerze (keine Folgekerze)', () => simAt(M, M.n - 1) === null],
  ['Langtest: „Neu im Trend“ deckt sich mit der Regel der App', () => flips.length > 5 && flipSame],
  ['Langtest: Donchian deckt sich mit der Regel der App und feuert nur am Tagesschluss', () => donchs.length > 5 && donchSame && donchs.every((i) => (G[i].t + H4) % DAY === 0)],
  ['Langtest: ein offener Trade je Markt', () => [TF, TD].every((L) => L.length > 3 && L.every((t, k) => k === 0 || t.t >= L[k - 1].x))],
  ['Langtest: Trades zählen nach Einstiegsdatum, Sperrfrist und Tresor bleiben leer', () => TF.every((t) => t.per === periodOf(t.t, STICH) && (t.per === 'dev' || t.per === 'check') && t.t < P.lastEntry) && cnt(TF, 'dev') > 0 && cnt(TF, 'check') > 0],
  ['Langtest: ohne geöffnete Prüfung wird nur die Entwicklung gerechnet', () => TFdev.length === cnt(TF, 'dev') && TFdev.every((t) => t.t < P.dev[1]) && RDEV.check === undefined && L1.check === undefined && randomSameCandle(Ms3, E3.filter((e) => e.per === 'dev'), preOf('flip'), ['dev'], 2).check === undefined],
  ['Langtest: Zufall der Entwicklung ändert sich nicht, wenn die Prüfung dazukommt', () => near(L1.dev.rndAvg, L2.dev.rndAvg, 1e-12) && near(L1.dev.avg, L2.dev.avg, 1e-12) && L1.dev.n === L2.dev.n],
  ['Langtest: Monat aus der Zeit (UTC)', () => monthOf(Date.UTC(2023, 11, 31, 23)) === 2023 * 12 + 11 && monthOf(Date.UTC(2024, 0, 1)) === 2024 * 12 && monthLabel(2024 * 12) === '01.2024'],
  ['Langtest: Schalter Regel 5: Schnitt der 28-Tage-Veränderung über die Märkte, die es gab', () => { const up = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 100 + i })), dn = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 100 - i })), dn2 = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 200 - 4 * i })); return marketSwitch({ a: up }).get(30 * DAY) === true && marketSwitch({ a: dn }).get(30 * DAY) === false && marketSwitch({ a: up, b: dn2 }).get(30 * DAY) === false && marketSwitch({ a: up }).get(27 * DAY) === undefined && marketSwitch({ a: up, b: dn.slice(0, 20) }).get(30 * DAY) === true; }],
  ['Langtest 8j: Kerze zur Zeit finden', () => idxAt(M, G[777].t) === 777 && idxAt(M, G[0].t) === 0 && idxAt(M, G[M.n - 1].t) === M.n - 1 && idxAt(M, G[5].t + 1) === -1 && idxAt(C.M, G[10].t) === -1],
  ['Langtest 8j: „kann einsteigen“ deckt sich mit der Simulation', () => idx.filter((i) => i % 53 === 0).every((i) => canEnter(M, i) === (simAt(M, i) !== null)) && !canEnter(M, -1) && !canEnter(M, M.n - 1)],
  ['Langtest 8j: Vorbedingung Tagestrend für den Zufall, bei Donchian keine', () => { const up = idx.find((i) => M.dOf[i] > 150 && M.fast[M.dOf[i]] > M.slow[M.dOf[i]]), dn = idx.find((i) => M.dOf[i] > 150 && M.fast[M.dOf[i]] < M.slow[M.dOf[i]]); return preOf('flip')(M, up) === true && preOf('flip')(M, dn) === false && preOf('donch')(M, dn) === true && preOf('flip')(M, 3) === false; }],
  ['Langtest 8j: Zufall steigt zur selben Kerze ein (ein Markt: genau dieselben Trades wie die Regel)', () => [0, 1, 2, 3, 4].every((d) => near(SOLO.dev.s[d] + SOLO.check.s[d], TF.reduce((s, t) => s + t.r, 0), 1e-9) && SOLO.dev.n[d] === cnt(TF, 'dev') && SOLO.check.n[d] === cnt(TF, 'check')) && SOLO.dev.skipped === 0],
  ['Langtest 8j: kein zulässiger Markt: auslassen und zählen', () => NONE.dev.n[0] === 0 && NONE.dev.skipped === cnt(TF, 'dev') && NONE.check.skipped === cnt(TF, 'check')],
  ['Langtest 8j: ein Markt nimmt je Durchgang nur einen Trade zugleich', () => { const p = TWICE[TF[0].per]; return p.n[0] === 1 && p.skipped === 1; }],
  ['Langtest 8j: Zufall mit mehreren Märkten: je Einstieg der Regel ein Zufalls-Einstieg oder ausgelassen', () => [...Array(12).keys()].every((d) => SA.dev.n[d] <= cnt(E3, 'dev') && SA.check.n[d] <= cnt(E3, 'check')) && near(mean([...SA.dev.n]) + SA.dev.skipped, cnt(E3, 'dev'), 1e-9) && mean([...SA.dev.n]) > 0.7 * cnt(E3, 'dev')],
  ['Langtest 8j: Zufall ist wiederholbar und je Durchgang verschieden', () => SA.dev.s.join() === SB.dev.s.join() && new Set([...SA.dev.s].map((x) => x.toFixed(6))).size > 6],
  ['Langtest 8j: Nachweis an Zufallskursen: alter Vergleich drückt Donchian nach unten, neuer liegt in der Mitte', () => mean(RW.old) < 10 && mean(RW.neu) > 30 && mean(RW.neu) < 70],
  ['Langtest 8j: „Rahmen allein“ ist der Schnitt über jede 5. Kerze und füllt den Speicher nicht', () => { const L = idx.filter((i) => i % 5 === 0 && periodOf(G[i].t + H4, STICH) === 'dev' && canEnter(M, i)).map((i) => simAt(M, i).r); return near(PF2.dev, mean(L), 1e-9) && near(PF.dev, PF2.dev, 1e-12) && Number.isFinite(PF.check) && simsBefore < 3000; }],
  ['Langtest 8j: Regel 5 gepaart: wiederholbar, Einstiege an und aus', () => PA.dev.sOn.join() === PB.dev.sOn.join() && PA.dev.nOn[0] > 0 && PA.dev.nOff[0] > 0 && PA.check.nOn[0] + PA.check.nOff[0] > 0],
  ['Langtest 8j: Regel 5: rund ein Einstieg je 280 freien Kerzen', () => { const n = mean([...PON.dev.nOn]); const cand = idx.filter((i) => periodOf(G[i].t + H4, STICH) === 'dev' && canEnter(M, i)).length; return n > 0.5 * cand / 280 && n < 1.6 * cand / 280 && PON.dev.nOff.every((x) => x === 0); }],
  ['Langtest 8j: Regel 5: Auswertung der Differenz an minus aus', () => { const a = { sOn: Float64Array.from([10, 0, 6]), nOn: Int32Array.from([10, 10, 10]), sOff: Float64Array.from([0, 5, 6]), nOff: Int32Array.from([10, 10, 0]) }; const r = pairResult(a, [true, true, false, false, true, false]); return r.pair && r.draws === 2 && near(r.pct, 50) && near(r.diff, 0.25) && near(r.avg, 16 / 30) && near(r.avgOff, 11 / 20) && r.n === 10 && r.nOff === 7 && r.flips === 3 && near(r.share, 50) && r.daysN === 6; }],
  ['Langtest 8j: Regel 5: ohne „aus“ gibt es kein Urteil', () => { const r = pairResult(PON.dev, [true, true]); return r.pct === null && r.draws === 0 && r.flips === 0 && !passA(r); }],
  ['Langtest 8j: Regel 5 besteht A erst ab 95 % der Durchgänge über 0', () => passA({ pair: true, pct: 95, avg: 0.1, n: 200 }) && !passA({ pair: true, pct: 94, avg: 0.1, n: 200 }) && verdict('r5', { pair: true, pct: 40, avg: -0.1, n: 200 }, null).dropped],
  ['Langtest 8j: alte Ergebnisse (Vergleich je Markt und Monat) gelten nicht mehr', () => { const v = validResults({ flip: { dev: {}, cmp: 1 }, donch: { dev: {} }, r5: { dev: { n: 1 }, cmp: 2 } }); return Object.keys(v).join() === 'r5' && Object.keys(validResults(null)).length === 0 && LT.cmp === 2; }],
  ['Langtest 8j: kein „−0,00R“ mehr', () => fmtR(-0.001) === '±0,00R' && fmtR(0.004) === '±0,00R' && fmtR(-0.006) === '−0,01R' && fmtR(0.126) === '+0,13R' && fmtR(null) === '–'],
  ['Langtest 8j: Text für Regel 5 nennt an, aus, Differenz und Wechsel', () => { const x = resultText('r5', L5, '8j'); return x.includes('Schalter an Ø') && x.includes('Wechsel') && x.includes('Fassung 2') && /über 0 in \d+ % der \d+ Durchgänge/.test(x) && resultText('flip', L2, '8j').includes('Rahmen allein Ø'); }],
  ['Langtest: Spanne über ganze Monate, wiederholbar, umschließt den Schnitt', () => { const tr = [...flat(40, 1), ...flat(40, -0.5, FROM + 200 * DAY)]; const a = monthSpan(tr, P.dev), b = monthSpan(tr, P.dev); return a.months === 48 && a.lo === b.lo && a.lo < 0.25 && a.hi > 0.25 && a.lo < a.hi && monthSpan([], P.dev).lo === null; }],
  ['Langtest: gleiche Trades in jedem Monat ergeben keine Spanne', () => { const s = monthSpan(flat(30, 0.4), P.dev); return near(s.lo, 0.4) && near(s.hi, 0.4); }],
  ['Langtest: Platz in der Zufalls-Verteilung', () => { const r = periodResult(flat(20, 0.955), rndOf(hundred), P.dev), q = periodResult(flat(20, 0.5), rndOf(hundred), P.dev); return near(r.pct, 96) && near(q.pct, 50) && r.draws === 100 && near(r.rndAvg, 0.495) && r.n === 20 && r.wins === 20; }],
  ['Langtest: Durchgänge ohne Trades zählen nicht mit', () => periodResult(flat(5, 1), { s: Float64Array.from([5, 0]), n: Int32Array.from([10, 0]) }, P.dev).draws === 1 && periodResult([], rndOf([0.1]), P.dev).pct === null],
  ['Langtest: Messlatte A ab 95 %, B ab Plus', () => passA(res(0.1, 95)) && !passA(res(0.1, 94.9)) && !passA(res(0.1, null)) && passB(res(0.01, 0)) && !passB(res(0, 99)) && !passB(res(null, 99)) && !passA(null)],
  ['Langtest: Kandidat, der in der Entwicklung bei A und B durchfällt, ist abgelegt', () => { const v = verdict('r5', res(-0.1, 40), null); return v.dropped && !v.canCheck && !v.passed; }],
  ['Langtest: Kandidat mit nur einer bestandenen Messlatte darf die Prüfung einmal ansehen', () => verdict('r5', res(0.1, 40), null).canCheck && verdict('r5', res(-0.1, 99), null).canCheck && !verdict('r5', res(0.1, 99), res(0.1, 99)).canCheck],
  ['Langtest: Vergleichsregeln werden nie abgelegt', () => { const v = verdict('flip', res(-0.1, 10), null); return !v.dropped && v.canCheck; }],
  ['Langtest: bestanden nur mit A und B in beiden Zeiträumen und 300 Trades', () => verdict('r5', res(0.1, 99), res(0.1, 96)).passed && !verdict('r5', res(0.1, 99), res(0.1, 94)).passed && !verdict('r5', res(0.1, 99), res(-0.1, 99)).passed && !verdict('r5', res(0.1, 99, 100), res(0.1, 99, 100)).passed && !verdict('r5', res(0.1, 99), null).passed],
  ['Langtest: ganzer Lauf über mehrere Märkte ist wiederholbar und meldet Fortschritt', () => prog === 3 && near(L1.dev.avg, L1b.dev.avg, 1e-12) && L1.dev.pct === L1b.dev.pct && L1.dev.n > cnt(TF, 'dev') && L1.dev.draws === 12],
  ['Langtest: Markt mit Start 2024 liefert nur Trades in der Prüfung', () => { const t = runRule(C.M, fireFlip, STICH, ALL); return t.length > 0 && t.every((x) => x.per === 'check') && runRule(C.M, fireFlip, STICH, ['dev']).length === 0; }],
  ['Langtest: Prüfung reicht nur bis zur Sperrfrist', () => L2.check.n > 0 && L2.check.months === monthOf(P.lastEntry - 1) - monthOf(P.check[0]) + 1],
  ['Langtest: Donchian und Regel 5 laufen durch', () => LD.dev.n > 5 && L5.dev.pair === true && L5.dev.n > 5 && L5.check.n > 0 && Number.isFinite(L5.dev.diff) && Number.isFinite(LD.dev.rndAvg) && Number.isFinite(LD.dev.plain)],
  ['Langtest: fehlende Kerzen brechen den Lauf mit klarer Meldung ab', () => /XXX fehlen/.test(MISS)],
  ['Langtest: drei Regeln, Regel 5 ist Kandidat, die anderen Vergleich', () => Object.keys(RULES).join() === 'flip,donch,r5' && RULES.r5.kind === 'kandidat' && RULES.flip.kind === 'vergleich' && RULES.donch.kind === 'vergleich'],
  ['Langtest: Vergleichsregel wird nie in den Tresor geschickt', () => { const ok = { n: 200, avg: 0.1, pct: 99, wins: 100 }; return /zählt nicht als Kandidat/.test(resultText('flip', { dev: ok, check: ok })) && !/darf einmal in den Tresor/.test(resultText('flip', { dev: ok, check: ok })) && /darf einmal in den Tresor/.test(resultText('r5', { dev: ok, check: ok })) && /abgelegt/.test(resultText('r5', { dev: { n: 200, avg: -0.1, pct: 10, wins: 50 } })); }],
  ['Langtest: Text zum Kopieren nennt Zeiträume, Messlatten und Tresor', () => { const a = resultText('flip', { dev: L2.dev }, '8i'), b = resultText('flip', L2, '8i'); return a.includes('Prüfung: noch nicht angesehen') && a.includes('Tresor: gesperrt') && a.includes('Vergleichsregel') && b.includes('Prüfung: ') && /besser als \d+ % der Durchgänge/.test(b) && resultText('flip', {}) === '' && mean([]) === null; }],
];
