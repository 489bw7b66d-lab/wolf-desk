// Marktüberblick für die Startseite: Fear & Greed, Gesamt-Marktkapitalisierung, BTC-Dominanz, Markt-Bias.
// Reine Funktionen (fngLabel, biasFrom, breadthFrom, ratioCandles, compositeBias) haben Tests in test-market.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { getCandles, getMarketCtx } from './core-scanner.js';
import { getUniverse } from './core-universe.js';
import { ema } from './core-indicators.js';
import { analyzeTimeframe, scoreTimeframe } from './core-signals.js';

const FNG_URL = 'https://api.alternative.me/fng/?limit=2';
const GLOBAL_URL = 'https://api.coingecko.com/api/v3/global';
export const ETF_URL = 'https://farside.co.uk/btc/';
const CACHE_MS = 10 * 60e3;

export const market = { fng: null, global: null, bias: null, errors: {}, at: 0 };
const listeners = new Set();
export const onMarket = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => { try { fn(market); } catch (e) { console.error(e); } });

// Fear & Greed: 0–100 in fünf Stufen
export function fngLabel(v) {
  if (v == null || !Number.isFinite(v)) return null;
  if (v < 25) return { text: 'Extreme Angst', cls: 'bad' };
  if (v < 45) return { text: 'Angst', cls: 'warn' };
  if (v <= 55) return { text: 'Neutral', cls: 'muted' };
  if (v <= 75) return { text: 'Gier', cls: 'ok' };
  return { text: 'Extreme Gier', cls: 'ok' };
}

// Stand des Fear-&-Greed-Werts. Die Quelle (alternative.me) rechnet einmal täglich neu (00:00 UTC),
// älter als 36 Std. heißt: Die Quelle hängt.
export function fngStand(ts, now = Date.now()) {
  if (!(ts > 0)) return null;
  const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const diffDays = Math.round((new Date(new Date(now).toDateString()) - new Date(new Date(ts).toDateString())) / 864e5);
  const text = diffDays <= 0 ? 'Stand heute' : diffDays === 1 ? 'Stand gestern' : `Stand ${day(ts)}`;
  return { text, stale: now - ts > 36 * 3600e3 };
}

// Markt-Bias aus dem BTC-Trend: −100 (klarer Short-Markt) bis +100 (klarer Long-Markt).
// Tageschart zählt 60 %, 4H 40 %, jeweils Long-Score minus Short-Score.
export function biasFrom(score4h, score1d) {
  if (!score4h && !score1d) return null;
  const d = (s) => (s ? s.long - s.short : 0);
  const w4 = score4h ? 0.4 : 0, wd = score1d ? 0.6 : 0;
  const value = Math.max(-100, Math.min(100, Math.round((d(score4h) * w4 + d(score1d) * wd) / (w4 + wd))));
  const label = value >= 40 ? 'Long-Markt' : value >= 15 ? 'Leicht bullisch' : value > -15 ? 'Neutral' : value > -40 ? 'Leicht bärisch' : 'Short-Markt';
  const cls = value >= 15 ? 'long' : value <= -15 ? 'short' : 'muted';
  return { value, label, cls };
}

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (e) {
    throw e.name === 'AbortError' ? new Error('Zeitüberschreitung') : e;
  } finally { clearTimeout(timer); }
}

async function loadFng() {
  const j = await getJson(FNG_URL);
  const [now, prev] = j?.data || [];
  const v = Number(now?.value);
  if (!Number.isFinite(v)) throw new Error('Keine Daten');
  return { value: v, prev: Number(prev?.value), ts: Number(now.timestamp) * 1000 };
}

async function loadGlobal() {
  const d = (await getJson(GLOBAL_URL))?.data;
  const cap = Number(d?.total_market_cap?.usd);
  if (!Number.isFinite(cap)) throw new Error('Keine Daten');
  return { cap, change24h: Number(d.market_cap_change_percentage_24h_usd), btcDom: Number(d.market_cap_percentage?.btc), ethDom: Number(d.market_cap_percentage?.eth) };
}

