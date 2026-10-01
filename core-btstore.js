// Backtest-Speicher (6a): Zwischenstand je Coin und fertige Ergebnisse überstehen App-Wechsel und Neuladen.
// iOS friert Web-Apps im Hintergrund ein und lädt sie manchmal neu; alles nur im Arbeitsspeicher wäre dann weg.
// Speicherort: IndexedDB (viel Platz), ohne IndexedDB (Tests) ein einfacher Ersatz im Speicher.
// Aufräumen automatisch: je Stil nur das letzte fertige Ergebnis, ein einziger laufender Zwischenstand.

const DB = 'wolfdesk-bt', STORE = 'kv';
let dbp = null;
function idb() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const mem = new Map();
async function tx(mode, fn) {
  const db = await idb();
  if (!db) return fn(null);
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    // Ergebnis einer Abfrage (auch „nicht gefunden“ = undefined), sonst der Rückgabewert selbst
    t.oncomplete = () => res(out && typeof out === 'object' && 'result' in out && 'readyState' in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}
// 7a: iOS lässt Datenbank-Zugriffe manchmal einfach hängen. Kein Zugriff darf länger als LIMIT warten.
const LIMIT = 2500;
export const withTimeout = (p, ms = LIMIT, fallback = null) => Promise.race([p, new Promise((res) => setTimeout(() => res(fallback), ms))]);
const kvGetRaw = async (k) => { try { const db = await idb(); if (!db) return mem.get(k) ?? null; return await tx('readonly', (st) => st.get(k)) ?? null; } catch { return null; } };
const kvSetRaw = async (k, v) => { try { const db = await idb(); if (!db) { mem.set(k, v); return; } await tx('readwrite', (st) => st.put(v, k)); } catch { /* voll oder gesperrt: egal */ } };
const kvDelRaw = async (k) => { try { const db = await idb(); if (!db) { mem.delete(k); return; } await tx('readwrite', (st) => st.delete(k)); } catch { /* egal */ } };
const kvKeysRaw = async () => { try { const db = await idb(); if (!db) return [...mem.keys()]; return await tx('readonly', (st) => st.getAllKeys()) || []; } catch { return []; } };

export const kvGet = (k) => withTimeout(kvGetRaw(k));
export const kvSet = (k, v) => withTimeout(kvSetRaw(k, v));
export const kvDel = (k) => withTimeout(kvDelRaw(k));
export const kvKeys = () => withTimeout(kvKeysRaw(), LIMIT, []);

// Kompakt speichern (7a): je Coin nur, was die Auswertung braucht – deutlich kleiner und schneller
const KEEP = ['adx', 'time', 'dir', 'score', 'method', 'events', 'seal', 'gate', 'filled', 'entryPx', 'fillTime', 'exitTime', 'R', 'hits', 'outcome', 'grossR', 'r', 'alt', 'coin'];
export const compactTrade = (t) => Object.fromEntries(KEEP.filter((k) => t[k] !== undefined).map((k) => [k, t[k]]));
export const compactRun = (r) => ({ coin: r.coin, trades: (r.trades || []).map(compactTrade), missed: [], missedN: r.missedN ?? r.missed?.length ?? 0, error: r.error, from: r.from, to: r.to });

// ---- Zwischenstand eines laufenden Backtests ----
const RUN = 'bt:run';
export const loadRun = () => kvGet(RUN);
export const saveRun = (run) => kvSet(RUN, { ...run, runs: (run.runs || []).map(compactRun), updatedAt: Date.now() });
export const clearRun = () => kvDel(RUN);
// Welche Coins fehlen noch?
export const remaining = (run) => (run?.coins || []).filter((c) => !(run.runs || []).some((r) => r.coin === c));

// ---- Fertige Ergebnisse: je Stil nur das letzte ----
export const saveResult = (style, last) => kvSet('bt:last:' + style, { ...last, trades: (last.trades || []).map(compactTrade), runs: (last.runs || []).map(compactRun), style, at: Date.now() });
// Nur gültige Ergebnisse zurückgeben (Schutz gegen leere oder beschädigte Einträge)
export const loadResult = async (style) => { const r = await kvGet('bt:last:' + style); return r && Array.isArray(r.trades) ? r : null; };
export async function savedList(styles) {
  const out = [];
  for (const s of styles) { const r = await loadResult(s); if (r) out.push({ style: s, at: r.at, complete: r.complete !== false, done: r.done, total: r.total, label: r.label }); }
  return out;
}
export async function clearAll() { for (const k of await kvKeys()) if (String(k).startsWith('bt:')) await kvDel(k); }

// Grobe Größe (für den Speicher-Bereich)
export async function approxSize() {
  let n = 0;
  for (const k of await kvKeys()) { const v = await kvGet(k); try { n += JSON.stringify(v).length; } catch { /* egal */ } }
  return n;
}
