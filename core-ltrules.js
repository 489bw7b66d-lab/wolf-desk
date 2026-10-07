// Die Regeln 1, 2, 3, 4 und 6 des Testplans (8k, Körper-Grundsatz seit 8k1). Nur Messung, nichts wird gemeldet.
// Grundlage: TESTPLAN.md Abschnitt 7 und TESTPLAN-PROTOKOLL.md (Lesarten 11 bis 16, Änderung 2 „Grundsatz Körper“). Tests in test-ltrules.js.
// Grundsatz Körper (Jensen, 07.10.2026): Wo ein Level LIEGT und wann der Kurs es ERREICHT, entscheidet die Körperkante
// (Oberkante = das Größere aus Eröffnung und Schluss, Unterkante = das Kleinere). Dochte zählen nur, wo sie zum Wesen der
// Regel gehören: beim Sweep (Regel 4) und beim Docht-Teil des Order Blocks (Regel 6).
// Jede Regel läuft einmal vorwärts über die Kerzen eines Marktes und merkt sich, an welchen 4H-Kerzen sie feuert.
// Sie benutzt an Kerze i nur 4H-Kerzen bis i und Tageskerzen, die beim Schluss von i schon abgeschlossen waren (M.dOf).
// Setups laufen unabhängig davon weiter, ob im Markt gerade ein Trade offen ist (Lesart 11).
import { reversalPoint } from './core-engine2.js';

const DAY = 864e5;
export const LTR = {
  ver: 2,                 // Fassung der Regeln (2 = Grundsatz Körper auch in Regel 1 und 3). Ändert sich der Code einer Regel, steigt die Zahl und die Blindprobe gilt nicht mehr.
  side: 5,                // Swing: je 5 Kerzen (Tage) davor und danach, strikt höher bzw. tiefer
  r1: { win: 180, touches: 3, spanDays: 28, turnDays: 10, retestDays: 10, half: 0.25, turnAtr: 1 },
  r2: { minAtr: 6, zoneFrom: 0.382, zoneTo: 0.65, kill: 0.786 },
  r3: { weeks: 4, months: 2, tolAtr: 0.5 },
  r4: { days: 20 },
};
export const NEW_RULES = ['r1', 'r2', 'r3', 'r4', 'r6'];

// Gemeinsame Vorbedingung (Tagestrend aufwärts: Tages-EMA 20 über EMA 100 am letzten abgeschlossenen Tag).
// Dieselbe Funktion prüft auch den gewürfelten Markt im Zufalls-Vergleich (core-longtest preOf).
export const trendUp = (M, i) => { const d = M.dOf[i]; return d >= 0 && M.fast[d] > 0 && M.slow[d] > 0 && M.fast[d] > M.slow[d]; };

// Swing-Punkt an Stelle p: strikt höher (tiefer) als je `side` Werte davor und danach. Bei Gleichstand kein Swing.
const isTop = (v, p, n, S = LTR.side) => { if (p < S || p + S >= n) return false; for (let j = 1; j <= S; j++) if (!(v(p) > v(p - j)) || !(v(p) > v(p + j))) return false; return true; };
const isBottom = (v, p, n, S = LTR.side) => { if (p < S || p + S >= n) return false; for (let j = 1; j <= S; j++) if (!(v(p) < v(p - j)) || !(v(p) < v(p + j))) return false; return true; };
// Swing aus Kerzenkörpern (Regel 1 und 2): strikt höher (tiefer) als die 5 davor, höher (tiefer) ODER GLEICH die 5 danach.
// Grund: Ohne Kurslücke ist die Eröffnung eines Tages der Schluss des Vortags; zwei Nachbartage teilen sich dann dieselbe
// Körperkante, und mit „strikt auf beiden Seiten“ gäbe es so gut wie nie einen Körper-Swing. Es zählt der frühere Tag.
const isTopB = (v, p, n, S = LTR.side) => { if (p < S || p + S >= n) return false; for (let j = 1; j <= S; j++) if (!(v(p) > v(p - j)) || !(v(p) >= v(p + j))) return false; return true; };
const isBottomB = (v, p, n, S = LTR.side) => { if (p < S || p + S >= n) return false; for (let j = 1; j <= S; j++) if (!(v(p) < v(p - j)) || !(v(p) <= v(p + j))) return false; return true; };
const c4 = (g, i) => ({ o: g.o[i], h: g.h[i], l: g.l[i], c: g.c[i] });
const bTop = (c) => Math.max(c.o, c.c), bBot = (c) => Math.min(c.o, c.c);
// Für die Tests: Ist Tag p ein Körper-Swing-Hoch bzw. -Tief? (Kerzen bis einschließlich p + 5 müssen vorliegen)
export const bodyTopAt = (D, p) => isTopB((k) => bTop(D[k]), p, D.length);
export const bodyBottomAt = (D, p) => isBottomB((k) => bBot(D[k]), p, D.length);

