// Marktüberblick für die Startseite: Fear & Greed, Gesamt-Marktkapitalisierung, BTC-Dominanz, Markt-Bias.
// Reine Funktionen (fngLabel, biasFrom) haben Tests in test-market.js.
import { getCandles } from './core-scanner.js';
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
    const res = await fetch(url, { signal: ctrl.signal });
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
  const [c4, cd] = [await getCandles('BTC', '4h'), await getCandles('BTC', '1d')];
  const s4 = c4.length >= 60 ? scoreTimeframe(analyzeTimeframe(c4, '4h')) : null;
  const sd = cd.length >= 60 ? scoreTimeframe(analyzeTimeframe(cd, '1d')) : null;
  return biasFrom(s4, sd);
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
