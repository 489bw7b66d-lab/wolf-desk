// Messmaschine für den Testplan (8i): rechnet Regeln auf der langen Historie von Binance. Nur Messung, nichts wird gemeldet.
// Grundlage: TESTPLAN.md (Fassung 3, fest) und TESTPLAN-PROTOKOLL.md (Stichtag, Märkte, Lesarten). Tests in test-longtest.js.
// Gemeinsamer Rahmen für ALLE Einstiege: nur Long · Einstieg zum Schluss der 4H-Signalkerze · Stop 2 x ATR(14) der Tageskerzen ·
// Teilverkäufe bei 2R / 3R / 4R, Rest läuft · Zeit-Ausstieg nach 10 Tagen · ein offener Trade je Markt · Gebühren und Funding.
// Zufalls-Vergleich seit 8j („Änderung 1“ im Protokoll): zur selben Kerze ein zufälliger zulässiger Markt; Regel 5 gepaart an gegen aus.
// Enthalten: die Vergleichsregeln „Neu im Trend“ und Donchian 20/10, Regel 5 (Marktphasen-Schalter) und seit 8k die Regeln 1, 2, 3, 4
// und 6 (core-ltrules.js). Am Zufalls-Vergleich hat 8k nichts geändert.
import { simulateTrade } from './core-backtest.js';
import { ema, atr } from './core-indicators.js';
import { mulberry32, hashStr } from './core-randombase.js';
import { BN, periods, periodOf, unpack } from './core-binance.js';
import { trendUp, signalsOf, markerTable, NEW_RULES, LTR } from './core-ltrules.js';

const DAY = 864e5, H4 = 4 * 36e5;
// Feste Werte des Tests. Bewusst NICHT aus den Einstellungen der App: Wer später seinen Ausstiegsplan ändert, ändert den Test nicht.
export const LT = {
  splits: [0.2, 0.3, 0.3, 0, 0.2],  // Jensens Plan vom 06.10.: 20 % bei 2R, 30 % bei 3R, 30 % bei 4R, Rest 20 % läuft
  tps: [2, 3, 4, 6],                // Ziele in R (bei 6R wird nichts verkauft, nur der Stop rückt nach)
  atrPeriod: 14, atrMult: 2,
  holdDays: 10,
  feePct: 0.045,                    // Gebühr je Seite (Hyperliquid-Grundsatz), fest für alle Läufe
  fundingPctPerDay: 0.03,           // Funding-Schätzung wie seit 8d
  minDays: 110,                     // so viele abgeschlossene Tageskerzen braucht ein Einstieg (wie „Neu im Trend“)
  emaFast: 20, emaSlow: 100,
  donchian: 20,
  every: 280,                       // Regel 5: im Schnitt ein Zufalls-Einstieg je 280 freien 4H-Kerzen
  momDays: 28,                      // Regel 5: Momentum des Gesamtmarkts über 28 Tage
  draws: 200, seed: 20261006,
  boot: 1000,                       // Ziehungen ganzer Monate für die Spanne der Regel
  passPct: 95, minTrades: 300,
  plainStride: 5,                   // „Rahmen allein“: jede 5. Kerze aller Märkte (nur beschreibend)
  cmp: 2,                           // Fassung des Zufalls-Vergleichs (1 = je Markt und Monat, ungültig seit 8j)
};

export const RULES = {
  flip: { label: 'Neu im Trend', kind: 'vergleich', sub: 'Vergleichsregel' },
  donch: { label: 'Donchian 20/10', kind: 'vergleich', sub: 'Vergleichsregel, im gemeinsamen Rahmen' },
  r5: { label: 'Regel 5 · Marktphasen-Schalter', kind: 'kandidat', sub: 'Schalter an gegen aus' },
  r1: { label: 'Regel 1 · Key-Level mit Retest', kind: 'kandidat', sub: 'Kandidat', blind: true },
  r2: { label: 'Regel 2 · Fibonacci-Rücklauf', kind: 'kandidat', sub: 'Kandidat, Körper (Änderung 2)', blind: true },
  r3: { label: 'Regel 3 · VWAP', kind: 'kandidat', sub: 'Kandidat, Annäherung an ein Level', blind: true },
  r4: { label: 'Regel 4 · Liquidity Sweep', kind: 'kandidat', sub: 'Kandidat', blind: true },
  r6: { label: 'Regel 6 · Order Block', kind: 'kandidat', sub: 'Kandidat', blind: true },
};

