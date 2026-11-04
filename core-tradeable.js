// Handelbare Märkte. 8y (Jensen, 04.11.2026: „finde die beste Lösung“, Ledger zeigt jetzt 299 Perps): Ledger reicht durch, was
// Hyperliquid listet (Hauptbörse und xyz). Standard ist deshalb „automatisch“: alle Märkte, die Hyperliquid gerade listet, ohne
// abgeschaltete, bei jedem Laden und jedem Wächter-Lauf neu abgefragt. Ausnahmen (z. B. was Ledger doch nicht anbietet) lassen sich abwählen.
// Gespeichert als Liste: '*' = automatisch, '-NAME' = Ausnahme. Ohne '*' ist es eine eigene Liste wie bisher; leer = Top-Coins.
// Gespeichert auf diesem Gerät, über „Für den Wächter übernehmen“ auch in my-settings.js. Tests in test-tradeable.js.
import { CONFIG } from './config.js';
import { LEDGER_MARKETS } from './ledger-markets.js';

const KEY = 'wolfdesk.tradeable';
export const AUTO = '*';
export const TRADEABLE_MAX = 300; // nur für eine eigene Liste
const listeners = new Set();
let NAMES = [];
// Die App meldet hier die aktuelle Marktliste von Hyperliquid (ohne abgeschaltete Märkte)
export const setMarketNames = (names) => { NAMES = [...(names || [])]; listeners.forEach((fn) => { try { fn(getRaw()); } catch (e) { console.error(e); } }); };
export const marketNames = () => NAMES;

export const isAuto = (raw) => Array.isArray(raw) && raw.includes(AUTO);
export const skipsOf = (raw) => (raw || []).filter((c) => typeof c === 'string' && c.startsWith('-') && c.length > 1).map((c) => c.slice(1));

// Die alte, abgetippte Ledger-Liste (29.09.) oder fast dieselbe wird zu „automatisch“; was daraus entfernt war, bleibt Ausnahme.
export function migrateTradeable(list, ledger = LEDGER_MARKETS) {
  if (!Array.isArray(list) || isAuto(list) || !list.length) return list;
  const L = new Set(ledger);
  if (list.length < ledger.length * 0.9 || !list.every((c) => L.has(c))) return list;
  return [AUTO, ...ledger.filter((c) => !list.includes(c)).map((c) => '-' + c)];
}

// Gespeicherte Form → Liste der Märkte. names: alle Marktnamen (ohne abgeschaltete)
export function resolveTradeable(raw, names = NAMES) {
  const list = migrateTradeable(raw);
  if (!isAuto(list)) return (list || []).filter((c) => typeof c === 'string' && !c.startsWith('-')).slice(0, TRADEABLE_MAX);
  const skip = new Set(skipsOf(list));
  return (names || []).filter((c) => !skip.has(c));
}

export function getRaw() {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null');
    if (Array.isArray(v)) return migrateTradeable(v);
  } catch { /* Standard verwenden */ }
  return migrateTradeable([...(CONFIG.tradeable || [])]);
}
// Liste der Märkte (bei „automatisch“ aus der Marktliste von Hyperliquid)
export const getTradeable = () => resolveTradeable(getRaw(), NAMES);

function save(list) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(list)); } catch { /* egal */ }
  listeners.forEach((fn) => { try { fn(list); } catch (e) { console.error(e); } });
}

export function addTradeable(coin) {
  const raw = getRaw();
  if (isAuto(raw)) { save(raw.filter((c) => c !== '-' + coin)); return null; }
  const list = resolveTradeable(raw);
  if (list.includes(coin)) return 'Schon in der Liste';
  if (list.length >= TRADEABLE_MAX) return `Maximal ${TRADEABLE_MAX} Märkte`;
  save([...list, coin].sort(byName));
  return null;
}
export function removeTradeable(coin) {
  const raw = getRaw();
  if (isAuto(raw)) { if (!raw.includes('-' + coin)) save([...raw, '-' + coin]); return; }
  save(resolveTradeable(raw).filter((c) => c !== coin));
}
export const clearTradeable = () => save([]);
export const setAuto = () => save([AUTO]);
// Eigene Liste: startet mit dem, was gerade automatisch drin ist
export const setManual = () => save(getTradeable().slice(0, TRADEABLE_MAX).sort(byName));
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
