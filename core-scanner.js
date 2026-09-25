// Holt Kerzen, analysiert alle drei Timeframes und baut das Signal zusammen.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { INTERVAL_MS, closedCandles, analyzeTimeframe, scoreTimeframe, combineScores, decide, tradePlan, keyLevels } from './core-signals.js';

const candleCache = new Map(); // "coin|tf" -> { at, candles }
let volumes = { at: 0, map: {} };

async function getCandles(coin, tf) {
  const key = coin + '|' + tf;
  const hit = candleCache.get(key);
  // Neu laden erst, wenn seit dem letzten Abruf eine neue Kerze geschlossen sein kann
  if (hit && Date.now() - hit.at < Math.min(INTERVAL_MS[tf], 5 * 60e3)) return hit.candles;
  const now = Date.now();
  const raw = await hl.candles(coin, tf, now - INTERVAL_MS[tf] * (CONFIG.signals.candles + 2), now);
  const candles = closedCandles(raw, now);
  candleCache.set(key, { at: now, candles });
  return candles;
}

async function getVolumes() {
  if (Date.now() - volumes.at < 10 * 60e3) return volumes.map;
  const map = {};
  const res = await Promise.allSettled(CONFIG.dexes.map((d) => hl.metaCtx(d)));
  res.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value)) return;
    const [meta, ctxs] = r.value;
    const dex = CONFIG.dexes[i];
    (meta?.universe || []).forEach((u, j) => {
      const name = dex && !u.name.startsWith(dex + ':') ? `${dex}:${u.name}` : u.name;
      map[name] = Number(ctxs?.[j]?.dayNtlVlm);
    });
  });
  volumes = { at: Date.now(), map };
  return map;
}

export async function analyzeMarket(coin, modeKey) {
  const mode = CONFIG.signals.modes[modeKey];
  const [series, vols] = await Promise.all([
    Promise.all(mode.tfs.map((tf) => getCandles(coin, tf))),
    getVolumes().catch(() => ({})),
  ]);
  series.forEach((c, i) => {
    if (c.length < 60) throw new Error(`Zu wenig Kursdaten auf ${mode.tfs[i]} (${c.length} Kerzen)`);
  });
  const analyses = series.map(analyzeTimeframe);
  const scores = analyses.map(scoreTimeframe);
  const total = combineScores(scores);
  const dir = decide(total, CONFIG.signals);
  const setup = analyses[1];
  const levels = keyLevels(analyses.slice(0, 2), setup.close);
  const plan = tradePlan(dir, setup, levels);
  const volume = vols[coin];
  const warnings = [...(plan?.warnings || [])];
  if (Number.isFinite(volume) && volume < CONFIG.signals.minDayVolumeUsd) warnings.push({ type: 'liq', text: 'Geringe Liquidität, Indikatoren weniger aussagekräftig' });
  if (analyses.some((a) => a.ema200 == null)) warnings.push({ type: 'data', text: 'Kurze Historie, EMA 200 nicht auf allen Timeframes berechenbar' });
  return {
    coin, mode: modeKey, tfs: mode.tfs, analyses, scores, total, dir, plan: plan && { ...plan, warnings }, levels,
    warnings: plan ? [] : warnings, volume, at: Date.now(), lastClose: Math.max(...series.map((c) => c.at(-1).T)),
  };
}
