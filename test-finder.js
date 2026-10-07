// Tests für den Setup-Finder (8l): core-sellblock.js (Sell-Block, „Platz nach oben“) und core-finder.js (aktuelle Funde, Reihenfolge)
import { sellBlocks, roomAbove, roomText } from './core-sellblock.js';
import { FINDER, BLOCK_NAME, trendNow, liveMarket, findsOf, fibBlockOverlap, sellSets, coinEntry, sortEntries, countByBlock, agoText, vizWithRoom } from './core-finder.js';
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
  ['Finder: im Abwärtstrend feuert kein Baustein, und ohne Fund gibt es keinen Eintrag', () => findsOf(DOWN).length === 0 && coinEntry('DWN', DOWN) === null && trendNow(DOWN.daily) === false],
  ['Finder: Sell-Blöcke auf 4H, Tag und Woche; die Woche zählt nur abgeschlossene Wochen', () => { const s = sellSets(c3.M, S.D); return s.map((x) => x.tf).join() === '4H,Tag,Woche' && s.every((x) => Array.isArray(x.blocks)); }],
  ['Finder: sortiert wird nach der Zahl der Bausteine, dann nach dem frischeren Fund, dann nach dem Namen', () => sortEntries([fake('B', ['r3'], 3), fake('C', ['r1', 'r6'], 5), fake('A', ['r3'], 1), fake('D', ['r4'], 1)]).map((e) => e.coin).join('') === 'CADB'],
  ['Finder: Zähler je Baustein', () => { const c = countByBlock([fake('A', ['r1', 'r3']), fake('B', ['r3']), fake('C', ['r6'])]); return c.r1 === 1 && c.r3 === 2 && c.r6 === 1 && c.r2 === 0 && c.r4 === 0; }],
  ['Finder: „Order Block in der Fib-Zone“ nur, wenn beide Bausteine da sind und sich am Preis überschneiden', () => { const fib = (lo, hi) => ({ rule: 'r2', viz: { h: { bands: [[lo, hi, 'Zone']] } } }), ob = { rule: 'r6', viz: { h: { bands: [[98, 100, 'Körper'], [96, 98, 'Docht']] } } }; return fibBlockOverlap([fib(99, 103), ob]) === true && fibBlockOverlap([fib(101, 103), ob]) === false && fibBlockOverlap([ob]) === false && fibBlockOverlap([fib(99, 103)]) === false; }],
  ['Finder: der Sell-Block wird nur eingezeichnet, wenn er nah liegt, und die Zeichenhilfe der Regel bleibt unverändert', () => { const f = { viz: { h: { from: 0, bands: [[1, 2, 'Zone']] } } }, nearE = { price: 100, R: 2, room: { state: 'weg', tf: 'Tag', bottom: 104, top: 106 } }, farE = { price: 100, R: 2, room: { state: 'weg', tf: 'Tag', bottom: 110, top: 112 } }; const a = vizWithRoom(f, nearE), b = vizWithRoom(f, farE), c = vizWithRoom(f, { price: 100, R: 2, room: { state: 'frei' } }); return a.h.bands.length === 2 && a.h.bands[1][3] === 'bad' && /Sell Tag/.test(a.h.bands[1][2]) && b.h.bands.length === 1 && c.h.bands.length === 1 && f.viz.h.bands.length === 1; }],
  ['Finder: das rote Band beginnt an der Kerze, aus der der Sell-Block stammt, und der Kurs von jetzt steht als Linie im Bild', () => { const M = { g: { n: 4, t: [10, 20, 30, 40] } }, f = { ago: 2, viz: { h: { from: 0, bands: [] } } }, v = vizWithRoom(f, { M, price: 100, R: 2, room: { state: 'weg', tf: '4H', bottom: 101, top: 102, t: 30 } }); const s0 = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'x', 'bad', 10]] }), s1 = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'x', 'bad']] }); return v.h.bands[0][4] === 2 && v.h.lines.some((L) => L.l === 'jetzt' && L.y === 100) && !vizWithRoom({ ago: 0, viz: { h: { bands: [] } } }, { price: 100, R: 2, room: { state: 'frei' } }).h.lines && /<rect x="0"/.test(s1) && !/<rect x="0" y/.test(s0); }],
  ['Finder: der Sell-Block erscheint im Bild in Rot, das Level des Bausteins in Gold', () => { const s = panelSvg(() => ({ o: 1, h: 2, l: 0.5, c: 1.5 }), 0, 20, { bands: [[1, 1.2, 'Zone'], [1.8, 2, 'Sell Tag', 'bad']] }); return s.includes('var(--bad);opacity') && s.includes('var(--gold);opacity') && s.includes('Sell Tag'); }],
  ['Finder: Altersangabe in Stunden', () => agoText(0, 3 * 36e5) === 'vor 3 Std.' && agoText(0, 10 * 60e3) === 'gerade eben'],
];
