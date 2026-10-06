// Tests für core-longtest.js (8i: Messmaschine für den Testplan, nur Messung)
import { LT, RULES, prepare, entryTime, simAt, fireFlip, fireDonch, fireR5, fireOf, marketSwitch, runRule, monthOf, monthLabel, randomMatched, monthSpan, periodResult, passA, passB, verdict, runLongTest, resultText, mean } from './core-longtest.js';
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
const RA = randomMatched(M, TF, STICH, ALL, 12), RB = randomMatched(M, TF, STICH, ALL, 12), RDEV = randomMatched(M, TFdev, STICH, ['dev'], 12);
const cnt = (list, per) => list.filter((t) => t.per === per).length;
const SW = marketSwitch({ AAA: D, BBB: B.D, CCC: C.D });
const T5 = runRule(M, fireOf('r5', SW), STICH, ALL);
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
  ['Langtest: spätestens nach 10 Tagen ist jeder Trade zu', () => [...TF, ...TD, ...T5].every((t) => t.x - t.t <= 10 * DAY) && [...TF, ...TD].some((t) => t.out === 'zeit' && t.x - t.t === 10 * DAY)],
  ['Langtest: kein Einstieg ohne 110 Tage Historie', () => simAt(M, 6 * 108) === null && simAt(M, 6 * 111) !== null && TF.every((t) => t.t >= FROM + 110 * DAY)],
  ['Langtest: kein Einstieg an der letzten Kerze (keine Folgekerze)', () => simAt(M, M.n - 1) === null],
  ['Langtest: „Neu im Trend“ deckt sich mit der Regel der App', () => flips.length > 5 && flipSame],
  ['Langtest: Donchian deckt sich mit der Regel der App und feuert nur am Tagesschluss', () => donchs.length > 5 && donchSame && donchs.every((i) => (G[i].t + H4) % DAY === 0)],
  ['Langtest: ein offener Trade je Markt', () => [TF, TD, T5].every((L) => L.length > 3 && L.every((t, k) => k === 0 || t.t >= L[k - 1].x))],
  ['Langtest: Trades zählen nach Einstiegsdatum, Sperrfrist und Tresor bleiben leer', () => TF.every((t) => t.per === periodOf(t.t, STICH) && (t.per === 'dev' || t.per === 'check') && t.t < P.lastEntry) && cnt(TF, 'dev') > 0 && cnt(TF, 'check') > 0],
  ['Langtest: ohne geöffnete Prüfung wird nur die Entwicklung gerechnet', () => TFdev.length === cnt(TF, 'dev') && TFdev.every((t) => t.t < P.dev[1]) && RDEV.check === undefined && L1.check === undefined],
  ['Langtest: Zufall hat je Monat so viele Einstiege wie die Regel', () => [...Array(12).keys()].every((d) => RA.dev.n[d] === cnt(TF, 'dev') && RA.check.n[d] === cnt(TF, 'check'))],
  ['Langtest: Zufall ist wiederholbar und je Durchgang verschieden', () => RA.dev.s.join() === RB.dev.s.join() && new Set([...RA.dev.s].map((x) => x.toFixed(6))).size > 6],
  ['Langtest: Zufall der Entwicklung ändert sich nicht, wenn die Prüfung dazukommt', () => near(L1.dev.rndAvg, L2.dev.rndAvg, 1e-12) && near(L1.dev.avg, L2.dev.avg, 1e-12) && L1.dev.n === L2.dev.n],
  ['Langtest: Monat aus der Zeit (UTC)', () => monthOf(Date.UTC(2023, 11, 31, 23)) === 2023 * 12 + 11 && monthOf(Date.UTC(2024, 0, 1)) === 2024 * 12 && monthLabel(2024 * 12) === '01.2024'],
  ['Langtest: Schalter Regel 5: Schnitt der 28-Tage-Veränderung über die Märkte, die es gab', () => { const up = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 100 + i })), dn = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 100 - i })), dn2 = [...Array(40)].map((_, i) => ({ t: i * DAY, c: 200 - 4 * i })); return marketSwitch({ a: up }).get(30 * DAY) === true && marketSwitch({ a: dn }).get(30 * DAY) === false && marketSwitch({ a: up, b: dn2 }).get(30 * DAY) === false && marketSwitch({ a: up }).get(27 * DAY) === undefined && marketSwitch({ a: up, b: dn.slice(0, 20) }).get(30 * DAY) === true; }],
  ['Langtest: Regel 5 steigt nur ein, wenn der Schalter an ist', () => T5.every((t) => { const i = (t.t - H4 - G[0].t) / H4; return SW.get(D[M.dOf[i]].t) === true; }) && idx.some((i) => M.dOf[i] > 200 && SW.get(D[M.dOf[i]].t) === false)],
  ['Langtest: Regel 5 würfelt wiederholbar', () => runRule(market('AAA', 0.1).M, fireOf('r5', SW), STICH, ALL).map((t) => t.t).join() === T5.map((t) => t.t).join() && fireR5(M, 3, SW) === false],
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
  ['Langtest: Donchian und Regel 5 laufen durch', () => LD.dev.n > 5 && L5.dev.n > 5 && L5.check.n > 0 && Number.isFinite(L5.dev.pct) && Number.isFinite(LD.dev.rndAvg)],
  ['Langtest: fehlende Kerzen brechen den Lauf mit klarer Meldung ab', () => /XXX fehlen/.test(MISS)],
  ['Langtest: drei Regeln, Regel 5 ist Kandidat, die anderen Vergleich', () => Object.keys(RULES).join() === 'flip,donch,r5' && RULES.r5.kind === 'kandidat' && RULES.flip.kind === 'vergleich' && RULES.donch.kind === 'vergleich'],
  ['Langtest: Vergleichsregel wird nie in den Tresor geschickt', () => { const ok = { n: 200, avg: 0.1, pct: 99, wins: 100 }; return /zählt nicht als Kandidat/.test(resultText('flip', { dev: ok, check: ok })) && !/darf einmal in den Tresor/.test(resultText('flip', { dev: ok, check: ok })) && /darf einmal in den Tresor/.test(resultText('r5', { dev: ok, check: ok })) && /abgelegt/.test(resultText('r5', { dev: { n: 200, avg: -0.1, pct: 10, wins: 50 } })); }],
  ['Langtest: Text zum Kopieren nennt Zeiträume, Messlatten und Tresor', () => { const a = resultText('flip', { dev: L2.dev }, '8i'), b = resultText('flip', L2, '8i'); return a.includes('Prüfung: noch nicht angesehen') && a.includes('Tresor: gesperrt') && a.includes('Vergleichsregel') && b.includes('Prüfung: ') && /besser als \d+ % der Durchgänge/.test(b) && resultText('flip', {}) === '' && mean([]) === null; }],
];
