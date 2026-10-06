// Lange Historie von Binance (8h): zweite Datenquelle für den Testplan. Reines Mess-Paket, der Rechen-Kern bleibt unberührt.
// Öffentliche Spot-Kerzen ohne Konto und ohne Schlüssel (data-api.binance.vision). Hier steht nie ein API-Schlüssel.
// Regeln aus TESTPLAN.md und der Prüfung vom 06.10.:
//  - Stichtag = Tag, an dem die Märkte zum ersten Mal geprüft werden. Er wird einmal festgelegt und nie verschoben.
//  - Tresor = die 365 Tage vor dem Stichtag. Diese Kerzen werden GAR NICHT geladen, bis der Tresor bewusst geöffnet wird.
//  - Auswahl: handelbare Märkte, bei Binance seit mind. 2 Jahren (gemessen am Stichtag), höchstens 50,
//    sortiert nach dem Binance-Umsatz der 30 Tage VOR der Tresor-Grenze (kein Wissen aus dem Tresor).
//  - Sperrfrist: keine Einstiege in den letzten 10 Tagen vor der Tresor-Grenze (längste Haltedauer). Trades zählen nach Einstiegsdatum.
// Kerzenform wie bei Hyperliquid: { t, T, o, h, l, c, v }, Zeiten in UTC, nur abgeschlossene Kerzen. Tests in test-binance.js.

const DAY = 864e5, H = 36e5;
export const BN = {
  base: 'https://data-api.binance.vision',
  from: Date.UTC(2020, 0, 1),       // Beginn der Historie
  checkFrom: Date.UTC(2024, 0, 1),  // Beginn des Prüf-Zeitraums (Entwicklung endet am 31.12.2023)
  vaultDays: 365,                   // Tresor: die letzten 12 Monate vor dem Stichtag
  minListedDays: 730,               // mind. zwei Jahre bei Binance
  volDays: 30,                      // Umsatz-Fenster vor der Tresor-Grenze
  embargoDays: 10,                  // Sperrfrist vor der Tresor-Grenze (Zeit-Ausstieg nach 10 Tagen)
  maxMarkets: 50,
  limit: 1000,                      // Kerzen je Abruf (Binance-Obergrenze)
  step: { '1d': DAY, '4h': 4 * H },
  timeoutMs: 15000, retries: 2,
  crossTolerance: 0.05,             // Gegenprobe mit Hyperliquid: Tagesschluss darf höchstens 5 % abweichen
};

// ---- Namen ----
// Hyperliquid führt einige Coins in Tausender-Einheiten (kPEPE = 1000 PEPE). Kurs mal 1000, Volumen geteilt durch 1000.
// OVERRIDE: Coins, die bei Binance anders heißen. SKIP: gleicher Name, aber ein anderer Coin (wird nach der Vorschau gepflegt).
const OVERRIDE = {};
const SKIP = new Set([]);
export function bnSymbol(coin) {
  const c = String(coin ?? '');
  if (!c || c.includes(':') || SKIP.has(c)) return null;          // Märkte fremder Börsen (xyz:GOLD) gibt es bei Binance nicht
  if (OVERRIDE[c]) return OVERRIDE[c];
  const k = /^k[A-Z0-9]+$/.test(c);
  const base = k ? c.slice(1) : c;
  if (!/^[A-Z0-9]+$/.test(base)) return null;
  if (/^(USDT|USDC|FDUSD|TUSD|DAI|USDE)$/.test(base)) return null; // Stablecoins sind kein Testmarkt
  return { symbol: base + 'USDT', mult: k ? 1000 : 1 };
}

// ---- Zeiträume ----
export const dayStart = (t) => Math.floor(t / DAY) * DAY;
export function periods(stichtag) {
  const vaultFrom = stichtag - BN.vaultDays * DAY;
  return {
    dev: [BN.from, BN.checkFrom],          // Entwicklung: 2020 bis Ende 2023
    check: [BN.checkFrom, vaultFrom],      // Prüfung: 2024 bis 12 Monate vor dem Stichtag
    vault: [vaultFrom, stichtag],          // Tresor
    lastEntry: vaultFrom - BN.embargoDays * DAY, // späteste Einstiegszeit außerhalb des Tresors
  };
}
// In welchen Zeitraum fällt ein Einstieg? 'sperre' = Sperrfrist vor dem Tresor (zählt nirgends)
export function periodOf(t, stichtag) {
  const p = periods(stichtag);
  if (t < p.dev[0] || t >= p.vault[1]) return null;
  if (t >= p.vault[0]) return 'vault';
  if (t >= p.lastEntry) return 'sperre';
  return t < p.check[0] ? 'dev' : 'check';
}
// Bis wohin darf geladen werden? Solange der Tresor zu ist: bis zur letzten Millisekunde vor der Tresor-Grenze.
export const loadEnd = (meta) => (meta?.vaultOpened ? meta.stichtag : meta.stichtag - BN.vaultDays * DAY) - 1;

