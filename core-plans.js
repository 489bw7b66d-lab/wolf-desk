// Ziele einer offenen Position (für manuelles Schließen an den TPs).
// Quellen in dieser Reihenfolge: dein gespeicherter Plan → passendes Telegram-Signal → Take-Profit-Orders (core-path.js).
// Reine Funktionen haben Tests in test-plans.js.
import { CONFIG } from './config.js';

export const PLANS_KEY = 'wolfdesk.plans';

// Pläne: aus my-settings.js (für den Wächter) plus die auf diesem iPhone (Vorrang, null = gelöscht)
export function getPlans() {
  let local = {};
  try { local = JSON.parse(globalThis.localStorage?.getItem(PLANS_KEY) || '{}'); } catch { /* egal */ }
  const all = { ...(CONFIG.plans || {}), ...local };
  Object.keys(all).forEach((k) => { if (all[k] == null) delete all[k]; });
  return all;
}
export function savePlan(coin, plan) {
  let local = {};
  try { local = JSON.parse(localStorage.getItem(PLANS_KEY) || '{}'); } catch { /* egal */ }
  local[coin] = plan;
  localStorage.setItem(PLANS_KEY, JSON.stringify(local));
}

// Gehört ein gespeicherter Plan zu dieser Position? (gleiche Richtung, gleicher Trade)
export function planFor(plans, coin, side, openedAt) {
  const p = plans?.[coin];
  if (!p || p.side !== side) return null;
  if (p.openedAt != null && openedAt != null && Math.abs(p.openedAt - openedAt) > 6 * 36e5) return null; // Plan eines früheren Trades
  return p;
}

// Passendes Telegram-Signal: gleicher Markt und Richtung, Position eröffnet zwischen 1 Std. vor und 24 Std. nach dem Signal
export function signalFor(signals, coin, side, openedAt) {
  return (signals || []).filter((x) => x.coin === coin && x.dir === side && x.tps?.length
    && (!openedAt || (openedAt >= x.at - 36e5 && openedAt <= x.at + 24 * 36e5)))
    .sort((a, b) => b.at - a.at)[0] || null;
}

// Ziele für den Trade-Weg: { tps: [...], source: 'plan'|'signal', label }
export function targetsFor({ plan, signal }) {
  if (plan?.tps?.length) return { tps: plan.tps, source: 'plan', label: plan.source === 'analyse' ? 'aus der Analyse übernommen' : plan.source === 'signal' ? 'aus dem Signal übernommen' : 'selbst festgelegt' };
  if (signal?.tps?.length) return { tps: signal.tps, source: 'signal', label: `aus dem Telegram-Signal vom ${new Date(signal.at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}` };
  return null;
}

// Neu erreichte Ziele einer Position (für die Meldung des Wächters). hit = schon gemeldete Schlüssel
export function targetHits(coin, side, tps, price, key, hit = {}) {
  if (!(price > 0) || !tps?.length) return [];
  const long = side === 'long';
  return tps.map((t, i) => ({ n: i + 1, price: t, key: `${coin}|${key}|tp${i + 1}` }))
    .filter((t) => (long ? price >= t.price : price <= t.price) && !hit[t.key]);
}

// Eingabe mit deutschen Zahlen → Zielliste (aufsteigend für Long, absteigend für Short, nur Gewinnseite)
export function cleanTargets(list, side, entry) {
  const p = (x) => {
    const t = String(x ?? '').trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const v = Number(t);
    return t && Number.isFinite(v) && v > 0 ? v : null;
  };
  const long = side === 'long';
  return list.map(p).filter((v) => v != null && (!(entry > 0) || (long ? v > entry : v < entry))).sort((a, b) => (long ? a - b : b - a));
}
