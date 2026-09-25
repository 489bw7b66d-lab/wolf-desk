// ============================================================
//  EINSTELLUNGEN – hier kannst du Dinge ändern, ohne Code anzufassen
// ============================================================
export const CONFIG = {
  // Hyperliquid-Schnittstelle (öffentlich, nur lesen)
  api: {
    rest: 'https://api.hyperliquid.xyz/info',
    ws: 'wss://api.hyperliquid.xyz/ws',
    timeoutMs: 8000,   // so lange warten wir maximal auf eine Antwort
    retries: 2,        // so oft wird bei Fehlern neu versucht
  },

  // Welche Börsen-Bereiche abgefragt werden:
  // ''    = Hyperliquid Hauptbörse (Krypto)
  // 'xyz' = trade.xyz (Rohstoffe, Forex, Aktien, Indizes)
  dexes: ['', 'xyz'],

  // Kontomodus bei Hyperliquid:
  // 'unified' = Guthaben liegt im Spot-Konto, Positionen sind darin enthalten (Ledger-Standard)
  // 'classic' = Perps-Konto und Spot-Konto getrennt
  accountMode: 'unified',

  // Beobachtete Märkte. HIP-3-Märkte tragen den Börsen-Namen als Präfix.
  // Falls ein Name nicht stimmt, zeigt die Testseite das an und listet die echten Namen.
  watchlist: ['BTC', 'ETH', 'SOL', 'LINK', 'xyz:GOLD', 'xyz:SILVER', 'xyz:EUR'],

  // DEINE RISIKO-REGELN (Prozentwerte beziehen sich auf den Kontowert)
  rules: {
    riskPerTradeWarnPct: 10,  // ab hier gelbe Warnung (Verlust bis Stop-Loss)
    riskPerTradeMaxPct: 15,   // ab hier roter Regelverstoß
    dailyLossLimitPct: 15,    // realisierter Tagesverlust, ab dem Schluss ist
    maxLeverage: 20,          // maximaler Hebel pro Position
    minLiqDistancePct: 10,    // Mindestabstand Kurs zur Liquidation
    maxOpenPositions: 5,      // maximal gleichzeitig offene Positionen
  },

  // Wie oft das Konto neu geladen wird (Kurse kommen live per WebSocket)
  refresh: {
    accountMs: 15000,
    pricesFallbackMs: 5000, // nur falls WebSocket ausfällt
  },

  // Ab wann Daten als veraltet gelten
  health: {
    priceStaleMs: 15000,
    accountStaleMs: 45000,
  },
};