// ---- Kerzen ----
export const klinesUrl = (symbol, tf, start, end, limit = BN.limit) =>
  `${BN.base}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${tf}&startTime=${start}&endTime=${end}&limit=${limit}`;

// Antwort von Binance in unsere Kerzenform. maxEnd: Kerzen, die danach noch offen wären, fallen weg (Tresor-Schutz, zweite Sicherung).
export function parseKlines(rows, mult = 1, maxEnd = Infinity) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const t = Number(r[0]), T = Number(r[6]);
    if (!Number.isFinite(t) || !Number.isFinite(T) || T > maxEnd) continue;
    const c = { t, T, o: r[1] * mult, h: r[2] * mult, l: r[3] * mult, c: r[4] * mult, v: r[5] / mult, q: Number(r[7]) };
    if ([c.o, c.h, c.l, c.c, c.v].every(Number.isFinite)) out.push(c);
  }
  return out;
}

async function getJson(url, fetchFn) {
  let lastErr;
  for (let a = 0; a <= BN.retries; a++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BN.timeoutMs);
    try {
      const res = await fetchFn(url, { signal: ctrl.signal });
      if (res.status === 400) return { invalid: true };                    // Markt gibt es bei Binance nicht
      if (res.status === 429 || res.status === 418) { const e = new Error('Binance bremst (zu viele Anfragen). Bitte in ein paar Minuten weitermachen.'); e.stop = true; throw e; }
      if (!res.ok) throw new Error(`Binance antwortet mit Status ${res.status}`);
      return { data: await res.json() };
    } catch (e) {
      if (e.stop) throw e;
      lastErr = e.name === 'AbortError' ? new Error('Zeitüberschreitung bei Binance') : e;
      if (a < BN.retries) await new Promise((r) => setTimeout(r, 400 * 2 ** a));
    } finally { clearTimeout(timer); }
  }
  // „Load failed“ / „Failed to fetch“: kein Netz oder der Abruf aus der App ist nicht erlaubt
  const blocked = /load failed|failed to fetch|networkerror/i.test(lastErr?.message || '');
  const err = new Error(blocked ? 'Binance ist aus der App nicht erreichbar (kein Netz oder Abruf nicht erlaubt)' : lastErr.message);
  err.blocked = blocked;
  throw err;
}

// Eine ganze Reihe laden (in Häppchen von 1000 Kerzen). Gibt null zurück, wenn es den Markt bei Binance nicht gibt.
// end kommt IMMER aus loadEnd(meta): Ohne geöffneten Tresor wird nichts jenseits der Tresor-Grenze angefragt.
export async function loadSeries(symbol, mult, tf, start, end, fetchFn = globalThis.fetch, onPage = null) {
  const step = BN.step[tf], out = [];
  let from = start;
  for (let guard = 0; guard < 200 && from <= end; guard++) {
    const r = await getJson(klinesUrl(symbol, tf, from, end), fetchFn);
    if (r.invalid) return out.length ? out : null;
    const rows = Array.isArray(r.data) ? r.data : [];
    const page = parseKlines(rows, mult, end);
    for (const c of page) if (!out.length || c.t > out[out.length - 1].t) out.push(c);
    if (onPage) onPage(out.length);
    if (rows.length < BN.limit) break;
    from = Number(rows[rows.length - 1][0]) + step;
  }
  return out;
}

// Lebenszeichen am Stichtag: Gibt es in den letzten drei Tagen vor dem Stichtag überhaupt eine Kerze?
// Liest bewusst nur „ja oder nein“, kein Kurs aus dem Tresor wird ausgewertet oder gespeichert.
export async function aliveAt(symbol, stichtag, fetchFn = globalThis.fetch) {
  const r = await getJson(klinesUrl(symbol, '1d', stichtag - 3 * DAY, stichtag - 1, 1), fetchFn);
  return !r.invalid && Array.isArray(r.data) && r.data.length > 0;
}

