# Wolf Desk – Masterplan

Stand: 27.09.2026 · Etappe 3u · 293 Tests

Dieses Dokument enthält alles, um Wolf Desk weiterzuentwickeln oder wiederherzustellen, auch wenn Chats verloren gehen.
Es enthält bewusst **keine Zugangsdaten** (Token, Wallet, Chat-IDs), weil das Repository öffentlich ist.

---

## 1. Worum es geht

**Wolf Desk** ist eine Trading-App (PWA) für Hyperliquid, gebaut komplett vom iPhone aus.
Nur lesender Zugriff: Die App kann nichts handeln, nur anzeigen, rechnen und warnen.

- **App:** Marktüberblick, Konto, Positionen, Risiko-Regeln, Signalgeber, Trade-Karten, Backtest, eigene Statistik
- **Telegram-Wächter:** läuft alle 15 Minuten bei GitHub, meldet Signale (Kanal) und Regelverstöße (privat)
- **Signal-Tagebuch:** misst jedes gemeldete Signal und vergleicht mit den echten Trades

---

## 2. Zusammenarbeit (Regeln, die sich bewährt haben)

- **Modular:** jede Datei hat eine Aufgabe; der Rechen-Kern wird nie nebenbei verändert.
- **Etappen:** jedes Update ist ein eigenes Paket mit Nummer (3a, 3b, …) und muss einzeln stabil laufen.
- **Tests:** jedes Paket muss auf `tests.html` alle Tests grün zeigen.
- **Wächter:** vor jedem Paket wird der Wächter komplett durchgespielt (Testlauf, normaler Lauf), nicht nur die App-Tests.
- **Nur geänderte Dateien** werden geliefert, als ZIP mit eigenem Ordner (z. B. `wolf-desk-3u`).
- **Arbeit vom iPhone:** Brave-Browser, Dateien-App, GitHub im Browser. Keine Ordner hochladbar, deshalb flache Struktur.
- **Ehrlichkeit:** keine Trefferquoten-Versprechen, Hinweise bei riskanten Werten, Bremse bei Überpacen.
- **Messen vor Ändern:** Signal-Einstellungen erst ändern, wenn das Tagebuch genug Daten hat (2–3 Wochen).

---

## 3. Adressen

| Wofür | Adresse |
|---|---|
| App | `489bw7b66d-lab.github.io/wolf-desk` |
| Tests | `489bw7b66d-lab.github.io/wolf-desk/tests.html` |
| Repository | `github.com/489bw7b66d-lab/wolf-desk` |
| Hochladen | `github.com/489bw7b66d-lab/wolf-desk/upload/main` |
| Datei löschen | `github.com/489bw7b66d-lab/wolf-desk/delete/main/DATEINAME` |
| Wächter starten / Läufe | `github.com/489bw7b66d-lab/wolf-desk/actions/workflows/wolf-watch.yml` |
| Zeitplan bearbeiten | `github.com/489bw7b66d-lab/wolf-desk/edit/main/.github/workflows/wolf-watch.yml` |
| Secrets | `github.com/489bw7b66d-lab/wolf-desk/settings/secrets/actions` |
| Neues Secret | `github.com/489bw7b66d-lab/wolf-desk/settings/secrets/actions/new` |
| Veröffentlichte Signale | `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/signals/signals.json` |

Altes Projekt (nicht anfassen): Repository `jensen-hyperliquid-connector`.

---

## 4. Zugänge und Geheimnisse (nur die Namen!)

Die Werte stehen als **GitHub Secrets** im Repository und sind dort nicht mehr lesbar, nur überschreibbar.

| Secret | Inhalt | Wo man den Wert wiederbekommt |
|---|---|---|
| `TELEGRAM_TOKEN` | Token des Bots **@WolfDeskBuddyBot** | Telegram → **@BotFather** (blauer Haken!) → `/mybots` → Wolf Desk → API Token → Copy. **Nie „Revoke“ tippen.** |
| `TELEGRAM_CHAT` | deine private Chat-ID mit dem Bot | Secret löschen, Bot „hallo“ schreiben, Test starten → Bot schickt die ID |
| `TELEGRAM_CHANNEL` | ID deines Signal-Kanals (beginnt mit `-100`) | Secret löschen, etwas in den Kanal posten, Test starten → Bot schickt „Kanal gefunden“ |
| `WALLET` | deine Hyperliquid-Adresse (öffentlich, nur lesend) | Hyperliquid / Ledger |

