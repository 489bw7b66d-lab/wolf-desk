# Wolf Desk – Masterplan

Stand: 29.09.2026 · Etappe 4d · 431 Tests

Dieses Dokument enthält alles, um Wolf Desk weiterzuentwickeln oder wiederherzustellen, auch in einem neuen Chat.
Es enthält bewusst **keine Zugangsdaten** (Token, Wallet, Chat-IDs), weil das Repository öffentlich ist.

---

## 1. Worum es geht

**Wolf Desk** ist eine Trading-App (PWA) für Hyperliquid-Perpetuals, gebaut komplett vom iPhone aus. Gehandelt wird über **Ledger**.
Nur lesender Zugriff: Die App kann keine Orders setzen, nur anzeigen, rechnen, warnen und erinnern. Geschlossen wird **manuell**.

- **App:** Marktüberblick, Konto, Positionen mit Trade-Weg, Risiko-Regeln, Signalgeber, Trade-Karten mit Hebel-Vorschau, Backtest, Statistik, Kosten, Geduld
- **Telegram-Wächter:** läuft alle 15 Minuten bei GitHub, Signale in den Kanal, alles Persönliche privat
- **Signal-Tagebuch:** misst jedes gemeldete Signal und vergleicht mit den echten Trades

**Selbstanalyse des Nutzers (Grundlage für Etappe 4a):** Stärke = Einstiege. Schwächen = zu hoher Hebel im Verhältnis zum Stop, zu enge Stops, zu wenig Geduld beim Laufenlassen. Die Konto-Statistik bestätigt das (in Teilen verkauft 83 % Treffer, alles auf einmal 21 %, frühes Aussteigen hat Geld gekostet).

---

## 2. Zusammenarbeit (Regeln, die sich bewährt haben)

- Nutzer heißt Jensen, Anrede **„Buddy“**, keine Programmierkenntnisse, arbeitet nur am iPhone (Brave, Dateien-App, GitHub im Browser).
- **Ton:** locker und herzlich wie ein Werkstatt-Kumpel (✅, 🐺, „Klasse, Buddy!“), dabei ehrlich. Nicht nüchtern-gutachterlich.
- **Modular:** jede Datei hat eine Aufgabe; der Rechen-Kern wird nie nebenbei verändert (Neues kommt in eigene Dateien).
- **Etappen:** jedes Update ist ein Paket mit Nummer (zuletzt 4b) und muss einzeln stabil laufen.
- **Vor jedem Paket:** alle Tests grün, **zusätzlich mit vielen verstellten Einstellungen**, und der **Wächter komplett durchgespielt** (Testlauf, normaler Lauf, keine doppelten Meldungen).
- **Nur geänderte Dateien** als ZIP mit eigenem Ordner; Schritt-für-Schritt-Anleitung dazu.
- **Vor größeren Änderungen:** erst Bestand prüfen (aktuellen Code von GitHub laden, Versionsnummer prüfen!) und Plan zeigen, dann bauen.
- **Ehrlichkeit:** keine Trefferquoten-Versprechen, Hinweise bei riskanten Werten, **Bremse bei Überpacen**.
- **Messen vor Ändern:** Alles, was die **Signale** verändert, wartet bis zur Tagebuch-Analyse (siehe Abschnitt 11).
- **Übersicht (seit 4b):** Neue Funktionen bringen **keine zusätzlichen Fußnoten** mit. Erklärungen stehen hinter einem **ⓘ** zum Antippen (`tipInline`, `tipHead` in `ui-parts.js`). Die App merkt sich aufgeklappte ⓘ, weil viele Karten jede Sekunde neu gezeichnet werden.

---

## 3. Adressen

| Wofür | Adresse |
|---|---|
| App | `489bw7b66d-lab.github.io/wolf-desk` |
| Tests | `489bw7b66d-lab.github.io/wolf-desk/tests.html` (bei altem Stand `?v=4b` anhängen) |
| Repository | `github.com/489bw7b66d-lab/wolf-desk` |
| Code als ZIP | `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` |
| Hochladen | `github.com/489bw7b66d-lab/wolf-desk/upload/main` |
| Datei löschen | `github.com/489bw7b66d-lab/wolf-desk/delete/main/DATEINAME` |
| Wächter starten / Läufe | `github.com/489bw7b66d-lab/wolf-desk/actions/workflows/wolf-watch.yml` |
| Zeitplan bearbeiten | `github.com/489bw7b66d-lab/wolf-desk/edit/main/.github/workflows/wolf-watch.yml` |
| Secrets | `github.com/489bw7b66d-lab/wolf-desk/settings/secrets/actions` |
| Veröffentlichte Signale | `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/signals/signals.json` |
| Einzelne Datei roh lesen | `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/main/DATEINAME` |

