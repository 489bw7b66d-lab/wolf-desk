import { engine2FromSlices } from './core-engine2.js';
// Backtest: spielt den Signalgeber auf vergangenen Kerzen nach, ohne in die Zukunft zu schauen.
// Pro Zeitpunkt sieht die Berechnung nur Kerzen, die damals schon abgeschlossen waren.
// simulateTrade und summarize sind reine Funktionen, Tests in test-backtest.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { INTERVAL_MS, closedCandles } from './core-signals.js';
import { signalFromSeries, modeTfs } from './core-scanner.js';
import { bmFlip, bmPlan, BM_EVENT } from './core-benchmark.js';
import { atr, adx, ema } from './core-indicators.js';
import { trailStop } from './core-trail.js';
import { exitVariants } from './core-exitcompare.js';

export const BT = {
  days: { swing: 180, intraday: 45, scalp: 14 }, // Testzeitraum je Stil (Hyperliquid liefert max. 5000 Kerzen)
  lookback: 260,     // Kerzen je Timeframe für die Berechnung, wie live
  entryBars: 6,      // so viele Setup-Kerzen bleibt eine Limit-Order in der Zone gültig
  maxBars: 60,       // spätestens nach so vielen Setup-Kerzen wird der Rest zum Marktpreis geschlossen
  feePct: 0.045,     // Taker-Gebühr je Seite (wird durch deinen echten Satz ersetzt, sobald bekannt)
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eventName = (n) => n.replace(/ \(.*\)$/, '').replace(/ ×.*$/, '');

// Verlauf eines Trades nachspielen. plan: { dir, zone, entry, stop, tps }, path: Kerzen NACH dem Signal (feinster Timeframe).
// opts: { fillNow: Kurs liegt schon in der Zone, nowPx, validUntil, maxUntil, splits,
//         trailFn(c, hits, stop, entryPx, fillTime) → neuer Stop (Nachziehen nach Struktur), stepTrail: false = ohne Stufen-Regel }
// Konservativ: Berührt eine Kerze Stop und Ziel gleichzeitig, zählt der Stop.
export function simulateTrade(plan, path, opts = {}) {
  const long = plan.dir === 'long', sg = long ? 1 : -1;
  const splits = opts.splits || CONFIG.exitPlan.map((x) => x.pct / 100);
  const touchLow = (c, p) => (long ? c.l <= p : c.h >= p);   // Kurs läuft gegen uns bis p
  const touchHigh = (c, p) => (long ? c.h >= p : c.l <= p);  // Kurs läuft für uns bis p
  let i = 0, entryPx = null, fillTime = null;

  if (opts.fillNow) { entryPx = opts.nowPx; fillTime = path[0]?.t ?? null; }
  else {
    for (; i < path.length; i++) {
      const c = path[i];
      if (opts.validUntil && c.t > opts.validUntil) return { filled: false, reason: 'nicht ausgelöst', end: c.t };
      if (touchHigh(c, plan.tps[0]) && !touchLow(c, plan.entry)) return { filled: false, reason: 'ohne Einstieg gelaufen', end: c.T };
      if (touchLow(c, plan.entry)) { entryPx = plan.entry; fillTime = c.t; break; }
    }
    if (entryPx == null) return { filled: false, reason: 'nicht ausgelöst', end: path.at(-1)?.T ?? null };
  }

  const R = Math.abs(entryPx - plan.stop);
  if (!(R > 0)) return { filled: false, reason: 'ungültig', end: fillTime };
  let stop = plan.stop, open = 1, r = 0, hits = 0, outcome = 'offen', exitTime = null, lastT = fillTime;
  const exitAt = (px, share) => { r += share * ((px - entryPx) * sg) / R; open -= share; };

  // In der Einstiegskerze einer Limit-Order kann nur noch der Stop greifen (Reihenfolge unbekannt)
  if (!opts.fillNow) {
    if (touchLow(path[i], stop)) { exitAt(stop, open); return done('stop', path[i].T); }
    i++;
  }
  for (; i < path.length && open > 1e-9; i++) {
    const c = path[i];
    if (opts.maxUntil && c.t > opts.maxUntil) { exitAt(path[i - 1]?.c ?? entryPx, open); return done('zeit', c.t); }
    if (touchLow(c, stop)) { exitAt(stop, open); return done(hits >= 2 ? (hits > 2 ? 'nachgezogen' : 'einstieg') : 'stop', c.T); }
    while (hits < plan.tps.length && touchHigh(c, plan.tps[hits])) {
      exitAt(plan.tps[hits], splits[hits]);
      hits++; lastT = c.T;
      // Nachzieh-Stop wie im Ausstiegsplan: ab TP2 auf Einstieg, danach eine Stufe hinter dem letzten Ziel
      if (hits === 2 && (entryPx - stop) * sg > 0) stop = entryPx;
      else if (hits > 2 && opts.stepTrail !== false) stop = plan.tps[hits - 2];
    }
    // Variante „Struktur“: nach jeder Kerze prüfen, ob ein neues höheres Tief (Short: tieferes Hoch) den Stop verbessert
    if (opts.trailFn && hits >= 1) {
      const ns = opts.trailFn(c, hits, stop, entryPx, fillTime);
      if (ns != null && (ns - stop) * sg > 0 && (c.c - ns) * sg > 0) stop = ns;
    }
  }
  if (open > 1e-9) { exitAt(path.at(-1)?.c ?? entryPx, open); return done('offen', path.at(-1)?.T ?? fillTime); }
  return done('tp4', lastT);

  function done(o, t) {
    outcome = o; exitTime = t;
    const feeR = (2 * BT.feePct / 100) * entryPx / R;
    return { filled: true, entryPx, fillTime, exitTime, R, hits, outcome, grossR: r, r: r - feeR };
  }
}

// Kennzahlen aus einer Liste von Trades { r, hits, score, events, seal, dir }
export function summarize(trades) {
  const n = trades.length;
  if (!n) return { n: 0 };
  const stat = (list) => {
    const k = list.length, wins = list.filter((t) => t.r > 0).length;
    return { n: k, winRate: k ? (wins / k) * 100 : null, avgR: k ? list.reduce((s, t) => s + t.r, 0) / k : null };
  };
  const wins = trades.filter((t) => t.r > 0), losses = trades.filter((t) => t.r <= 0);
  const gw = wins.reduce((s, t) => s + t.r, 0), gl = -losses.reduce((s, t) => s + t.r, 0);
  let cum = 0, peak = 0, dd = 0;
  const curve = trades.map((t) => { cum += t.r; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); return cum; });

  const buckets = [['65–74', 0, 75], ['75–84', 75, 85], ['85+', 85, 101]]
    .map(([label, lo, hi]) => ({ label, ...stat(trades.filter((t) => t.score >= lo && t.score < hi)) })).filter((b) => b.n);
  const names = new Set(trades.flatMap((t) => t.events || []));
  const byEvent = [...names].map((name) => {
    const w = trades.filter((t) => t.events?.includes(name)), wo = trades.filter((t) => !t.events?.includes(name));
    const a = stat(w), b = stat(wo);
    return { name, ...a, edge: b.n ? a.avgR - b.avgR : null };
  }).filter((e) => e.n >= 3).sort((a, b) => (b.edge ?? -99) - (a.edge ?? -99));

  return {
    ...stat(trades), wins: wins.length,
    tp1Rate: (trades.filter((t) => t.hits >= 1).length / n) * 100,
    totalR: cum, profitFactor: gl > 0 ? gw / gl : null, maxDdR: dd, curve,
    byScore: buckets, byEvent,
    seal: { with: stat(trades.filter((t) => t.seal)), without: stat(trades.filter((t) => !t.seal)) },
    long: stat(trades.filter((t) => t.dir === 'long')), short: stat(trades.filter((t) => t.dir === 'short')),
  };
}