// ---- Regel 4: Liquidity Sweep ----
// Eine 4H-Kerze eröffnet über einem bestätigten Swing-Tief der letzten 20 Tage, unterschreitet es und schließt wieder darüber.
// Es zählen nur Tiefs, unter denen seit ihrer Bestätigung noch keine 4H-Kerze geschlossen hat (Festlegung, nicht im Plan).
function ruleSweep(M) {
  const g = M.g, S = LTR.side, lows = [];
  return {
    day() {},
    candle(i, d, up) {
      let sig = null;
      for (let k = lows.length - 1; k >= 0; k--) { // jüngstes Tief zuerst
        const L = lows[k];
        if (g.t[i] - g.t[L.p] > LTR.r4.days * DAY) { lows.splice(k, 1); continue; }
        if (!sig && g.o[i] > L.price && g.l[i] < L.price && g.c[i] > L.price) {
          sig = { mk: { Sweep: L.swept ? 'wiederholt' : 'erster' }, viz: { h: { from: L.p - 12, lines: [{ y: L.price, l: 'Tief' }], marks: [{ k: L.p, l: 'T' }] } } };
        }
        if (g.c[i] < L.price) { lows.splice(k, 1); continue; }
        if (g.l[i] < L.price) L.swept++;
      }
      const p = i - S;
      if (isBottom((x) => g.l[x], p, i + 1)) lows.push({ p, price: g.l[p], swept: 0 });
      return sig && up ? sig : null;
    },
  };
}

// ---- Regel 6: Order Block als Unterstützung ----
// Ereignis: erster 4H-Schluss über dem jüngsten bestätigten Swing-Hoch, über dem noch keine 4H-Kerze geschlossen hat.
// Block = letzte fallende 4H-Kerze vor dieser Kerze: Körper = Eröffnung bis Schluss, Docht = Schluss bis Tief.
// Einstieg: beim ersten Rücklauf in den Block die erste Kerze, die über der Körpermitte schließt.
function ruleBlock(M) {
  const g = M.g, S = LTR.side, highs = [], blocks = [];
  return {
    day() {},
    candle(i, d, up) {
      let sig = null;
      for (let k = blocks.length - 1; k >= 0; k--) { // jüngster Block zuerst
        const B = blocks[k];
        if (g.c[i] < B.low) { blocks.splice(k, 1); continue; }             // Schluss unter dem Block: ungültig
        if (g.l[i] > B.top) { if (B.visit) blocks.splice(k, 1); continue; } // nicht im Block; war der erste Rücklauf schon da, ist er vorbei
        if (g.l[i] < B.low) { blocks.splice(k, 1); continue; }             // Docht unter dem Block: kein Einstieg, erster Rücklauf vorbei
        B.visit = true; B.minLow = Math.min(B.minLow, g.l[i]);
        if (g.c[i] > B.mid) {
          if (!sig) {
            const age = (g.t[i] - g.t[B.b]) / DAY;
            sig = { mk: { Rücklauf: B.minLow >= B.body ? 'nur Körper' : 'bis in den Docht', Alter: age < 3 ? 'unter 3 Tage' : age <= 10 ? '3 bis 10 Tage' : 'über 10 Tage' },
              viz: { h: { from: Math.min(B.b, B.hp) - 8, bands: [[B.body, B.top, 'Körper'], [B.low, B.body, 'Docht']], lines: [{ y: B.hi, l: 'Hoch' }, { y: B.mid }], marks: [{ k: B.b, l: 'B' }, { k: B.at, l: 'A' }] } } };
          }
          blocks.splice(k, 1);
        }
      }
      const top = highs[highs.length - 1];
      if (top && g.c[i] > top.price) {
        let b = i - 1; while (b >= 0 && !(g.c[b] < g.o[b])) b--;
        if (b >= 0 && !blocks.some((x) => x.b === b)) blocks.push({ b, top: g.o[b], body: g.c[b], mid: (g.o[b] + g.c[b]) / 2, low: g.l[b], hi: top.price, hp: top.p, at: i, visit: false, minLow: Infinity });
      }
      for (let k = highs.length - 1; k >= 0; k--) if (g.c[i] > highs[k].price) highs.splice(k, 1);
      const p = i - S;
      if (isTop((x) => g.h[x], p, i + 1)) highs.push({ p, price: g.h[p] });
      return sig && up ? sig : null;
    },
  };
}

