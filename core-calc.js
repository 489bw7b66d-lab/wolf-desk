// Reine Rechenfunktionen: keine Netzwerkzugriffe, keine Anzeige.
// Jede Funktion hier hat Tests in test-calc.js.

// Wandelt Hyperliquid-Zahlen (kommen als Text) sicher in Zahlen um.
export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Abstand vom aktuellen Preis zur Liquidation in Prozent.
// Long: Preis muss fallen, Short: Preis muss steigen.
export function liqDistancePct(side, mark, liq) {
  if (!mark || !liq || mark <= 0 || liq <= 0) return null;
  const d = side === 'long' ? (mark - liq) / mark : (liq - mark) / mark;
  return d * 100;
}

// Unrealisierter PnL auf Basis eines Preises (zum Nachrechnen mit Live-Kursen).
export function unrealizedPnl(size, entry, mark) {
  if (size == null || entry == null || mark == null) return null;
  return size * (mark - entry); // size ist bei Short negativ
}

// Mark-Preis, wie ihn die Börse zuletzt gemeldet hat: Positionswert / Größe.
export function markFromPosition(positionValue, size) {
  if (!positionValue || !size) return null;
  return Math.abs(positionValue / size);
}

// Kontoübersicht je nach Kontomodus.
// unified: Spot-USDC ist der Gesamtwert, Perps-Wert (Margin inkl. PnL) steckt darin.
// classic: Perps-Konto und Spot werden addiert.
export function accountSummary(a, mode = 'unified') {
  if (!a) return null;
  const perps = a.accountValue || 0;
  const spot = a.spotUsdc || 0;
  const unified = mode === 'unified';
  const equity = unified ? spot : perps + spot;
  const available = unified ? spot - perps : (a.withdrawable || 0);
  return {
    equity,
    available,
    inPositions: perps,
    usagePct: equity > 0 ? (perps / equity) * 100 : null,
    leverage: equity > 0 ? a.notional / equity : null,
  };
}