// ---- Markt vorbereiten ----
// daily: Tageskerzen als Objekte, g: 4H-Kerzen in Spalten (wie gespeichert). Indikatoren werden einmal über die ganze Reihe
// gerechnet; jeder Wert hängt nur von Kerzen bis zu seinem Tag ab (kein Blick in die Zukunft, per Test abgesichert).
export function prepare(coin, daily, g) {
  const closes = daily.map((c) => c.c), n = g.n;
  const hi = new Array(daily.length).fill(null); // höchstes Hoch der 20 Tage VOR dem Tag
  for (let d = LT.donchian; d < daily.length; d++) { let m = -Infinity; for (let k = d - LT.donchian; k < d; k++) m = Math.max(m, daily[k].h); hi[d] = m; }
  // Zu jeder 4H-Kerze: Index der letzten Tageskerze, die bei ihrem Schluss schon abgeschlossen war (−1 = keine)
  const dOf = new Int32Array(n); let p = -1;
  for (let i = 0; i < n; i++) { const close = g.t[i] + H4; while (p + 1 < daily.length && daily[p + 1].t + DAY <= close) p++; dOf[i] = p; }
  return { coin, daily, g, n, dOf, fast: ema(closes, LT.emaFast), slow: ema(closes, LT.emaSlow), atr: atr(daily, LT.atrPeriod), hi, sims: new Map() };
}
const candle = (g, i) => ({ t: g.t[i], T: g.t[i] + H4 - 1, o: g.o[i], h: g.h[i], l: g.l[i], c: g.c[i] });
export const entryTime = (M, i) => M.g.t[i] + H4;

// ---- Gemeinsamer Rahmen: Trade mit Einstieg zum Schluss der Kerze i ----
// Gibt null zurück, wenn dort kein Einstieg möglich ist (zu wenig Historie, kein ATR, keine Folgekerze).
export function simAt(M, i) {
  if (M.sims.has(i)) return M.sims.get(i);
  let out = null;
  const d = M.dOf[i], a = d >= 0 ? M.atr[d] : null, px = M.g.c[i];
  if (d + 1 >= LT.minDays && a > 0 && i + 1 < M.n) {
    const R = LT.atrMult * a, stop = px - R, t = entryTime(M, i);
    if (stop > 0) {
      const path = [];
      for (let k = i + 1; k < M.n && M.g.t[k] <= t + LT.holdDays * DAY; k++) path.push(candle(M.g, k));
      const sim = simulateTrade({ dir: 'long', entry: px, stop, zone: [px, px], tps: LT.tps.map((x) => px + x * R) }, path,
        { fillNow: true, nowPx: px, maxUntil: t + LT.holdDays * DAY - 1, splits: LT.splits });
      if (sim.filled) {
        const fee = (2 * LT.feePct / 100) * px / R;
        const fund = (LT.fundingPctPerDay / 100) * (Math.max(0, sim.exitTime - t) / DAY) * px / R;
        out = { i, t, x: Math.max(sim.exitTime, t), r: sim.grossR - fee - fund, hits: sim.hits, out: sim.outcome };
      }
    }
  }
  M.sims.set(i, out);
  return out;
}

// ---- Regeln: Feuert die Regel am Schluss der Kerze i? ----
const trendOk = (M, i) => {
  const d = M.dOf[i];
  if (d + 1 < LT.minDays || !(M.fast[d] > 0) || !(M.slow[d] > 0) || !(M.atr[d] > 0)) return null; // noch nicht bestimmbar
  return M.fast[d] > M.slow[d] && M.g.c[i] > M.fast[d];
};
// „Neu im Trend“: Bedingung an dieser Kerze erfüllt, an der davor bestimmbar und nicht erfüllt (wie core-benchmark bmFlip)
export const fireFlip = (M, i) => i > 0 && trendOk(M, i) === true && trendOk(M, i - 1) === false;
// Donchian: Tagesschluss über dem höchsten Hoch der 20 Tage davor; Signalkerze ist die 4H-Kerze, die den Tag schließt
export const fireDonch = (M, i) => {
  const d = M.dOf[i];
  return d >= LT.donchian && M.daily[d].t + DAY === M.g.t[i] + H4 && M.daily[d].c > M.hi[d];
};
// Regeln 1, 2, 3, 4, 6 (8k): Die Regel liefert ihre Merker statt true; die Vorbedingung (Tagestrend) prüft sie selbst.
export const fireOf = (rule) => (rule === 'flip' ? fireFlip : rule === 'donch' ? fireDonch : (M, i) => signalsOf(rule, M).get(i) || false);