async function loadBias() {
  const btc4 = await getCandles('BTC', '4h'), btcD = await getCandles('BTC', '1d');
  const eth4 = await getCandles('ETH', '4h'), ethD = await getCandles('ETH', '1d');
  const parts = {
    btc: valueOf(scoreOf(btc4, '4h'), scoreOf(btcD, '1d')),
    eth: valueOf(scoreOf(eth4, '4h'), scoreOf(ethD, '1d')),
    ratio: valueOf(null, scoreOf(ratioCandles(ethD, btcD), '1d')),
    breadth: market.breadth?.value ?? null,
  };
  // Marktbreite läuft im Hintergrund nach und aktualisiert den Tacho, sobald sie fertig ist
  if (!breadthRun) {
    breadthRun = loadBreadth().then((b) => {
      market.breadth = b;
      market.bias = compositeBias({ ...market.bias?.parts, breadth: b?.value ?? null });
      emit();
    }).catch(() => { market.breadthProgress = null; }).finally(() => { setTimeout(() => { breadthRun = null; }, 30 * 60e3); });
  }
  return compositeBias(parts);
}

// ===== Zusammengesetzter Markt-Bias =====
const labelOf = (value) => ({
  value,
  label: value >= 40 ? 'Long-Markt' : value >= 15 ? 'Leicht bullisch' : value > -15 ? 'Neutral' : value > -40 ? 'Leicht bärisch' : 'Short-Markt',
  cls: value >= 15 ? 'long' : value <= -15 ? 'short' : 'muted',
});

// Marktbreite: Anteil der Märkte, deren Tagesschluss über der EMA liegt. Wert −100 (alle darunter) bis +100 (alle darüber)
export function breadthFrom(dailyList, emaLen = 50) {
  const usable = (dailyList || []).filter((c) => c?.length >= emaLen + 5);
  if (usable.length < 5) return null;
  const above = usable.filter((c) => { const e = ema(c.map((x) => x.c), emaLen).at(-1); return e != null && c.at(-1).c > e; }).length;
  const pct = (above / usable.length) * 100;
  return { pct, n: usable.length, value: Math.round((pct - 50) * 2) };
}

// ETH/BTC als eigene Kerzenreihe (nur gemeinsame Tage)
export function ratioCandles(eth, btc) {
  const b = new Map((btc || []).map((c) => [c.t, c]));
  return (eth || []).filter((c) => b.has(c.t) && b.get(c.t).c > 0).map((c) => {
    const x = b.get(c.t), r = c.c / x.c, o = c.o / x.o;
    return { t: c.t, T: c.T, o, h: Math.max(o, r), l: Math.min(o, r), c: r, v: 0 };
  });
}

// Gewichteter Mittelwert der verfügbaren Bausteine (fehlende werden herausgerechnet)
export function compositeBias(parts, weights = CONFIG.market.biasWeights) {
  const keys = Object.keys(weights).filter((k) => parts[k] != null && Number.isFinite(parts[k]) && weights[k] > 0);
  if (!keys.length) return null;
  const w = keys.reduce((s, k) => s + weights[k], 0);
  const value = Math.max(-100, Math.min(100, Math.round(keys.reduce((s, k) => s + parts[k] * weights[k], 0) / w)));
  return { ...labelOf(value), parts, used: keys };
}

const scoreOf = (candles, tf) => (candles?.length >= 60 ? scoreTimeframe(analyzeTimeframe(candles, tf)) : null);
const valueOf = (s4, sd) => biasFrom(s4, sd)?.value ?? null;

// Marktbreite im Hintergrund (gedrosselt), Fortschritt wird laufend angezeigt
let breadthRun = null;
async function loadBreadth() {
  const names = [];
  for (const dex of CONFIG.dexes.filter((d) => !d)) {
    const m = await hl.meta(dex).catch(() => null);
    (m?.universe || []).filter((u) => !u.isDelisted).forEach((u) => names.push(u.name));
  }
  const ctx = await getMarketCtx().catch(() => ({ ctx: {} }));
  const uni = await getUniverse(names, ctx.ctx);
  const coins = uni.coins.slice(0, CONFIG.market.breadthTop);
  const list = [];
  for (const [i, c] of coins.entries()) {
    try { list.push(await getCandles(c, '1d', true)); } catch { /* einzelner Markt fehlt */ }
    market.breadthProgress = { done: i + 1, total: coins.length };
    if ((i + 1) % 10 === 0) emit();
  }
  market.breadthProgress = null;
  return breadthFrom(list, CONFIG.market.breadthEma);
}

export async function refreshMarket(force = false) {
  if (!force && Date.now() - market.at < CACHE_MS) return market;
  market.at = Date.now();
  const jobs = { fng: loadFng, global: loadGlobal, bias: loadBias };
  await Promise.all(Object.entries(jobs).map(async ([k, fn]) => {
    try { market[k] = await fn(); delete market.errors[k]; }
    catch (e) { market.errors[k] = e.message; }
    emit();
  }));
  return market;
}
