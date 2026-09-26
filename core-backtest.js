// Backtest: spielt den Signalgeber auf vergangenen Kerzen nach, ohne in die Zukunft zu schauen.
// Pro Zeitpunkt sieht die Berechnung nur Kerzen, die damals schon abgeschlossen waren.
// simulateTrade und summarize sind reine Funktionen, Tests in test-backtest.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { INTERVAL_MS, closedCandles } from './core-signals.js';
import { signalFromSeries, modeTfs } from './core-scanner.js';

export const BT = {
  days: { swing: 180, intraday: 45, scalp: 14 }, // Testzeitraum je Stil (Hyperliquid liefert max. 5000 Kerzen)
  lookback: 260,     // Kerzen je Timeframe für die Berechnung, wie live
  entryBars: 6,      // so viele Setup-Kerzen bleibt eine Limit-Order in der Zone gültig
  maxBars: 60,       // spätestens nach so vielen Setup-Kerzen wird der Rest zum Marktpreis geschlossen
  feePct: 0.045,     // Hyperliquid Taker-Gebühr je Seite
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eventName = (n) => n.replace(/ \(.*\)$/, '').replace(/ ×.*$/, '');

// Verlauf eines Trades nachspielen. plan: { dir, zone, entry, stop, tps }, path: Kerzen NACH dem Signal (feinster Timeframe).
// opts: { fillNow: Kurs liegt schon in der Zone, nowPx, validUntil, maxUntil, splits }
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
      if (hits === 2) stop = entryPx;
      else if (hits > 2) stop = plan.tps[hits - 2];
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
export async function runBacktest(coin, modeKey, series, { days = BT.days[modeKey], onProgress, shouldStop } = {}) {
  const tfs = CONFIG.signals.modes[modeKey].tfs;
  const setup = series[1], fine = series[2];
  const from = Date.now() - days * 864e5;
  const setupMs = INTERVAL_MS[tfs[1]];
  const ptr = series.map(() => -1);
  const trades = [], missed = [];
  let busyUntil = 0, done = 0;
  const steps = setup.filter((c) => c.T >= from);

  for (const bar of steps) {
    if (shouldStop?.()) break;
    done++;
    if (done % 25 === 0) { onProgress?.(done / steps.length); await sleep(0); }
    if (bar.T < busyUntil) continue;
    const t = bar.T;
    const slices = series.map((list, k) => {
      ptr[k] = advance(list, ptr[k], t);
      return list.slice(Math.max(0, ptr[k] + 1 - BT.lookback), ptr[k] + 1);
    });
    let r;
    try { r = signalFromSeries(coin, modeKey, slices); } catch { continue; }
    const p = r.plan;
    if (!p) continue;
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
    const meta = {
      time: t, dir: p.dir, score: r.total[p.dir], method: p.method,
      events: [...new Set(r.events.filter((e) => e.dir === p.dir).map((e) => eventName(e.name)))],
      seal: (r.confirms || []).some((c) => c.dir === p.dir),
    };
    if (sim.filled) { trades.push({ ...meta, ...sim }); busyUntil = sim.exitTime; }
    else { missed.push({ ...meta, reason: sim.reason }); busyUntil = sim.end || t + BT.entryBars * setupMs; }
  }
  onProgress?.(1);
  return { coin, mode: modeKey, days, trades, missed, from, to: setup.at(-1)?.T };
}