// Schalter für Regel 5: gleichgewichteter Schnitt der 28-Tage-Veränderung aller Märkte, die es an dem Tag (und 28 Tage davor) gab.
// dailyByCoin: { coin: Tageskerzen }. Ergebnis: Map Tagesbeginn → true (Schnitt im Plus) / false.
export function marketSwitch(dailyByCoin) {
  const sum = new Map(), cnt = new Map();
  for (const D of Object.values(dailyByCoin)) {
    for (let d = LT.momDays; d < D.length; d++) {
      if (D[d].t - D[d - LT.momDays].t !== LT.momDays * DAY || !(D[d - LT.momDays].c > 0)) continue; // nur lückenlose 28 Tage
      const t = D[d].t; sum.set(t, (sum.get(t) || 0) + D[d].c / D[d - LT.momDays].c - 1); cnt.set(t, (cnt.get(t) || 0) + 1);
    }
  }
  const out = new Map();
  for (const [t, s] of sum) out.set(t, s / cnt.get(t) > 0);
  return out;
}

// ---- Regel auf einem Markt: ein offener Trade je Markt, Trades zählen nach Einstiegsdatum ----
// allowed: Zeiträume, die gerechnet werden dürfen (['dev'] oder ['dev', 'check']). Alles andere wird nicht einmal simuliert.
export function runRule(M, fire, stichtag, allowed = ['dev']) {
  const trades = []; let busy = -Infinity;
  trades.missed = {}; // 8k: Signale, die verfielen, weil im Markt noch ein Trade offen war (je Zeitraum, nur gezählt)
  for (let i = 0; i < M.n; i++) {
    const t = entryTime(M, i);
    const per = periodOf(t, stichtag);
    if (!allowed.includes(per)) continue;
    const f = fire(M, i);
    if (!f) continue;
    if (t < busy) { trades.missed[per] = (trades.missed[per] || 0) + 1; continue; }
    const s = simAt(M, i);
    if (!s) continue;
    trades.push(f === true ? { ...s, per } : { ...s, per, mk: f.mk }); busy = s.x;
  }
  return trades;
}

export const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const quant = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] : null);

export const monthOf = (t) => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
export const monthLabel = (m) => `${String((m % 12) + 1).padStart(2, '0')}.${Math.floor(m / 12)}`;

// ---- ALTER Zufalls-Vergleich (8i, UNGÜLTIG): je Markt und Kalendermonat so viele Zufalls-Einstiege wie die Regel ----
// Bleibt nur im Code, damit der Test an Zufallskursen zeigen kann, dass er verzerrt (er wählt Markt-Monate im Nachhinein aus).
// Die App benutzt ihn nicht mehr.
// Ergebnis: je Zeitraum Summe und Anzahl je Durchgang (Float64Array / Int32Array der Länge draws)
export function randomMatchedOld(M, ruleTrades, stichtag, allowed = ['dev'], draws = LT.draws) {
  const need = new Map(); // Monat → Anzahl
  for (const t of ruleTrades) need.set(monthOf(t.t), (need.get(monthOf(t.t)) || 0) + 1);
  const months = [...need.keys()].sort((a, b) => a - b);
  const pool = new Map(months.map((m) => [m, []]));
  for (let i = 0; i < M.n; i++) {
    const t = entryTime(M, i), m = monthOf(t);
    if (pool.has(m) && M.dOf[i] + 1 >= LT.minDays && allowed.includes(periodOf(t, stichtag))) pool.get(m).push(i);
  }
  const out = {};
  for (const p of allowed) out[p] = { s: new Float64Array(draws), n: new Int32Array(draws) };
  for (let d = 0; d < draws; d++) {
    const rng = mulberry32((LT.seed ^ hashStr(M.coin + '|rnd') ^ Math.imul(d + 1, 2654435761)) >>> 0);
    const acc = [];
    for (const m of months) {
      const cand = pool.get(m), k = need.get(m);
      let got = 0;
      for (let tries = 0; got < k && cand.length && tries < 30 * k + 60; tries++) {
        const s = simAt(M, cand[Math.floor(rng() * cand.length)]);
        if (!s || acc.some((a) => s.t < a.x && a.t < s.x) || acc.some((a) => a.t === s.t)) continue; // ein offener Trade je Markt
        acc.push(s); got++;
        const per = periodOf(s.t, stichtag);
        out[per].s[d] += s.r; out[per].n[d]++;
      }
    }
  }
  return out;
}

