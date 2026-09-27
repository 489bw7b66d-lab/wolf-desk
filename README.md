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
- `core-market.js`, `ui-market.js` – Marktüberblick (Markt-Bias, Fear & Greed, Marktkapitalisierung, BTC-Dominanz)
- `core-trades.js`, `ui-coin.js` – Trade-Historie aus Fills, Teilverkäufe, Markt-Blatt mit Chart in allen Zeitebenen
- `core-backtest.js`, `ui-backtest.js` – Backtest des Signalgebers auf vergangenen Kerzen
- `core-alerts.js`, `watcher.js` – Telegram-Wächter: läuft alle 15 Minuten bei GitHub Actions (`.github/workflows/wolf-watch.yml`), meldet starke Signale und Regelverstöße
- `core-settings.js`, `ui-settings.js`, `my-settings.js` – Einstellungen (Zahnrad): empfohlene Werte in config.js, deine Abweichungen in my-settings.js (auch für den Wächter)
- `ui-feed.js` – Letzte Signale im Signale-Tab (liest signals.json aus dem Zweig „signals“, vom Wächter veröffentlicht)
- `core-views.js`, `ui-views.js` – Deine Markteinschätzung je Markt: Marken im Chart, ⭐/⚠︎ bei Signalen, Meldungen des Wächters
- `core-fees.js` – Kosten: Gebühren, Funding, deine Gebührensätze, Schätzung je Trade
- `core-path.js` – Trade-Weg einer Position (Stop → Einstieg → Ziele aus echten Orders und Teilverkäufen)
- `core-plans.js` – Ziele je offener Position (eigener Plan, passendes Signal), Meldungen beim Erreichen
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
Etappe 3h: Marktüberblick (Bias-Tacho, Fear & Greed, Marktkap., BTC-Dominanz, ETF-Link), PnL 24 Std und realisiert vs. Buchgewinn, Teilverkäufe je Trade, abgeschlossene Trades, Markt-Blatt mit Chart in allen Zeitebenen, Trade-Karte in Handelsreihenfolge mit Margin, Live-Kurs/24h/Entry-Abstand in der Watchlist, Backtest-Modul
Etappe 3i: Privatmodus (Auge blendet Beträge und Stückzahlen aus, Prozente bleiben), Ziehen zum Aktualisieren in der installierten App
Etappe 3j: Verkäufe als Anteil in Prozent statt Stück, Ausstiegsplan mit Wert je Stufe
Etappe 3k: Versionsnummer für alle Dateien (Import-Map), damit nach Updates keine alten Dateien aus dem Zwischenspeicher geladen werden
Etappe 3l: Kundentest umgesetzt: rote Warnung bei fehlendem Stop nahe Liquidation, Regel „Freies Kapital“, Hinweis bei vollem Konto, eigene Trade-Statistik, kompakte Positionskarten, „Stop im Gewinn“, automatischer Watchlist-Scan, Backtest als eigener Tab, Börsen-Präfix ausgeblendet
Etappe 3m: Telegram-Wächter (GitHub Actions alle 15 Min., Signale ab Score 75, Regelverstöße und Entwarnungen, Wallet und Zugangsdaten als GitHub Secrets)
Etappe 3n: Signal-Tagebuch (jedes Telegram-Signal wird verfolgt: TP1/TP2 oder Stop, wöchentliche Auswertung privat), nur Swing/Daytrade per Telegram, Mindestumsatz 20 Mio. $, kein Richtungswechsel binnen 24 Std., Beschriftung „unter/über der Zone“
Etappe 3o: Einstellungen mit Zahnrad (Konto, Risiko, Ausstiegsplan, Signalgeber, Telegram, Indikatoren, Ereignis-Punkte), Empfehlung markiert, Zurücksetzen, Export my-settings.js für den Wächter
Etappe 3p: Wächter-Beruhigung: Entwarnung erst, wenn eine Regel wieder grün ist (kein Hin und Her bei Werten an der Grenze)
Etappe 3q: Tagebuch verknüpft Signale mit deinen echten Trades (Umsetzung, Auswahl, eigene Trades ohne Signal), automatische Update-Prüfung der App
Etappe 3r: Markt-Bias aus BTC (40 %), ETH (20 %), Marktbreite Top 50 über EMA 50 (25 %) und ETH/BTC (15 %), Aufschlüsselung unter dem Tacho, Gewichte in den Einstellungen
Etappe 3s: Signale-Tab zeigt die letzten 5 Telegram-Signale mit Live-Kurs, Abstand und Status statt der Watchlist-Liste; Wächter veröffentlicht signals.json im Zweig „signals“
Etappe 3t: Meine Einschätzung (Richtung, ungültig/bestätigt, Ziele, Notiz, Gültigkeit), Linien im Chart, ⭐ passt / ⚠︎ dagegen bei Signalen, Wächter meldet Marken und Ziele, Tagebuch wertet ⭐-Signale getrennt aus
Etappe 3u: Aufräumen: alte watcher.mjs entfernt, GitHub-Bausteine auf Version 5 (Node 24)
Etappe 3v: Menüleiste Start · Konto · Signale · Backtest · Risiko
Etappe 3w: Kosten-Karte im Konto (Gebühren und Funding 7/30/90 Tage, Anteil am Bruttogewinn), Funding und Netto je Trade, geschätzte Gebühren auf der Trade-Karte mit deinem echten Satz, Backtest rechnet mit deinem Satz
Etappe 3y: Trade-Weg in den Positionskarten: Fortschrittsbalken vom Stop bis zum Kurs mit beschrifteten Strichen für SL, Einstieg und TP1–TP4 (Anzahl nach Ausstiegsplan), erreichte Ziele mit ✓, nächstes Ziel in %
Etappe 3z: Ziele je Position für manuelles Schließen (aus Signal, aus Analyse oder selbst eingetragen, im Markt-Blatt), Trade-Weg nutzt diese Ziele, rot bis Einstieg und grün ab Einstieg, 🏁 am letzten Ziel, Beschriftungen ohne Überlappung, Wächter meldet erreichte Ziele privat mit Verkaufsanteil laut Plan
