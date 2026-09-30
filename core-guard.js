// Schutz vor typischen Fehlern:
// 1. Stop-Check: Liegt der Stop innerhalb der normalen Schwankung (ATR)? Dann wird er wahrscheinlich ausgelöst.
// 2. Abkühlphase: Nach mehreren Verlust-Trades in Folge eine Weile vorsichtiger handeln.
// Reine Funktionen haben Tests in test-guard.js.
import { CONFIG } from './config.js';
import { atr } from './core-indicators.js';
import { positionSize } from './core-risk.js';
import { getCandles } from './core-scanner.js';

const G = () => CONFIG.guard;

// Stop-Abstand im Verhältnis zum ATR. Ergebnis: { ratio, status, text, suggest } oder null
// liq (optional, offene Position): Liegt der ATR-gerechte Stop hinter der Liquidation, wird er NICHT vorgeschlagen (5c).
export function stopNoise(entry, stop, atrValue, cfg = G(), liq = null) {
  if (!(entry > 0) || !(stop > 0) || !(atrValue > 0) || entry === stop) return null;
  const dist = Math.abs(entry - stop), ratio = dist / atrValue;
  const long = stop < entry, s = long ? 1 : -1;
  const status = ratio < cfg.stopNoiseAtr ? 'bad' : ratio < cfg.stopTightAtr ? 'warn' : 'ok';
  const suggestStop = entry - s * cfg.suggestAtr * atrValue;
  const beyondLiq = liq > 0 && (long ? suggestStop <= liq : suggestStop >= liq);
  const r = (x) => x.toFixed(1).replace('.', ',');
  return {
    ratio, status, atr: atrValue,
    text: status === 'bad' ? `Stop liegt im normalen Rauschen (${r(ratio)}× ATR), wird wahrscheinlich ausgelöst`
      : status === 'warn' ? `Stop ist knapp (${r(ratio)}× ATR), normale Schwankungen können ihn erreichen`
      : `Stop mit genug Luft (${r(ratio)}× ATR)`,
    suggest: status === 'ok' ? null : { stop: suggestStop, atrMult: cfg.suggestAtr, distPct: (cfg.suggestAtr * atrValue / entry) * 100, beyondLiq, liq },
  };
}

// Was bedeutet der vorgeschlagene Stop bei gleichem Risiko? Kleinere Position, weniger Hebel nötig
export function suggestImpact(equity, riskPct, entry, stopNow, stopNew) {
  const a = positionSize(equity, riskPct, entry, stopNow), b = positionSize(equity, riskPct, entry, stopNew);
  if (!a || !b) return null;
  return { sizeNow: a.size, sizeNew: b.size, notionalNow: a.notional, notionalNew: b.notional, factor: b.notional / a.notional };
}

// Verlust-Trades in Folge (neueste zuerst). trades: aus tradeHistory, nur abgeschlossene zählen.
// Ein Trade zählt als Verlust, wenn er nach Gebühren im Minus geschlossen wurde.
export function lossStreak(trades) {
  const closed = (trades || []).filter((t) => t.closedAt != null && !t.partial).sort((a, b) => b.closedAt - a.closedAt);
  let n = 0;
  for (const t of closed) { if (t.realized < 0) n++; else break; }
  return { streak: n, lastAt: n ? closed[0].closedAt : null, coins: closed.slice(0, n).map((t) => t.coin) };
}

// Abkühlphase: aktiv, wenn die Serie lang genug ist und der letzte Verlust weniger als Y Stunden her ist
export function cooldown(trades, now = Date.now(), cfg = G()) {
  const s = lossStreak(trades);
  if (s.streak < cfg.lossStreak || !s.lastAt) return { active: false, ...s };
  const until = s.lastAt + cfg.cooldownHours * 36e5;
  return { active: now < until, until, ...s };
}

// Risiko-Vorschlag in der Abkühlphase: halbiert
export const cooledRisk = (riskPct, active) => (active ? Math.round(riskPct * 50) / 100 : riskPct);

// Restzeit lesbar
export function leftText(until, now = Date.now()) {
  const m = Math.max(0, Math.round((until - now) / 60e3));
  return m >= 60 ? `${Math.floor(m / 60)} Std. ${m % 60} Min.` : `${m} Min.`;
}

// ATR eines Marktes auf einer Zeitebene (App, mit Zwischenspeicher)
const atrCache = new Map();
export function atrFor(coin, tf) {
  const key = coin + '|' + tf, hit = atrCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.value;
  if (!hit?.loading) {
    atrCache.set(key, { ...(hit || {}), loading: true });
    getCandles(coin, tf, true).then((c) => {
      const v = c.length > 20 ? atr(c, CONFIG.indicators.atrPeriod).at(-1) : null;
      atrCache.set(key, { value: v, at: Date.now() });
    }).catch(() => atrCache.set(key, { value: null, at: Date.now() }));
  }
  return hit?.value ?? null;
}

// Setup-Zeitebene des gewählten Stils (Swing 4H, Daytrade 1H)
export const setupTf = (style = CONFIG.positions?.autoStyle || 'swing') => (CONFIG.signals.modes[style] || CONFIG.signals.modes.swing).tfs[1];

// Trade-Karte (5f): Stop durch den Vorschlag ersetzen oder zurück. Ziele bleiben, R und Abstand werden neu gerechnet.
export function planWithStop(p, stop, label = 'Vorschlag (ATR)') {
  if (!p || !(stop > 0)) return p;
  const long = p.dir === 'long';
  if (long ? stop >= p.entry : stop <= p.entry) return p;
  const R = Math.abs(p.entry - stop);
  return { ...p, stop, R, stopDistPct: (R / p.entry) * 100, stopLabel: label, origStop: p.origStop ?? p.stop, origStopLabel: p.origStopLabel ?? p.stopLabel, stopAdjusted: true };
}
export function planOrigStop(p) {
  if (!p?.stopAdjusted) return p;
  const R = Math.abs(p.entry - p.origStop);
  const { origStop, origStopLabel, stopAdjusted, ...rest } = p;
  return { ...rest, stop: origStop, stopLabel: origStopLabel, R, stopDistPct: (R / p.entry) * 100 };
}

// Was kostet es, wenn der Stop greift? (5g) Liegt die Liquidation vor dem Stop, ist die ganze Margin weg.
// pnl: Ergebnis gegenüber dem Einstieg (negativ = Verlust), fromNow: zusätzlich gegenüber dem aktuellen Kurs.
export function lossAtStop(p) {
  const q = Math.abs(p?.size || 0);
  if (!q || !(p.entry > 0) || p.stop == null) return null;
  const long = p.side === 'long', mark = p.mark ?? p.entry;
  const liqFirst = p.liq > 0 && (long ? p.stop <= p.liq : p.stop >= p.liq);
  const exit = liqFirst ? p.liq : p.stop;
  const move = (a, b) => (long ? b - a : a - b) * q;
  const pnl = liqFirst && p.marginUsed > 0 ? -p.marginUsed : move(p.entry, exit);
  return { pnl, fromNow: move(mark, exit), liqFirst, exit };
}
