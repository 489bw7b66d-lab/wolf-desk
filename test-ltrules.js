// Tests für core-ltrules.js (8k: Regeln 1, 2, 3, 4 und 6 des Testplans, nur Messung) und ihren Anschluss an die Messmaschine
import { LTR, NEW_RULES, trendUp, signalsOf, countTouches, weekKey, monthKey, markerTable, gapTimes } from './core-ltrules.js';
import { LT, RULES, prepare, runRule, fireOf, preOf, canEnter, entryTime, randomSameCandle, periodResult, verdict, resultText, blindSample, blindOk, marketYears, fireFlip } from './core-longtest.js';
import { mulberry32 } from './core-randombase.js';
import { pack, periods, periodOf } from './core-binance.js';
import { reversalPoint } from './core-engine2.js';
import { gapsText } from './core-longtest.js';
import { blindHtml, panelSvg } from './ui-blindchart.js';
import { longTestText } from './ui-export.js';

const DAY = 864e5, H4 = 4 * 36e5, S = 5;
const near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) < eps;
const STICH = Date.UTC(2026, 9, 6), FROM = Date.UTC(2020, 0, 1);

// ---- Zufallskurse ohne Vorteil: 4H-Kerzen mit Dochten, Tageskerzen daraus zusammengesetzt (Eröffnung = Schluss davor) ----
function synth(seed, from, to) {
  const r = mulberry32(seed), nrm = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const G = []; let p = 100, drift = 0;
  for (let t = from; t + H4 <= to; t += H4) {
    if (r() < 0.004) drift = (r() - 0.45) * 0.006;
    const o = p, c = o * Math.exp(drift + 0.012 * nrm());
    G.push({ t, T: t + H4 - 1, o, c, h: Math.max(o, c) * (1 + 0.006 * Math.abs(nrm())), l: Math.min(o, c) * (1 - 0.006 * Math.abs(nrm())), v: 100 + 400 * r() }); p = c;
  }
  const D = [];
  for (let k = 0; k + 6 <= G.length; k += 6) { const s = G.slice(k, k + 6); D.push({ t: s[0].t, T: s[0].t + DAY - 1, o: s[0].o, c: s[5].c, h: Math.max(...s.map((x) => x.h)), l: Math.min(...s.map((x) => x.l)), v: s.reduce((a, x) => a + x.v, 0) }); }
  return { G, D };
}
const TO = Date.UTC(2022, 6, 1);
const mk = (coin, seed, to = TO) => { const { G, D } = synth(seed, FROM, to); return { coin, G, D, M: prepare(coin, D, pack(G)) }; };
const X = mk('AAA', 7919), Y = mk('BBB', 15838), Z = mk('CCC', 23757);
const ALLM = [X, Y, Z];
const sig = (rule, m = X) => signalsOf(rule, m.M);
const keys = (rule, m = X) => [...sig(rule, m).keys()];

// „Schaut nicht in die Zukunft“: Signale auf der abgeschnittenen Reihe = Signale auf der vollen Reihe (bis zum Schnitt)
function causal(rule, m = X) {
  return [0.45, 0.8].every((q) => {
    const cut = Math.floor(m.G.length * q), G = m.G.slice(0, cut), D = m.D.filter((d) => d.t + DAY <= G[cut - 1].t + H4);
    const part = signalsOf(rule, prepare(m.coin, D, pack(G))), full = sig(rule, m);
    const a = [...part.entries()].map(([i, s]) => i + JSON.stringify(s.mk)).join('|'), b = [...full.entries()].filter(([i]) => i < cut).map(([i, s]) => i + JSON.stringify(s.mk)).join('|');
    return part.size > 0 && a === b;
  });
}

// ---- Kleine handgebaute Märkte (nur 4H; Tagestrend, ATR künstlich) ----
const T0 = Date.UTC(2021, 0, 4);
function mini(rows, { up = true } = {}) { // rows: [o, h, l, c]
  const n = rows.length, col = (j) => Float64Array.from(rows, (r) => r[j]);
  const g = { n, t: Float64Array.from(rows, (_, i) => T0 + i * H4), o: col(0), h: col(1), l: col(2), c: col(3), v: new Float32Array(n).fill(1) };
  return { coin: 'X', g, n, daily: [{ t: T0 - DAY, o: 100, h: 100, l: 100, c: 100, v: 1 }], dOf: new Int32Array(n), fast: [up ? 2 : 1], slow: [up ? 1 : 2], atr: [1], sims: new Map() };
}
const flat = [100, 100.5, 99.5, 100], F = (k) => Array.from({ length: k }, () => flat);
const hits = (rule, rows, o) => [...signalsOf(rule, mini(rows, o)).entries()].map(([i, s]) => [i, s.mk]);