// Verbindungstest: zwei alte BTC-Tageskerzen (Januar 2020, weit weg vom Tresor). Legt nichts fest.
export async function pingBinance(fetchFn = globalThis.fetch) {
  const r = await getJson(klinesUrl('BTCUSDT', '1d', BN.from, BN.from + 2 * DAY - 1, 2), fetchFn);
  const c = parseKlines(r.data);
  if (!c.length) throw new Error('Binance liefert keine Kerzen');
  return { first: c[0].t, n: c.length };
}

// Lücken: fehlende Kerzen zwischen erster und letzter (Binance hatte Wartungspausen)
export function gaps(candles, step) {
  let missing = 0; const ranges = [];
  for (let i = 1; i < candles.length; i++) {
    const n = Math.round((candles[i].t - candles[i - 1].t) / step) - 1;
    if (n > 0) { missing += n; if (ranges.length < 5) ranges.push([candles[i - 1].t + step, candles[i].t - 1, n]); }
  }
  return { missing, ranges };
}

// Umsatz in USDT über die letzten 30 Tageskerzen vor der Tresor-Grenze
export function volumeBefore(daily, vaultFrom, days = BN.volDays) {
  return daily.filter((c) => c.t >= vaultFrom - days * DAY && c.T < vaultFrom).reduce((s, c) => s + (c.q || 0), 0);
}

// Erfüllt ein Markt die Bedingungen? Gibt den Grund zurück, warum nicht (null = erfüllt).
export function rejectReason(info, stichtag) {
  const vaultFrom = stichtag - BN.vaultDays * DAY;
  if (!info || info.none) return 'nicht bei Binance';
  if (!(info.first <= stichtag - BN.minListedDays * DAY)) return 'weniger als zwei Jahre bei Binance';
  if (!(info.last >= vaultFrom - 3 * DAY)) return 'Handel endete vor der Tresor-Grenze';
  if (info.alive === false) return 'am Stichtag nicht mehr im Handel';
  if (info.cross === 'bad') return 'Kurs passt nicht zu Hyperliquid (anderer Coin?)';
  if (!(info.vol > 0)) return 'kein Umsatz';
  return null;
}

// Gegenprobe: derselbe Tagesschluss bei Hyperliquid und Binance (ein Tag vor der Tresor-Grenze)
export function crossCheck(hlClose, bnClose) {
  if (!(hlClose > 0) || !(bnClose > 0)) return 'none';            // bei Hyperliquid damals noch nicht gelistet: nicht prüfbar
  return Math.abs(hlClose / bnClose - 1) <= BN.crossTolerance ? 'ok' : 'bad';
}

// Auswahl: die umsatzstärksten Märkte, die alle Bedingungen erfüllen. Bei gleichem Umsatz entscheidet der Name (wiederholbar).
export function selectMarkets(scanned, stichtag, max = BN.maxMarkets) {
  return Object.entries(scanned || {})
    .filter(([, i]) => rejectReason(i, stichtag) === null)
    .sort((a, b) => b[1].vol - a[1].vol || (a[0] < b[0] ? -1 : 1))
    .slice(0, max).map(([coin]) => coin);
}

// ---- Kompakt speichern: Spalten statt 15.000 Objekte je Markt ----
export function pack(candles, withQ = false) {
  const n = candles.length;
  const p = { n, t: new Float64Array(n), o: new Float64Array(n), h: new Float64Array(n), l: new Float64Array(n), c: new Float64Array(n), v: new Float32Array(n) };
  if (withQ) p.q = new Float32Array(n);
  candles.forEach((k, i) => { p.t[i] = k.t; p.o[i] = k.o; p.h[i] = k.h; p.l[i] = k.l; p.c[i] = k.c; p.v[i] = k.v; if (withQ) p.q[i] = k.q || 0; });
  return p;
}
export function unpack(p, step) {
  const out = [];
  if (!p || !p.t) return out;
  for (let i = 0; i < p.n; i++) out.push({ t: p.t[i], T: p.t[i] + step - 1, o: p.o[i], h: p.h[i], l: p.l[i], c: p.c[i], v: p.v[i], ...(p.q ? { q: p.q[i] } : {}) });
  return out;
}
export const packedBytes = (n, withQ = false) => n * (5 * 8 + 4 + (withQ ? 4 : 0));

// ---- Speicher: eigene Datenbank, getrennt von den Backtests („Backtest-Daten löschen“ fasst sie nicht an) ----
const DB = 'wolfdesk-bn', STORE = 'kv';
let dbp = null;
const mem = new Map();
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
const wait = (p, ms, fb) => Promise.race([p, new Promise((res) => setTimeout(() => res(fb), ms))]);
async function req(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), q = fn(t.objectStore(STORE));
    t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const key = (tf, coin) => `${tf}:${coin}`;