// ---- Regel 3: VWAP ----
// Level = VWAP-Schlusswerte (HLC3 x Volumen, aus Tageskerzen) der letzten vier vollständigen Wochen (ab Montag UTC) und der
// letzten zwei vollständigen Monate (ab dem Ersten UTC). Einstieg: Der Kurs kommt von oben bis auf ½ ATR an ein Level heran
// und eine 4H-Kerze schließt über dem Level (das kann die Annäherungskerze selbst sein).
// Grundsatz Körper: Die Annäherung wird an der Körper-Unterkante gemessen, nicht am Tief. Ein Docht allein zählt nicht.
export const weekKey = (t) => Math.floor((Math.floor(t / DAY) + 3) / 7);
export const monthKey = (t) => { const x = new Date(t); return x.getUTCFullYear() * 12 + x.getUTCMonth(); };
const daysInMonth = (t) => { const x = new Date(t); return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); };
function ruleVwap(M) {
  const g = M.g, D = M.daily, R = LTR.r3;
  const acc = { w: null, m: null }, done = { w: [], m: [] };
  let levels = [], setId = '', state = new Map();
  const add = (kind, key, c, need) => {
    let a = acc[kind];
    if (!a || a.key !== key) a = acc[kind] = { key, pv: 0, v: 0, n: 0 };
    a.pv += ((c.h + c.l + c.c) / 3) * c.v; a.v += c.v; a.n++;
    if (a.n === need && a.v > 0 && !done[kind].some((x) => x.key === key)) done[kind].push({ key, y: a.pv / a.v }); // nur vollständige Perioden
  };
  return {
    day(d) {
      const c = D[d];
      add('w', weekKey(c.t), c, 7); add('m', monthKey(c.t), c, daysInMonth(c.t));
      // Welche Woche und welcher Monat sind am Ende dieses Tages zuletzt abgelaufen?
      const next = c.t + DAY, refW = weekKey(next) - 1, refM = monthKey(next) - 1;
      const id = refW + '|' + refM;
      if (id === setId) return;
      setId = id; state = new Map(); // Wochen- oder Monatswechsel: offene Annäherungen verfallen
      levels = [
        ...done.w.filter((x) => x.key > refW - R.weeks && x.key <= refW).map((x) => ({ id: 'w' + x.key, y: x.y, kind: 'Woche', age: refW - x.key + 1 })),
        ...done.m.filter((x) => x.key > refM - R.months && x.key <= refM).map((x) => ({ id: 'm' + x.key, y: x.y, kind: 'Monat', age: refM - x.key + 1 })),
      ];
    },
    candle(i, d, up) {
      const A = d >= 0 ? M.atr[d] : null;
      if (!(A > 0) || !levels.length || i < 1) return null;
      let best = null;
      for (const L of levels) {
        const thr = L.y + R.tolAtr * A;
        if (!state.get(L.id) && Math.min(g.o[i - 1], g.c[i - 1]) > thr && Math.min(g.o[i], g.c[i]) <= thr) state.set(L.id, true);
        if (!state.get(L.id)) continue;
        if (g.c[i] > L.y) { state.set(L.id, false); if (!best || Math.abs(g.c[i] - L.y) < Math.abs(g.c[i] - best.y)) best = L; } else if (g.c[i] < L.y - R.tolAtr * A) state.set(L.id, false);
      }
      if (!best || !up) return null;
      const near = levels.filter((x) => x !== best && Math.abs(x.y - best.y) <= R.tolAtr * A).length;
      return { mk: { Level: `${best.kind} −${best.age}`, Nachbarn: near ? 'weitere Level nah' : 'Level allein' },
        viz: { h: { from: i - 60, lines: levels.map((x) => ({ y: x.y, l: (x.kind === 'Woche' ? 'W' : 'M') + x.age, hot: x === best })) } } };
    },
  };
}

