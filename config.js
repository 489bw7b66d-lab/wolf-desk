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

  // AUSSTIEGSPLAN: Anteil der Position je Ziel (Summe 100 %)
  exitPlan: [
    { label: 'TP1', pct: 20 },
    { label: 'TP2', pct: 25 },
    { label: 'TP3', pct: 25 },
    { label: 'TP4', pct: 15 },
    { label: 'Runner', pct: 15 },  // ohne festes Ziel, läuft mit Nachzieh-Stop
  ],
  runnerNote: 'Stop auf Einstieg ab TP2, danach unter das jeweils letzte erreichte Ziel nachziehen',

  // PERFORMANCE: dein eingezahltes Startkapital
  startCapital: 1500,

  // DEINE RISIKO-REGELN (Prozentwerte beziehen sich auf den Kontowert)
  rules: {
    riskPerTradeWarnPct: 10,  // ab hier gelbe Warnung (Verlust bis Stop-Loss)
    riskPerTradeMaxPct: 15,   // ab hier roter Regelverstoß
    dailyLossLimitPct: 15,    // realisierter Tagesverlust, ab dem Schluss ist
    maxLeverage: 20,          // maximaler Hebel pro Position
    liqBufferPct: 1,          // Liquidation muss mind. so viel % (vom Kurs) HINTER dem Stop liegen
    liqNoStopMinShare: 0.5,   // ohne Stop: Warnung, wenn mehr als die Hälfte des Anfangsabstands verbraucht ist
    maxOpenPositions: 5,      // maximal gleichzeitig offene Positionen
    marginBudgetPct: 50,      // Hebel-Empfehlung: pro Trade höchstens so viel % des verfügbaren Kapitals als Margin
    freeCapitalWarnPct: 10,   // gelb, wenn weniger als so viel % vom Konto frei sind
    freeCapitalMinPct: 2,     // rot darunter: keine neuen Trades möglich, kein Puffer
  },

  // SIGNALGEBER
  signals: {
    modes: {
      // tfs: Trend, Setup, Trigger · maxLeverage: Obergrenze für diesen Stil · minTp1Pct: TP1 muss mind. so weit weg sein (Gebühren)
      scalp: { label: 'Scalp', tfs: ['1h', '15m', '5m'], maxLeverage: 20, minTp1Pct: 0.4 },
      intraday: { label: 'Daytrade', tfs: ['4h', '1h', '15m'], maxLeverage: 10, minTp1Pct: 0.8 },
      swing: { label: 'Swing', tfs: ['1d', '4h', '1h'], maxLeverage: 5, minTp1Pct: 2 },
    },
    defaultMode: 'auto',       // 'auto' = alle drei Stile prüfen und den besten wählen
    candles: 260,              // Kerzen pro Timeframe (EMA 200 braucht Vorlauf)
    minScore: 65,              // Mindest-Score für ein Signal
    minGap: 20,                // Mindestabstand Long- zu Short-Score
    minDayVolumeUsd: 1000000,  // darunter: Warnung "geringe Liquidität"
    // Live-Überwachung der Top-Coins nach Market Cap
    hot: {
      topN: 150,               // Top 150 nach Market Cap (CoinGecko)
      maxPicks: 5,             // höchstens so viele "heiße" Coins anzeigen
      deepScan: 15,            // so viele Kandidaten werden auf allen Timeframes geprüft
      mode: 'auto',            // Tiefenprüfung in allen Stilen, bester wird gewählt
      requestGapMs: 1300,      // Abstand zwischen Hintergrund-Abrufen (Hyperliquid-Limit)
      roundPauseMs: 300000,    // Pause zwischen zwei Durchläufen (5 Min.)
    },
  },

  // Wie oft das Konto neu geladen wird (Kurse kommen live per WebSocket)
  refresh: {
    accountMs: 15000,
    performanceMs: 60000,
    pricesFallbackMs: 5000, // nur falls WebSocket ausfällt
  },

  // Ab wann Daten als veraltet gelten
  health: {
    priceStaleMs: 15000,
    accountStaleMs: 45000,
  },
};
