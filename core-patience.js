// Geduld-Statistik: Was hat frühes Aussteigen gekostet oder gespart?
// Ein Trade gilt als „vorzeitig geschlossen“, wenn du zwischen Stop und TP1 ausgestiegen bist.
// Danach wird geprüft, ob der Kurs später TP1/TP2 erreicht hätte (verpasst) oder zuerst den Stop (gespart).
// Reine Funktionen (earlyExit, patienceStats) haben Tests in test-patience.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { closedCandles } from './core-signals.js';
import { computeAutoPlan } from './core-autoplan.js';

export const PATIENCE_KEY = 'wolfdesk.patience';
export const windowDays = (style = CONFIG.positions?.autoStyle || 'swing') => (style === 'intraday' ? 7 : 14);

// trade: aus tradeHistory (abgeschlossen), plan: { stop, tps }, candles: Kerzen ab dem Schluss
export function earlyExit(trade, plan, candles, now = Date.now(), days = 14) {
  if (trade?.closedAt == null || !plan?.tps?.length || !(plan.stop > 0) || !trade.exits?.length) return null;
  const long = trade.side === 'long', s = long ? 1 : -1;
  const qty = trade.exits.reduce((a, e) => a + e.sz, 0);
  if (!(qty > 0)) return null;
  const exitPx = trade.exits.reduce((a, e) => a + e.px * e.sz, 0) / qty;
  const tp1 = plan.tps[0], tp2 = plan.tps[1] ?? null, tol = exitPx * 0.003;
  const early = (tp1 - exitPx) * s > tol && (exitPx - plan.stop) * s > tol;
  if (!early) return { early: false };
  const base = { early: true, coin: trade.coin, side: trade.side, closedAt: trade.closedAt, exitPx, qty, tp1, tp2, stop: plan.stop };
  let reached1 = false;
  const end = trade.closedAt + days * 864e5;
  for (const c of candles || []) {
    if (c.T <= trade.closedAt || c.t > end) continue;
    const hitStop = long ? c.l <= plan.stop : c.h >= plan.stop;
    if (hitStop) {
      // Stop zuerst: frühes Aussteigen hat Geld gespart (sofern TP1 nicht schon vorher kam)
      return reached1 ? { ...base, outcome: 'tp1', missed: qty * (tp1 - exitPx) * s, saved: 0 }
        : { ...base, outcome: 'stop', missed: 0, saved: qty * (exitPx - plan.stop) * s };
    }
    if (tp2 != null && (long ? c.h >= tp2 : c.l <= tp2)) return { ...base, outcome: 'tp2', missed: qty * (tp2 - exitPx) * s, saved: 0 };
    if (long ? c.h >= tp1 : c.l <= tp1) reached1 = true;
  }
  if (reached1 && now >= end) return { ...base, outcome: 'tp1', missed: qty * (tp1 - exitPx) * s, saved: 0 };
  if (now < end) return { ...base, outcome: 'offen', missed: 0, saved: 0, reached1 };
  return { ...base, outcome: 'keins', missed: 0, saved: 0 };
}

export function patienceStats(list) {
  const early = (list || []).filter((x) => x?.early);
  const done = early.filter((x) => x.outcome !== 'offen');
  const missed = done.reduce((a, x) => a + x.missed, 0), saved = done.reduce((a, x) => a + x.saved, 0);
  return {
    n: early.length, done: done.length, pending: early.length - done.length,
    later: done.filter((x) => x.outcome === 'tp1' || x.outcome === 'tp2').length,
    later2: done.filter((x) => x.outcome === 'tp2').length,
    stopFirst: done.filter((x) => x.outcome === 'stop').length,
    none: done.filter((x) => x.outcome === 'keins').length,
    missed, saved, net: saved - missed,
  };
}

// Auswertung laden: Plan je Trade (eigene Ziele/Signal über getTargets, sonst automatischer Plan) + Kerzen nach dem Schluss.
// cache: Objekt mit fertigen Ergebnissen (werden nicht erneut berechnet)
export async function evaluatePatience(trades, { getTargets = () => null, cache = {}, now = Date.now(), max = 20 } = {}) {
  const style = CONFIG.positions?.autoStyle || 'swing';
  const days = windowDays(style), tf = style === 'intraday' ? '15m' : '1h';
  const list = (trades || []).filter((t) => t.closedAt && !t.partial && now - t.closedAt < 60 * 864e5)
    .sort((a, b) => b.closedAt - a.closedAt).slice(0, max);
  const out = [];
  for (const t of list) {
    const key = `${t.coin}|${t.closedAt}`;
    if (cache[key] && cache[key].outcome !== 'offen') { out.push(cache[key]); continue; }
    try {
      let plan = getTargets(t);
      if (!plan?.tps?.length || !(plan.stop > 0)) {
        const auto = await computeAutoPlan(t.coin, t.side, t.entryAvg, t.openedAt, style);
        plan = auto && { stop: auto.stop, tps: auto.tps };
      }
      if (!plan) continue;
      const raw = await hl.candles(t.coin, tf, t.closedAt - 36e5, Math.min(now, t.closedAt + days * 864e5));
      const r = earlyExit(t, plan, closedCandles(raw, Infinity), now, days);
      if (r) { cache[key] = r; out.push(r); }
    } catch { /* einzelner Trade fehlgeschlagen */ }
  }
  return out;
}