// ---- Regel 2: Fibonacci-Rücklauf mit Reaktion ----
// Änderung 2 (07.10.2026): Swing-Hoch und Swing-Tief des Impulses kommen aus den KÖRPERN der Tageskerzen, und „in der Zone“
// wird am Körper der Umkehrkerze geprüft. Impuls = letztes bestätigtes Swing-Hoch und das letzte bestätigte Swing-Tief davor,
// mindestens 6 Tages-ATR (ATR am Tag des Hochs). Zone 0,382 bis 0,65. Einstieg = Umkehrpunkt-Regel auf 4H.
// Ende: Tagesschluss unter 0,786, Tagesschluss über dem Swing-Hoch oder ein neues bestätigtes Swing-Hoch.
function ruleFib(M) {
  const g = M.g, D = M.daily, S = LTR.side, R = LTR.r2, lows = [];
  const bh = (k) => Math.max(D[k].o, D[k].c), bl = (k) => Math.min(D[k].o, D[k].c);
  let imp = null;
  const check = (k) => { if (imp && !imp.dead && (D[k].c < imp.hi - R.kill * imp.range || D[k].c > imp.hi)) imp.dead = true; };
  return {
    day(d) {
      const p = d - S;
      if (isBottomB(bl, p, d + 1)) lows.push({ p, price: bl(p) });
      if (isTopB(bh, p, d + 1)) {
        let L = null; for (let k = lows.length - 1; k >= 0; k--) if (lows[k].p < p) { L = lows[k]; break; }
        const hi = bh(p), range = L ? hi - L.price : 0;
        imp = { p, q: L ? L.p : -1, hi, lo: L ? L.price : null, range, dead: !(L && range > 0 && M.atr[p] > 0 && range >= R.minAtr * M.atr[p]), count: 0 };
        for (let k = p + 1; k < d; k++) check(k);
      }
      check(d);
    },
    candle(i, d, up) {
      if (!imp || imp.dead || i < 2) return null;
      const rp = reversalPoint([c4(g, i - 2), c4(g, i - 1), c4(g, i)], 'long');
      if (!rp) return null;
      const f = (imp.hi - Math.min(g.o[i - 1], g.c[i - 1])) / imp.range; // Körper-Unterkante der Umkehrkerze
      if (f < R.zoneFrom || f > R.zoneTo || !up) return null;
      imp.count++;
      const y = (x) => imp.hi - x * imp.range;
      return { mk: { Teilzone: f < 0.5 ? '0,382 bis 0,5' : f < 0.618 ? '0,5 bis 0,618' : 'Golden Pocket', Einstieg: imp.count === 1 ? 'erster aus dem Impuls' : 'wiederholter' },
        viz: { d: { from: imp.q - 12, bands: [[y(R.zoneTo), y(R.zoneFrom), 'Zone']], lines: [{ y: imp.hi, l: 'Hoch' }, { y: imp.lo, l: 'Tief' }, { y: y(R.kill), l: '0,786' }], marks: [{ k: imp.q, l: 'T' }, { k: imp.p, l: 'H' }] },
          h: { from: i - 45, bands: [[y(R.zoneTo), y(R.zoneFrom), 'Zone']], lines: [{ y: y(R.kill), l: '0,786' }], marks: [{ k: i - 1, l: 'U' }] } } };
    },
  };
}

