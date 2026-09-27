// Automatischer Plan für jede offene Position (auch eigene Trades ohne Signal).
// Rechnet mit den Kerzen ZUM ZEITPUNKT DES EINSTIEGS nach denselben Regeln wie der Signalgeber:
// Fibonacci-Plan, sonst ATR-Plan; verankert am echten Einstiegskurs. Dadurch bleibt der Plan stabil.
// Reine Funktion planFromSeries hat Tests in test-autoplan.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { analyzeTimeframe, tradePlan, keyLevels, closedCandles, INTERVAL_MS } from './core-signals.js';
import { withEntry } from './core-risk.js';

export const AUTO_KEY = 'wolfdesk.autoplans';
const LOOKBACK = 260;

// series: Kerzen [Trend, Setup] bis zum Einstieg. Ergebnis: { stop, tps: [4], method } oder null
export function planFromSeries(side, entry, series, tfs = ['4h', '1h']) {
  if (!(entry > 0) || !series?.[1]?.length || series[1].length < 60) return null;
  const analyses = series.slice(0, 2).map((c, i) => (c?.length >= 60 ? analyzeTimeframe(c, tfs[i]) : null)).filter(Boolean);
  const setup = analyses.at(-1);
  if (!setup?.atr) return null;
  const long = side === 'long', s = long ? 1 : -1;
  const levels = keyLevels(analyses, setup.close);
  const plan = withEntry(tradePlan(side, setup, levels), entry);
  const beyond = (x) => (x - entry) * s > 0;
  if (plan && plan.tps.filter(beyond).length >= 3 && (entry - plan.stop) * s > 0) {
    return { stop: plan.stop, tps: plan.tps.filter(beyond).slice(0, 4), method: plan.method === 'fib' ? 'Fibonacci' : 'ATR' };
  }
  // Fallback: ATR-Plan direkt am Einstieg (Stop 1,5 ATR, Ziele 1R bis 4R)
  const R = 1.5 * setup.atr;
  return { stop: entry - s * R, tps: [1, 2, 3, 4].map((k) => entry + s * k * R), method: 'ATR' };
}

// Kerzen bis zum Einstieg laden und Plan berechnen
export async function computeAutoPlan(coin, side, entry, openedAt, style = CONFIG.positions?.autoStyle || 'swing') {
  const tfs = CONFIG.signals.modes[style]?.tfs || CONFIG.signals.modes.swing.tfs;
  const series = [];
  for (const tf of tfs.slice(0, 2)) {
    const raw = await hl.candles(coin, tf, openedAt - (LOOKBACK + 2) * INTERVAL_MS[tf], openedAt);
    series.push(closedCandles(raw, openedAt));
  }
  const p = planFromSeries(side, entry, series, tfs.slice(0, 2));
  return p && { ...p, side, entry, openedAt, style, source: 'auto', at: Date.now() };
}

// App: Zwischenspeicher je Trade (Markt + Eröffnung + Stil), Berechnung im Hintergrund
const running = new Set();
function readCache() { try { return JSON.parse(globalThis.localStorage?.getItem(AUTO_KEY) || '{}'); } catch { return {}; } }
export function getAutoPlan(coin, side, entry, openedAt) {
  if (!openedAt || !(entry > 0)) return null;
  const style = CONFIG.positions?.autoStyle || 'swing';
  const key = `${coin}|${openedAt}|${style}`;
  const cache = readCache();
  if (cache[key]) return cache[key];
  if (!running.has(key)) {
    running.add(key);
    computeAutoPlan(coin, side, entry, openedAt, style).then((p) => {
      if (!p) return;
      const c = readCache();
      c[key] = p;
      // alte Einträge begrenzen
      const keys = Object.keys(c);
      if (keys.length > 60) keys.slice(0, keys.length - 60).forEach((k) => delete c[k]);
      try { localStorage.setItem(AUTO_KEY, JSON.stringify(c)); } catch { /* egal */ }
    }).catch(() => {}).finally(() => { setTimeout(() => running.delete(key), 5 * 60e3); });
  }
  return null;
}