// Regel 4: Tief bei 95 (Kerze 6), bestätigt nach 5 Kerzen
const lowAt = [...F(6), [100, 100.5, 95, 100], ...F(6)];           // 13 Kerzen, Tief an Index 6
const sweep = [100, 101, 94, 99];
// Regel 6: Hoch bei 105 (Index 6), rote Kerze (Index 13), Ausbruch (Index 14), eine Kerze darüber (Index 15)
const obBase = [...F(6), [100, 105, 99.5, 100], ...F(6), [100, 100.2, 97, 98], [98, 106.5, 98, 106], [106, 107.5, 104, 107]];

// ---- Regel 4: unabhängige Gegenrechnung (ohne Zustand, jede Kerze von Grund auf) ----
function sweepRef(m, i) {
  const g = m.M.g;
  for (let p = i - S - 1; p >= S && g.t[i] - g.t[p] <= LTR.r4.days * DAY; p--) {
    let piv = true; for (let j = 1; j <= S; j++) if (!(g.l[p] < g.l[p - j]) || !(g.l[p] < g.l[p + j])) piv = false;
    if (!piv) continue;
    const price = g.l[p]; let closed = false, wick = false;
    for (let k = p + 1; k < i; k++) { if (g.c[k] < price) closed = true; if (g.l[k] < price) wick = true; }
    if (!closed && g.o[i] > price && g.l[i] < price && g.c[i] > price) return wick ? 'wiederholt' : 'erster';
  }
  return null;
}
const sweepSame = ALLM.every((m) => { for (let i = 0; i < m.M.n; i++) { const a = sig('r4', m).get(i)?.mk.Sweep || null, b = trendUp(m.M, i) ? sweepRef(m, i) : null; if (a !== b) return false; } return true; });

// ---- Regel 2: unabhängige Gegenrechnung ----
const bh = (D, k) => Math.max(D[k].o, D[k].c), bl = (D, k) => Math.min(D[k].o, D[k].c);
const topB = (D, p) => { if (p < S || p + S >= D.length) return false; for (let j = 1; j <= S; j++) if (!(bh(D, p) > bh(D, p - j)) || !(bh(D, p) >= bh(D, p + j))) return false; return true; };
const botB = (D, p) => { if (p < S || p + S >= D.length) return false; for (let j = 1; j <= S; j++) if (!(bl(D, p) < bl(D, p - j)) || !(bl(D, p) <= bl(D, p + j))) return false; return true; };
function fibRef(m, i) {
  const { M, D, G } = m, d = M.dOf[i];
  if (i < 2 || !trendUp(M, i)) return false;
  let p = d - S; while (p >= S && !topB(D, p)) p--;
  if (p < S) return false;
  let q = p - 1; while (q >= S && !botB(D, q)) q--;
  if (q < S) return false;
  const hi = bh(D, p), range = hi - bl(D, q);
  if (!(range > 0) || !(range >= 6 * M.atr[p])) return false;
  for (let k = p + 1; k <= d; k++) if (D[k].c < hi - 0.786 * range || D[k].c > hi) return false;
  if (!reversalPoint([G[i - 2], G[i - 1], G[i]], 'long')) return false;
  const f = (hi - Math.min(G[i - 1].o, G[i - 1].c)) / range;
  return f >= 0.382 && f <= 0.65;
}
const fibSame = ALLM.every((m) => { for (let i = 0; i < m.M.n; i++) if (sig('r2', m).has(i) !== fibRef(m, i)) return false; return true; });
const fibCount = ALLM.reduce((a, m) => a + sig('r2', m).size, 0);

// ---- Regel 6: unabhängige Gegenrechnung (jedes Ereignis und jeder Block einzeln verfolgt) ----
function blockRef(m) {
  const g = m.M.g, n = m.M.n, out = new Set(), seen = new Map(); // seen: Blockkerze → bis wann der Block lebt
  for (let e = S + 1; e < n; e++) {
    let hp = -1;
    for (let p = e - S - 1; p >= S; p--) {
      let piv = true; for (let j = 1; j <= S; j++) if (!(g.h[p] > g.h[p - j]) || !(g.h[p] > g.h[p + j])) piv = false;
      if (!piv) continue;
      let broken = false; for (let k = p + 1; k < e; k++) if (g.c[k] > g.h[p]) broken = true;
      if (!broken) { hp = p; break; } // jüngstes bestätigtes Hoch ohne Schluss darüber
    }
    if (hp < 0 || !(g.c[e] > g.h[hp])) continue;
    let b = e - 1; while (b >= 0 && !(g.c[b] < g.o[b])) b--;
    if (b < 0 || (seen.has(b) && seen.get(b) >= e)) continue;
    const top = g.o[b], mid = (g.o[b] + g.c[b]) / 2, low = g.l[b];
    let visit = false, end = n;
    for (let k = e + 1; k < n; k++) {
      if (g.c[k] < low) { end = k; break; }
      if (g.l[k] > top) { if (visit) { end = k; break; } continue; }
      if (g.l[k] < low) { end = k; break; }
      visit = true;
      if (g.c[k] > mid) { if (trendUp(m.M, k)) out.add(k); end = k; break; }
    }
    seen.set(b, end);
  }
  return out;
}
const blockSame = [X, Y].every((m) => { const a = keys('r6', m).join(), b = [...blockRef(m)].sort((x, y) => x - y).join(); return a === b && a.length > 0; });