// ---- Zufalls-Vergleich (8j, Änderung 1): zur selben Kerze ein zufälliger zulässiger Markt ----
// Frage: Ist DIESER Markt an DIESER Stelle besser als ein beliebiger zulässiger Markt zur selben Zeit?
// Nutzt nur Wissen, das zum Einstieg vorlag; die Marktphase ist für Regel und Zufall exakt gleich.
// trendUp steht seit 8k in core-ltrules.js (dieselbe Funktion für Regel und gewürfelten Markt).
// Gemeinsame Vorbedingung je Regel (gilt auch für den gewürfelten Markt). Donchian hat keine.
export const preOf = (rule) => (rule === 'donch' || rule === 'r5' ? () => true : trendUp);
// Kann an Kerze i überhaupt eingestiegen werden? (dieselben Bedingungen wie simAt, ohne zu rechnen)
export const canEnter = (M, i) => { const d = M.dOf[i]; return i >= 0 && i + 1 < M.n && d + 1 >= LT.minDays && M.atr[d] > 0 && M.g.c[i] - LT.atrMult * M.atr[d] > 0; };
// Index der Kerze mit Öffnungszeit t (−1 = gibt es in diesem Markt nicht)
export function idxAt(M, t) {
  let lo = 0, hi = M.n - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1, v = M.g.t[mid]; if (v === t) return mid; if (v < t) lo = mid + 1; else hi = mid - 1; }
  return -1;
}
// entries: Einstiege der Regel über alle Märkte [{ t, per }], zeitlich sortiert. Ms: vorbereitete Märkte (Array).
// Ergebnis je Zeitraum: Summe und Anzahl je Durchgang, dazu wie viele Einstiege mangels zulässigem Markt ausgelassen wurden.
export function randomSameCandle(Ms, entries, pre, allowed = ['dev'], draws = LT.draws) {
  const out = {};
  for (const p of allowed) out[p] = { s: new Float64Array(draws), n: new Int32Array(draws), skipped: 0 };
  // Zulässige Märkte je Einstieg einmal bestimmen (hängt nicht vom Durchgang ab, nur „schon im Trade“ kommt je Durchgang dazu)
  const elig = entries.map((e) => { const list = []; for (let m = 0; m < Ms.length; m++) { const i = idxAt(Ms[m], e.t - H4); if (i >= 0 && canEnter(Ms[m], i) && pre(Ms[m], i)) list.push(m, i); } return list; });
  const busy = new Float64Array(Ms.length), free = [];
  for (let d = 0; d < draws; d++) {
    const rng = mulberry32((LT.seed ^ Math.imul(d + 1, 2654435761) ^ 0x51ab) >>> 0);
    busy.fill(-Infinity);
    for (let k = 0; k < entries.length; k++) {
      const e = entries[k], list = elig[k];
      free.length = 0;
      for (let j = 0; j < list.length; j += 2) if (e.t >= busy[list[j]]) free.push(j);
      const s = free.length ? (() => { const j = free[Math.floor(rng() * free.length)]; const x = simAt(Ms[list[j]], list[j + 1]); if (x) busy[list[j]] = x.x; return x; })() : null;
      if (!s) { out[e.per].skipped++; continue; }
      out[e.per].s[d] += s.r; out[e.per].n[d]++;
    }
  }
  for (const p of allowed) out[p].skipped = out[p].skipped / draws; // Ø ausgelassene Einstiege je Durchgang
  return out;
}

// „Rahmen allein“ (nur beschreibend, zählt nicht fürs Urteil): Ø R, wenn man an jeder 5. Kerze jedes Marktes einsteigt
export function plainFrame(Ms, stichtag, allowed = ['dev']) {
  const s = {}, n = {};
  for (const p of allowed) { s[p] = 0; n[p] = 0; }
  for (const M of Ms) {
    for (let i = 0; i < M.n; i += LT.plainStride) {
      const per = periodOf(entryTime(M, i), stichtag);
      if (!allowed.includes(per) || !canEnter(M, i)) continue;
      const had = M.sims.has(i), x = simAt(M, i);
      if (!had) M.sims.delete(i); // nicht aufheben: das wären zu viele Einträge im Speicher
      if (x) { s[per] += x.r; n[per]++; }
    }
  }
  const out = {};
  for (const p of allowed) out[p] = n[p] ? s[p] / n[p] : null;
  return out;
}

