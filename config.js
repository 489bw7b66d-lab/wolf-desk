// ============================================================
//  EINSTELLUNGEN – hier kannst du Dinge ändern, ohne Code anzufassen
// ============================================================
import { LEDGER_MARKETS } from './ledger-markets.js';
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
  // Standard-Watchlist. In der App bearbeitest du sie direkt, der Telegram-Wächter nutzt diese Liste.
  watchlist: ['BTC', 'ETH', 'SOL', 'LINK', 'NEAR', 'XRP', 'XLM', 'LTC', 'xyz:QNT', 'ZEC', 'SUI'],

  // HANDELBARE MÄRKTE (z. B. was über Ledger handelbar ist). In der App unter ⚙️ gepflegt, über my-settings.js auch für den Wächter.
  // Leer = Heiße Coins und Wächter scannen wie bisher die Top-Coins nach Market Cap. Mit Einträgen = nur diese Märkte (plus Watchlist).
  // Standard seit 4c: deine Ledger-Liste aus ledger-markets.js.
  tradeable: [...LEDGER_MARKETS],

  // DEINE MARKTEINSCHÄTZUNG je Markt (wird in der App gepflegt und über my-settings.js an den Wächter gegeben)
  views: {},

  // DEINE ZIELE je offener Position (für manuelles Schließen; über my-settings.js auch für den Wächter)
  plans: {},

  // SCHUTZ VOR TYPISCHEN FEHLERN
  guard: {
    stopNoiseAtr: 1.0,         // Stop näher als so viele ATR = rot: liegt im normalen Rauschen
    stopTightAtr: 1.5,         // bis hierhin gelb: knapp
    suggestAtr: 1.5,           // Vorschlag für einen sinnvolleren Stop-Abstand
    lossStreak: 2,             // so viele Verlust-Trades in Folge starten die Abkühlphase
    cooldownHours: 4,          // so lange dauert die Abkühlphase
  },

  // AUTOMATISCHER PLAN für offene Positionen ohne eigene Ziele und ohne Signal
  positions: {
    autoStyle: 'swing',      // nach welchem Stil SL und Ziele berechnet werden: 'swing' oder 'intraday'
  },

  // LETZTE SIGNALE: vom Wächter veröffentlicht (eigener Zweig "signals", nur öffentliche Signaldaten)
  feed: {
    url: 'https://raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/signals/signals.json',
    count: 5,                   // so viele Signale im Signale-Tab
  },

  // TELEGRAM-WÄCHTER (läuft alle 15 Minuten bei GitHub)
  alerts: {
    minScore: 75,               // Signal melden ab diesem Score
    styles: ['swing', 'intraday'], // Scalp nicht per Telegram: der Wächter läuft nur alle 15 Minuten
    minVolumeUsd: 20000000,     // nur Märkte mit mindestens so viel 24h-Umsatz (weniger Ausreißer)
    flipHours: 24,              // kein Richtungswechsel auf demselben Markt innerhalb so vieler Stunden
    journalDays: { swing: 14, intraday: 3 }, // so lange wird ein Signal im Tagebuch verfolgt
    reportDays: 7,              // Tagebuch-Auswertung alle so viele Tage privat an dich
    repeatHours: 12,            // gleicher Markt in gleicher Richtung frühestens nach so vielen Stunden erneut
    states: ['zone', 'early'],  // nur melden, wenn der Kurs noch nicht davongelaufen ist
    maxPerRun: 3,               // höchstens so viele Signal-Meldungen pro Durchlauf
    risk: true,                 // Regelverstöße deiner Positionen melden (und Entwarnung)
    appUrl: 'https://489bw7b66d-lab.github.io/wolf-desk/',
  },

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
    riskSteps: [2, 3, 5],     // Knöpfe „Risiko pro Trade“ auf Trade-Karte und im Rechner (Prozent vom Konto)
    riskPerTradeWarnPct: 3,   // ab hier gelbe Warnung (Verlust bis Stop-Loss)
    riskPerTradeMaxPct: 5,    // ab hier roter Regelverstoß
    dailyLossLimitPct: 15,    // realisierter Tagesverlust, ab dem Schluss ist
    maxLeverage: 20,          // maximaler Hebel pro Position
    liqBufferPct: 1,          // Liquidation muss mind. so viel % (vom Kurs) HINTER dem Stop liegen
    liqNoStopMinShare: 0.5,   // ohne Stop: Warnung, wenn mehr als die Hälfte des Anfangsabstands verbraucht ist
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
    shortFilter: 'aus',        // Shorts nur mit bärischem Tagestrend: 'aus' | 'mild' | 'mittel' | 'streng' (core-trendgate.js, Backtest vergleicht alle)
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

  // MARKT-BIAS: Zusammensetzung des Tachos auf der Startseite (Gewichte in Prozent)
  market: {
    biasWeights: { btc: 40, eth: 20, breadth: 25, ratio: 15 },
    breadthTop: 50,            // Marktbreite: so viele Top-Coins nach Market Cap
    breadthEma: 50,            // … über ihrer EMA dieser Länge im Tageschart
  },

  // INDIKATOREN (Experte): Längen und Schwellen der Signal-Berechnung
  indicators: {
    emaFast: 8, emaMid: 21, emaSlow: 55, emaTrend: 200,  // EMA-Längen (Stack und Kreuzungen)
    rsiPeriod: 14, rsiHigh: 70, rsiLow: 30,             // RSI-Länge und Grenzen überkauft/überverkauft
    atrPeriod: 14,                                      // ATR-Länge (Stops, Momentum, Muster)
    macdFast: 12, macdSlow: 26, macdSignal: 9,          // MACD
    momentumAtr: 3,                                     // ab so vielen ATR in 10 Kerzen gilt Momentum als stark
    volumeSpike: 2.5,                                   // ab diesem Vielfachen des Durchschnitts gilt Volumen als Spike
  },
  // PUNKTE JE EREIGNIS (Trendzustand max. 70, Ereignisse max. 30 je Timeframe und Richtung)
  eventPoints: {
    goldenCross: 15, patternDaily: 15, pattern4h: 10, ema55x200: 8, ema21x55: 7, ema8x21: 5, macdCross: 4,
    rsiExit: 6, momentum: 4, momentumStrong: 7, volume: 5, volumeStrong: 8, candle: 4, candleStrong: 5, elliott: 8,
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

// ============================================================
//  DEINE EINSTELLUNGEN
//  Die Werte oben sind die EMPFEHLUNG. Abweichungen kommen aus
//  my-settings.js (für App und Telegram-Wächter, von der App erzeugt)
//  und in der App zusätzlich aus dem Speicher des iPhones.
// ============================================================
// Fehlt die Datei (z. B. vergessen hochzuladen), läuft alles mit der Empfehlung weiter
let fileSettings = {};
try { fileSettings = (await import('./my-settings.js')).MY_SETTINGS || {}; } catch { /* keine eigenen Werte */ }
export const MY_SETTINGS = fileSettings;
export const RECOMMENDED = JSON.parse(JSON.stringify(CONFIG));
export const SETTINGS_KEY = 'wolfdesk.settings';

// Wert über Pfad lesen/schreiben, z. B. "rules.maxLeverage" oder "exitPlan.0.pct"
export function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
export function setPath(obj, path, value) {
  const keys = path.split('.'); let o = obj;
  keys.slice(0, -1).forEach((k) => { if (o[k] == null) o[k] = {}; o = o[k]; });
  o[keys.at(-1)] = value;
}
export function applySettings(target, overrides) {
  Object.entries(overrides || {}).forEach(([path, v]) => {
    if (getPath(RECOMMENDED, path) !== undefined) setPath(target, path, JSON.parse(JSON.stringify(v)));
  });
}
function localOverrides() {
  try { return JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}
applySettings(CONFIG, MY_SETTINGS);
applySettings(CONFIG, localOverrides());