---

## 4. Zugänge und Geheimnisse (nur die Namen!)

| Secret | Inhalt | Wo man den Wert wiederbekommt |
|---|---|---|
| `TELEGRAM_TOKEN` | Token des Bots **@WolfDeskBuddyBot** | Telegram → **@BotFather** (blauer Haken!) → `/mybots` → Wolf Desk → API Token. **Nie „Revoke“ tippen.** |
| `TELEGRAM_CHAT` | private Chat-ID mit dem Bot | Secret löschen, Bot „hallo“ schreiben, Test starten → Bot schickt die ID |
| `TELEGRAM_CHANNEL` | ID des Signal-Kanals (beginnt mit `-100`) | Secret löschen, im Kanal posten, Test starten → Bot schickt „Kanal gefunden“ |
| `WALLET` | Hyperliquid-Adresse (öffentlich, nur lesend) | Hyperliquid / Ledger |

Der Bot ist im Kanal **Admin** mit „Nachrichten posten“. Nur der BotFather mit blauem Haken ist echt.

---

## 5. Aufbau der App (90 Dateien, fast alle im Hauptordner)

**Einstellungen:** `config.js` (Empfehlungen) · `ledger-markets.js` (deine Ledger-Märkte, Standard für „Handelbare Märkte“) · `my-settings.js` (deine Abweichungen, Einschätzungen, Ziele, **geänderte Watchlist, handelbare Märkte**; von der App erzeugt, gilt auch für den Wächter)

**Daten-Kern (`core-*.js`)**
- Schnittstelle & Konto: `core-api`, `core-stream`, `core-store`, `core-health`, `core-account`, `core-calc`, `core-positions`, `core-stops`
- Risiko: `core-risk` (Regeln, Ausstiegsplan, Hebel), `core-guard` (Stop-Check gegen ATR, Abkühlphase), **`core-trail`** (SL nachziehen nach Struktur), **`core-levpreview`** (Hebel-Vorschau: Liquidation, Puffer, Margin-Anteil)
- Handel & Auswertung: `core-trades`, `core-performance` (ehrlicher Gewinn aus Hyperliquids PnL-Verlauf), `core-fees` (Gebühren/Funding), `core-patience` (Geduld-Statistik)
- Signale: `core-indicators`, `core-signals`, `core-scanner`, `core-fib`, `core-elliott`, `core-patterns`, `core-candlesticks`, `core-confirm` (🛡-Siegel), **`core-feedplan`** (Trade-Karte aus gemeldetem Signal)
- Märkte: `core-universe` (Top-Coins bzw. deine Liste), `core-hotscan`, `core-market` (Markt-Bias, Fear & Greed mit Stand), `core-watchlist`, **`core-tradeable`** (handelbare Märkte, Marktsuche)
- Positionen: `core-path` (Trade-Weg), `core-plans` (Ziele je Position), `core-autoplan` (automatischer Plan)
- Sonstiges: `core-backtest`, `core-settings`, `core-views` (Einschätzung), `core-alerts` (Wächter-Logik, Tagebuch, Berichte), `core-format`

**Anzeige (`ui-*.js`):** `ui-chart` (Zeichnung) + **`ui-chartview`** (Bedienung: wischen, zoomen, Fadenkreuz, eigene Linien), `ui-home`, `ui-market`, `ui-feed`, `ui-views`, `ui-signals`, `ui-trade`, `ui-coin`, `ui-chart`, `ui-performance`, `ui-testpage` (Konto/Positionen), `ui-risk`, `ui-backtest`, `ui-settings`, **`ui-tradeable`**, `ui-parts` (gemeinsame Bausteine, Hebel-Regler mit Vorschau, ⓘ)

**Rahmen:** `index.html`, `main.js`, `styles.css`, `manifest.json`, `tests.html` + `test-*.js`, `watcher.js`, `.github/workflows/wolf-watch.yml`

**Versionsnummer:** `index.html` hat `<meta name="app-version" content="4d">` und eine Import-Map mit `?v=4d` je Datei (auch `tests.html`). Bei jedem Update erhöhen und **neue Dateien in beide Import-Maps eintragen**; die App erkennt neue Versionen selbst und lädt neu.