Im Kanal ist der Bot **Admin** mit dem Recht „Nachrichten posten“.
Achtung vor falschen BotFathern (z. B. „Botfagher“): nur der mit blauem Haken ist echt.

---

## 5. Aufbau der App (64 Dateien, alle im Hauptordner)

**Einstellungen**
- `config.js` – alle **empfohlenen** Werte (Watchlist, Regeln, Signale, Indikatoren, Wächter)
- `my-settings.js` – **deine Abweichungen** (von der App erzeugt, gilt auch für den Wächter)

**Daten-Kern (`core-*.js`)**
- `core-api.js`, `core-stream.js`, `core-store.js`, `core-health.js` – Hyperliquid-Schnittstelle, Live-Kurse, Datenqualität
- `core-account.js`, `core-calc.js`, `core-positions.js`, `core-stops.js` – Konto, Positionen, Stops
- `core-risk.js` – Risiko-Regeln, Ausstiegsplan, Hebel
- `core-performance.js`, `core-trades.js` – Performance, Trade-Historie, eigene Statistik
- `core-indicators.js`, `core-signals.js`, `core-scanner.js` – Indikatoren, Scores, Trade-Plan, Stilwahl
- `core-fib.js`, `core-elliott.js`, `core-patterns.js`, `core-candlesticks.js`, `core-confirm.js` – Fibonacci, Elliott, Chartmuster, Kerzen, Retest-Siegel
- `core-universe.js`, `core-hotscan.js` – Top-150-Liste, Heiße Coins
- `core-market.js` – Marktüberblick, zusammengesetzter Markt-Bias
- `core-backtest.js` – Backtest
- `core-settings.js` – Einstellungen (Grenzen, Prüfungen, Export)
- `core-views.js` – deine Markteinschätzung
- `core-alerts.js` – Wächter-Logik, Tagebuch, Berichte
- `core-watchlist.js`, `core-format.js` – Watchlist, Zahlenformat (inkl. Privatmodus)

**Anzeige (`ui-*.js`)**
- `ui-home.js` (Start), `ui-market.js` (Tacho), `ui-feed.js` (Letzte Signale), `ui-views.js` (Meine Einschätzung)
- `ui-signals.js` (Signalgeber), `ui-trade.js` (Trade-Karte), `ui-coin.js` (Markt-Blatt), `ui-chart.js` (Chart)
- `ui-performance.js`, `ui-testpage.js` (Konto), `ui-risk.js` (Risiko), `ui-backtest.js`, `ui-settings.js`, `ui-parts.js`

**Rahmen**
- `index.html`, `main.js`, `styles.css`, `manifest.json`, `icon-*.png`
- `tests.html` + `test-*.js` – alle Tests
- `watcher.js` – der Telegram-Wächter (läuft bei GitHub)
- `.github/workflows/wolf-watch.yml` – Zeitplan des Wächters (siehe Abschnitt 8)

**Versionsnummer:** `index.html` enthält `<meta name="app-version" content="3u">` und eine Import-Map mit `?v=3u` für jede Datei.
Bei jedem Update wird die Nummer erhöht; die App erkennt neue Versionen dann selbst und lädt sich neu.

---

## 6. Empfohlene Werte (Stand 3u)

