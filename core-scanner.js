// Holt Kerzen, analysiert alle Timeframes und baut das Signal zusammen.
// Hintergrund-Abrufe (Live-Überwachung) laufen gedrosselt, damit das Hyperliquid-Limit nicht reißt.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { INTERVAL_MS, closedCandles, analyzeTimeframe, scoreTimeframe, combineScores, decide, tradePlan, keyLevels } from './core-signals.js';

const candleCache = new Map(); // "coin|tf" -> { at, candles }
let volumes = { at: 0, map: {}, ctx: {} };
let gate = Promise.resolve(), pauseUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wartet, bis ein Hintergrund-Abruf erlaubt ist (Mindestabstand + Pause nach Rate-Limit).
function throttled() {
  const next = gate.then(async () => {
    const wait = Math.max(0, pauseUntil - Date.now());
    if (wait) await sleep(wait);
    await sleep(CONFIG.signals.hot.requestGapMs);
  });
  gate = next.catch(() => {});
  return next;
}

export async function getCandles(coin, tf, background = false) {
  const key = coin + '|' + tf;
  const hit = candleCache.get(key);
  const maxAge = tf === '1d' ? 30 * 60e3 : Math.min(INTERVAL_MS[tf], 5 * 60e3);
  if (hit && Date.now() - hit.at < maxAge) return hit.candles;
  if (background) await throttled();
  const now = Date.now();
  let raw;
  try {
    raw = await hl.candles(coin, tf, now - INTERVAL_MS[tf] * (CONFIG.signals.candles + 2), now);
  } catch (e) {
    if (/Rate-Limit/.test(e.message)) pauseUntil = Date.now() + 60e3;
    throw e;
  }
  const candles = closedCandles(raw, now);
  candleCache.set(key, { at: now, candles });
  return candles;
}

// Tagesvolumen, Open Interest und Kurse aller Märkte (ein Abruf je Bereich, 10 Min. zwischengespeichert)
export async function getMarketCtx() {
  if (Date.now() - volumes.at < 10 * 60e3) return volumes;
  const map = {}, ctx = {};
  const res = await Promise.allSettled(CONFIG.dexes.map((d) => hl.metaCtx(d)));
  res.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value)) return;
    const [meta, ctxs] = r.value;
    const dex = CONFIG.dexes[i];
    (meta?.universe || []).forEach((u, j) => {
      const name = dex && !u.name.startsWith(dex + ':') ? `${dex}:${u.name}` : u.name;
      const c = ctxs?.[j] || {};
      map[name] = Number(c.dayNtlVlm);
      ctx[name] = { volume: Number(c.dayNtlVlm), oi: Number(c.openInterest) * Number(c.markPx), price: Number(c.markPx), delisted: !!u.isDelisted };
    });
  });
  volumes = { at: Date.now(), map, ctx };
  return volumes;
}

// Komplette Analyse eines Marktes. Der Tageschart wird immer mitgeladen (200er Tageslinie, Golden/Death Cross).
export async function analyzeMarket(coin, modeKey, background = false) {
  const mode = CONFIG.signals.modes[modeKey];
  const tfs = mode.tfs.includes('1d') ? mode.tfs : [...mode.tfs, '1d'];
  const series = [];
  for (const tf of tfs) series.push(await getCandles(coin, tf, background)); // nacheinander, schont das Limit
  const vols = await getMarketCtx().catch(() => ({ map: {} }));
  mode.tfs.forEach((tf, i) => {
    if (series[i].length < 60) throw new Error(`Zu wenig Kursdaten auf ${tf} (${series[i].length} Kerzen)`);
  });
  const all = series.map((c, i) => (c.length >= 60 ? analyzeTimeframe(c, tfs[i]) : null));
  const analyses = all.slice(0, 3);
  const daily = all[tfs.indexOf('1d')];
  const scores = analyses.map(scoreTimeframe);
  let total = combineScores(scores, undefined, daily);
  // Golden/Death Cross im Tageschart zählt immer, auch wenn 1D nicht zu den drei Modus-Timeframes gehört
  const dailyStrong = daily && !mode.tfs.includes('1d') ? daily.events.filter((e) => e.strong) : [];
  dailyStrong.forEach((e) => { total = { ...total, [e.dir]: Math.min(100, total[e.dir] + 10) }; });
  const dir = decide(total, CONFIG.signals);
  const setup = analyses[1];
  const levels = keyLevels(analyses.slice(0, 2), setup.close);
  const plan = tradePlan(dir, setup, levels);
  const volume = vols.map[coin];
  const warnings = [];
  if (Number.isFinite(volume) && volume < CONFIG.signals.minDayVolumeUsd) warnings.push({ type: 'liq', text: 'Geringe Liquidität, Indikatoren weniger aussagekräftig' });
  if (analyses.some((a) => a.ema200 == null)) warnings.push({ type: 'data', text: 'Kurze Historie, EMA 200 nicht auf allen Timeframes berechenbar' });

  const events = [...analyses.flatMap((a) => a.events.map((e) => ({ ...e, tf: a.tf }))), ...dailyStrong.map((e) => ({ ...e, tf: '1d' }))];
  const waves = [...analyses, ...(daily && !mode.tfs.includes('1d') ? [daily] : [])]
    .filter((a) => a.elliott).map((a) => ({ tf: a.tf, ...a.elliott }));
  return {
    coin, mode: modeKey, tfs: mode.tfs, analyses, daily, scores, total, dir, levels, events, waves, volume,
    plan: plan && { ...plan, warnings: [...plan.warnings, ...warnings] },
    warnings: plan ? [] : warnings, at: Date.now(), lastClose: Math.max(...series.slice(0, 3).map((c) => c.at(-1).T)),
  };
}

// "Hitze" eines Signals für die Top-5-Auswahl: Score plus frische, starke Ereignisse in Signalrichtung.
export function heat(r) {
  if (!r || r.dir === 'neutral') return 0;
  const score = r.total[r.dir];
  const ev = r.events.filter((e) => e.dir === r.dir).reduce((n, e) => n + (e.strong ? 12 : e.barsAgo <= 2 ? 5 : 2), 0);
  const ew = r.waves.some((w) => w.bias === r.dir && w.wave === 3) ? 8 : r.waves.some((w) => w.bias === r.dir) ? 4 : 0;
  const gap = r.total[r.dir] - r.total[r.dir === 'long' ? 'short' : 'long'];
  return Math.round(score + Math.min(ev, 25) + ew + gap * 0.2);
}
