# Wolf Desk

Trading-Dashboard für Hyperliquid (Krypto, Rohstoffe, Forex). Nur lesender Zugriff.

## Aufbau (flach, damit alles vom iPhone hochgeladen werden kann)
- `config.js` – alle Einstellungen (Watchlist, Börsen-Bereiche, Aktualisierung)
- `core-*.js` – Daten-Kern: Schnittstelle, Live-Kurse, Konto, Rechnen, Datenqualität
- `ui-*.js` – Anzeige-Module (lesen nur aus dem Store): `ui-home` Startseite, `ui-trade` Trade-Karte, `ui-signals` Signale, `ui-risk` Risiko, `ui-performance`, `ui-parts` gemeinsame Bausteine
- `core-performance.js`, `ui-performance.js` – Performance ab Startkapital, Verlauf, Drawdown
- `core-indicators.js`, `core-signals.js`, `core-scanner.js`, `ui-signals.js` – Signalgeber (EMA, RSI, MACD, ATR, Struktur, Scores, Trade-Plan)
- `core-fib.js`, `core-elliott.js`, `core-universe.js`, `core-hotscan.js` – Fibonacci, Elliott-Regeln, Top-150-Liste, Live-Überwachung
- `core-risk.js`, `core-positions.js`, `core-stops.js` – Risiko-Regeln, Zusammenführung, manuelle Stops
- `test-*.js` – Tests für alle Rechenfunktionen, aufrufbar über `tests.html`

## Stand
Etappe 1: Daten-Kern (fertig)
Etappe 2: Risiko-Modul (hebelangepasst), Stop-Loss-Erkennung, Positionsgrößen-Rechner, Performance (fertig)
Etappe 3: Signalgeber mit Scalp/Intraday/Swing, Watchlist-Scan, Navigation
Etappe 3b: Heiße Coins (Top 150 Market Cap), EMA-Kreuzungen inkl. Golden/Death Cross, RSI-Zonen, Momentum, Volumen-Spikes, Elliott ab 4H, Fibonacci-Stops und -Ziele
Etappe 3c: Startseite, Trade-Karte mit einem Tipp, Marktsuche, automatische Überwachung
Etappe 3d: Automatische Stilwahl (Scalp/Daytrade/Swing) mit Hebel-Obergrenzen, Ausstiegsplan TP1–TP4 + Runner, Margin im Rechner
Etappe 3e: Live-Kurs auf der Trade-Karte, Chartmuster-Brüche (1D/4H), Candlestick-Muster, neue Score-Balance (70 Trend + max. 30 Ereignisse)
Etappe 3f: Live-Chart auf der Trade-Karte, Hebel manuell per Stepper, Hyperliquid-Hebelgrenzen, App-Icon (PWA)
Etappe 3g: Watchlist bearbeitbar (max. 15), Retest-Siegel (BOS/CHoCH/Key Level), Hebel-Regler mit Farbzonen, Chart-Abstand