// true = sicher gespeichert. false = Speicher voll, gesperrt oder zu langsam (dann gilt der Markt als nicht geladen).
export async function putSeries(tf, coin, packed) {
  try {
    if (!idb()) { mem.set(key(tf, coin), packed); return true; }
    return await wait(req('readwrite', (st) => st.put(packed, key(tf, coin))).then(() => true), 20000, false);
  } catch { return false; }
}
export async function getSeries(tf, coin) {
  try {
    if (!idb()) return mem.get(key(tf, coin)) ?? null;
    return await wait(req('readonly', (st) => st.get(key(tf, coin))), 20000, null) ?? null;
  } catch { return null; }
}
export async function delSeries(tf, coin) {
  try { if (!idb()) { mem.delete(key(tf, coin)); return; } await wait(req('readwrite', (st) => st.delete(key(tf, coin))), 5000, null); } catch { /* egal */ }
}
export async function seriesKeys() {
  try { if (!idb()) return [...mem.keys()]; return await wait(req('readonly', (st) => st.getAllKeys()), 5000, []) || []; } catch { return []; }
}
// Fertige Kerzen eines Marktes für die Regeln (nächstes Paket)
export const candlesOf = async (tf, coin) => unpack(await getSeries(tf, coin), BN.step[tf]);

// ---- Protokoll (klein, im normalen Speicher): Stichtag, geprüfte Märkte, eingefrorene Liste, Ladestand ----
const META = 'wolfdesk.bn';
export function loadMeta() {
  try { const m = JSON.parse(globalThis.localStorage?.getItem(META) || 'null'); return m && Number.isFinite(m.stichtag) ? m : null; } catch { return null; }
}
export function saveMeta(m) { try { globalThis.localStorage?.setItem(META, JSON.stringify(m)); return true; } catch { return false; } }
export const newMeta = (now, candidates) => ({ v: 1, stichtag: dayStart(now), candidates: [...candidates], scanned: {}, markets: null, frozenAt: null, h4: {}, vaultOpened: false });

// Belegter Platz (aus dem Protokoll gerechnet, ohne die großen Daten anzufassen)
export function metaBytes(m) {
  if (!m) return 0;
  const coins = m.markets || Object.keys(m.scanned || {}).filter((c) => m.scanned[c]?.n);
  return coins.reduce((s, c) => s + packedBytes(m.scanned?.[c]?.n || 0, true) + packedBytes(m.h4?.[c]?.n || 0), 0);
}

// ---- Abläufe ----
// Einen Markt prüfen: Tageskerzen bis zur Tresor-Grenze laden und speichern, Lebenszeichen, Gegenprobe mit Hyperliquid.
// hlClose(coin, dayStartMs) liefert den Tagesschluss bei Hyperliquid oder null.
export async function scanMarket(coin, meta, { fetchFn = globalThis.fetch, hlClose = async () => null } = {}) {
  const s = bnSymbol(coin);
  if (!s) return { none: true };
  const end = loadEnd(meta), vaultFrom = end + 1;
  // 8h1: Für unbekannte Märkte schickt Binance eine Fehlerantwort, die der Browser nicht durchlässt; in der App sieht das
  // aus wie „kein Netz“. Deshalb: Scheitert ein Markt, während Binance selbst erreichbar ist (BTC-Probe), und scheitert er
  // danach noch einmal, gibt es ihn bei Binance nicht. Scheitert auch die Probe, ist es wirklich das Netz: anhalten.
  let daily;
  try { daily = await loadSeries(s.symbol, s.mult, '1d', BN.from, end, fetchFn); }
  catch (e) {
    if (!e.blocked) throw e;
    await pingBinance(fetchFn);
    try { daily = await loadSeries(s.symbol, s.mult, '1d', BN.from, end, fetchFn); }
    catch (e2) { if (!e2.blocked) throw e2; await pingBinance(fetchFn); return { none: true, symbol: s.symbol, blocked: true }; }
  }
  if (!daily || !daily.length) return { none: true, symbol: s.symbol };
  const info = { symbol: s.symbol, mult: s.mult, first: daily[0].t, last: daily[daily.length - 1].t, n: daily.length, vol: Math.round(volumeBefore(daily, vaultFrom)), gap: gaps(daily, DAY).missing };
  if (rejectReason({ ...info, alive: true }, meta.stichtag) !== null) return info; // fällt ohnehin raus: Rest sparen
  info.alive = await aliveAt(s.symbol, meta.stichtag, fetchFn);
  if (info.alive) {
    const day = vaultFrom - 2 * DAY, bn = daily.find((c) => c.t === day);
    let hc = null; try { hc = await hlClose(coin, day); } catch { hc = null; }
    info.cross = crossCheck(hc, bn?.c);
  }
  // Nur Märkte speichern, die alle Bedingungen erfüllen. Klappt das Speichern nicht, gilt der Markt als noch nicht geprüft
  // (Fehler statt Ablehnung), damit ein voller Speicher die Auswahl nicht verändert.
  if (rejectReason(info, meta.stichtag) === null && !(await putSeries('1d', coin, pack(daily, true)))) throw new Error('Speichern gescheitert (Speicher voll?)');
  return info;
}

