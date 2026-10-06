// Zufalls-Maßstab (8f, nur Messung): Was verdient man mit ZUFÄLLIGEN Einstiegen, wenn Stop und Ausstieg dieselben sind wie bei
// „Neu im Trend“? Damit lässt sich trennen, was die Regel leistet und was nur die Marktrichtung ist.
// Vorab festgelegt (05.10.2026): nur Long · Einstieg an zufälligen Setup-Kerzen · Stop 2 × ATR 14 (Tag) · Ziele 2R / 3R / 4R / 6R ·
// Zeit-Ausstieg nach 60 Setup-Kerzen · dieselben Kosten · 20 Durchgänge mit festem Startwert (wiederholbar).
// Messlatte: „Neu im Trend“ muss in BEIDEN Zeiträumen über der Spanne der 20 Durchgänge liegen, sonst gilt der Vorteil als Marktrichtung.
// Reine Funktionen bis auf runRandomBase (rechnet mit bereits geladenen Kerzen). Tests in test-randombase.js.
import { CONFIG } from './config.js';
import { atr } from './core-indicators.js';
import { INTERVAL_MS } from './core-signals.js';
import { modeTfs } from './core-scanner.js';
import { BT, simulateTrade } from './core-backtest.js';
import { afterFunding, FUNDING } from './core-btmetrics.js';
import { DC, simulateDonchian } from './core-donchian.js';

// every: im Schnitt ein Einstieg je so vielen freien Setup-Kerzen (ergibt etwa so viele Trades wie „Neu im Trend“)
// everyDays (8g): Zufalls-Vergleich für Donchian: im Schnitt ein Einstieg je so vielen freien Tagesschlüssen
export const RND = { draws: 20, seed: 20261006, everyDays: 40, every: { swing: 280, intraday: 280, scalp: 700 }, minDays: 110, atrPeriod: 14, atrMult: 2, tps: [2, 3, 4, 6] };

// Kleiner, wiederholbarer Zufallsgenerator (mulberry32): gleicher Startwert = gleiche Zahlenfolge
export function mulberry32(a) {
  let s = a >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashStr(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Startwert je Markt, Stil und Durchgang: unabhängig von der Reihenfolge der Märkte und vom „Weitermachen“
export const drawSeed = (coin, modeKey, d, seed = RND.seed) => (seed ^ hashStr(coin + '|' + modeKey) ^ Math.imul(d + 1, 2654435761)) >>> 0;

// Würfel für EINE Kerze: hängt nur von Startwert und Schlusszeit der Kerze ab. So fällt die Entscheidung für dieselbe Kerze
// in jedem Lauf gleich aus, auch wenn der Testzeitraum inzwischen ein Stück weitergerückt ist.
export const rollAt = (seedD, T) => mulberry32((seedD ^ Math.imul(Math.floor(T / 60000) | 0, 2246822519)) >>> 0)();

// Derselbe Plan wie beim Maßstab, nur ohne Trend-Bedingung. D: abgeschlossene Tageskerzen bis zum Einstieg, px: Einstiegskurs.
export function randomPlan(D, px, cfg = RND) {
  if (!D || D.length < cfg.minDays || !(px > 0)) return null;
  const a = atr(D, cfg.atrPeriod).at(-1);
  if (!(a > 0)) return null;
  const R = cfg.atrMult * a, stop = px - R;
  if (!(stop > 0)) return null;
  return { dir: 'long', entry: px, stop, zone: [px, px], tps: cfg.tps.map((k) => px + k * R), R, stopDistPct: (R / px) * 100, method: 'random', warnings: [] };
}

// 8g: Plan für den Zufalls-Vergleich zu Donchian: Einstieg zum Tagesschluss, Stop 2 x ATR, keine Ziele (wie core-donchian.js, nur ohne Ausbruch)
export function randomDonchianPlan(D, cfg = DC) {
  if (!D || D.length < Math.max(cfg.entry + 1, cfg.atr + 2)) return null;
  const a = atr(D, cfg.atr).at(-1), px = D.at(-1).c;
  if (!(a > 0) || !(px > 0)) return null;
  const R = cfg.atrMult * a;
  if (!(px - R > 0)) return null;
  return { dir: 'long', entry: px, stop: px - R, zone: [px, px], tps: [], R, stopDistPct: (R / px) * 100, method: 'random-donchian', warnings: [] };
}

const lastIdx = (list, t) => { let lo = 0, hi = list.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m].T <= t) { k = m; lo = m + 1; } else hi = m - 1; } return k; };

