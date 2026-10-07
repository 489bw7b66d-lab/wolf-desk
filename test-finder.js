// Tests für den Setup-Finder (8l, 8l1): core-sellblock.js (Sell-Block, „Platz nach oben“) und core-finder.js (Funde, Gültigkeit, Fib-Lage, RSI, Reihenfolge)
import { sellBlocks, roomAbove, roomText, roomByTf, roomsText, blocksAbove } from './core-sellblock.js';
import { FINDER, BLOCK_NAME, FLAG_NAME, trendNow, liveMarket, findsOf, fibBlockOverlap, sellSets, coinEntry, sortEntries, countByBlock, agoText, vizWithRoom, stillValid, fibPosition, fibText, rsiInfo, rsiText, atLeast, crowdNotes, sinceText, tradeResult, withBias, searchEntries } from './core-finder.js';
import { signalsOf, NEW_RULES } from './core-ltrules.js';
import { LT } from './core-longtest.js';
import { mulberry32 } from './core-randombase.js';
import { panelSvg } from './ui-blindchart.js';

const DAY = 864e5, H4 = 4 * 36e5, near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) < eps;
const cs = (rows) => rows.map(([o, h, l, c]) => ({ o, h, l, c }));
const F = [100, 100.5, 99.5, 100], flat = (k) => Array.from({ length: k }, () => F);
// Swing-Tief 95 an Kerze 6 (bestätigt mit Kerze 11), steigende Kerze 12, Bruch mit Schluss 94 an Kerze 13
const base = [...flat(6), [100, 100.5, 95, 100], ...flat(5), [100, 102, 99.8, 101.5], [101.5, 101.6, 93, 94]];
const one = (rows) => sellBlocks(cs(rows));

// Zufallskurse wie in den Regel-Tests: 4H-Kerzen mit Dochten, Tageskerzen daraus
function synth(seed, from, to) {
  const r = mulberry32(seed), nrm = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const G = []; let p = 100, drift = 0;
  for (let t = from; t + H4 <= to; t += H4) { if (r() < 0.004) drift = (r() - 0.45) * 0.006; const o = p, c = o * Math.exp(drift + 0.012 * nrm()); G.push({ t, T: t + H4 - 1, o, c, h: Math.max(o, c) * (1 + 0.006 * Math.abs(nrm())), l: Math.min(o, c) * (1 - 0.006 * Math.abs(nrm())), v: 100 + 400 * r() }); p = c; }
  const D = []; for (let k = 0; k + 6 <= G.length; k += 6) { const s = G.slice(k, k + 6); D.push({ t: s[0].t, T: s[0].t + DAY - 1, o: s[0].o, c: s[5].c, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), v: s.reduce((a, x) => a + x.v, 0) }); }
  return { G, D };
}
const FROM = Date.UTC(2024, 0, 1), S = synth(7919, FROM, Date.UTC(2025, 6, 1));
const full = liveMarket('AAA', S.D, S.G);
// Markt so abschneiden, dass ein Fund von Regel `rule` genau `ago` Kerzen zurückliegt
function cutAt(rule, ago) {
  const idx = [...signalsOf(rule, full).keys()].filter((i) => i > 1500 && full.dOf[i] + 1 >= LT.minDays);
  const i = idx[Math.floor(idx.length / 2)], n = i + 1 + ago, G = S.G.slice(0, n), D = S.D.filter((d) => d.t + DAY <= G[n - 1].t + H4);
  return { i, M: liveMarket('AAA', D, G) };
}
const c3 = cutAt('r3', 2), c3old = cutAt('r3', FINDER.bars), f3 = findsOf(c3.M);
const e3 = coinEntry('AAA', c3.M);
const fake = (coin, rules, ago = 1) => ({ coin, n: rules.length, finds: rules.map((rule, k) => ({ rule, ago: ago + k })) });
// Ein Stück der Reihe, an dessen Ende noch gültige Sell-Blöcke stehen
const CUT = [900, 1200, 1500, 1800, 2100, 2400, 2700, 3000].find((n) => sellBlocks(S.G.slice(0, n)).length > 0), GB = S.G.slice(0, CUT);
const blocksAll = sellBlocks(GB), blk = blocksAll[blocksAll.length - 1];
// Markt im Abwärtstrend: kein Baustein darf feuern
const DOWN = (() => { const G = []; let p = 500; for (let t = FROM; t + H4 <= FROM + 200 * DAY; t += H4) { const o = p, c = o * 0.9985; G.push({ t, T: t + H4 - 1, o, c, h: o * 1.001, l: c * 0.999, v: 100 }); p = c; } const D = []; for (let k = 0; k + 6 <= G.length; k += 6) { const s = G.slice(k, k + 6); D.push({ t: s[0].t, T: s[0].t + DAY - 1, o: s[0].o, c: s[5].c, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), v: 600 }); } return liveMarket('DWN', D, G); })();