// 4H-Kerzen eines eingefrorenen Marktes laden und speichern
export async function loadH4(coin, meta, fetchFn = globalThis.fetch, onPage = null) {
  const i = meta.scanned[coin];
  const c = await loadSeries(i.symbol, i.mult, '4h', BN.from, loadEnd(meta), fetchFn, onPage);
  if (!c || !c.length) throw new Error('keine 4H-Kerzen');
  if (!(await putSeries('4h', coin, pack(c)))) throw new Error('Speichern gescheitert (Speicher voll?)');
  return { n: c.length, first: c[0].t, last: c[c.length - 1].t, gap: gaps(c, 4 * H).missing };
}

export const scanLeft = (m) => (m?.candidates || []).filter((c) => !m.scanned[c]);
export const h4Left = (m) => (m?.markets || []).filter((c) => !m.h4[c]);
export const phaseOf = (m) => (!m ? 'neu' : scanLeft(m).length ? 'pruefen' : !m.markets ? 'vorschau' : h4Left(m).length ? 'laden' : 'fertig');

// ---- Protokoll-Text zum Kopieren (für TESTPLAN-PROTOKOLL.md; enthält nur öffentliche Marktdaten) ----
const d = (t) => new Date(t).toISOString().slice(0, 10).split('-').reverse().join('.');
export function protocolText(m) {
  if (!m) return '';
  const p = periods(m.stichtag), list = m.markets || selectMarkets(m.scanned, m.stichtag);
  const rej = {};
  for (const c of m.candidates) { const r = m.scanned[c] ? rejectReason(m.scanned[c], m.stichtag) : 'noch nicht geprüft'; if (r) rej[r] = (rej[r] || 0) + 1; }
  const nSel = Object.keys(m.scanned).filter((c) => rejectReason(m.scanned[c], m.stichtag) === null).length;
  return [
    `WOLF DESK – Protokoll lange Historie (${m.markets ? 'eingefroren am ' + d(m.frozenAt) : 'VORSCHAU, noch nicht eingefroren'})`,
    `Stichtag: ${d(m.stichtag)} (UTC)`,
    `Entwicklung: ${d(p.dev[0])} bis ${d(p.dev[1] - 1)}`,
    `Prüfung: ${d(p.check[0])} bis ${d(p.check[1] - 1)} (Einstiege bis ${d(p.lastEntry - 1)}, danach 10 Tage Sperrfrist)`,
    `Tresor: ${d(p.vault[0])} bis ${d(p.vault[1] - 1)} (${m.vaultOpened ? 'GEÖFFNET' : 'nicht geladen'})`,
    `Geprüft: ${m.candidates.length} handelbare Märkte · erfüllen alle Bedingungen: ${nSel} · ausgewählt: ${list.length}`,
    `Ausgeschieden: ${Object.entries(rej).map(([r, n]) => `${n} × ${r}`).join(' · ') || 'keine'}`,
    `Nicht bei Binance: ${m.candidates.filter((c) => m.scanned[c]?.none).join(', ') || 'keine'}`,
    `Auswahl nach Binance-Umsatz der 30 Tage vor der Tresor-Grenze:`,
    ...list.map((c, i) => { const s = m.scanned[c], h = m.h4?.[c]; return `${i + 1}. ${c} = ${s.symbol}${s.mult > 1 ? ' × ' + s.mult : ''} · ab ${d(s.first)} · Gegenprobe ${s.cross === 'ok' ? 'ok' : 'nicht möglich'} · Lücken 1d ${s.gap}${h ? ', 4h ' + h.gap : ''}`; }),
  ].join('\n');
}