---

## 6. Empfohlene Werte (Stand 4b)

- **Risiko pro Trade:** Stufen **2 / 3 / 5 %** (Knöpfe), gelb ab **3 %**, rot ab **5 %** · Tagesverlust max. 15 % · Hebel max. 20× · Liquidation mind. 1 % hinter Stop · Margin je Trade max. 50 % des Freien · freies Kapital gelb unter 10 %, rot unter 2 %
- **Kein Limit** für die Anzahl offener Positionen (Bremse ist die Abkühlphase)
- **Stop-Check:** rot unter **1,0× ATR** („im Rauschen“), gelb unter **1,5× ATR**, Vorschlag **1,5× ATR** (Setup-Zeitebene: Swing 4H, Daytrade 1H)
- **Abkühlphase:** nach **2** Verlust-Trades in Folge für **4 Std.**: Banner, Risiko-Vorschlag halbiert, Telegram
- **Ausstiegsplan (Empfehlung):** TP1 20 · TP2 25 · TP3 25 · TP4 15 · Runner 15 % (Nutzer hat eigenen Plan, TP4 = 0 %)
- **Automatischer Plan für eigene Trades:** Swing
- **Markt-Bias:** BTC 40 · ETH 20 · Marktbreite 25 · ETH/BTC 15 %
- **Wächter (Empfehlung):** ab Score 75 · Swing + Daytrade · Mindestumsatz 20 Mio. $ (Nutzer: Score 80, 15 Mio. $)
- **Handelbare Märkte:** Standard = Ledger-Liste (177 Märkte, `ledger-markets.js`); leer = Top 150 nach Market Cap. Der Wächter meldet trotzdem nur ab Mindestumsatz (15 Mio. $)
- **SL nachziehen (Struktur, 4d):** frühestens ab TP1 · nur bestätigte Swing-Tiefs/-Hochs der Setup-Zeitebene (2 Kerzen links/rechts, abgeschlossen, nach Eröffnung) · Puffer ½ ATR · nur in Gewinnrichtung · spätestens ab TP2 Einstieg + Gebühren (2 × Taker) · Telegram erneut erst ab 0,5 % Verbesserung
- **Gewinn gesamt (4d):** aus Hyperliquids Gesamt-PnL (Ein-/Auszahlungen herausgerechnet), Prozent auf die Netto-Einzahlungen; Startkapital nur noch Notlösung, solange der Verlauf nicht geladen ist
- **Hebel-Vorschau:** Liquidation ≈ 90 % / Hebel vom Einstieg (wie im Risiko-Kern); Achse links bis 2× Stop-Abstand, weiter weg steht „← Liq“ am Rand
- **Indikatoren:** EMA 8/21/55/200 · RSI 14 · ATR 14 · MACD 12/26/9

---

## 7. Update-Routine

1. ZIP in der Dateien-App speichern, antippen → Ordner `wolf-desk-XX`.
2. Bei GitHub **angemeldet** sein.
3. `…/upload/main` → „choose your files“ → Durchsuchen → Ordner → „Auswählen“ → „Alle auswählen“ → Öffnen → **Commit changes**.
4. ~10 Min. warten, App komplett schließen und neu öffnen (aktualisiert sich selbst), `tests.html?v=XX` prüfen.
5. Betrifft es den Wächter: Test starten (Run workflow).

**Einstellungen/Einschätzungen/Ziele/Watchlist/handelbare Märkte an den Wächter:** ⚙️ → „Für den Wächter übernehmen“ → „In Dateien sichern“ → Ordner Claude → **Sichern** → `my-settings.js` hochladen. Vorher alte Datei im Ordner löschen.

**Stolperfallen:** „Uploads are disabled“ = nicht angemeldet · iPhone hängt „2“ an doppelte Namen · Brave behandelt lange Adressen manchmal als Suche (immer mit `https://` eintippen) · Platzhalter nie wörtlich übernehmen · Dateien-Suche findet auch Texte, die den Namen enthalten · Nach dem Upload zeigt Brave evtl. noch die alte Testseite (`?v=XX` anhängen) · Paket gebaut heißt nicht hochgeladen: nach jedem Paket prüfen, ob die Versionsnummer bei GitHub stimmt.

