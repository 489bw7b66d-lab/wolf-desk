// Handelbare Märkte: deine eigene Liste (z. B. was über Ledger handelbar ist, Hyperliquid kann das nicht liefern).
// Gespeichert auf diesem Gerät, über „Für den Wächter übernehmen“ auch in my-settings.js.
// Ist die Liste leer, scannen Heiße Coins und Wächter wie bisher die Top-Coins. Tests in test-tradeable.js.
import { CONFIG } from './config.js';
import { LEDGER_MARKETS } from './ledger-markets.js';

const KEY = 'wolfdesk.tradeable';
export const TRADEABLE_MAX = 300;
const listeners = new Set();

export function getTradeable() {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null');
    if (Array.isArray(v)) return v.slice(0, TRADEABLE_MAX);
  } catch { /* Standard verwenden */ }
  return (CONFIG.tradeable || []).slice(0, TRADEABLE_MAX);
}

function save(list) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(list)); } catch { /* egal */ }
  listeners.forEach((fn) => { try { fn(list); } catch (e) { console.error(e); } });
}

export function addTradeable(coin) {
  const list = getTradeable();
  if (list.includes(coin)) return 'Schon in der Liste';
  if (list.length >= TRADEABLE_MAX) return `Maximal ${TRADEABLE_MAX} Märkte`;
  save([...list, coin].sort(byName));
  return null;
}
export const removeTradeable = (coin) => save(getTradeable().filter((c) => c !== coin));
export const clearTradeable = () => save([]);
// Deine Ledger-Liste (ledger-markets.js) übernehmen, z. B. wenn vorher schon eine eigene Liste gespeichert war
export const loadLedger = () => save([...LEDGER_MARKETS].slice(0, TRADEABLE_MAX));
export const isLedgerList = (list) => list.length === LEDGER_MARKETS.length && LEDGER_MARKETS.every((c) => list.includes(c));
export const LEDGER_COUNT = LEDGER_MARKETS.length;
export const onTradeable = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// Sortierung nach Anzeigename (ohne Börsen-Präfix), damit xyz-Märkte zwischen den anderen stehen
const shown = (c) => String(c).replace(/^[a-z]+:/, '').toUpperCase();
export const byName = (a, b) => shown(a).localeCompare(shown(b));

// Suche über alle Marktnamen: exakte Treffer zuerst, dann Anfang des Namens, dann irgendwo im Namen.
// Groß-/Kleinschreibung und Börsen-Präfix egal („gold“ findet „xyz:GOLD“, „pepe“ findet „kPEPE“).
export function matchMarkets(query, names, exclude = [], max = 8) {
  const q = String(query || '').trim().toUpperCase();
  if (!q) return [];
  const skip = new Set(exclude);
  const rank = (n) => {
    const s = shown(n), bare = s.replace(/^K(?=[A-Z])/, '');
    if (s === q || bare === q) return 0;
    if (s.startsWith(q) || bare.startsWith(q)) return 1;
    if (s.includes(q)) return 2;
    return 9;
  };
  return names.filter((n) => !skip.has(n)).map((n) => [n, rank(n)]).filter(([, r]) => r < 9)
    .sort((a, b) => a[1] - b[1] || byName(a[0], b[0])).slice(0, max).map(([n]) => n);
}

// Nur Märkte, die es wirklich gibt (vertippte oder abgeschaltete fallen raus)
export const knownTradeable = (list, allNames) => (list || []).filter((c) => allNames.includes(c));