// ---- Regel 5 gepaart (8j, Änderung 1): Zufalls-Einstiege über Zeit und Märkte, eingeteilt nach Schalterstand ----
// Kennzahl je Durchgang: Ø R bei Schalter an minus Ø R bei Schalter aus. Der Abstand zum nächsten Einstieg wird gewürfelt
// (im Schnitt LT.every freie Kerzen), ein offener Trade je Markt.
export function pairedSwitch(Ms, sw, stichtag, allowed = ['dev'], draws = LT.draws) {
  const acc = {};
  for (const p of allowed) acc[p] = { sOn: new Float64Array(draws), nOn: new Int32Array(draws), sOff: new Float64Array(draws), nOff: new Int32Array(draws) };
  const logq = Math.log(1 - 1 / LT.every);
  for (const M of Ms) {
    for (let d = 0; d < draws; d++) {
      const rng = mulberry32((LT.seed ^ hashStr(M.coin + '|r5') ^ Math.imul(d + 1, 2654435761)) >>> 0);
      let i = 0;
      while (i < M.n) {
        i += Math.floor(Math.log(1 - rng()) / logq); // so viele freie Kerzen bleiben ungenutzt
        if (i >= M.n) break;
        const t = entryTime(M, i), per = periodOf(t, stichtag), dd = M.dOf[i];
        const on = dd >= 0 ? sw.get(M.daily[dd].t) : undefined;
        const s = allowed.includes(per) && on !== undefined && canEnter(M, i) ? simAt(M, i) : null;
        if (!s) { i++; continue; }
        const a = acc[per];
        if (on) { a.sOn[d] += s.r; a.nOn[d]++; } else { a.sOff[d] += s.r; a.nOff[d]++; }
        while (i < M.n && entryTime(M, i) < s.x) i++; // bis der Trade zu ist
      }
    }
  }
  return acc;
}
// Auswertung eines Zeitraums für Regel 5. days: Schalterstände der Tage im Zeitraum (zeitlich sortiert, true / false)
export function pairResult(a, days) {
  const diffs = []; let sOn = 0, nOn = 0, sOff = 0, nOff = 0;
  for (let d = 0; d < a.sOn.length; d++) {
    sOn += a.sOn[d]; nOn += a.nOn[d]; sOff += a.sOff[d]; nOff += a.nOff[d];
    if (a.nOn[d] > 0 && a.nOff[d] > 0) diffs.push(a.sOn[d] / a.nOn[d] - a.sOff[d] / a.nOff[d]);
  }
  diffs.sort((x, y) => x - y);
  const D = a.sOn.length || 1;
  let flips = 0; for (let k = 1; k < days.length; k++) if (days[k] !== days[k - 1]) flips++;
  return { pair: true, n: Math.round(nOn / D), nOff: Math.round(nOff / D), avg: nOn ? sOn / nOn : null, avgOff: nOff ? sOff / nOff : null,
    diff: mean(diffs), diffLo: quant(diffs, 0.05), diffHi: quant(diffs, 0.95), pct: diffs.length ? (diffs.filter((x) => x > 0).length / diffs.length) * 100 : null,
    draws: diffs.length, share: days.length ? (days.filter(Boolean).length / days.length) * 100 : null, flips, daysN: days.length };
}

// ---- Auswertung ----

// Spanne der Regel: ganze Kalendermonate des Zeitraums neu ziehen (nicht einzelne Trades), 5. bis 95. Perzentil des Ø R
export function monthSpan(trades, range, boots = LT.boot, seed = LT.seed) {
  const m0 = monthOf(range[0]), m1 = monthOf(range[1] - 1), k = m1 - m0 + 1;
  if (!trades.length || k < 1) return { lo: null, hi: null, months: Math.max(0, k) };
  const s = new Float64Array(k), n = new Int32Array(k);
  for (const t of trades) { const j = monthOf(t.t) - m0; if (j >= 0 && j < k) { s[j] += t.r; n[j]++; } }
  const rng = mulberry32(seed >>> 0), avgs = [];
  for (let b = 0; b < boots; b++) {
    let ss = 0, nn = 0;
    for (let j = 0; j < k; j++) { const pick = Math.floor(rng() * k); ss += s[pick]; nn += n[pick]; }
    if (nn) avgs.push(ss / nn);
  }
  avgs.sort((a, b) => a - b);
  return { lo: quant(avgs, 0.05), hi: quant(avgs, 0.95), months: k };
}

// Ergebnis eines Zeitraums: Regel gegen die Verteilung der Zufalls-Durchgänge
// rnd: { s, n } über alle Märkte summiert. pct = Anteil der Durchgänge, die schlechter waren als die Regel.
export function periodResult(trades, rnd, range, plain = null) {
  const n = trades.length, avg = n ? mean(trades.map((t) => t.r)) : null;
  const d = []; for (let i = 0; i < rnd.s.length; i++) if (rnd.n[i] > 0) d.push(rnd.s[i] / rnd.n[i]);
  d.sort((a, b) => a - b);
  const below = avg == null ? 0 : d.filter((x) => x < avg).length;
  const span = monthSpan(trades, range);
  return { n, avg, sum: n ? avg * n : 0, wins: trades.filter((t) => t.r > 0).length, pct: d.length && avg != null ? (below / d.length) * 100 : null,
    rndAvg: mean(d), rndLo: quant(d, 0.05), rndHi: quant(d, 0.95), rndN: d.length ? Math.round(mean([...rnd.n].filter((x) => x > 0))) : 0, draws: d.length, lo: span.lo, hi: span.hi, months: span.months, skipped: rnd.skipped || 0, plain };
}
export const passA = (r) => !!r && r.pct != null && r.pct >= LT.passPct;
export const passB = (r) => !!r && r.avg != null && r.avg > 0;