// ---- Regel 3: Level von Grund auf nachgerechnet ----
function vwapOf(D, pred) { let pv = 0, v = 0, n = 0; for (const c of D) if (pred(c.t)) { pv += ((c.h + c.l + c.c) / 3) * c.v; v += c.v; n++; } return { y: v > 0 ? pv / v : null, n }; }
const vwapLevelsOk = [X, Y].every((m) => [...sig('r3', m).entries()].filter((_, k) => k % 9 === 0).every(([i, s]) => {
  const d = m.M.dOf[i], next = m.D[d].t + DAY, refW = weekKey(next) - 1, refM = monthKey(next) - 1, past = m.D.slice(0, d + 1);
  return s.viz.h.lines.every((L) => {
    const age = Number(L.l.slice(1)), w = L.l[0] === 'W';
    const x = w ? vwapOf(past, (t) => weekKey(t) === refW - age + 1) : vwapOf(past, (t) => monthKey(t) === refM - age + 1);
    return near(x.y, L.y, 1e-7) && (w ? x.n === 7 && age <= 4 : age <= 2);
  }) && s.viz.h.lines.filter((L) => L.hot).length === 1;
}));
// Handgebaut: alle Level bei 100 (flache Kerzen vom 01.01. bis 14.03.2021), ATR künstlich 2 → Schwelle 101, Verfall unter 99
function vwapCase(tail, extraDays = 0, plusDaily = 0) {
  const from = Date.UTC(2021, 0, 1), end = Date.UTC(2021, 2, 15), D = [], G = [];
  for (let t = from; t < end; t += DAY) D.push({ t, T: t + DAY - 1, o: 100, h: 100, l: 100, c: 100, v: 1 });
  for (let t = from; t < end; t += H4) G.push({ t, T: t + H4 - 1, o: 100, h: 100, l: 100, c: 100, v: 1 });
  for (let k = 0; k < extraDays; k++) { const t = end + k * DAY; D.push({ t, T: t + DAY - 1, o: 110, h: 110, l: 110, c: 110, v: 1 }); for (let j = 0; j < 6; j++) G.push({ t: t + j * H4, T: t + (j + 1) * H4 - 1, o: 110, h: 110, l: 109, c: 110, v: 1 }); }
  for (let k = 0; k < plusDaily; k++) { const t = end + (extraDays + k) * DAY; D.push({ t, T: t + DAY - 1, o: 110, h: 110, l: 110, c: 110, v: 1 }); }
  const base = G.length, t1 = G[base - 1].t + H4;
  tail.forEach((r, k) => G.push({ t: t1 + k * H4, T: t1 + (k + 1) * H4 - 1, o: r[0], h: r[1], l: r[2], c: r[3], v: 1 }));
  const M = prepare('V', D, pack(G));
  M.atr = M.atr.map(() => 2); M.fast = M.fast.map(() => 2); M.slow = M.slow.map(() => 1);
  return [...signalsOf('r3', M).entries()].map(([i, s]) => [i - base, s.mk]);
}
const hiC = [110, 110, 109, 110];

