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

// Risiko einer Position, zwei Sichtweisen:
// fromEntry = geplantes Risiko ab Einstieg (Basis für die Regel)
// fromNow   = was ab dem aktuellen Kurs noch verloren gehen kann (inkl. Buchgewinn)
// Greift die Liquidation vor dem Stop, zählt bei isolierten Positionen die Margin als Maximalverlust.
export function positionRisk(p, mark, stop) {
  if (stop == null) return { fromEntry: null, fromNow: null, giveBack: null, liqFirst: false };
  const liqFirst = liqBeforeStop(p.side, p.liq, stop);
  const isolated = p.leverageType === 'isoliert';
  let fromEntry, fromNow;
  if (liqFirst && isolated) {
    fromEntry = p.entry && p.leverage ? (p.entry * Math.abs(p.size)) / p.leverage : null; // Anfangs-Margin
    fromNow = p.marginUsed ?? null;
  } else {
    const exit = liqFirst ? p.liq : stop;
    fromEntry = lossToStop(p.side, p.size, p.entry, exit);
    fromNow = lossToStop(p.side, p.size, mark, exit);
  }
  const giveBack = fromNow != null && fromEntry != null ? Math.max(0, fromNow - fromEntry) : null;
  return { fromEntry, fromNow, giveBack, liqFirst };
}

const fmt1 = (v) => v.toFixed(1).replace('.', ',');

// Ungefährer Abstand Einstieg → Liquidation bei isoliertem Hebel (in %).
// 90 statt 100, weil die Wartungs-Margin die Liquidation etwas näher rückt.
export const approxLiqDistPct = (leverage) => (leverage > 0 ? 90 / leverage : null);

// Höchster Hebel, bei dem die Liquidation noch hinter dem Stop plus Puffer liegt.
export function maxLeverageForStop(stopDistPct, bufferPct, maxLeverage) {
  if (!(stopDistPct > 0)) return null;
  return Math.max(1, Math.min(maxLeverage, Math.floor(90 / (stopDistPct + bufferPct))));
}

// Liquidations-Prüfung, an den Hebel angepasst:
// mit Stop: Liegt die Liquidation weit genug hinter dem Stop?
// ohne Stop: Wie viel vom hebelabhängigen Anfangsabstand ist schon verbraucht?
export function liqCheck(p, mark, stop, liqDist, rules, liqFirst) {
  if (liqDist == null || !mark || !p.liq) return null;
  if (stop != null) {
    if (liqFirst) return null; // wird schon beim Stop-Loss als Verstoß gemeldet
    const buffer = (p.side === 'long' ? stop - p.liq : p.liq - stop) / mark * 100;
    return {
      rule: 'Liquidations-Puffer',
      status: level(false, buffer < rules.liqBufferPct),
      text: `Liquidation ${fmt1(buffer)} % hinter dem Stop (mind. ${fmt1(rules.liqBufferPct)} %)`,
    };
  }
  const start = approxLiqDistPct(p.leverage);
  const share = start ? liqDist / start : 1;
  return {
    rule: 'Abstand Liquidation',
    status: level(share < rules.liqNoStopMinShare * 0.5, share < rules.liqNoStopMinShare),
    text: `${fmt1(liqDist)} % von anfangs ca. ${fmt1(start)} % bei ${p.leverage}×`,
  };
}

// Prüft eine Position gegen die Regeln. mark = aktueller Kurs, stop = SL (Order oder manuell).
export function checkPosition(p, mark, stop, liqDist, equity, rules) {
  const risk = positionRisk(p, mark, stop);
  const riskPct = risk.fromEntry != null && equity > 0 ? (risk.fromEntry / equity) * 100 : null;
  const checks = [];
  checks.push({
    rule: 'Stop-Loss',
    status: stop == null ? 'warn' : risk.liqFirst ? 'bad' : 'ok',
    text: stop == null ? 'Kein Stop-Loss hinterlegt, Risiko unbegrenzt' : risk.liqFirst ? 'Liquidation greift vor dem Stop-Loss' : 'Stop liegt vor der Liquidation',
  });
  if (riskPct != null) checks.push({
    rule: 'Risiko ab Einstieg',
    status: level(riskPct >= rules.riskPerTradeMaxPct, riskPct >= rules.riskPerTradeWarnPct),
    text: `${riskPct.toFixed(1).replace('.', ',')} % vom Konto (Warnung ab ${rules.riskPerTradeWarnPct} %, max. ${rules.riskPerTradeMaxPct} %)`,
  });
  checks.push({
    rule: 'Hebel',
    status: level(p.leverage > rules.maxLeverage, p.leverage === rules.maxLeverage),
    text: `${p.leverage}× (max. ${rules.maxLeverage}×)`,
  });
  const lc = liqCheck(p, mark, stop, liqDist, rules, risk.liqFirst);
  if (lc) checks.push(lc);
  const worst = checks.some((c) => c.status === 'bad') ? 'bad' : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
  return { ...risk, loss: risk.fromNow, riskPct, checks, worst };
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