// ---- Regel 1: Key-Level, Ausbruch mit Retest ----
// Grundsatz Körper: Level = bestätigter KÖRPER-Swing im Tageschart (Körper-Hoch oder Körper-Tief) der letzten 180 Tage,
// Zone = Level ± ¼ ATR (ATR des Tages vor dem Ausbruch).
// Berührung = eine Körperkante einer Tageskerze liegt in der Zone, ein Docht allein zählt nicht (aufeinanderfolgende Tage = eine), danach innerhalb von 10 Tagen ein
// Tagesschluss mindestens 1 ATR jenseits der Zone, zurück auf der Seite, von der der Kurs kam. Alles vor dem Ausbruchstag.
// Ausbruch = erster Tagesschluss über der Zone. Retest = die Körper-Unterkante einer 4H-Kerze erreicht in den 10 Tagen danach die Zonen-Oberkante.
// Einstieg = erster 4H-Schluss über der Zone ab der Retest-Kerze. Ende: Tagesschluss unter der Zone.
export function countTouches(D, P, A, from, to) { // Tage from..to (einschließlich), alle vor dem Ausbruchstag
  const R = LTR.r1, zl = P - R.half * A, zh = P + R.half * A, out = [];
  const inZone = (k) => { const a = bTop(D[k]), b = bBot(D[k]); return (a >= zl && a <= zh) || (b >= zl && b <= zh); };
  for (let k = Math.max(1, from); k <= to; k++) {
    if (!inZone(k)) continue;
    const k1 = k; while (k + 1 <= to && inZone(k + 1)) k++;
    const below = D[k1 - 1].c < P; // Seite, von der der Kurs kam
    for (let j = k + 1; j <= Math.min(k + R.turnDays, to); j++) {
      if (below ? D[j].c <= zl - R.turnAtr * A : D[j].c >= zh + R.turnAtr * A) { out.push(k1); break; }
    }
  }
  return out;
}
// Tage, an denen nur ein Docht (Hoch oder Tief) in der Zone liegt, aber keine Körperkante: zählen NICHT als Berührung.
// Nur für die Zeichnung der Blindprobe, die Regel selbst braucht sie nicht.
export function wickOnlyDays(D, P, A, from, to) {
  const R = LTR.r1, zl = P - R.half * A, zh = P + R.half * A, out = [], inZ = (v) => v >= zl && v <= zh;
  for (let k = Math.max(0, from); k <= to; k++) if ((inZ(D[k].h) || inZ(D[k].l)) && !inZ(bTop(D[k])) && !inZ(bBot(D[k]))) out.push(k);
  return out;
}
function ruleKey(M) {
  const g = M.g, D = M.daily, S = LTR.side, R = LTR.r1, piv = [];
  let setups = [];
  return {
    day(d) {
      setups = setups.filter((s) => !(D[d].c < s.zl)); // Tagesschluss unter der Zone beendet das Setup
      const A = d >= 1 ? M.atr[d - 1] : null;
      if (A > 0) {
        for (const pv of piv) { // nur Level, die am Vortag schon bestätigt waren
          if (pv.p < d - R.win) continue;
          const zh = pv.price + R.half * A, zl = pv.price - R.half * A;
          if (!(D[d].c > zh && D[d - 1].c <= zh)) continue; // erster Tagesschluss über der Zone
          const t = countTouches(D, pv.price, A, d - R.win, d - 1);
          if (t.length < R.touches || t[t.length - 1] - t[0] < R.spanDays) continue;
          setups.push({ zl, zh, P: pv.price, n: t.length, first: t[0], touches: t, wicks: wickOnlyDays(D, pv.price, A, t[0] - 15, d - 1), D: d, tEnd: D[d].t + DAY, retest: false });
        }
      }
      const p = d - S;
      if (isTopB((k) => bTop(D[k]), p, d + 1)) piv.push({ p, price: bTop(D[p]) });
      if (isBottomB((k) => bBot(D[k]), p, d + 1)) piv.push({ p, price: bBot(D[p]) });
    },
    candle(i, d, up) {
      let best = null;
      for (let k = setups.length - 1; k >= 0; k--) {
        const s = setups[k];
        if (g.t[i] < s.tEnd) continue; // Retest zählt erst ab den Kerzen nach dem Ausbruchstag
        if (!s.retest) {
          if (g.t[i] >= s.tEnd + R.retestDays * DAY) { setups.splice(k, 1); continue; }
          if (Math.min(g.o[i], g.c[i]) <= s.zh) s.retest = true;
        }
        if (s.retest && g.c[i] > s.zh) {
          if (!best || s.n > best.n || (s.n === best.n && s.P > best.P)) best = s;
          setups.splice(k, 1);
        }
      }
      if (!best || !up) return null;
      const weeks = Math.floor((best.D - best.first) / 7);
      return { mk: { Berührungen: best.n >= 5 ? '5 und mehr' : String(best.n), Alter: weeks <= 8 ? 'bis 8 Wochen' : weeks <= 16 ? '9 bis 16 Wochen' : 'über 16 Wochen' },
        viz: { d: { from: best.first - 15, bands: [[best.zl, best.zh, 'Zone']], marks: [...best.touches.map((k) => ({ k, l: '•' })), ...best.wicks.map((k) => ({ k, l: '×', x: true })), { k: best.D, l: 'A' }] },
          h: { from: i - 70, bands: [[best.zl, best.zh, 'Zone']] } } };
    },
  };
}

