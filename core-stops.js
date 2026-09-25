// Manuell eingetragene Stop-Losses (nur für Positionen ohne SL-Order).
// Gespeichert im Browser dieses Geräts.
const KEY = 'wolfdesk.manualStops';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function getManualStop(coin) {
  const v = Number(read()[coin]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function setManualStop(coin, price) {
  const all = read();
  if (price == null) delete all[coin]; else all[coin] = price;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignorieren */ }
}