// ---- Regel 1: jedes Signal gegen die Definition geprüft ----
const keyOk = ALLM.every((m) => [...sig('r1', m).entries()].every(([i, s]) => {
  const { M, D } = m, g = M.g, [zl, zh] = s.viz.d.bands[0], marks = s.viz.d.marks, A = marks[marks.length - 1].k, t = marks.slice(0, -1).map((x) => x.k), a = M.atr[A - 1];
  const tEnd = D[A].t + DAY;
  let re = -1; for (let k = 0; k <= i; k++) if (g.t[k] >= tEnd && g.t[k] < tEnd + 10 * DAY && g.l[k] <= zh) { re = k; break; }
  let firstClose = -1; if (re >= 0) for (let k = re; k <= i; k++) if (g.c[k] > zh) { firstClose = k; break; }
  let killed = false; for (let k = A + 1; k <= M.dOf[i]; k++) if (D[k].c < zl) killed = true;
  return near(zh - zl, 0.5 * a, 1e-7) && t.length >= 3 && t[t.length - 1] - t[0] >= 28 && t.every((k) => k < A && k >= A - 180) && D[A].c > zh && D[A - 1].c <= zh
    && countTouches(D, (zl + zh) / 2, a, A - 180, A - 1).join() === t.join() && firstClose === i && !killed && trendUp(M, i);
}));
const keyCount = ALLM.reduce((a, m) => a + sig('r1', m).size, 0);
// Berührungen handgebaut: Level 100, ATR 2 → Zone 99,5 bis 100,5; „1 ATR weg“ = Schluss ≤ 97,5 (von unten) bzw. ≥ 102,5 (von oben)
const dd = (rows) => rows.map(([h, l, c], k) => ({ t: T0 + k * DAY, o: c, h, l, c, v: 1 }));
const lowDay = [96, 94, 95], hiDay = [106, 104, 105];
const touchUp = dd([lowDay, [100, 96, 97], lowDay, lowDay]);                     // von unten berührt, Schluss 97 → dreht weg
const touchThrough = dd([lowDay, [100, 96, 99], hiDay, hiDay]);                  // von unten berührt, danach Schluss weit DARÜBER → Durchlauf
const touchDown = dd([hiDay, [104, 100, 103], hiDay]);                           // von oben berührt, Schluss 103 → dreht weg
const touchRun = dd([lowDay, [100, 96, 99], [100.4, 97, 99], [99.8, 96, 97], lowDay]); // drei Tage in der Zone = eine Berührung
const touchLate = dd([lowDay, [100, 96, 99], ...Array.from({ length: 10 }, () => [99, 98, 98.5]), lowDay]); // Wegdrehen erst am 11. Tag

// ---- Anschluss an die Messmaschine ----
const TR = Object.fromEntries(NEW_RULES.map((r) => [r, ALLM.map((m) => runRule(m.M, fireOf(r), STICH, ['dev', 'check']))]));
const allTrades = (r) => TR[r].flatMap((l, k) => l.map((t) => ({ ...t, coin: ALLM[k].coin }))).sort((a, b) => a.t - b.t);
const Ms = ALLM.map((m) => m.M);
const rnd3 = randomSameCandle(Ms, allTrades('r3'), preOf('r3'), ['dev', 'check'], 20);
const blind = Object.fromEntries(NEW_RULES.map((r) => [r, blindSample(r, Ms, STICH)]));
const P = periods(STICH);

