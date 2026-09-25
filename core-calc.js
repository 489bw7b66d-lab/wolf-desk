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