**Code als ZIP holen (z. B. für einen neuen Chat):** Adresse `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen → Herunterladen → landet unter Downloads.

**Notfall:** Datei bei GitHub öffnen → Uhr-Symbol (History) → ältere Version zurückspielen. Wächter-Fehler: Actions → Lauf → „watch“ → roter Schritt.

---

## 8. Telegram-Wächter

- Alle 15 Min. (GitHub teils später), kostenlos bei öffentlichem Repository.
- **Je Lauf:** Konto prüfen (Alarm/Entwarnung mit Beruhigung) → Tagebuch auswerten und mit echten Trades verknüpfen → Trades 60 Tage laden → **Abkühlphase** melden → **handelbare Märkte bzw. Top 150** + Watchlist scannen → Signale melden (⭐ bei passender Einschätzung) → **Ziele offener Positionen** melden (🎯/🏁, eigener Plan → Signal → automatischer Plan) → Marken deiner Einschätzungen → Wochenbericht (mit Umsetzung, Einschätzung, **Geduld**) → `signals.json` veröffentlichen.
- **Watchlist:** Seit 4b nutzt der Wächter die in der App bearbeitete Watchlist (über `my-settings.js`). Vorher lief er mit der Standardliste aus `config.js`.
- **Gedächtnis:** `.watch-state.json` im GitHub-Zwischenspeicher. **Veröffentlichung:** Zweig `signals`.

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

**Probelauf ohne Internet (für Claude):** Hyperliquid, CoinGecko und Telegram in Node nachbilden (`globalThis.fetch` ersetzen), Kurse als stetige Funktion der Zeit erzeugen (sonst passen Kerzen und Marktpreis nicht zusammen und es gibt keine Signale), dann `watcher.js` mit `TEST_RUN=true`, danach zweimal normal laufen lassen. Erwartung: Testnachrichten, Signale in den Kanal, zweiter Lauf ohne Meldungen.

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
Etappe 3v: Menüleiste Start · Konto · Signale · Backtest · Risiko
Etappe 3w: Kosten-Karte im Konto (Gebühren und Funding 7/30/90 Tage, Anteil am Bruttogewinn), Funding und Netto je Trade, geschätzte Gebühren auf der Trade-Karte mit deinem echten Satz, Backtest rechnet mit deinem Satz
Etappe 3y: Trade-Weg in den Positionskarten: Fortschrittsbalken vom Stop bis zum Kurs mit beschrifteten Strichen für SL, Einstieg und TP1–TP4 (Anzahl nach Ausstiegsplan), erreichte Ziele mit ✓, nächstes Ziel in %
Etappe 3z: Ziele je Position für manuelles Schließen (aus Signal, aus Analyse oder selbst eingetragen, im Markt-Blatt), Trade-Weg nutzt diese Ziele, rot bis Einstieg und grün ab Einstieg, 🏁 am letzten Ziel, Beschriftungen ohne Überlappung, Wächter meldet erreichte Ziele privat mit Verkaufsanteil laut Plan
Etappe 3za: Auswahlknöpfe eindeutig (ausgewählt gold mit ✓)
Etappe 3zb: Automatischer Plan für jede Position nach den Regeln des Signalgebers (Kerzen zum Einstieg, Fibonacci sonst ATR, Stil wählbar), Trade-Weg mit ursprünglichem SL₀ und nachgezogenem SL (schraffiert = abgesichert), Wächter meldet Ziele auch für eigene Trades
Etappe 4a: Risiko-Stufen 2/3/5 % in den Einstellungen (Warnung ab 3 %, rot ab 5 %), Positions-Begrenzer entfernt, Stop-Check gegen ATR auf Trade-Karte/Rechner/Positionen mit Vorschlag, Abkühlphase nach Verlustserie (Banner, halbiertes Risiko, Telegram), Geduld-Statistik im Konto und im Wochenbericht
Etappe 4b: Tipp auf ein laufendes Signal öffnet die Trade-Karte mit dem Plan aus dem Signal (Hinweis, wenn die Analyse von jetzt anders aussieht) · Chart-Fehler behoben (eine gemeinsame Live-Kerze für alle Märkte ließ beim Öffnen fremde Kurse einfließen; jetzt je Markt getrennt plus Plausibilitäts-Sicherung) · Hebel-Vorschau unter dem Regler auf Trade-Karte und im Rechner (Liq wandert Richtung Stop, Puffer grün/gelb/rot, Margin-Anteil am Freien) · Fear & Greed mit „Stand“ und Warnung „Quelle hängt“, ohne Zwischenspeicher · Handelbare Märkte (Ledger) in den Einstellungen mit Suche, Heiße Coins und Wächter scannen nur diese · Backtest für alle Märkte (Suche, auch xyz) und „alle handelbaren“ · Trade-Weg „Risiko verringert“ statt „abgesichert“, solange der nachgezogene Stop unter dem Einstieg liegt · Watchlist geht jetzt mit an den Wächter · Fußnoten hinter ⓘ (Hebel, Gebühren, Ausstiegsplan, Statistik, Geduld, Kosten, Backtest, Trade-Weg)

Etappe 4b1: ⓘ-Erklärungen blieben nicht offen (Karten werden jede Sekunde neu gezeichnet) → aufgeklappte ⓘ werden gemerkt · Trade-Karte aus Signal ohne doppelten Hinweis „Kein klares Signal“ · Heiße Coins im Probelauf geprüft (Top-Coins und eigene Liste)

Etappe 4c: Bedienbare Charts (eigene Umsetzung ohne Fremdbibliothek: waagrecht wischen = zurück in der Zeit, zwei Finger = zoomen, tippen = Fadenkreuz mit Preis/Zeit/OHLC, doppelt tippen = zurücksetzen, eigene blaue Linien je Markt zum Ziehen) in Trade-Karte, Markt-Blatt und Signalgeber · Signalgeber mit Chart und empfohlenem Hebel (bei kleinster Risiko-Stufe) · Coin-Logos von Hyperliquid mit Buchstaben-Ersatz · Ledger-Liste (177 Märkte) als Standard für handelbare Märkte, Knopf „Ledger-Liste laden“

Etappe 4c1: Coin-Logos blinkten (jede Sekunde neues Bild) → jedes Logo wird einmal geladen und dann als CSS-Hintergrund gezeigt

Etappe 4d (Politur): Gewinn gesamt ehrlich aus Hyperliquids PnL-Verlauf (Einzahlungen zählen nicht als Gewinn), PnL-Zeile „offen · heute“ unter dem Kontowert, Abweichungs-Satz entfernt (Erklärung hinter ⓘ) · Positions-Blatt zeigt die Regel-Ampel im Klartext · Heiße-Coins-Text ohne veraltetes „Top 150“ · SL nachziehen nach Struktur (Positionskarte, Positions-Blatt, Telegram) · Backtest vergleicht dieselben Einstiege mit Nachziehen nach Plan und nach Struktur

---

## 10. Offene Aufgaben (nächste Pakete)

**Nächstes Politur-Paket (wenn sich Wünsche gesammelt haben):** kleine Haken beim Handling, optische Aufhübschung. **Keine neuen Indikatoren oder Infos** (Wunsch des Nutzers: „da ist wirklich alles drin“).
- Lightweight Charts wurde bewusst nicht genommen: Claude hat beim Bauen kein Internet und könnte die Bibliothek nicht testen; die eigene Umsetzung ist voll getestet.
- Nachziehen: Backtest-Vergleich Plan gegen Struktur in der App auf den handelbaren Märkten laufen lassen; ist Struktur klar schlechter, Regel überdenken
- Ledger-Liste: zwischen ORDI und NXPC war im Screenshot eine Zeile abgeschnitten, nach GRIFFAIN evtl. weitere Märkte → über die Suche ergänzen.

**Kleinigkeiten für später:**
- Hebel-Vorschau auch als Was-wäre-wenn am Trade-Weg einer offenen Position (bewusst nicht in 4b, der Nutzer wollte die Trade-Karte)
- Empfehlungs-Markierung „▼ 1×“ am Hebel-Regler ragt bei 1× über den linken Rand
- Weitere Fußnoten nach und nach hinter ⓘ, wenn sie auffallen

---

## 11. Auf Halde bis zur ersten Tagebuch-Analyse (Paket 3, ändert Signale)

- **Signal-Vorlauf verkürzen** (Signale kommen zu früh; Abstand um zwei Drittel verkürzen), mit Versionsschnitt im Tagebuch
- **Konfluenz-Score** je Signal, **Stufen A/B/C** (A = Telegram ⭐, B = nur App, C = gar nicht), Zielgröße ca. 3–8 A-Signale pro Woche, Schwellen per Backtest und Tagebuch
- **Golden Pocket:** Fib-Zone 0,618–0,65 statt 0,5–0,618, Auslöser erst bei **Reaktion**, Ziele 1,0 und 1,618
- **Engine-Mindest-Stop** anheben (heute 0,5 ATR möglich)
- **Nadaraya-Watson Envelope (LuxAlgo, ohne Repainting)** als Überdehnungs-Filter, Einstiegs-Bestätigung, Ausstiegs-Hinweis; nie allein, nie gegen die Struktur
- **SMC-Bausteine:** Order Blocks, FVG, Premium/Discount, Weak/Strong High/Low (höhere Zeitebene hat Vorrang), Vortages-/Wochen-/Monatshochs, gleiche Hochs/Tiefs
- **MACD-Divergenz** als Faktor, **Richtung der höheren Zeitebene** als Faktor
- **Auswertung pro Markt** (schlechte Trefferquote → Warnhinweis bzw. nicht mehr melden)
- **Bestätigte Signale:** Telegram erst nach Reaktion in der Zone

---

## 12. Setup-Katalog (Trading-Handschrift des Nutzers)

Vorgehen beim Chart: Struktur zuerst → Konfluenz (Key Level, RSI Tag/Woche, MACD bzw. Divergenz, Fib, SMC-Zonen, Nadaraya-Band) → Bestätigung aus der höheren Zeitebene → Ziele an SMC-Zonen, die auf Fib-Levels liegen. **Mehrheit der Faktoren** statt „alles oder nichts“.

1. **VIRTUAL, 26.09., ✅ Ausbruch + Retest (mit Trend):** horizontaler Widerstand mehrfach von unten getestet, Ausbruch mit Momentum, zwei Retests von oben, Einstieg am Retest, Stop unter dem Retest-Tief.
2. **ZEC, 1D, Konfluenz-Short (Kontra):** Fib-Extension 2,618 (~1.647) + RSI Tag/Woche überkauft (84/87) + MACD Tag dreht + SMC Weak High + Key Level + NW ▼. Gegenargument: MACD Woche steigt noch. Ziele SMC-Zonen auf Fib (1.089 / 744). Stop über dem Weak High mit Puffer.
3. **Konfluenz-Long (Spiegel zu 2):** Golden Pocket bzw. Fib-Unterstützung + RSI überverkauft + MACD dreht + SMC Discount/OB/FVG/Strong Low + Key Level + NW ▲.
4. **SUI, 1D/4H, Short mit übergeordnetem Trend:** altes HH / Strong High (1D) + RSI überkauft + **MACD-Divergenz (4H)** + NW ▼ auf **1D und 4H** + Weak High (4H); Ziel SMC-Zone ~−20 %. Fib diesmal ohne Rolle.
5. **ICP, 4H, ❌ Negativbeispiel:** sieben NW-▼ im Aufwärtstrend nach bullischem BOS, RSI nur 60–70 → Fehlsignale. Lehre: NW nur mit der Struktur, Kontra nur mit RSI über 80, Serie von ▼ bei neuen Hochs = Trendstärke.
6. **NIL, 4H, Golden-Pocket-Reaktion:** Rücksetzer nach starkem Impuls ins Golden Pocket (0,0812–0,0777), RSI ~26; Auslöser erst bei Reaktion. Ziele 1,0 und 1,618. Ungültig unter 0,702/0,786.

Hinweis: Repainting-Signale sehen im Nachhinein besser aus als live; die Engine nutzt nur Signale auf abgeschlossenen Kerzen.

---

## 13. Neustart mit einem neuen Claude-Chat

1. Diesen Masterplan anhängen.
2. Den aktuellen Code als ZIP anhängen: `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen (mit `https://`), herunterladen, im Chat anhängen. Ohne ZIP kann Claude einzelne Dateien über `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/main/DATEINAME` lesen, wenn du die Adresse in den Chat schreibst.
3. Diesen Text als erste Nachricht:

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk“ gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang sind der Masterplan und der aktuelle Code. Bitte lies beides und arbeite genau so weiter: modular, Etappen mit Tests (auch mit verstellten Einstellungen), Wächter vor jedem Paket komplett durchspielen, nur geänderte Dateien als ZIP, Schritt-für-Schritt-Anleitungen, ehrliche Einschätzungen und Bremse, wenn ich überpace. Sprich locker mit mir wie ein Kumpel. Prüf zuerst, ob die Versionsnummer im Code zum Masterplan passt. Die App ist inhaltlich fertig; als Nächstes nur Politur (Abschnitt 10).