// Historische Kerzen laden (je Timeframe ein Abruf)
export async function loadHistory(coin, modeKey, days = BT.days[modeKey]) {
  const now = Date.now(), out = [];
  for (const tf of modeTfs(modeKey)) {
    const start = now - days * 864e5 - (BT.lookback + 2) * INTERVAL_MS[tf];
    out.push(closedCandles(await hl.candles(coin, tf, start, now), now));
    await sleep(350);
  }
  return out;
}

// Letzter Index mit c.T <= t (Kerzen aufsteigend sortiert), ab Startindex vorwärts
function advance(list, idx, t) {
  while (idx + 1 < list.length && list[idx + 1].T <= t) idx++;
  return idx;
}

// Backtest für einen Markt und Stil. series in der Reihenfolge von modeTfs(modeKey).
export async function runBacktest(coin, modeKey, series, { days = BT.days[modeKey], onProgress, shouldStop, engine = 1, regime = null } = {}) {
  const allTfs = modeTfs(modeKey); // Reihenfolge der Kerzenreihen (Engine 2 braucht sie beim Namen)
  const tfs = CONFIG.signals.modes[modeKey].tfs;
  const setup = series[1], fine = series[2];
  const from = Date.now() - days * 864e5;
  const setupMs = INTERVAL_MS[tfs[1]];
  const ptr = series.map(() => -1);
  const trades = [], missed = [];
  const setupAtr = atr(setup, CONFIG.indicators.atrPeriod);
  let busyUntil = 0, done = 0;
  const usedImpulses = new Set(); // Engine 2 (A2): ein Signal je Impuls
  const steps = setup.filter((c) => c.T >= from);

  let breath = Date.now();
  for (const bar of steps) {
    if (shouldStop?.()) break;
    done++;
    // Spätestens alle 40 ms dem iPhone Luft lassen (Anzeige, Tippen), sonst wirkt die App kurz eingefroren (5c)
    if (Date.now() - breath > 40) { onProgress?.(done / steps.length); await sleep(0); breath = Date.now(); }
    if (bar.T < busyUntil) continue;
    const t = bar.T;
    const slices = series.map((list, k) => {
      ptr[k] = advance(list, ptr[k], t);
      return list.slice(Math.max(0, ptr[k] + 1 - BT.lookback), ptr[k] + 1);
    });
    let r;
    try { r = engine === 4 ? benchmarkFlipFromSlices(allTfs, slices) : engine === 3 ? benchmarkFromSlices(allTfs, slices) : engine === 2 ? engine2FromSlices(modeKey, allTfs, slices) : signalFromSeries(coin, modeKey, slices, undefined, { ignoreGate: true }); } catch { continue; }
    const p = r.plan;
    if (!p) continue;
    if (p.impulseKey) { if (usedImpulses.has(p.impulseKey)) continue; usedImpulses.add(p.impulseKey); }
    const close = r.analyses[1].close;
    const fillNow = close >= p.zone[0] && close <= p.zone[1];
    const startIdx = advance(fine, ptr[2], t) + 1;
    const path = fine.slice(startIdx);
    if (!path.length) break;
    const sim = simulateTrade(p, path, {
      fillNow, nowPx: close,
      validUntil: t + BT.entryBars * setupMs,
      maxUntil: t + BT.maxBars * setupMs,
    });
    const dIdx = allTfs.indexOf('1d');
    const meta = {
      time: t, dir: p.dir, score: r.total[p.dir], method: p.method,
      adx: dIdx >= 0 ? adx(slices[dIdx], 14) : null, // 7c: Marktphase beim Einstieg (Tages-ADX)
      events: [...new Set(r.events.filter((e) => e.dir === p.dir).map((e) => eventName(e.name)))],
      seal: (r.confirms || []).some((c) => c.dir === p.dir),
      gate: r.gate ? { known: r.gate.known, mild: r.gate.mild, mittel: r.gate.mittel, streng: r.gate.streng } : null,
    };
    if (sim.filled) {
      // Dieselben Einstiege noch einmal mit „Nachziehen nach Struktur“ (Vergleich der Ausstiegsregel, 4d)
      const alt = simulateTrade(p, path, { fillNow, nowPx: close, validUntil: t + BT.entryBars * setupMs, maxUntil: t + BT.maxBars * setupMs, stepTrail: false, trailFn: structureTrail(p, setup, setupAtr) });
      // 8c (nur Messung): dieselben Einstiege mit zwei weiteren Ausstiegen, dazu die Marktphase von BTC beim Einstieg
      const ex = exitVariants(simulateTrade, p, path, { fillNow, nowPx: close, validUntil: t + BT.entryBars * setupMs, maxUntil: t + BT.maxBars * setupMs });
      trades.push({ ...meta, ...sim, alt: alt.filled ? { r: alt.r, outcome: alt.outcome, hits: alt.hits } : null, ex, btc: regime ? regime(sim.fillTime ?? t) : null });
      busyUntil = sim.exitTime;
    }
    else { missed.push({ ...meta, reason: sim.reason }); busyUntil = sim.end || t + BT.entryBars * setupMs; }
  }
  onProgress?.(1);
  return { coin, mode: modeKey, days, trades, missed, from, to: setup.at(-1)?.T, engine };
}

