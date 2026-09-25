// Zentraler Datenspeicher. Module lesen hier und hören auf Änderungen.
// Kein Modul spricht direkt mit einem anderen – alles läuft über den Store.
const state = {
  prices: {},        // { 'BTC': 63120.5, ... }
  priceTs: {},       // { 'BTC': 1727262000000, ... } Zeitpunkt der letzten Aktualisierung
  markets: {},       // { '': ['BTC', ...], 'xyz': ['xyz:GOLD', ...] }
  account: null,     // normalisierter Kontozustand (siehe core/account.js)
  accountTs: 0,
  accountError: null,
  stream: 'getrennt', // 'verbinde' | 'verbunden' | 'getrennt' | 'fallback'
  errors: [],        // letzte Fehlermeldungen
};

const listeners = new Set();

export function getState() {
  return state;
}

export function update(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error(e); }
  });
}

export function setPrices(mids, ts = Date.now()) {
  const prices = { ...state.prices };
  const priceTs = { ...state.priceTs };
  for (const [coin, px] of Object.entries(mids)) {
    const v = Number(px);
    if (Number.isFinite(v) && v > 0) {
      prices[coin] = v;
      priceTs[coin] = ts;
    }
  }
  update({ prices, priceTs });
}

export function logError(source, err) {
  const entry = { source, message: err?.message || String(err), time: Date.now() };
  update({ errors: [entry, ...state.errors].slice(0, 8) });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
