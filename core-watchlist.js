// Bearbeitbare Watchlist (max. 15 Märkte), gespeichert auf diesem Gerät.
import { CONFIG } from './config.js';

const KEY = 'wolfdesk.watchlist';
export const WATCHLIST_MAX = 15;
const listeners = new Set();

export function getWatchlist() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(v) && v.length) return v.slice(0, WATCHLIST_MAX);
  } catch { /* Standard verwenden */ }
  return CONFIG.watchlist.slice(0, WATCHLIST_MAX);
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* egal */ }
  listeners.forEach((fn) => { try { fn(list); } catch (e) { console.error(e); } });
}

// Rückgabe: null bei Erfolg, sonst Grund
export function addToWatchlist(coin) {
  const list = getWatchlist();
  if (list.includes(coin)) return 'Schon auf der Watchlist';
  if (list.length >= WATCHLIST_MAX) return `Maximal ${WATCHLIST_MAX} Märkte, erst einen entfernen`;
  save([...list, coin]);
  return null;
}

export function removeFromWatchlist(coin) {
  save(getWatchlist().filter((c) => c !== coin));
}

export const onWatchlist = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
