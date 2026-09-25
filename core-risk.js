// Risiko-Berechnungen und Regelprüfung. Reine Funktionen, keine Anzeige.
// Tests: test-risk.js

// Stop-Loss aus offenen Orders finden: Stop-Order auf der Verlustseite der Position.
export function findStopLoss(position, orders) {
  const isLong = position.side === 'long';
  const candidates = (orders || []).filter((o) => {
    if (o.coin !== position.coin) return false;
    const px = Number(o.triggerPx);
    if (!Number.isFinite(px) || px <= 0) return false;
    const type = String(o.orderType || '');
    const closes = isLong ? o.side === 'A' : o.side === 'B'; // A = Verkauf, B = Kauf
    return closes && type.includes('Stop');
  });
  if (!candidates.length) return null;
  // Bei mehreren: der Stop, der am nächsten am Kurs liegt, greift zuerst
  const pxs = candidates.map((o) => Number(o.triggerPx));
  return isLong ? Math.max(...pxs) : Math.min(...pxs);
}

// Verlust in $, wenn der Stop ab dem aktuellen Kurs ausgelöst wird (0 wenn Gewinn gesichert).
export function lossToStop(side, size, mark, stop) {
  if (stop == null || mark == null || size == null) return null;
  const move = side === 'long' ? mark - stop : stop - mark;
  return Math.max(0, move * Math.abs(size));
}

// Greift die Liquidation vor dem Stop?
export function liqBeforeStop(side, liq, stop) {
  if (liq == null || stop == null) return false;
  return side === 'long' ? liq >= stop : liq <= stop;
}

// Realisiertes Ergebnis aus Fills (geschlossener PnL minus Gebühren).
export function realizedPnl(fills) {
  return (fills || []).reduce((sum, f) => sum + (Number(f.closedPnl) || 0) - (Number(f.fee) || 0), 0);
}

// Positionsgröße für ein gewünschtes Risiko.
export function positionSize(equity, riskPct, entry, stop) {
  const dist = Math.abs(entry - stop);
  if (!(equity > 0) || !(riskPct > 0) || !(entry > 0) || !(stop > 0) || dist === 0) return null;
  const riskAmt = (equity * riskPct) / 100;
  const size = riskAmt / dist;
  return { riskAmt, size, notional: size * entry, stopDistPct: (dist / entry) * 100 };
}

const level = (bad, warn) => (bad ? 'bad' : warn ? 'warn' : 'ok');

// Prüft eine Position gegen die Regeln. mark = aktueller Kurs, stop = SL (Order oder manuell).
export function checkPosition(p, mark, stop, liqDist, equity, rules) {
  const loss = lossToStop(p.side, p.size, mark, stop);
  const riskPct = loss != null && equity > 0 ? (loss / equity) * 100 : null;
  const checks = [];
  checks.push({
    rule: 'Stop-Loss',
    status: stop == null ? 'warn' : liqBeforeStop(p.side, p.liq, stop) ? 'bad' : 'ok',
    text: stop == null ? 'Kein Stop-Loss hinterlegt, Risiko unbegrenzt' : liqBeforeStop(p.side, p.liq, stop) ? 'Liquidation greift vor dem Stop-Loss' : 'Stop liegt vor der Liquidation',
  });
  if (riskPct != null) checks.push({
    rule: 'Risiko bis Stop',
    status: level(riskPct >= rules.riskPerTradeMaxPct, riskPct >= rules.riskPerTradeWarnPct),
    text: `${riskPct.toFixed(1).replace('.', ',')} % vom Konto (Warnung ab ${rules.riskPerTradeWarnPct} %, max. ${rules.riskPerTradeMaxPct} %)`,
  });
  checks.push({
    rule: 'Hebel',
    status: level(p.leverage > rules.maxLeverage, p.leverage === rules.maxLeverage),
    text: `${p.leverage}× (max. ${rules.maxLeverage}×)`,
  });
  if (liqDist != null) checks.push({
    rule: 'Abstand Liquidation',
    status: level(liqDist < rules.minLiqDistancePct, liqDist < rules.minLiqDistancePct * 1.5),
    text: `${liqDist.toFixed(1).replace('.', ',')} % (mind. ${rules.minLiqDistancePct} %)`,
  });
  const worst = checks.some((c) => c.status === 'bad') ? 'bad' : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
  return { loss, riskPct, checks, worst };
}

// Prüft kontoweite Regeln.
export function checkAccount({ equity, positionsCount, realizedToday, openRiskTotal }, rules) {
  const dayLossPct = equity > 0 && realizedToday < 0 ? (-realizedToday / equity) * 100 : 0;
  return [
    {
      rule: 'Tagesverlust (realisiert)',
      status: level(dayLossPct >= rules.dailyLossLimitPct, dayLossPct >= rules.dailyLossLimitPct * 0.66),
      text: `${dayLossPct.toFixed(1).replace('.', ',')} % von max. ${rules.dailyLossLimitPct} %`,
      value: dayLossPct,
    },
    {
      rule: 'Offene Positionen',
      status: level(positionsCount > rules.maxOpenPositions, positionsCount === rules.maxOpenPositions),
      text: `${positionsCount} von max. ${rules.maxOpenPositions}`,
    },
    {
      rule: 'Gesamtrisiko bis Stops',
      status: level(false, openRiskTotal == null),
      text: openRiskTotal == null ? 'Nicht berechenbar, mindestens ein Stop-Loss fehlt'
        : `${(equity > 0 ? (openRiskTotal / equity) * 100 : 0).toFixed(1).replace('.', ',')} % vom Konto, wenn alle Stops greifen`,
    },
  ];
}
