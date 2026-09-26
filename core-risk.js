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
export function maxLeverageForStop(stopDistPct, bufferPct, maxLeverage) { // maxLeverage = Regel- bzw. Stil-Obergrenze
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

// Hebel-Empfehlung: so niedrig wie möglich, dabei höchstens `budgetPct` % des verfügbaren Kapitals als Margin.
// Reicht das Budget nicht, darf die Margin bis zum gesamten verfügbaren Kapital gehen.
// Obergrenze ist immer der Hebel, bei dem die Liquidation noch hinter dem Stop liegt.
export function recommendLeverage(notional, available, maxLev, budgetPct = 50) {
  if (!(notional > 0) || !(available > 0) || !maxLev) return null;
  const inBudget = Math.max(1, Math.ceil(notional / (available * budgetPct / 100)));
  const minimum = Math.max(1, Math.ceil(notional / available));
  if (minimum > maxLev) return { lev: null, need: minimum, maxLev };
  const lev = Math.min(inBudget, maxLev);
  const margin = notional / lev;
  return { lev, need: minimum, maxLev, margin, budgetPct: (margin / available) * 100 };
}

// Ausstiegsplan: Position auf Ziele verteilen. splits: [{label, pct}], letzter Eintrag ohne Ziel = Runner.
// Ergebnis je Stufe: Preis, Stückzahl, Wert (Anteil am Positionswert beim Einstieg), Gewinn in $; dazu Summe, wenn alle festen Ziele erreicht werden.
export function exitPlan(dir, entry, tps, size, splits) {
  if (!(size > 0) || !entry) return null;
  const s = dir === 'long' ? 1 : -1;
  const rows = splits.map((sp, i) => {
    const price = tps[i] ?? null;
    const qty = (size * sp.pct) / 100;
    return { label: sp.label, pct: sp.pct, price, qty, value: qty * entry, profit: price != null ? s * (price - entry) * qty : null };
  });
  const fixed = rows.filter((x) => x.profit != null);
  return { rows, totalFixed: fixed.reduce((n, x) => n + x.profit, 0), pctFixed: fixed.reduce((n, x) => n + x.pct, 0) };
}

// Größte machbare Position, wenn das Wunschrisiko nicht ins Kapital passt:
// Margin = budgetPct % vom verfügbaren Kapital, Hebel = maxLev.
export function maxFit(entry, stop, available, maxLev, budgetPct = 50) {
  if (!(entry > 0) || !(stop > 0) || !(available > 0) || !(maxLev > 0)) return null;
  const margin = (available * budgetPct) / 100;
  const notional = margin * maxLev;
  const size = notional / entry;
  return { size, notional, margin, lev: maxLev, riskAmt: size * Math.abs(entry - stop) };
}

// Wo steht der Live-Kurs im Verhältnis zum Plan?
// 'zone' = in der Einstiegszone, 'chasing' = schon Richtung Ziel gelaufen, 'early' = zwischen Zone und Stop, 'invalid' = hinter dem Stop
export function priceVsPlan(p, price) {
  if (!p || !(price > 0)) return null;
  const long = p.dir === 'long';
  const [lo, hi] = p.zone;
  let state;
  if ((long && price <= p.stop) || (!long && price >= p.stop)) state = 'invalid';
  else if (price >= lo && price <= hi) state = 'zone';
  else if ((long && price > hi) || (!long && price < lo)) state = 'chasing';
  else state = 'early';
  const ref = long ? (state === 'chasing' ? hi : lo) : (state === 'chasing' ? lo : hi);
  return { state, distPct: state === 'zone' ? 0 : ((price - ref) / ref) * 100 };
}

// Plan mit dem Live-Kurs als Einstieg (Ziele bleiben, Risiko und R ändern sich)
export function withEntry(p, price) {
  if (!p || !(price > 0)) return null;
  const long = p.dir === 'long';
  if ((long && price <= p.stop) || (!long && price >= p.stop)) return null;
  const R = Math.abs(price - p.stop);
  return { ...p, entry: price, R, stopDistPct: (R / price) * 100, liveEntry: true };
}

// Prüft einen (manuell gewählten) Hebel. liqMax = Hebel, ab dem die Liquidation vor dem Stop läge.
export function leverageIssues(lev, { liqMax, exchangeMax, styleMax, margin, available }) {
  const out = [];
  if (!(lev > 0)) return out;
  if (exchangeMax && lev > exchangeMax) out.push({ status: 'bad', text: `Hyperliquid erlaubt für diesen Markt max. ${exchangeMax}×` });
  if (liqMax && lev > liqMax) out.push({ status: 'bad', text: `Bei ${lev}× läge die Liquidation vor dem Stop (bis ca. ${liqMax}× sicher)` });
  if (margin != null && available != null && margin > available) out.push({ status: 'bad', text: 'Margin ist höher als dein verfügbares Kapital' });
  if (styleMax && lev > styleMax) out.push({ status: 'warn', text: `Über deiner Obergrenze für diesen Stil (${styleMax}×)` });
  return out;
}

// Ampel für einen Hebel: 'ok' sicher, 'warn' über Stil-Grenze bzw. mehr als Budget, 'bad' Liquidation vor Stop / Börsenlimit / Kapital reicht nicht
export function levStatus(lev, { notional, available, liqMax, exchangeMax, styleMax, budgetPct = 50 }) {
  const margin = notional / lev;
  const issues = leverageIssues(lev, { liqMax, exchangeMax, styleMax, margin, available });
  if (issues.some((i) => i.status === 'bad')) return { status: 'bad', margin, issues };
  if (issues.length || margin > (available * budgetPct) / 100) return { status: 'warn', margin, issues };
  return { status: 'ok', margin, issues };
}