// Nachziehen nach Struktur für den Backtest: nur Setup-Kerzen, die zum Zeitpunkt c schon abgeschlossen waren
export function structureTrail(plan, setup, setupAtr) {
  let k = -1;
  return (c, hits, stop, entryPx, fillTime) => {
    while (k + 1 < setup.length && setup[k + 1].T <= c.T) k++;
    if (k < 10) return null;
    const tr = trailStop({ side: plan.dir, entry: entryPx, stop, mark: c.c, hits, candles: setup.slice(Math.max(0, k - 80), k + 1), atrValue: setupAtr[k], openedAt: fillTime, feePct: BT.feePct });
    return tr ? tr.stop : null;
  };
}

// Vergleich der Ausstiegsregeln über dieselben Trades: Plan (Stufen) gegen Struktur
export function compareTrail(trades) {
  const both = trades.filter((t) => t.alt);
  if (!both.length) return null;
  const sum = (a) => a.reduce((n, x) => n + x, 0);
  const plan = sum(both.map((t) => t.r)), struct = sum(both.map((t) => t.alt.r));
  return { n: both.length, plan, struct, avgPlan: plan / both.length, avgStruct: struct / both.length, better: both.filter((t) => t.alt.r > t.r + 1e-9).length, worse: both.filter((t) => t.alt.r < t.r - 1e-9).length };
}