- Kontomodus **unified**, Startkapital **1.500 $**, Börsenbereiche Standard + **xyz** (Gold, Silber, EUR, …)
- **Risiko:** gelb ab 10 %, rot ab 15 % pro Trade · Tagesverlust max. 15 % · Hebel max. 20× · max. 5 Positionen · Liquidation mind. 1 % hinter Stop · Margin je Trade max. 50 % des Freien · freies Kapital gelb unter 10 %, rot unter 2 %
- **Ausstiegsplan:** TP1 20 % · TP2 25 % · TP3 25 % · TP4 15 % · Runner 15 % (Stop auf Einstieg ab TP2)
- **Stil-Hebel:** Scalp 20× · Daytrade 10× · Swing 5×
- **Score:** Trend max. 70 + Ereignisse max. 30; Retest-Siegel 🛡 zählt nicht in den Score
- **Markt-Bias:** BTC 40 % · ETH 20 % · Marktbreite (Top 50 über EMA 50) 25 % · ETH/BTC 15 %
- **Wächter:** Signale ab Score 75 · nur Swing und Daytrade · Mindestumsatz 20 Mio. $ · gleiches Signal frühestens nach 12 Std. · kein Richtungswechsel binnen 24 Std. · max. 3 Meldungen pro Lauf · Bericht alle 7 Tage
- **Indikatoren:** EMA 8/21/55/200 · RSI 14 (70/30) · ATR 14 · MACD 12/26/9

Alle Werte sind in der App über ⚙️ änderbar; „empfohlen“ zeigt den Wert aus `config.js`.

---

## 7. Update-Routine (Schritt für Schritt)

1. ZIP in der Dateien-App speichern und antippen → Ordner `wolf-desk-XX` entsteht.
2. Bei GitHub **angemeldet** sein (oben rechts Profilbild, nicht „Sign in“).
3. `…/upload/main` → „choose your files“ → Durchsuchen → Ordner → „Auswählen“ → „Alle auswählen“ → Öffnen → **Commit changes**.
4. ~10 Minuten warten; App öffnen (aktualisiert sich selbst). `tests.html` prüfen.
5. Betrifft das Update den Wächter: Test starten (`…/actions/workflows/wolf-watch.yml` → Run workflow).

**Einzelne Datei ersetzen:** vorher die alte Datei in der Dateien-App **löschen**, sonst heißt die neue „name 2.js“.
**Zeitplan ändern:** kein Upload, sondern Text im Browser ersetzen (`…/edit/main/.github/workflows/wolf-watch.yml`).
**Einstellungen / Einschätzungen an den Wächter:** ⚙️ → „Für den Wächter übernehmen“ → `my-settings.js` sichern → hochladen.

**Bekannte Stolperfallen**
- „Uploads are disabled“ = nicht angemeldet.
- iPhone benennt `.mjs` in `.js` um und hängt „2“ an doppelte Namen.
- Brave behandelt lange Adressen mit Doppelpunkt manchmal als Suche (Token nie in die Suchleiste!).
- Alte Dateien im Zwischenspeicher: App komplett schließen; seit 3q prüft die App selbst auf Updates.
- Platzhalter in Anleitungen (z. B. „dein Token“) nie wörtlich übernehmen.

**Notfall:** Läuft nach einem Update etwas nicht, bei GitHub die betroffene Datei öffnen → Uhr-Symbol (History) → ältere Version ansehen und deren Inhalt zurückspielen. Der Wächter zeigt Fehler unter Actions → Lauf → „watch“ → roter Schritt.

---

## 8. Telegram-Wächter

- Läuft alle 15 Minuten (GitHub startet teils 5–15 Min. später) und kostenlos, solange das Repository öffentlich ist.
- **Ablauf je Lauf:** Konto prüfen (Regelverstöße, Entwarnung erst bei grün) → Tagebuch auswerten und mit echten Trades verknüpfen → Top 150 + Watchlist scannen → Signale melden → deine Marken prüfen → Wochenbericht → `signals.json` veröffentlichen.
- **Gedächtnis:** Datei `.watch-state.json` im GitHub-Zwischenspeicher (Tagebuch, gemeldete Signale, aktive Alarme).
- **Veröffentlichung:** `signals.json` im eigenen Zweig `signals` (nur öffentliche Signaldaten, nichts über echte Trades).
- **Kanal:** Signale. **Privat:** Regelverstöße, Marken, Tagebuch-Berichte.
- GitHub pausiert Zeitpläne nach 60 Tagen ohne Änderung am Repository; ein kleines Update weckt ihn.