const MAKE = { r1: ruleKey, r2: ruleFib, r3: ruleVwap, r4: ruleSweep, r6: ruleBlock };

// Alle Signale einer Regel in einem Markt: Map 4H-Index → { mk: Merker, viz: Zeichenhilfe für die Blindprobe }.
// Wird je Markt und Regel einmal gerechnet und gemerkt.
export function signalsOf(rule, M) {
  M.sig ||= {};
  if (M.sig[rule]) return M.sig[rule];
  const st = MAKE[rule](M), out = new Map();
  let last = -1;
  for (let i = 0; i < M.n; i++) {
    const d = M.dOf[i];
    while (last < d) st.day(++last);
    const s = st.candle(i, d, trendUp(M, i));
    if (s) out.set(i, s);
  }
  return (M.sig[rule] = out);
}

// Merker auswerten (nur beschreibend): je Merker und Ausprägung Anzahl und Ø R
export function markerTable(trades) {
  const acc = {};
  for (const t of trades) for (const [k, v] of Object.entries(t.mk || {})) { const a = ((acc[k] ||= {})[v] ||= { n: 0, s: 0 }); a.n++; a.s += t.r; }
  return Object.fromEntries(Object.entries(acc).map(([k, vals]) => [k, Object.entries(vals).map(([v, a]) => ({ v, n: a.n, avg: a.s / a.n })).sort((a, b) => (a.v < b.v ? -1 : 1))]));
}

// Fehlende 4H-Kerzen eines Marktes: Öffnungszeiten der Kerzen, die es geben müsste
export function gapTimes(g, step = 4 * 36e5, max = 20) {
  const out = [];
  for (let i = 1; i < g.n && out.length < max; i++) for (let t = g.t[i - 1] + step; t < g.t[i] && out.length < max; t += step) out.push(t);
  return out;
}
