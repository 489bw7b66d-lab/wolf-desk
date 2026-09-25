// Verknüpft Positionen mit Live-Kurs, Stop-Loss und Regelprüfung.
// Einzige Stelle, an der diese Daten zusammengeführt werden – alle Anzeigen nutzen sie.
import { CONFIG } from './config.js';
import { priceHealth } from './core-health.js';
import { liqDistancePct, accountSummary } from './core-calc.js';
import { findStopLoss, checkPosition, checkAccount, realizedPnl } from './core-risk.js';
import { getManualStop } from './core-stops.js';

export function enrichPositions(s, now = Date.now()) {
  const a = s.account;
  if (!a) return [];
  const equity = accountSummary(a, CONFIG.accountMode).equity;
  return a.positions.map((p) => {
    const live = priceHealth(s, p.coin, now).status === 'ok' ? s.prices[p.coin] : null;
    const mark = live ?? p.markSnapshot;
    const orderStop = findStopLoss(p, a.orders);
    const manualStop = orderStop == null ? getManualStop(p.coin) : null;
    const stop = orderStop ?? manualStop;
    const liqDist = liqDistancePct(p.side, mark, p.liq);
    const evaluation = checkPosition(p, mark, stop, liqDist, equity, CONFIG.rules);
    return { ...p, mark, live: live != null, stop, stopSource: orderStop != null ? 'Order' : manualStop != null ? 'manuell' : null, liqDist, evaluation };
  });
}

export function accountRisk(s, now = Date.now()) {
  const a = s.account;
  if (!a) return null;
  const summary = accountSummary(a, CONFIG.accountMode);
  const positions = enrichPositions(s, now);
  const missingStop = positions.some((p) => p.stop == null);
  const openRiskTotal = missingStop ? null : positions.reduce((n, p) => n + (p.evaluation.loss || 0), 0);
  const realizedToday = a.fillsToday ? realizedPnl(a.fillsToday) : null;
  const checks = checkAccount({ equity: summary.equity, positionsCount: positions.length, realizedToday: realizedToday ?? 0, openRiskTotal }, CONFIG.rules);
  if (realizedToday == null) checks[0] = { rule: 'Tagesverlust (realisiert)', status: 'warn', text: 'Trades von heute konnten nicht geladen werden' };
  return { summary, positions, checks, realizedToday, openRiskTotal };
}
