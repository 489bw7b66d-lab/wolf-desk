// Messmaschine für den Testplan (8i): rechnet Regeln auf der langen Historie von Binance. Nur Messung, nichts wird gemeldet.
// Grundlage: TESTPLAN.md (Fassung 3, fest) und TESTPLAN-PROTOKOLL.md (Stichtag, Märkte, Lesarten). Tests in test-longtest.js.
// Gemeinsamer Rahmen für ALLE Einstiege: nur Long · Einstieg zum Schluss der 4H-Signalkerze · Stop 2 x ATR(14) der Tageskerzen ·
// Teilverkäufe bei 2R / 3R / 4R, Rest läuft · Zeit-Ausstieg nach 10 Tagen · ein offener Trade je Markt · Gebühren und Funding.
// In 8i enthalten: die Vergleichsregeln „Neu im Trend“ und Donchian 20/10 sowie Regel 5 (Marktphasen-Schalter).
import { simulateTrade } from './core-backtest.js';
import { ema, atr } from './core-indicators.js';
import { mulberry32, hashStr } from './core-randombase.js';
import { BN, periods, periodOf, unpack } from './core-binance.js';

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
};

export const RULES = {
  flip: { label: 'Neu im Trend', kind: 'vergleich', sub: 'Vergleichsregel' },
  donch: { label: 'Donchian 20/10', kind: 'vergleich', sub: 'Vergleichsregel, im gemeinsamen Rahmen' },
  r5: { label: 'Regel 5 · Marktphasen-Schalter', kind: 'kandidat', sub: 'Zufall nur bei positivem 28-Tage-Momentum' },
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
// Regel 5: Zufalls-Einstieg (Würfel hängt an Markt und Kerzenzeit), aber nur wenn der Schalter am letzten Tagesschluss an war
const roll = (coin, T, salt) => mulberry32((LT.seed ^ hashStr(coin + '|' + salt) ^ Math.imul(Math.floor(T / 60000) | 0, 2246822519)) >>> 0)();
export const fireR5 = (M, i, sw) => {
  const d = M.dOf[i];
  return d >= 0 && sw.get(M.daily[d].t) === true && roll(M.coin, M.g.t[i], 'r5') < 1 / LT.every;
};
export const fireOf = (rule, sw) => (rule === 'flip' ? fireFlip : rule === 'donch' ? fireDonch : (M, i) => fireR5(M, i, sw));

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
  for (let i = 0; i < M.n; i++) {
    const t = entryTime(M, i);
    if (t < busy) continue;
    const per = periodOf(t, stichtag);
    if (!allowed.includes(per) || !fire(M, i)) continue;
    const s = simAt(M, i);
    if (!s) continue;
    trades.push({ ...s, per }); busy = s.x;
  }
  return trades;
}

export const monthOf = (t) => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
export const monthLabel = (m) => `${String((m % 12) + 1).padStart(2, '0')}.${Math.floor(m / 12)}`;