export const tests = [
  ['Regeln 8k: fünf neue Kandidaten mit Blindprobe, die alten Regeln ohne', () => NEW_RULES.join() === 'r1,r2,r3,r4,r6' && NEW_RULES.every((r) => RULES[r].kind === 'kandidat' && RULES[r].blind === true) && !RULES.flip.blind && !RULES.r5.blind],
  ['Regeln 8k: der gewürfelte Markt wird mit derselben Trend-Funktion geprüft wie die Regel', () => NEW_RULES.every((r) => preOf(r) === trendUp) && preOf('flip') === trendUp && preOf('donch') !== trendUp],
  ['Regeln 8k: Signale je Markt werden einmal gerechnet und gemerkt', () => signalsOf('r4', X.M) === signalsOf('r4', X.M)],
  ['Regeln 8k: jede Regel feuert auf Zufallskursen', () => NEW_RULES.every((r) => ALLM.reduce((a, m) => a + sig(r, m).size, 0) > 0)],
  ['Regeln 8k: jedes Signal liegt im Tagestrend aufwärts', () => NEW_RULES.every((r) => ALLM.every((m) => keys(r, m).every((i) => trendUp(m.M, i))))],
  ['Regeln 8k: ohne Tagestrend kein Signal', () => hits('r4', [...lowAt, sweep], { up: false }).length === 0 && hits('r4', [...lowAt, sweep]).length === 1],
  ['Regel 1 schaut nicht in die Zukunft', () => causal('r1')],
  ['Regel 2 schaut nicht in die Zukunft', () => causal('r2', Z)],
  ['Regel 3 schaut nicht in die Zukunft', () => causal('r3')],
  ['Regel 4 schaut nicht in die Zukunft', () => causal('r4')],
  ['Regel 6 schaut nicht in die Zukunft', () => causal('r6')],

  ['Regel 4: Sweep eines bestätigten Tiefs feuert (erster Sweep)', () => { const h = hits('r4', [...lowAt, sweep]); return h.length === 1 && h[0][0] === 13 && h[0][1].Sweep === 'erster'; }],
  ['Regel 4: zweiter Sweep desselben Tiefs heißt „wiederholt“', () => { const h = hits('r4', [...lowAt, sweep, flat, [100, 101, 94.5, 99]]); return h.length === 2 && h[1][1].Sweep === 'wiederholt'; }],
  ['Regel 4: nach einem Schluss unter dem Tief zählt es nicht mehr', () => hits('r4', [...lowAt, [100, 100.5, 94.2, 94.5], [94.5, 100.5, 94.5, 100], [100, 101, 94.8, 99]]).length === 0],
  ['Regel 4: die Kerze muss über dem Tief eröffnen', () => hits('r4', [...lowAt, [94.9, 100, 94, 99]]).length === 0],
  ['Regel 4: Schluss unter dem Tief ist kein Sweep', () => hits('r4', [...lowAt, [100, 101, 94, 94.9]]).length === 0],
  ['Regel 4: vor der Bestätigung (5 Kerzen) kein Signal', () => hits('r4', [...lowAt.slice(0, 11), sweep]).length === 0],
  ['Regel 4: Tiefs, die älter als 20 Tage sind, zählen nicht', () => hits('r4', [...lowAt, ...F(115), sweep]).length === 0 && hits('r4', [...lowAt, ...F(100), sweep]).length === 1],
  ['Regel 4: stimmt mit der Gegenrechnung von Grund auf überein (alle Kerzen, drei Märkte)', () => sweepSame && keys('r4').length > 20],

  ['Regel 6: Rücklauf in den Körper mit Schluss über der Mitte feuert', () => { const h = hits('r6', [...obBase, [107, 107.5, 99.5, 103]]); return h.length === 1 && h[0][0] === 16 && h[0][1]['Rücklauf'] === 'nur Körper' && h[0][1].Alter === 'unter 3 Tage'; }],
  ['Regel 6: Rücklauf bis in den Docht wird als Merker festgehalten', () => { const h = hits('r6', [...obBase, [107, 107.5, 97.5, 103]]); return h.length === 1 && h[0][1]['Rücklauf'] === 'bis in den Docht'; }],
  ['Regel 6: Docht unter dem Block-Tief ist kein Einstieg und beendet den ersten Rücklauf', () => hits('r6', [...obBase, [107, 107.5, 96.5, 103], [103, 104, 99.5, 103.5]]).length === 0],
  ['Regel 6: Schluss unter dem Block-Tief macht den Block ungültig', () => hits('r6', [...obBase, [107, 107.5, 96, 96.5], [96.5, 104, 96.5, 103]]).length === 0],
  ['Regel 6: schließt die erste Kerze nicht über der Mitte, zählt die nächste im selben Rücklauf', () => { const h = hits('r6', [...obBase, [107, 107.5, 98.5, 98.9], [98.9, 101.5, 98.2, 101]]); return h.length === 1 && h[0][0] === 17 && h[0][1]['Rücklauf'] === 'nur Körper'; }],
  ['Regel 6: nur der erste Rücklauf zählt', () => hits('r6', [...obBase, [107, 107.5, 98.5, 98.9], [98.9, 104, 101, 103], [103, 104, 99.5, 103.5]]).length === 0],
  ['Regel 6: die Ausbruchskerze selbst ist kein Rücklauf', () => hits('r6', obBase).length === 0],
  ['Regel 6: ohne Schluss über dem Swing-Hoch kein Block', () => hits('r6', [...obBase.slice(0, 14), [98, 104.9, 98, 104.5], [104.5, 105, 104, 104.8], [104.8, 105, 99.5, 103]]).length === 0],
  ['Regel 6: stimmt mit der Gegenrechnung von Grund auf überein (zwei Märkte)', () => blockSame],

  ['Regel 3: Wochen beginnen montags UTC, Monate am Ersten UTC', () => weekKey(Date.UTC(2021, 0, 4)) === weekKey(Date.UTC(2021, 0, 10, 23)) && weekKey(Date.UTC(2021, 0, 3, 23)) + 1 === weekKey(Date.UTC(2021, 0, 4)) && monthKey(Date.UTC(2021, 0, 31, 23)) + 1 === monthKey(Date.UTC(2021, 1, 1))],
  ['Regel 3: Level stimmen mit dem von Grund auf gerechneten VWAP überein, nur vollständige Wochen, höchstens 4 Wochen und 2 Monate', () => vwapLevelsOk],
  ['Regel 3: die Annäherungskerze feuert selbst, wenn sie über dem Level schließt', () => { const h = vwapCase([hiC, [110, 110, 100.8, 100.5]]); return h.length === 1 && h[0][0] === 1 && h[0][1].Nachbarn === 'weitere Level nah'; }],
  ['Regel 3: schließt sie darunter, feuert der erste spätere Schluss über dem Level', () => { const h = vwapCase([hiC, [110, 110, 99.4, 99.6], [99.6, 100.4, 99.5, 100.2]]); return h.length === 1 && h[0][0] === 2; }],
  ['Regel 3: Schluss mehr als ½ ATR unter dem Level lässt die Annäherung verfallen', () => vwapCase([hiC, [110, 110, 97.5, 98], [98, 100.4, 98, 100.2]]).length === 0],
  ['Regel 3: ohne Annäherung von oben kein Signal', () => vwapCase([[100, 100.6, 99.8, 100.5], [100.5, 100.9, 100.2, 100.8]]).length === 0 && vwapCase([hiC, [110, 110, 101.2, 101.5]]).length === 0],
  ['Regel 3: nach einem Signal braucht es eine neue Annäherung von oben', () => vwapCase([hiC, [110, 110, 100.8, 100.5], [100.5, 100.9, 100.2, 100.8], hiC, [110, 110, 100.9, 100.6]]).map((x) => x[0]).join() === '1,4'],
  ['Regel 3: beim Wochenwechsel verfällt eine offene Annäherung', () => {
    // Sechs Zusatztage bei 110 (Montag bis Samstag). Sonntag: die fünfte Kerze nähert sich an und schließt knapp unter dem Level,
    // die sechste schließt darüber. Mit ihr endet die Woche: Die Level wechseln, die Annäherung ist verfallen.
    const tail = [hiC, hiC, hiC, hiC, [110, 110, 100.8, 99.6], [99.6, 100.6, 99.5, 100.5]];
    const mid = vwapCase(tail, 6, 0), end = vwapCase(tail, 6, 1); // Kontrolle ohne Sonntags-Tageskerze: die Woche läuft noch
    return mid.length === 1 && mid[0][0] === 5 && end.length === 0;
  }],

  ['Regel 2: Körper-Swings gibt es auch ohne Kurslücken (Eröffnung = Schluss davor)', () => { let n = 0; for (let p = S; p + S < X.D.length; p++) if (topB(X.D, p)) n++; return n > 20; }],
  ['Regel 2: stimmt mit der Gegenrechnung von Grund auf überein (alle Kerzen, drei Märkte)', () => fibSame && fibCount > 5],
  ['Regel 2: jede Teilzone liegt zwischen 0,382 und 0,65, der Zähler beginnt je Impuls bei „erster“', () => ALLM.every((m) => [...sig('r2', m).values()].every((s) => ['0,382 bis 0,5', '0,5 bis 0,618', 'Golden Pocket'].includes(s.mk.Teilzone) && ['erster aus dem Impuls', 'wiederholter'].includes(s.mk.Einstieg))) && ALLM.some((m) => [...sig('r2', m).values()].some((s) => s.mk.Einstieg === 'erster aus dem Impuls'))],
  ['Regel 2: der Impuls misst Körper, nicht Dochte (Hoch und Tief der Zeichnung liegen auf Körperkanten)', () => ALLM.every((m) => [...sig('r2', m).values()].every((s) => { const [T, H] = s.viz.d.marks, L = s.viz.d.lines; return near(L[0].y, bh(m.D, H.k)) && near(L[1].y, bl(m.D, T.k)) && T.k < H.k; }))],

  ['Regel 1: Berührung von unten zählt, wenn der Kurs 1 ATR nach unten wegdreht', () => countTouches(touchUp, 100, 2, 0, 3).join() === '1'],
  ['Regel 1: ein Durchlauf nach oben ist keine Berührung', () => countTouches(touchThrough, 100, 2, 0, 3).length === 0],
  ['Regel 1: Berührung von oben zählt, wenn der Kurs 1 ATR nach oben wegdreht', () => countTouches(touchDown, 100, 2, 0, 2).join() === '1'],
  ['Regel 1: aufeinanderfolgende Tage in der Zone sind eine Berührung', () => countTouches(touchRun, 100, 2, 0, 4).join() === '1'],
  ['Regel 1: das Wegdrehen muss innerhalb von 10 Tagen und vor dem Ausbruchstag liegen', () => countTouches(touchLate, 100, 2, 0, 12).length === 0 && countTouches(touchUp, 100, 2, 0, 1).length === 0 && countTouches(touchUp, 100, 2, 0, 2).length === 1],
  ['Regel 1: jedes Signal erfüllt die Definition (Zone ½ ATR, 3 Berührungen über 4 Wochen, erster Tagesschluss darüber, Retest in 10 Tagen, erster 4H-Schluss über der Zone)', () => keyOk && keyCount > 10],
  ['Regel 1: Merker nennen Berührungen und Alter des Levels', () => ALLM.every((m) => [...sig('r1', m).values()].every((s) => ['3', '4', '5 und mehr'].includes(s.mk['Berührungen']) && /Wochen/.test(s.mk.Alter)))],

  ['Messmaschine 8k: Merker hängen an jedem Trade der neuen Regeln', () => NEW_RULES.every((r) => allTrades(r).length > 0 && allTrades(r).every((t) => t.mk && Object.keys(t.mk).length >= 1 && Number.isFinite(t.r)))],
  ['Messmaschine 8k: Signale bei offenem Trade verfallen und werden gezählt', () => NEW_RULES.every((r) => ALLM.every((m, k) => { const l = TR[r][k]; let n = 0; for (const i of keys(r, m)) if (['dev', 'check'].includes(periodOf(entryTime(m.M, i), STICH)) && canEnter(m.M, i)) n++; return l.length + (l.missed.dev || 0) + (l.missed.check || 0) >= n && l.length <= n; }))],
  ['Messmaschine 8k: ein offener Trade je Markt', () => NEW_RULES.every((r) => TR[r].every((l) => l.every((t, k) => k === 0 || t.t >= l[k - 1].x)))],
  ['Messmaschine 8k: ohne geöffnete Prüfung entstehen nur Trades der Entwicklung', () => NEW_RULES.every((r) => { const l = runRule(X.M, fireOf(r), STICH, ['dev']); return l.every((t) => t.per === 'dev' && t.t < P.dev[1]) && !l.missed.check; })],
  ['Messmaschine 8k: „Neu im Trend“ rechnet wie vorher (keine Merker, dieselben Einstiege)', () => { const l = runRule(X.M, fireOf('flip'), STICH, ['dev']); return l.length > 0 && l.every((t) => t.mk === undefined && fireFlip(X.M, t.i)); }],
  ['Messmaschine 8k: der Zufalls-Vergleich kommt auf dieselbe Zahl an Einstiegen', () => { const n = allTrades('r3').filter((t) => t.per === 'dev').length; return n > 0 && [...rnd3.dev.n].every((x) => x + rnd3.dev.skipped * 20 >= n - 1 && x <= n); }],
  ['Messmaschine 8k: Merker-Tabelle zählt und mittelt je Ausprägung', () => { const t = markerTable([{ r: 1, mk: { A: 'x' } }, { r: 3, mk: { A: 'x' } }, { r: -1, mk: { A: 'y' } }, { r: 9 }]); return t.A.length === 2 && t.A[0].v === 'x' && t.A[0].n === 2 && near(t.A[0].avg, 2) && near(t.A[1].avg, -1); }],
  ['Messmaschine 8k: Markt-Jahre zählen nur Zeiten, in denen ein Einstieg möglich war', () => { const y = marketYears([X.M], STICH, 'dev'); return y > 2 && y < 2.5 && marketYears([X.M], STICH, 'check') === 0; }],
  ['Messmaschine 8k: Text zum Kopieren nennt Merker, verfallene Signale und Einstiege je Markt und Jahr', () => {
    const mine = allTrades('r4').filter((t) => t.per === 'dev'), r = periodResult(mine, randomSameCandle(Ms, mine, preOf('r4'), ['dev'], 20).dev, P.dev, 0.1);
    r.mk = markerTable(mine); r.missed = 7; r.perMY = 12.34;
    const txt = resultText('r4', { dev: r }, '8k');
    return /Regel 4/.test(txt) && /Merker Sweep: erster \d+ \(Ø [+−±]\d,\d\dR\)/.test(txt) && /12,3 Einstiege je Markt und Jahr · 7 Signale verfallen/.test(txt) && /Tresor: gesperrt/.test(txt);
  }],
  ['Messmaschine 8k: Text der alten Regeln bleibt ohne Zusatzzeilen', () => { const mine = runRule(X.M, fireOf('flip'), STICH, ['dev']).map((t) => ({ ...t, coin: 'AAA' })); const txt = resultText('flip', { dev: periodResult(mine, randomSameCandle(Ms, mine, preOf('flip'), ['dev'], 10).dev, P.dev, 0) }, '8k'); return !/Merker|verfallen/.test(txt) && txt.split('\n').length === 7; }],
  ['Messmaschine 8k: ein neuer Kandidat, der in der Entwicklung bei A und B durchfällt, ist abgelegt', () => verdict('r1', { n: 400, avg: -0.1, pct: 10 }, null).dropped === true && verdict('r1', { n: 400, avg: 0.1, pct: 10 }, null).canCheck === true],

  ['Blindprobe: höchstens fünf Einstiege je Regel, nur aus der Entwicklung, ohne Ergebnis', () => NEW_RULES.every((r) => { const b = blind[r]; return b.items.length === Math.min(5, b.total) && b.items.every((x) => periodOf(x.t, STICH) === 'dev' && !('r' in x) && !('x' in x) && x.viz && x.mk); })],
  ['Blindprobe: fester Würfel (dieselben fünf bei jedem Aufruf), keine doppelt', () => NEW_RULES.every((r) => { const a = blind[r].items.map((x) => x.coin + x.i), b = blindSample(r, Ms, STICH).items.map((x) => x.coin + x.i); return a.join() === b.join() && new Set(a).size === a.length; })],
  ['Blindprobe: rechnet keinen einzigen Trade', () => { const fresh = ALLM.map((m) => prepare(m.coin, m.D, pack(m.G))); NEW_RULES.forEach((r) => blindSample(r, fresh, STICH)); return fresh.every((M) => M.sims.size === 0); }],
  ['Blindprobe: die Zeichenhilfe endet an der Signalkerze (nichts danach)', () => NEW_RULES.every((r) => blind[r].items.every((x) => ['d', 'h'].every((tf) => !x.viz[tf] || (x.viz[tf].marks || []).every((m) => m.k <= (tf === 'h' ? x.i : x.M.dOf[x.i])))))],
  ['Blindprobe: neue Regeln sind gesperrt, bis sie für diese Fassung bestätigt sind', () => !blindOk('r1', {}) && !blindOk('r1', { r1: { ok: true, rv: LTR.ver + 1 } }) && !blindOk('r1', { r1: { ok: false, rv: LTR.ver } }) && blindOk('r1', { r1: { ok: true, rv: LTR.ver } }) && !blindOk('r2', { r1: { ok: true, rv: LTR.ver } })],
  ['Blindprobe: die alten Regeln brauchen keine', () => blindOk('flip', {}) && blindOk('donch', {}) && blindOk('r5', {})],

  ['Blindprobe: das Bild nennt weder Coin noch Datum noch Kurse', () => NEW_RULES.every((r) => blind[r].items.every((x) => { const h = blindHtml(x); return h.includes('<svg') && !h.includes(x.coin) && !/20\d\d/.test(h) && !/<text[^>]*>\s*[\d.,]{3,}\s*</.test(h.replace(/>0,786</g, '><')); }))],
  ['Blindprobe: gezeichnet wird höchstens bis zur Signalkerze', () => { let last = -1; const s = panelSvg((k) => { last = Math.max(last, k); return { o: 1, h: 2, l: 0.5, c: 1.5 }; }, 10, 40, {}, { signal: true }); return last === 40 && s.includes('▲') && (s.match(/<rect/g) || []).length === 32; }],
  ['Blindprobe: Regeln mit Tages-Level zeigen Tages- und 4H-Bild, die anderen nur 4H', () => ['r1', 'r2'].every((r) => blind[r].items.every((x) => (blindHtml(x).match(/<svg/g) || []).length === 2)) && ['r3', 'r4', 'r6'].every((r) => blind[r].items.every((x) => (blindHtml(x).match(/<svg/g) || []).length === 1))],
  ['Export 8k: Testplan-Läufe, Stand der Blindproben und Lücken stehen im Bericht', () => {
    const mine = allTrades('r4').filter((t) => t.per === 'dev'), dev = periodResult(mine, randomSameCandle(Ms, mine, preOf('r4'), ['dev'], 10).dev, P.dev, 0);
    const t = longTestText({ r4: { dev, devAt: 0, ver: '8k', cmp: 2 } }, { r4: { ok: true, rv: LTR.ver }, r1: { ok: false, rv: LTR.ver } }, 'Fehlende 4H-Kerzen: keine');
    return /Testplan-Läufe/.test(t) && /Regel 4 · Liquidity Sweep: bestätigt/.test(t) && /Regel 1 · Key-Level mit Retest: abgelehnt/.test(t) && /Regel 2 · Fibonacci-Rücklauf: offen/.test(t) && /Fehlende 4H-Kerzen: keine/.test(t) && longTestText({}, {}, '') === '';
  }],
  ['Lücken: Text nennt Datum, Uhrzeit (UTC) und Zahl der Märkte', () => gapsText({ [Date.UTC(2020, 1, 19, 12)]: 15 }) === 'Fehlende 4H-Kerzen: 19.02.2020 12:00 UTC (15 Märkte)' && gapsText({}) === 'Fehlende 4H-Kerzen: keine' && gapsText(null) === ''],
  ['Lücken: fehlende 4H-Kerzen werden mit ihrer Zeit genannt', () => { const g = { n: 4, t: [0, H4, 3 * H4, 6 * H4] }; return gapTimes(g).join() === [2 * H4, 4 * H4, 5 * H4].join() && gapTimes(X.M.g).length === 0; }],
  ['Regeln 8k: der feste Rahmen des Tests ist unverändert', () => LT.atrMult === 2 && LT.holdDays === 10 && LT.draws === 200 && LT.cmp === 2 && LT.passPct === 95 && LT.minTrades === 300 && LT.splits.join() === '0.2,0.3,0.3,0,0.2'],
];