// Ein Markt, alle Durchgänge. series: Kerzen je Zeitebene des Stils (wie loadHistory sie liefert).
// Rückgabe wie runBacktest (trades = Durchgang 1 als Beispiel), dazu rnd: je Durchgang [n, Summe, n Entw., Summe Entw., n Best., Summe Best.].
// exit 'donchian' (8g, Engine 7): Einstieg nur an der ersten Setup-Kerze nach einem Tagesschluss, Ausstieg wie Donchian (Stop oder Schluss unter dem 10-Tage-Tief).
export async function runRandomBase(coin, modeKey, series, { days = BT.days[modeKey], regime = null, cfg = RND, onProgress, shouldStop, simOpts = {}, exit = 'time', engine } = {}) {
  const dc = exit === 'donchian' || engine === 7;
  const tfs = CONFIG.signals.modes[modeKey].tfs;
  const setup = series[1], fine = series[2], daily = series[modeTfs(modeKey).indexOf('1d')] ?? null;
  const setupMs = INTERVAL_MS[tfs[1]];
  const from = Date.now() - days * 864e5, to = setup.at(-1)?.T;
  const cut = from + (to - from) * 2 / 3;
  const steps = setup.filter((c) => c.T >= from);
  const p = dc ? 1 / cfg.everyDays : 1 / (cfg.every[modeKey] || 280);
  const rnd = [], first = [];
  let breath = Date.now();
  for (let d = 0; d < cfg.draws; d++) {
    if (shouldStop?.()) break;
    const seedD = drawSeed(coin, modeKey + (dc ? '|dc' : ''), d, cfg.seed);
    const agg = [0, 0, 0, 0, 0, 0];
    let busyUntil = 0;
    for (const bar of steps) {
      if (Date.now() - breath > 40) { onProgress?.((d + 0.5) / cfg.draws); await new Promise((r) => setTimeout(r, 0)); breath = Date.now(); }
      if (bar.T < busyUntil) continue;
      const t = bar.T;
      if (!daily) continue;
      const k = lastIdx(daily, t);
      if (k < 0) continue;
      let plan, roll;
      if (dc) {
        // wie beim Donchian-Signal: nur die erste Setup-Kerze nach dem Tagesschluss zählt; gewürfelt wird je Tagesschluss
        if (!(t - daily[k].T < setupMs)) continue;
        roll = rollAt(seedD, daily[k].T);
      } else roll = rollAt(seedD, t);
      if (roll >= p) continue;
      const D = daily.slice(Math.max(0, k + 1 - BT.lookback), k + 1);
      plan = dc ? randomDonchianPlan(D) : randomPlan(D, bar.c, cfg);
      if (!plan) continue;
      const path = fine.slice(lastIdx(fine, t) + 1);
      if (!path.length) break;
      const sim = afterFunding(dc
        ? simulateDonchian(plan, path, daily, { t, feePct: BT.feePct })
        : simulateTrade(plan, path, { fillNow: true, nowPx: bar.c, validUntil: t + BT.entryBars * setupMs, maxUntil: t + BT.maxBars * setupMs, ...simOpts }), 'long');
      if (!sim.filled) continue;
      busyUntil = sim.exitTime;
      agg[0]++; agg[1] += sim.r;
      if (t < cut) { agg[2]++; agg[3] += sim.r; } else { agg[4]++; agg[5] += sim.r; }
      if (d === 0) first.push({ time: t, dir: 'long', score: 50, events: ['Zufalls-Einstieg'], seal: false, gate: null, ...sim, alt: null, ex: null, btc: regime ? regime(sim.fillTime ?? t) : null });
    }
    rnd.push(agg);
  }
  return { coin, mode: modeKey, days, trades: first, missed: [], from, to, engine: dc ? 7 : 6, fundingPctDay: FUNDING.pctPerDay, rnd };
}

// Durchgänge mehrerer Märkte zusammenzählen
export function sumDraws(list) {
  const out = [];
  for (const rnd of list) (rnd || []).forEach((a, d) => { out[d] = out[d] || [0, 0, 0, 0, 0, 0]; a.forEach((x, i) => { out[d][i] += x; }); });
  return out;
}

// Schnitt und Spanne über die Durchgänge, je Zeitraum. Ø R eines Durchgangs = Summe / Trades.
export function randomSummary(rnd) {
  if (!rnd?.length) return null;
  const part = (ni, si) => {
    const avgs = rnd.filter((a) => a[ni] > 0).map((a) => a[si] / a[ni]);
    if (!avgs.length) return null;
    return { mean: avgs.reduce((s, x) => s + x, 0) / avgs.length, min: Math.min(...avgs), max: Math.max(...avgs), n: rnd.reduce((s, a) => s + a[ni], 0) / rnd.length };
  };
  return { draws: rnd.length, all: part(0, 1), dev: part(2, 3), conf: part(4, 5) };
}

// Urteil nach der vorab festgelegten Messlatte. rule: { dev, conf } = Ø R der Regel je Zeitraum.
export function randomVerdict(sum, rule) {
  if (!sum?.dev || !sum?.conf || rule?.dev == null || rule?.conf == null) return null;
  const above = { dev: rule.dev > sum.dev.max, conf: rule.conf > sum.conf.max };
  const below = { dev: rule.dev < sum.dev.min, conf: rule.conf < sum.conf.min };
  return { above, below, pass: above.dev && above.conf };
}

// 8g: Beide Messlatten getrennt. rule: { all, dev, conf, n } = Ø R der Regel gesamt und je Zeitraum, n = Trades.
// A (besser als Zufall): in beiden Zeiträumen über der Spanne. B (verdient Geld): gesamt und in beiden Zeiträumen im Plus, genug Trades.
// Scharf wird nur, was A und B besteht.
export const MIN_TRADES = 300;
export function benchmarks(sum, rule, minTrades = MIN_TRADES) {
  if (!rule || rule.dev == null || rule.conf == null || rule.all == null) return null;
  const v = randomVerdict(sum, rule);
  const pos = (key) => (!v ? null : v.above[key] ? 'above' : v.below[key] ? 'below' : 'inside');
  const A = v ? { pass: v.pass, dev: pos('dev'), conf: pos('conf') } : null;
  const B = { pass: rule.all > 0 && rule.dev > 0 && rule.conf > 0 && rule.n >= minTrades, all: rule.all > 0, dev: rule.dev > 0, conf: rule.conf > 0, enough: rule.n >= minTrades };
  return { A, B, pass: !!A?.pass && B.pass };
}