// 8l1: kleiner Markt von Hand für die Gültigkeit (2 Tage = 12 4H-Kerzen, Fund an Kerze 5)
const mini = (closes, dayCloses) => ({ n: closes.length, g: { c: closes }, dOf: closes.map((_, k) => Math.floor(k / 6)), atr: [2, 2, 2], daily: dayCloses.map((c) => ({ c })) });
const C100 = Array(12).fill(100), withAt = (k, v) => C100.map((x, j) => (j === k ? v : x));
const fOB = { rule: 'r6', i: 5, viz: { h: { bands: [[98, 100, 'Körper'], [96, 98, 'Docht']] } } }, fSW = { rule: 'r4', i: 5, viz: { h: { lines: [{ y: 97 }] } } };
const fVW = { rule: 'r3', i: 5, viz: { h: { lines: [{ y: 105, l: 'Woche' }, { y: 99, l: 'Tag', hot: true }] } } }, fKL = { rule: 'r1', i: 5, viz: { h: { bands: [[98, 99, 'Band']] } } }, fFB = { rule: 'r2', i: 5, viz: { d: { lines: [{ y: 97, l: '0,786' }] } } };
// Tageskerzen für die Fib-Lage: Körper-Swing-Tief 100 an Tag 10, Anstieg bis Körper-Oberkante 140,5 an Tag 20 (Dochte gehen weiter)
const FD = Array.from({ length: 30 }, (_, k) => { const m = k <= 10 ? 120 - 2 * k : k <= 20 ? 100 + 4 * (k - 10) : 140 - (k - 20); return { o: m + 0.5, c: m, h: m + 6, l: m - 6 }; }), FA = Array(30).fill(2);
// RSI: zwei Swing-Tiefs im Schlusskurs, das zweite tiefer, aber nach schwächerem Abverkauf
const seg = (a, b, k) => Array.from({ length: k }, (_, j) => a + ((b - a) * (j + 1)) / k);
const DIVC = [...seg(120, 120, 20), ...seg(120, 90, 6), ...seg(90, 104, 10), ...seg(104, 88, 16), ...seg(88, 96, 8)];
const rise = Array.from({ length: 60 }, (_, k) => 100 + k), fall = Array.from({ length: 60 }, (_, k) => 200 - k);
const ent = (coin, rules) => ({ coin, n: rules.length, finds: rules.map((rule) => ({ rule, ago: 1 })) });
// 8m: versteckte Divergenz. Zwei Swing-Tiefs, das zweite HÖHER, aber nach härterem Abverkauf (RSI tiefer).
// Dieselbe Reihe hat an den Hochs eine klassische bärische Divergenz (höheres Hoch, RSI tiefer): beide Angaben stehen nebeneinander.
const HIDC = [...seg(100, 120, 20), ...seg(120, 116, 6), ...seg(116, 140, 10), ...seg(140, 118, 5), ...seg(118, 124, 8)];
export const tests = [
  ['Sell-Block: letzte steigende Kerze vor dem Bruch eines bestätigten Swing-Tiefs, von der Eröffnung bis zum Hoch', () => { const b = one(base); return b.length === 1 && b[0].b === 12 && b[0].bottom === 100 && b[0].body === 101.5 && b[0].top === 102 && b[0].at === 13; }],
  ['Sell-Block: ein Docht über dem Block bricht ihn nicht', () => one([...base, [94, 103, 94, 96]]).length === 1],
  ['Sell-Block: ein Schluss über dem Hoch des Blocks lässt ihn verschwinden', () => one([...base, [94, 103, 94, 96], [96, 103, 96, 102.5]]).length === 0],
  ['Sell-Block: ein Schluss genau auf dem Hoch bricht ihn noch nicht', () => one([...base, [94, 102, 94, 102]]).length === 1],
  ['Sell-Block: vor der Bestätigung des Swing-Tiefs (5 Kerzen) gibt es keinen', () => one([...flat(6), [100, 100.5, 95, 100], ...flat(3), [100, 102, 99.8, 101.5], [101.5, 101.6, 93, 94]]).length === 0],
  ['Sell-Block: ohne Schluss unter dem Swing-Tief gibt es keinen (Docht darunter reicht nicht)', () => one([...flat(6), [100, 100.5, 95, 100], ...flat(5), [100, 102, 99.8, 101.5], [101.5, 101.6, 93, 96]]).length === 0],
  ['Sell-Block: ohne steigende Kerze davor gibt es keinen', () => one([...flat(6), [100, 100.5, 95, 100], ...flat(5), [100, 100.2, 93, 94]]).length === 0],
  ['Sell-Block: auf Zufallskursen ist jeder gemeldete Block ungebrochen und stammt von einer steigenden Kerze vor seinem Bruch', () => blocksAll.length > 0 && blocksAll.every((b) => GB[b.b].c > GB[b.b].o && b.b < b.at && near(b.bottom, GB[b.b].o) && near(b.top, GB[b.b].h) && GB.slice(b.at).every((c) => !(c.c > b.top)))],
  ['Sell-Block: schaut nicht in die Zukunft (abgeschnittene Reihe meldet denselben Block, solange er noch gilt)', () => { const part = sellBlocks(GB.slice(0, blk.at + 1)); return part.some((b) => b.b === blk.b && b.at === blk.at) && sellBlocks(GB.slice(0, blk.at)).every((b) => b.b !== blk.b); }],
  ['Platz nach oben: kein Block über dem Kurs heißt frei; ein Block ganz unter dem Kurs zählt nicht', () => roomAbove(100, [{ tf: '4H', blocks: [] }], 2).state === 'frei' && roomAbove(100, [{ tf: 'Tag', blocks: [{ bottom: 90, top: 95 }] }], 2).state === 'frei'],
  ['Platz nach oben: Abstand bis zur Unterkante in R, mit Zeitebene', () => { const r = roomAbove(100, [{ tf: 'Tag', blocks: [{ bottom: 103, top: 105 }] }], 2); return r.state === 'weg' && near(r.r, 1.5) && r.tf === 'Tag' && roomText(r) === 'Platz nach oben: 1,5 R bis Sell-Block (Tag)'; }],
  ['Platz nach oben: der nächste Block gewinnt, egal auf welcher Zeitebene', () => { const r = roomAbove(100, [{ tf: '4H', blocks: [{ bottom: 108, top: 109 }] }, { tf: 'Tag', blocks: [{ bottom: 104, top: 106 }] }, { tf: 'Woche', blocks: [{ bottom: 120, top: 130 }] }], 2); return r.tf === 'Tag' && near(r.r, 2); }],
  ['Platz nach oben: steht der Kurs im Block, wird das gesagt', () => { const r = roomAbove(104.5, [{ tf: 'Woche', blocks: [{ bottom: 104, top: 106 }] }], 2); return r.state === 'im' && roomText(r) === 'Kurs im Sell-Block (Woche)'; }],
  ['Platz nach oben: Text für frei', () => /frei/.test(roomText({ state: 'frei' })) && roomText(null) === ''],
  ['Finder: fünf Bausteine, die festgeschriebenen Regeln', () => NEW_RULES.every((r) => BLOCK_NAME[r]) && Object.keys(BLOCK_NAME).join() === 'r1,r2,r3,r4,r6'],
  ['Finder: ein Fund in den letzten 24 Stunden (6 Kerzen) wird gemeldet, mit Alter', () => { const f = f3.find((x) => x.rule === 'r3'); return !!f && f.i === c3.i && f.ago === 2 && f.t === c3.M.g.t[c3.i] + H4 && !!f.viz && !!f.mk; }],
  ['Finder: ein Fund, der 6 Kerzen zurückliegt, zählt nicht mehr als aktuell', () => !findsOf(c3old.M).some((x) => x.rule === 'r3' && x.i === c3old.i)],
  ['Finder: je Baustein nur der jüngste Fund', () => f3.length === new Set(f3.map((x) => x.rule)).size && f3.every((x) => [...signalsOf(x.rule, c3.M).keys()].every((i) => i <= x.i || i < c3.M.n - FINDER.bars))],
  ['Finder: der Fund ist derselbe, den die abgenommene Regel liefert (keine eigene Fassung)', () => f3.every((x) => signalsOf(x.rule, c3.M).get(x.i).mk === x.mk)],
  ['Finder: Tagestrend entscheidet, ob ein Markt überhaupt geprüft wird', () => { const up = Array.from({ length: 150 }, (_, k) => ({ c: 100 + k })), dn = Array.from({ length: 150 }, (_, k) => ({ c: 300 - k })); return trendNow(up) === true && trendNow(dn) === false && trendNow(up.slice(0, LT.minDays - 1)) === false && trendNow(null) === false; }],
  ['Finder: Eintrag nennt Bausteine, Kurs, R (2 × Tages-ATR) und Platz nach oben, aber keinen Score und keine Trefferquote', () => { const d = c3.M.dOf[c3.M.n - 1]; return !!e3 && e3.n === e3.finds.length && near(e3.R, 2 * c3.M.atr[d]) && ['frei', 'im', 'weg'].includes(e3.room.state) && !('score' in e3) && !('winRate' in e3) && !('r' in e3) && e3.price === c3.M.g.c[c3.M.n - 1]; }],
  ['Finder: im Abwärtstrend feuert kein Baustein; den Eintrag gibt es trotzdem, mit null Bausteinen (für die Filter Fib-Lage und RSI)', () => { const e = coinEntry('DWN', DOWN); return findsOf(DOWN).length === 0 && !!e && e.n === 0 && e.finds.length === 0 && e.rooms.length === 3 && trendNow(DOWN.daily) === false; }],
  ['Finder: Sell-Blöcke auf 4H, Tag und Woche; die Woche zählt nur abgeschlossene Wochen', () => { const s = sellSets(c3.M, S.D); return s.map((x) => x.tf).join() === '4H,Tag,Woche' && s.every((x) => Array.isArray(x.blocks)); }],
  ['Finder: sortiert wird nach der Zahl der Bausteine, dann nach dem frischeren Fund, dann nach dem Namen', () => sortEntries([fake('B', ['r3'], 3), fake('C', ['r1', 'r6'], 5), fake('A', ['r3'], 1), fake('D', ['r4'], 1)]).map((e) => e.coin).join('') === 'CADB'],
  ['Finder: Zähler je Baustein', () => { const c = countByBlock([fake('A', ['r1', 'r3']), fake('B', ['r3']), fake('C', ['r6'])]); return c.r1 === 1 && c.r3 === 2 && c.r6 === 1 && c.r2 === 0 && c.r4 === 0; }],
  ['Finder: „Order Block in der Fib-Zone“ nur, wenn beide Bausteine da sind und sich am Preis überschneiden', () => { const fib = (lo, hi) => ({ rule: 'r2', viz: { h: { bands: [[lo, hi, 'Zone']] } } }), ob = { rule: 'r6', viz: { h: { bands: [[98, 100, 'Körper'], [96, 98, 'Docht']] } } }; return fibBlockOverlap([fib(99, 103), ob]) === true && fibBlockOverlap([fib(101, 103), ob]) === false && fibBlockOverlap([ob]) === false && fibBlockOverlap([fib(99, 103)]) === false; }],
  ['Finder: nur 4H-Sell-Blöcke kommen ins Bild, und nur wenn sie nah liegen; die Zeichenhilfe der Regel bleibt unverändert', () => { const f = { viz: { h: { from: 0, bands: [[1, 2, 'Zone']] } } }; const a = vizWithRoom(f, { price: 100, R: 2, sell4h: [{ bottom: 104, top: 106 }, { bottom: 110, top: 112 }] }), c = vizWithRoom(f, { price: 100, R: 2, sell4h: [], rooms: [{ tf: 'Woche', state: 'im', bottom: 90, top: 120 }] }); return a.h.bands.length === 2 && a.h.bands[1][3] === 'bad' && a.h.bands[1][2] === 'Sell 4H' && c.h.bands.length === 1 && f.viz.h.bands.length === 1; }],
  ['Finder: das rote Band beginnt an der Kerze, aus der der Sell-Block stammt, und der Kurs von jetzt steht als Linie im Bild', () => { const M = { g: { n: 4, t: [10, 20, 30, 40] } }, f = { ago: 2, viz: { h: { from: 0, bands: [] } } }, v = vizWithRoom(f, { M, price: 100, R: 2, sell4h: [{ bottom: 101, top: 102, t: 30 }] }); const s0 = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'x', 'bad', 10]] }), s1 = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'x', 'bad']] }); return v.h.bands[0][4] === 2 && v.h.lines.some((L) => L.l === 'jetzt' && L.y === 100) && !vizWithRoom({ ago: 0, viz: { h: { bands: [] } } }, { price: 100, R: 2, sell4h: [] }).h.lines && /<rect x="0"/.test(s1) && !/<rect x="0" y/.test(s0); }],
  ['Finder: der Sell-Block erscheint im Bild in Rot, das Level des Bausteins in Gold', () => { const s = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'Zone'], [1.8, 2, 'Sell Tag', 'bad']] }); return s.includes('var(--bad);opacity') && s.includes('var(--gold);opacity') && s.includes('Sell Tag'); }],
  ['Finder: Altersangabe in Stunden', () => agoText(0, 3 * 36e5) === 'vor 3 Std.' && agoText(0, 10 * 60e3) === 'gerade eben'],
  ['8l1 Platz nach oben je Zeitebene: Reihenfolge Woche, Tag, 4H, jede für sich', () => { const r = roomByTf(100, [{ tf: '4H', blocks: [{ bottom: 102, top: 103 }] }, { tf: 'Tag', blocks: [] }, { tf: 'Woche', blocks: [{ bottom: 95, top: 110 }] }], 2); return r.map((x) => x.tf).join() === 'Woche,Tag,4H' && r[0].state === 'im' && r[1].state === 'frei' && r[2].state === 'weg' && near(r[2].r, 1); }],
  ['8l1 Platz nach oben je Zeitebene: Text nennt alle drei, oder „frei“ wenn nirgends ein Block liegt', () => roomsText(roomByTf(100, [{ tf: '4H', blocks: [{ bottom: 102, top: 103 }] }, { tf: 'Woche', blocks: [{ bottom: 95, top: 110 }] }], 2)) === 'Platz nach oben · Woche: Kurs im Block · Tag: frei · 4H: 1,0 R' && /frei \(kein Sell-Block/.test(roomsText(roomByTf(100, [], 2))) && roomsText(null) === ''],
  ['8l1 Sell-Blöcke fürs Bild: nur über dem Kurs, der nächste zuerst, höchstens zwei', () => { const b = blocksAbove(100, [{ bottom: 120, top: 121 }, { bottom: 90, top: 95 }, { bottom: 103, top: 104 }, { bottom: 110, top: 111 }]); return b.length === 2 && b[0].bottom === 103 && b[1].bottom === 110 && blocksAbove(100, null).length === 0; }],
  ['8l1 Gültigkeit Order Block: überholt, sobald eine 4H-Kerze nach dem Fund unter dem Tief des Blocks schließt', () => stillValid(fOB, mini(C100, [100, 100])) && stillValid(fOB, mini(withAt(8, 96.5), [100, 100])) && !stillValid(fOB, mini(withAt(8, 95.9), [100, 100]))],
  ['8l1 Gültigkeit: Kerzen bis zur Signalkerze zählen nicht (nur was danach kam)', () => stillValid(fOB, mini(withAt(4, 90), [100, 100])) && stillValid(fOB, mini(withAt(5, 90), [100, 100]))],
  ['8l1 Gültigkeit Sweep: überholt bei 4H-Schluss unter dem Sweep-Tief', () => stillValid(fSW, mini(withAt(9, 97), [100, 100])) && !stillValid(fSW, mini(withAt(9, 96.9), [100, 100]))],
  ['8l1 Gültigkeit VWAP: überholt bei 4H-Schluss mehr als eine halbe Tages-ATR unter dem auslösenden Level', () => stillValid(fVW, mini(withAt(7, 98), [100, 100])) && !stillValid(fVW, mini(withAt(7, 97.9), [100, 100]))],
  ['8l1 Gültigkeit Key-Level: überholt erst bei Tagesschluss unter dem Band (4H darunter reicht nicht)', () => stillValid(fKL, mini(withAt(7, 90), [100, 98.5])) && !stillValid(fKL, mini(C100, [100, 97.9]))],
  ['8l1 Gültigkeit Fib-Rücklauf: überholt bei Tagesschluss unter 0,786', () => stillValid(fFB, mini(C100, [100, 97])) && !stillValid(fFB, mini(C100, [100, 96.9]))],
  ['8l1 Eintrag: nur gültige Funde zählen, überholte werden mitgezählt, und jeder Fund trägt „seit der Signalkerze“ in R', () => { const all = findsOf(c3.M); return e3.n + e3.stale === all.length && e3.finds.every((f) => stillValid(f, c3.M) && near(f.since, (e3.price - c3.M.g.c[f.i]) / e3.R)); }],
  ['8l1 Fib-Lage: Anker an den Kerzenkörpern (Körper-Unterkante des Swing-Tiefs, höchste Körper-Oberkante), nicht an den Dochten', () => { const x = fibPosition(FD, FA, 126); return !!x && x.lo === 100 && x.hi === 140.5 && x.lowAt === 10 && x.highAt === 20 && near(x.f, 14.5 / 40.5) && x.zone === 'über 0,382' && !x.gp && !x.inZone; }],
  ['8l1 Fib-Lage: Golden Pocket von 0,618 bis 0,65, mit Text', () => { const x = fibPosition(FD, FA, 114.6), y = fibPosition(FD, FA, 118), z = fibPosition(FD, FA, 110); return x.gp && x.inZone && x.zone === 'Golden Pocket' && !y.gp && y.inZone && y.zone === '0,5 bis 0,618' && !z.gp && z.zone === 'unter dem Golden Pocket' && fibText(x) === 'Fib: Kurs bei 0,64 des letzten Anstiegs · Golden Pocket' && fibText(null) === ''; }],
  ['8l1 Fib-Lage: ein zu kleiner Anstieg (unter 6 Tages-ATR) zählt nicht, ein Kurs unter dem Tief auch nicht', () => fibPosition(FD, Array(30).fill(7), 126) === null && fibPosition(FD, FA, 99) === null && fibPosition([], [], 100) === null],
  ['8l1 Fib-Lage: wartet nicht auf die Bestätigung des Hochs (Zustand, kein Auslöser)', () => { const x = fibPosition(FD.slice(0, 22), FA, 125); return !!x && x.hi === 140.5 && x.highAt === 20; }],
  ['8l1 RSI: überkauft nach einem langen Anstieg, überverkauft nach einem langen Abstieg, sonst ohne Zusatz', () => rsiInfo(rise).state === 'überkauft' && rsiInfo(fall).state === 'überverkauft' && rsiInfo(DIVC).state === '' && rsiInfo([1, 2, 3]) === null],
  ['8l1 RSI: bullische Divergenz = tieferes Tief im Schlusskurs, höheres Tief im RSI', () => rsiInfo(DIVC).div === 'bullische Divergenz'],
  ['8l1 RSI: bärische Divergenz ist das Spiegelbild', () => rsiInfo(DIVC.map((x) => 300 - x)).div === 'bärische Divergenz'],
  ['8l1 RSI: ohne zweites Swing-Tief keine Divergenz', () => rsiInfo(rise).div === null],
  ['8l1 RSI: Text nennt den Tag zuerst, dann 4H', () => rsiText({ now: 28.4, state: 'überverkauft', div: 'bullische Divergenz' }, { now: 51, state: '', div: null }) === 'RSI · Tag 28 überverkauft · bullische Divergenz · 4H 51' && rsiText(null, null) === ''],
  ['8l1 Filter: Golden Pocket, RSI überverkauft und bullische Divergenz, als Merkmale am Eintrag', () => Object.keys(FLAG_NAME).join() === 'gp,os,div' && ['gp', 'os', 'div'].every((k) => typeof e3.flags[k] === 'boolean')],
  ['8l1 Ansicht: „ab 2 Bausteinen“ ist die Voreinstellung', () => FINDER.minBlocks === 2 && atLeast([ent('A', ['r3']), ent('B', ['r3', 'r6']), ent('C', [])], 2).map((e) => e.coin).join() === 'B' && atLeast(null, 1).length === 0],
  ['8l1 Marktbewegung: Hinweis, wenn ein Baustein bei mehr als einem Drittel der geprüften Märkte auslöst', () => { const l = [ent('A', ['r3']), ent('B', ['r3']), ent('C', ['r4']), ent('D', [])]; const a = crowdNotes(l, 4), b = crowdNotes(l, 6); return a.length === 1 && /VWAP löst gerade bei 2 von 4 Märkten aus/.test(a[0]) && b.length === 0 && crowdNotes(l, 0).length === 0; }],
  ['8l1 Seit der Signalkerze: Angabe in R mit Vorzeichen', () => sinceText(0.84) === 'seit der Signalkerze +0,8 R' && sinceText(-1.26) === 'seit der Signalkerze −1,3 R' && sinceText(0.02) === 'seit der Signalkerze ±0,0 R' && sinceText(null) === ''],
  ['8l1 Reihenfolge: Coins ohne Baustein stehen hinten', () => sortEntries([ent('Z', []), ent('B', ['r3']), ent('A', [])]).map((e) => e.coin).join('') === 'BAZ'],
  ['8l1 VWAP-Bild: nur das auslösende Level behält seinen Namen', () => { const v = vizWithRoom({ rule: 'r3', ago: 0, viz: { h: { lines: [{ y: 105, l: 'Woche' }, { y: 99, l: 'Tag', hot: true }] } } }, { price: 100, R: 2, sell4h: [] }); return v.h.lines.length === 2 && !v.h.lines[0].l && v.h.lines[1].l === 'Tag' && v.h.lines[1].hot; }],
  ['8l1 Bild: Beschriftungen, die übereinander lägen, werden auseinandergeschoben', () => { const s = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { lines: [{ y: 1.5, l: 'eins' }, { y: 1.501, l: 'zwei' }, { y: 1.502, l: 'drei' }] }); const ys = [...s.matchAll(/<text[^>]* y="([\d.]+)"[^>]*>(eins|zwei|drei)</g)].map((m) => Number(m[1])).sort((a, b) => a - b); return ys.length === 3 && ys[1] - ys[0] >= 9.4 && ys[2] - ys[1] >= 9.4; }],
  ['8l1 Trade-Karte: Übernahme als Long zum Kurs, Stop 2 × Tages-ATR darunter, Ziele bei 2R, 3R, 4R und 6R', () => { const r = tradeResult({ coin: 'AAA', price: 100, R: 4, finds: [{ rule: 'r6' }, { rule: 'r3' }] }, null, [2, 3, 4, 6]); const p = r.plan; return r.coin === 'AAA' && p.dir === 'long' && p.entry === 100 && p.stop === 96 && p.R === 4 && near(p.stopDistPct, 4) && p.tps.join() === '108,112,116,124' && p.zone.join() === '100,100'; }],
  ['8l1 Trade-Karte: als Beobachtung gekennzeichnet, ohne Score, mit den Namen der Bausteine', () => { const r = tradeResult({ coin: 'AAA', price: 100, R: 4, finds: [{ rule: 'r6' }, { rule: 'r3' }] }); return r.finder === true && r.total.long === 0 && r.total.short === 0 && r.blocks.join() === 'Order Block,VWAP' && /Beobachtung/.test(r.plan.entryMode) && !('score' in r); }],
  ['8l1 Trade-Karte: der Live-Kurs geht vor, R bleibt der Rahmen-Abstand', () => { const r = tradeResult({ coin: 'AAA', price: 100, R: 4, finds: [] }, 102); return r.plan.entry === 102 && r.plan.stop === 98 && r.blocks.length === 0; }],
  ['8l1 Trade-Karte: ohne R oder mit Stop unter null gibt es keinen Plan', () => tradeResult(null) === null && tradeResult({ coin: 'A', price: 100, R: 0 }) === null && tradeResult({ coin: 'A', price: 3, R: 4 }) === null],
  ['8m RSI: versteckte bullische Divergenz = höheres Tief im Schlusskurs, tieferes Tief im RSI', () => { const x = rsiInfo(HIDC); return x.divs.join() === 'versteckte bullische Divergenz,bärische Divergenz' && x.div === 'bärische Divergenz'; }],
  ['8m RSI: versteckte bärische Divergenz ist das Spiegelbild (tieferes Hoch im Kurs, höheres im RSI)', () => rsiInfo(HIDC.map((x) => 300 - x)).divs.includes('versteckte bärische Divergenz')],
  ['8m RSI: die klassische Divergenz bleibt die Hauptangabe, und der Filter „bullische Divergenz“ meint nur die klassische', () => rsiInfo(DIVC).div === 'bullische Divergenz' && rsiInfo(DIVC).divs[0] === 'bullische Divergenz' && !rsiInfo(HIDC).div.startsWith('bullische') && rsiInfo([...seg(100, 120, 20), ...seg(120, 116, 6), ...seg(116, 119, 10), ...seg(119, 117, 5), ...seg(117, 118, 8)]).div === 'versteckte bullische Divergenz'],
  ['8m RSI: der Text nennt alle Angaben einer Zeitebene', () => rsiText({ now: 55, state: '', div: 'bärische Divergenz', divs: ['versteckte bullische Divergenz', 'bärische Divergenz'] }, null) === 'RSI · Tag 55 · versteckte bullische Divergenz · bärische Divergenz'],
  ['8m Coin-Bias: Stärke gegen BTC über 30 Tage kommt an den Eintrag, der Eintrag selbst bleibt unverändert', () => { const btc = c3.M.daily.map((d) => ({ ...d, c: 100 })); const e = withBias(e3, btc); return e.up === true && Number.isFinite(e.vsBtc) && e.n === e3.n && !('vsBtc' in e3) && withBias(e3, null).vsBtc === null && withBias(null, btc) === null; }],
  ['8m Suche: findet über alle geprüften Märkte, Groß- und Kleinschreibung egal, auch Teilnamen', () => { const l = [ent('SUI', []), ent('kPEPE', ['r3']), ent('HBAR', [])]; return searchEntries(l, 'su').map((e) => e.coin).join() === 'SUI' && searchEntries(l, 'PEPE').length === 1 && searchEntries(l, ' ').length === 3 && searchEntries(l, 'xyz').length === 0 && searchEntries(null, 'a').length === 0; }],
];