// Urteil nach Testplan Abschnitt 6. dev / check: Ergebnisse der Zeiträume (check = null, solange nicht angesehen)
export function verdict(rule, dev, check) {
  const kand = RULES[rule]?.kind === 'kandidat';
  const A = { dev: passA(dev), check: check ? passA(check) : null }, B = { dev: passB(dev), check: check ? passB(check) : null };
  const nAll = (dev?.n || 0) + (check?.n || 0);
  const dropped = kand && !A.dev && !B.dev;            // Abbruch: in der Entwicklung bei A und B durchgefallen → abgelegt
  const done = !!check;
  return { A, B, nAll, enough: nAll >= LT.minTrades, dropped,
    canCheck: !!dev && !check && !dropped,
    passed: done && A.dev && A.check && B.dev && B.check && nAll >= LT.minTrades, done };
}

// ---- Ablage der Ergebnisse (klein, im normalen Speicher). Die Prüfung wird je Regel nur EINMAL gerechnet und dann nur noch gezeigt. ----
const KEY = 'wolfdesk.lt';
// Ergebnisse mit dem alten Zufalls-Vergleich (8i) werden nicht mehr gezeigt: Sie sind laut Protokoll ungültig.
// 8k1: Ergebnisse der Regeln 1, 2, 3, 4, 6 gelten nur für die Fassung der Regeln, mit der sie gerechnet wurden.
export const validResults = (r) => Object.fromEntries(Object.entries(r && typeof r === 'object' ? r : {}).filter(([, v]) => v && v.cmp === LT.cmp && (v.dev?.rv == null || v.dev.rv === LTR.ver)));
export function loadResults() { try { return validResults(JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null')); } catch { return {}; } }
export function saveResults(r) { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(r)); return true; } catch { return false; } }

// ---- Ganzer Lauf über alle Märkte. load(tf, coin) liefert die gespeicherten Spalten (core-binance getSeries). ----
// Märkte laden und vorbereiten (gemeinsam für Läufe und Blindprobe)
export async function loadMarkets(meta, { load, onProgress = null, pause = async () => {} } = {}) {
  const coins = meta.markets, dailies = {}, Ms = [];
  let k = 0;
  for (const c of coins) {
    dailies[c] = unpack(await load('1d', c), DAY);
    if (!dailies[c].length) throw new Error(`Tageskerzen von ${c} fehlen`);
    const g = await load('4h', c);
    if (!g?.n) throw new Error(`4H-Kerzen von ${c} fehlen`);
    Ms.push(prepare(c, dailies[c], g));
    if (onProgress) onProgress(++k, coins.length);
    await pause();
  }
  return { dailies, Ms };
}
// Markt-Jahre eines Zeitraums: wie lange konnten die Märkte zusammen überhaupt handeln? (für „Einstiege je Markt und Jahr“)
export function marketYears(Ms, stichtag, per) {
  let n = 0;
  for (const M of Ms) for (let i = 0; i < M.n; i++) if (periodOf(entryTime(M, i), stichtag) === per && canEnter(M, i)) n++;
  return n / (6 * 365);
}

export async function runLongTest(rule, meta, { withCheck = false, load, onProgress = null, pause = async () => {} } = {}) {
  const allowed = withCheck ? ['dev', 'check'] : ['dev'];
  const P = periods(meta.stichtag), range = { dev: P.dev, check: [P.check[0], P.lastEntry] };
  const { dailies, Ms } = await loadMarkets(meta, { load, onProgress, pause });
  const res = {};
  if (rule === 'r5') {
    const sw = marketSwitch(dailies), acc = pairedSwitch(Ms, sw, meta.stichtag, allowed);
    const days = [...sw.keys()].sort((a, b) => a - b);
    for (const p of allowed) res[p] = pairResult(acc[p], days.filter((t) => t >= range[p][0] && t < range[p][1]).map((t) => sw.get(t)));
    return res;
  }
  const fire = fireOf(rule), trades = [], missed = {};
  for (const M of Ms) {
    const list = runRule(M, fire, meta.stichtag, allowed);
    for (const t of list) trades.push({ coin: M.coin, t: t.t, x: t.x, r: t.r, per: t.per, mk: t.mk });
    for (const p of allowed) missed[p] = (missed[p] || 0) + (list.missed[p] || 0);
    await pause();
  }
  trades.sort((a, b) => a.t - b.t || (a.coin < b.coin ? -1 : 1));
  await pause();
  const rnd = randomSameCandle(Ms, trades, preOf(rule), allowed);
  await pause();
  const plain = plainFrame(Ms, meta.stichtag, allowed);
  for (const p of allowed) {
    const mine = trades.filter((t) => t.per === p);
    res[p] = periodResult(mine, rnd[p], range[p], plain[p]);
    if (NEW_RULES.includes(rule)) { // 8k: Merker (nur beschreibend), verfallene Signale, Einstiege je Markt und Jahr
      const my = marketYears(Ms, meta.stichtag, p);
      res[p].mk = markerTable(mine); res[p].missed = missed[p] || 0; res[p].perMY = my > 0 ? mine.length / my : null; res[p].rv = LTR.ver;
    }
  }
  return res;
}

// ---- Blindprobe (8k): je Regel fünf zufällige Einstiege der Entwicklung zum Ansehen, OHNE Ergebnis ----
// Es wird kein Trade simuliert. Gezogen wird mit festem Würfel (dieselben fünf bei jedem Aufruf), nur aus der Entwicklung.
export function blindSample(rule, Ms, stichtag, k = 5) {
  const all = [];
  Ms.forEach((M, m) => { for (const [i, s] of signalsOf(rule, M)) if (periodOf(entryTime(M, i), stichtag) === 'dev' && canEnter(M, i)) all.push({ m, i, s }); });
  const rng = mulberry32((LT.seed ^ hashStr('blind|' + rule) ^ LTR.ver) >>> 0), pick = [];
  for (let n = Math.min(k, all.length); pick.length < n;) { const x = all[Math.floor(rng() * all.length)]; if (!pick.includes(x)) pick.push(x); }
  // 8k1, nur Regel 1: Zeigt keines der fünf Bilder einen Tag, an dem bloß ein Docht die Zone antippt (zählt nicht als Berührung),
  // kommt gezielt ein sechstes dazu, das so einen Tag zeigt. Jensen soll sehen, was der Grundsatz Körper ausschließt.
  const hasWick = (x) => (x.s.viz?.d?.marks || []).some((m) => m.x);
  let extra = null;
  if (rule === 'r1' && pick.length && !pick.some(hasWick)) { const cand = all.filter((x) => hasWick(x) && !pick.includes(x)); if (cand.length) extra = cand[Math.floor(rng() * cand.length)]; }
  const item = (x, ex) => ({ coin: Ms[x.m].coin, i: x.i, t: entryTime(Ms[x.m], x.i), mk: x.s.mk, viz: x.s.viz, M: Ms[x.m], ...(ex ? { extra: true } : {}) });
  return { total: all.length, items: [...pick.map((x) => item(x, false)), ...(extra ? [item(extra, true)] : [])] };
}
const BKEY = 'wolfdesk.ltblind';
export function loadBlind() { try { return JSON.parse(globalThis.localStorage?.getItem(BKEY) || '{}') || {}; } catch { return {}; } }
export function saveBlind(b) { try { globalThis.localStorage?.setItem(BKEY, JSON.stringify(b)); return true; } catch { return false; } }
// Darf die Regel gerechnet werden? Regeln mit Blindprobe erst, wenn Jensen sie für diese Fassung der Regeln bestätigt hat.
export const blindOk = (rule, b = loadBlind()) => !RULES[rule]?.blind || (b[rule]?.ok === true && b[rule]?.rv === LTR.ver);

// Fehlende 4H-Kerzen (8k): beim Laden mitgezählt, damit das Datum der Lücke im Protokoll stehen kann. { Öffnungszeit: Zahl der Märkte }
const GKEY = 'wolfdesk.ltgaps';
export function loadGaps() { try { return JSON.parse(globalThis.localStorage?.getItem(GKEY) || 'null'); } catch { return null; } }
export function saveGaps(x) { try { globalThis.localStorage?.setItem(GKEY, JSON.stringify(x)); return true; } catch { return false; } }
export function gapsText(x = loadGaps()) {
  if (!x) return '';
  const rows = Object.entries(x).map(([t, n]) => [Number(t), n]).sort((a, b) => a[0] - b[0]);
  if (!rows.length) return 'Fehlende 4H-Kerzen: keine';
  const iso = (t) => { const d = new Date(t).toISOString(); return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)} ${d.slice(11, 16)} UTC`; };
  return 'Fehlende 4H-Kerzen: ' + rows.slice(0, 12).map(([t, n]) => `${iso(t)} (${n} ${n === 1 ? 'Markt' : 'Märkte'})`).join(' · ') + (rows.length > 12 ? ` · und ${rows.length - 12} weitere` : '');
}

// ---- Text zum Kopieren ----
const R2 = (v) => { if (v == null || !Number.isFinite(v)) return '–'; const x = Math.round(v * 100) / 100; return (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(2).replace('.', ',') + 'R'; };
export const fmtR = R2;
// 8k: Zusatzzeilen für die Regeln 1, 2, 3, 4, 6 (alles nur beschreibend)
function extraLines(rec) {
  const out = [];
  for (const [name, r] of [['Entwicklung', rec.dev], ['Prüfung', rec.check]]) {
    if (!r || !r.mk) continue;
    out.push(`${name}, beschreibend: ${r.perMY == null ? '–' : r.perMY.toFixed(1).replace('.', ',')} Einstiege je Markt und Jahr · ${r.missed} Signale verfallen (Trade war offen)`);
    for (const [k, rows] of Object.entries(r.mk)) out.push(`${name}, Merker ${k}: ` + rows.map((x) => `${x.v} ${x.n} (Ø ${R2(x.avg)})`).join(' · '));
  }
  return out;
}
export function resultText(rule, rec, version = '') {
  if (!rec?.dev) return '';
  const v = verdict(rule, rec.dev, rec.check || null);
  const line = (name, r) => (r.pair
    ? `${name}: Schalter an Ø ${R2(r.avg)} (rund ${r.n} Trades je Durchgang) · aus Ø ${R2(r.avgOff)} (rund ${r.nOff}) · Differenz Ø ${R2(r.diff)} (${R2(r.diffLo)} bis ${R2(r.diffHi)}) · über 0 in ${r.pct == null ? '–' : Math.round(r.pct)} % der ${r.draws} Durchgänge · Schalter an ${r.share == null ? '–' : Math.round(r.share)} % der ${r.daysN} Tage, ${r.flips} Wechsel`
    : `${name}: ${r.n} Trades · Ø ${R2(r.avg)} (Spanne ${R2(r.lo)} bis ${R2(r.hi)}, ${r.months} Monate) · Treffer ${r.n ? Math.round((r.wins / r.n) * 100) : 0} % · Zufall selbe Kerze Ø ${R2(r.rndAvg)} (${R2(r.rndLo)} bis ${R2(r.rndHi)}, ${r.draws} Durchgänge, je rund ${r.rndN} Trades${r.skipped >= 0.5 ? `, ${Math.round(r.skipped)} ausgelassen` : ''}) · besser als ${r.pct == null ? '–' : Math.round(r.pct)} % der Durchgänge · Rahmen allein Ø ${R2(r.plain)}`);
  const aText = rec.dev.pair ? 'A (an besser als aus in mind. 95 % der Durchgänge)' : 'A (besser als 95 % der Zufalls-Durchgänge)';
  return [
    `WOLF DESK – Testplan-Lauf: ${RULES[rule].label} (${RULES[rule].kind === 'kandidat' ? 'Kandidat' : 'Vergleichsregel'})${version ? ' · ' + version : ''} · Zufalls-Vergleich Fassung ${LT.cmp}`,
    line('Entwicklung', rec.dev),
    rec.check ? line('Prüfung', rec.check) : 'Prüfung: noch nicht angesehen',
    `${aText}: Entwicklung ${v.A.dev ? 'ja' : 'nein'}${rec.check ? ' · Prüfung ' + (v.A.check ? 'ja' : 'nein') : ''}`,
    ...extraLines(rec),
    `B (im Plus nach Kosten): Entwicklung ${v.B.dev ? 'ja' : 'nein'}${rec.check ? ' · Prüfung ' + (v.B.check ? 'ja' : 'nein') : ''} · Trades gesamt ${v.nAll} (nötig ${LT.minTrades})`,
    RULES[rule].kind === 'vergleich' ? `Stand: Vergleichsregel, zählt nicht als Kandidat${v.done ? '' : ' · Prüfung offen'}` : v.dropped ? 'Stand: in der Entwicklung bei A und B durchgefallen → abgelegt' : v.done ? `Stand: ${v.passed ? 'A und B bestanden → darf einmal in den Tresor' : 'nicht bestanden'}` : 'Stand: Prüfung offen',
    'Tresor: gesperrt',
  ].join('\n');
}