// ---- Zufalls-Vergleich: je Markt und Kalendermonat so viele Zufalls-Einstiege wie die Regel, 200 Durchgänge ----
// Ergebnis: je Zeitraum Summe und Anzahl je Durchgang (Float64Array / Int32Array der Länge draws)
export function randomMatched(M, ruleTrades, stichtag, allowed = ['dev'], draws = LT.draws) {
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

// ---- Auswertung ----
export const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const quant = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] : null);

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
export function periodResult(trades, rnd, range) {
  const n = trades.length, avg = n ? mean(trades.map((t) => t.r)) : null;
  const d = []; for (let i = 0; i < rnd.s.length; i++) if (rnd.n[i] > 0) d.push(rnd.s[i] / rnd.n[i]);
  d.sort((a, b) => a - b);
  const below = avg == null ? 0 : d.filter((x) => x < avg).length;
  const span = monthSpan(trades, range);
  return { n, avg, sum: n ? avg * n : 0, wins: trades.filter((t) => t.r > 0).length, pct: d.length && avg != null ? (below / d.length) * 100 : null,
    rndAvg: mean(d), rndLo: quant(d, 0.05), rndHi: quant(d, 0.95), rndN: d.length ? Math.round(mean([...rnd.n].filter((x) => x > 0))) : 0, draws: d.length, lo: span.lo, hi: span.hi, months: span.months };
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
export function loadResults() { try { const r = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null'); return r && typeof r === 'object' ? r : {}; } catch { return {}; } }
export function saveResults(r) { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(r)); return true; } catch { return false; } }

// ---- Ganzer Lauf über alle Märkte. load(tf, coin) liefert die gespeicherten Spalten (core-binance getSeries). ----
export async function runLongTest(rule, meta, { withCheck = false, load, onProgress = null, pause = async () => {} } = {}) {
  const allowed = withCheck ? ['dev', 'check'] : ['dev'];
  const P = periods(meta.stichtag), coins = meta.markets;
  const dailies = {};
  for (const c of coins) { dailies[c] = unpack(await load('1d', c), DAY); if (!dailies[c].length) throw new Error(`Tageskerzen von ${c} fehlen`); }
  const sw = rule === 'r5' ? marketSwitch(dailies) : null, fire = fireOf(rule, sw);
  const trades = [], rnd = {};
  for (const p of allowed) rnd[p] = { s: new Float64Array(LT.draws), n: new Int32Array(LT.draws) };
  let k = 0;
  for (const c of coins) {
    const g = await load('4h', c);
    if (!g?.n) throw new Error(`4H-Kerzen von ${c} fehlen`);
    const M = prepare(c, dailies[c], g);
    const tr = runRule(M, fire, meta.stichtag, allowed);
    const r = randomMatched(M, tr, meta.stichtag, allowed);
    for (const p of allowed) for (let d = 0; d < LT.draws; d++) { rnd[p].s[d] += r[p].s[d]; rnd[p].n[d] += r[p].n[d]; }
    for (const t of tr) trades.push({ coin: c, t: t.t, x: t.x, r: t.r, per: t.per });
    if (onProgress) onProgress(++k, coins.length);
    await pause();
  }
  const res = { dev: periodResult(trades.filter((t) => t.per === 'dev'), rnd.dev, P.dev) };
  if (withCheck) res.check = periodResult(trades.filter((t) => t.per === 'check'), rnd.check, [P.check[0], P.lastEntry]);
  return res;
}

// ---- Text zum Kopieren ----
const R2 = (v) => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2).replace('.', ',') + 'R');
export function resultText(rule, rec, version = '') {
  if (!rec?.dev) return '';
  const v = verdict(rule, rec.dev, rec.check || null);
  const line = (name, r) => `${name}: ${r.n} Trades · Ø ${R2(r.avg)} (Spanne ${R2(r.lo)} bis ${R2(r.hi)}, ${r.months} Monate) · Treffer ${r.n ? Math.round((r.wins / r.n) * 100) : 0} % · Zufall Ø ${R2(r.rndAvg)} (${R2(r.rndLo)} bis ${R2(r.rndHi)}, ${r.draws} Durchgänge, je rund ${r.rndN} Trades) · besser als ${r.pct == null ? '–' : Math.round(r.pct)} % der Durchgänge`;
  return [
    `WOLF DESK – Testplan-Lauf: ${RULES[rule].label} (${RULES[rule].kind === 'kandidat' ? 'Kandidat' : 'Vergleichsregel'})${version ? ' · ' + version : ''}`,
    line('Entwicklung', rec.dev),
    rec.check ? line('Prüfung', rec.check) : 'Prüfung: noch nicht angesehen',
    `A (besser als 95 % der Zufalls-Durchgänge): Entwicklung ${v.A.dev ? 'ja' : 'nein'}${rec.check ? ' · Prüfung ' + (v.A.check ? 'ja' : 'nein') : ''}`,
    `B (im Plus nach Kosten): Entwicklung ${v.B.dev ? 'ja' : 'nein'}${rec.check ? ' · Prüfung ' + (v.B.check ? 'ja' : 'nein') : ''} · Trades gesamt ${v.nAll} (nötig ${LT.minTrades})`,
    RULES[rule].kind === 'vergleich' ? `Stand: Vergleichsregel, zählt nicht als Kandidat${v.done ? '' : ' · Prüfung offen'}` : v.dropped ? 'Stand: in der Entwicklung bei A und B durchgefallen → abgelegt' : v.done ? `Stand: ${v.passed ? 'A und B bestanden → darf einmal in den Tresor' : 'nicht bestanden'}` : 'Stand: Prüfung offen',
    'Tresor: gesperrt',
  ].join('\n');
}
