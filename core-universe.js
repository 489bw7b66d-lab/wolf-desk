// Welche Coins überwacht werden: Top N nach Market Cap (CoinGecko), soweit auf Hyperliquid handelbar.
// Fällt CoinGecko aus, nehmen wir die Hyperliquid-Märkte mit dem höchsten Open Interest.
import { CONFIG } from './config.js';

const KEY = 'wolfdesk.universe';
const MAX_AGE = 6 * 3600e3;
const STABLES = new Set(['USDT', 'USDC', 'DAI', 'USDE', 'FDUSD', 'TUSD', 'PYUSD', 'USDS', 'USD1', 'BUSD', 'USDD', 'FRAX']);

// CoinGecko-Symbole auf Hyperliquid-Namen abbilden (z. B. PEPE → kPEPE bei 1000er-Einheiten)
export function mapSymbols(symbols, hlNames) {
  const names = new Set(hlNames);
  const out = [];
  for (const raw of symbols) {
    const s = String(raw || '').toUpperCase();
    if (!s || STABLES.has(s)) continue;
    const hit = names.has(s) ? s : names.has('k' + s) ? 'k' + s : null;
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

async function fetchCoinGecko(n) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${n}&page=1&sparkline=false`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('CoinGecko Status ' + res.status);
    const data = await res.json();
    return data.map((c) => c.symbol);
  } finally {
    clearTimeout(timer);
  }
}

export async function getUniverse(hlNames, ctx) {
  const n = CONFIG.signals.hot.topN;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* egal */ }
  if (cached && Date.now() - cached.at < MAX_AGE && cached.symbols?.length) {
    return { source: 'CoinGecko Top ' + n, coins: mapSymbols(cached.symbols, hlNames) };
  }
  try {
    const symbols = await fetchCoinGecko(n);
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), symbols })); } catch { /* egal */ }
    return { source: 'CoinGecko Top ' + n, coins: mapSymbols(symbols, hlNames) };
  } catch {
    if (cached?.symbols?.length) return { source: 'CoinGecko (älterer Stand)', coins: mapSymbols(cached.symbols, hlNames) };
    const coins = hlNames.filter((c) => !ctx[c]?.delisted)
      .sort((a, b) => (ctx[b]?.oi || 0) - (ctx[a]?.oi || 0)).slice(0, n);
    return { source: 'Hyperliquid, Top ' + n + ' nach Open Interest (CoinGecko nicht erreichbar)', coins };
  }
}