// Deinen echten Taker-Satz übernehmen (z. B. 0.00035 → 0,035 % je Seite)
export function setFeeRate(taker) { if (Number.isFinite(taker) && taker >= 0) BT.feePct = taker * 100; }

// Entwicklung / Bestätigung (7a): erste zwei Drittel des Zeitraums gegen das letzte Drittel (Swing: 120 / 60 Tage)
export function splitPeriods(trades, from, to) {
  if (!trades?.length || !(to > from)) return null;
  const cut = from + (to - from) * 2 / 3;
  const part = (list) => ({ n: list.length, avgR: list.length ? list.reduce((a, t) => a + t.r, 0) / list.length : null, sum: list.reduce((a, t) => a + t.r, 0) });
  return { cut, dev: part(trades.filter((t) => t.time < cut)), conf: part(trades.filter((t) => t.time >= cut)) };
}

// Maßstab (7c): stumpfe Trendfolge zum Vergleich – Long, solange Tages-EMA 20 über EMA 100 und Kurs darüber.
// Stop 2 ATR (Tag), Ziele 2R/3R/4R/6R. Schlagen unsere Engines das nicht, haben wir uns verkünstelt.
export function benchmarkFromSlices(tfs, slices) {
  const D = slices[tfs.indexOf('1d')], G = slices[1];
  if (!D || D.length < 110 || !G?.length) return { plan: null };
  const closes = D.map((c) => c.c), e20 = ema(closes, 20).at(-1), e100 = ema(closes, 100).at(-1), px = G.at(-1).c;
  const a = atr(D, 14).at(-1);
  if (!(e20 > e100) || !(px > e20) || !(a > 0)) return { plan: null };
  const R = 2 * a, stop = px - R;
  const plan = { dir: 'long', entry: px, stop, zone: [px, px], tps: [px + 2 * R, px + 3 * R, px + 4 * R, px + 6 * R], R, stopDistPct: (R / px) * 100, method: 'benchmark', warnings: [] };
  return { plan, dir: 'long', total: { long: 50, short: 0 }, events: [{ name: 'Trendfolge EMA 20/100', dir: 'long' }], confirms: [], gate: null, analyses: [null, { close: px }] };
}

// Maßstab · neu im Trend (8b): dieselbe Regel, aber Einstieg nur an der ersten Setup-Kerze, an der die Bedingung neu erfüllt ist.
// Das ist die Regel, nach der der Wächter seit 8b meldet (core-benchmark.js).
export function benchmarkFlipFromSlices(tfs, slices) {
  const D = slices[tfs.indexOf('1d')], G = slices[1];
  const fl = bmFlip(D, G);
  const plan = fl.flip ? bmPlan(fl.now) : null;
  if (!plan) return { plan: null };
  return { plan, dir: 'long', total: { long: 50, short: 0 }, events: [{ name: BM_EVENT, dir: 'long' }], confirms: [], gate: null, analyses: [null, { close: fl.now.px }] };
}

// Marktphase (7c): Ergebnis je Tages-ADX beim Einstieg, dazu „was wäre mit Filter“
export function byRegime(trades) {
  const part = (list) => ({ n: list.length, avgR: list.length ? list.reduce((s, t) => s + t.r, 0) / list.length : null, sum: list.reduce((s, t) => s + t.r, 0) });
  const known = trades.filter((t) => t.adx != null);
  return {
    side: part(known.filter((t) => t.adx < 20)), mid: part(known.filter((t) => t.adx >= 20 && t.adx < 25)), trend: part(known.filter((t) => t.adx >= 25)),
    min20: part(known.filter((t) => t.adx >= 20)), min25: part(known.filter((t) => t.adx >= 25)), all: part(trades),
  };
}