**Aktueller Zeitplan** (`.github/workflows/wolf-watch.yml`):

```yaml
name: Wolf Desk Wächter

on:
  schedule:
    - cron: '*/15 * * * *'   # alle 15 Minuten (GitHub startet teils einige Minuten später)
  workflow_dispatch:          # manuell starten über „Run workflow“
    inputs:
      test:
        description: 'Nur Testnachricht senden'
        type: boolean
        default: true

concurrency:
  group: wolf-watch
  cancel-in-progress: false

permissions:
  contents: write   # damit der Wächter signals.json im Zweig "signals" ablegen darf

jobs:
  watch:
    runs-on: ubuntu-latest
    timeout-minutes: 14
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          package-manager-cache: false

      # Gedächtnis zwischen den Läufen (was schon gemeldet wurde)
      - uses: actions/cache/restore@v5
        with:
          path: .watch-state.json
          key: watch-state-${{ github.run_id }}
          restore-keys: watch-state-

      - name: Wächter ausführen
        run: |
          echo '{"type":"module"}' > package.json
          node watcher.js
        env:
          TELEGRAM_TOKEN: ${{ secrets.TELEGRAM_TOKEN }}
          TELEGRAM_CHAT: ${{ secrets.TELEGRAM_CHAT }}
          TELEGRAM_CHANNEL: ${{ secrets.TELEGRAM_CHANNEL }}
          WALLET: ${{ secrets.WALLET }}
          TEST_RUN: ${{ github.event_name == 'workflow_dispatch' && inputs.test }}

      - uses: actions/cache/save@v5
        if: always()
        with:
          path: .watch-state.json
          key: watch-state-${{ github.run_id }}

      # Letzte Signale für die App veröffentlichen (eigener Zweig, die App-Seite wird dadurch nicht neu gebaut)
      - name: Signale veröffentlichen
        if: always()
        run: |
          [ -f signals.json ] || exit 0
          cp signals.json /tmp/signals.json && rm -f signals.json
          git config user.name "wolf-desk-waechter"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if git fetch -q origin signals 2>/dev/null; then
            git checkout -q -B signals FETCH_HEAD
          else
            git checkout -q --orphan signals
            git rm -rfq --cached . || true
          fi
          cp /tmp/signals.json signals.json
          git add signals.json
          git diff --cached --quiet || git commit -qm "Signale aktualisiert"
          git push -q origin signals
```

---

## 9. Etappen bisher

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

---

## 10. Fahrplan

- **Jetzt:** Einschätzungen pflegen, Daten sammeln. Einstellungen, die Signale beeinflussen, 2–3 Wochen nicht ändern.
- **Paket 2 – Filter (datenbasiert, nach Tagebuch-Auswertung):** Regime-Filter mit dem Markt-Bias, Seitwärts-Filter, Überdehnungs-Filter (Momentum/Volumen nicht mehr belohnen, wenn Kurs > ~2 ATR über EMA 21), Stop-Mindestabstand ~1 ATR.
- **Paket 3 – Bestätigte Signale:** Telegram meldet erst nach Reaktion in der Zone; App trennt „im Aufbau“ und „bestätigt“.
- **Optional:** Cloudflare (Konto vorhanden) für minütlichen Risiko-Wächter und ETF-Zuflüsse in der App.
- **Feinschliff:** Design, Texte, kleine Wünsche jederzeit.

---

## 11. Neustart mit einem neuen Claude-Chat

Diesen Text als erste Nachricht schicken und diese Datei anhängen:

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk“ gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang ist der Masterplan mit Aufbau, Regeln, Adressen und Fahrplan. Bitte lies ihn und arbeite genau so weiter: modular, Etappen mit Tests, nur geänderte Dateien als ZIP, Schritt-für-Schritt-Anleitungen, ehrliche Einschätzungen und Bremse, wenn ich überpace. Den aktuellen Code findest du im Repository; wenn du Dateien brauchst, lade ich sie hoch.

Hilfreich: zusätzlich die aktuellen Dateien als ZIP mitschicken (Repository → Code → Download ZIP, am iPhone über „Desktop-Website“).
