# Wolf Desk – Masterplan

Stand: 05.10.2026 · Etappe 8b · 633 Tests (Sammelliste für 8c ff. in Abschnitt 10)

Dieses Dokument enthält alles, um Wolf Desk weiterzuentwickeln oder wiederherzustellen, auch in einem neuen Chat.
Es enthält bewusst **keine Zugangsdaten** (Token, Wallet, Chat-IDs), weil das Repository öffentlich ist.

---

## 1. Worum es geht

**Wolf Desk** ist eine Trading-App (PWA) für Hyperliquid-Perpetuals, gebaut komplett vom iPhone aus. Gehandelt wird über **Ledger**.
Nur lesender Zugriff: Die App kann keine Orders setzen, nur anzeigen, rechnen, warnen und erinnern. Geschlossen wird **manuell**.

**Grenzen von Ledger-Perpetuals (wichtig für alle Vorschläge):** kein Margin-Nachschießen und nur **eine Position pro Coin**. Die App darf nie „Margin nachschießen“ oder „zweite Position“ vorschlagen. Was beim Einstieg festgelegt ist (Hebel, Margin), bleibt; umso wichtiger ist die Rechnung vorher.

- **App:** Marktüberblick, Konto, Positionen mit Trade-Weg, Risiko-Regeln, Signalgeber, Trade-Karten mit Hebel-Vorschau, Backtest, Statistik, Kosten, Geduld
- **Telegram-Wächter:** läuft alle 15 Minuten bei GitHub, Signale in den Kanal, alles Persönliche privat
- **Signal-Tagebuch:** misst jedes gemeldete Signal und vergleicht mit den echten Trades

**Selbstanalyse des Nutzers (Grundlage für Etappe 4a):** Stärke = Einstiege. Schwächen = zu hoher Hebel im Verhältnis zum Stop, zu enge Stops, zu wenig Geduld beim Laufenlassen. Die Konto-Statistik bestätigt das (in Teilen verkauft 83 % Treffer, alles auf einmal 21 %, frühes Aussteigen hat Geld gekostet).

---

## 2. Zusammenarbeit (Regeln, die sich bewährt haben)

- Nutzer heißt Jensen, Anrede **„Buddy“**, keine Programmierkenntnisse, arbeitet nur am iPhone (Brave, Dateien-App, GitHub im Browser).
- **Ton:** locker und herzlich wie ein Werkstatt-Kumpel (✅, 🐺, „Klasse, Buddy!“), dabei ehrlich. Nicht nüchtern-gutachterlich.
- **Modular:** jede Datei hat eine Aufgabe; der Rechen-Kern wird nie nebenbei verändert (Neues kommt in eigene Dateien).
- **Etappen:** jedes Update ist ein Paket mit Nummer (zuletzt 8b) und muss einzeln stabil laufen.
- **Vor jedem Paket:** alle Tests grün, **zusätzlich mit vielen verstellten Einstellungen**, und der **Wächter komplett durchgespielt** (Testlauf, normaler Lauf, keine doppelten Meldungen).
- **Nur geänderte Dateien** als ZIP mit eigenem Ordner; Schritt-für-Schritt-Anleitung dazu.
- **Vor größeren Änderungen:** erst Bestand prüfen (aktuellen Code von GitHub laden, Versionsnummer prüfen!) und Plan zeigen, dann bauen.
- **Ehrlichkeit:** keine Trefferquoten-Versprechen, Hinweise bei riskanten Werten, **Bremse bei Überpacen**.
- **Messen vor Ändern:** Alles, was die **Signale** verändert, wartet bis zur Tagebuch-Analyse (siehe Abschnitt 11).
- **Arbeitsweise (seit 5g):** erst mehrere Punkte sammeln (Sammelliste), dann ein Paket schnüren – nicht nach jedem Gedanken ein Update. Pakete müssen in der App übersichtlich bedienbar sein (keine neuen Kästen, wo eine Zeile reicht; Sichtprüfung in iPhone-Größe vor der Auslieferung).
- **Übersicht (seit 4b):** Neue Funktionen bringen **keine zusätzlichen Fußnoten** mit. Erklärungen stehen hinter einem **ⓘ** zum Antippen (`tipInline`, `tipHead` in `ui-parts.js`). Die App merkt sich aufgeklappte ⓘ, weil viele Karten jede Sekunde neu gezeichnet werden.

---

## 3. Adressen

| Wofür | Adresse |
|---|---|
| App | `489bw7b66d-lab.github.io/wolf-desk` |
| Tests | `489bw7b66d-lab.github.io/wolf-desk/tests.html` (bei altem Stand `?v=8b` anhängen) |
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

## 4. Datenschutz-Regeln (streng, vom Nutzer ausdrücklich gewünscht)

1. **Nie Zugangsdaten, Wallet-Adresse oder Beträge** in Dateien, die ins (öffentliche) Repository gehen. Seit 8a lässt „Für den Wächter übernehmen“ auch das **Startkapital** weg (`core-privacy.js`); es bleibt nur in der App auf dem iPhone. Der Masterplan selbst nennt Trefferquoten und R-Werte, aber keine Kontobeträge.
2. **Einschätzungen und Ziele je Position** gehören nicht in `my-settings.js`, sondern ins Secret `PRIVATE_SETTINGS` (seit 5d).
3. **Exporte für Claude** („📤 Daten für Claude“) enthalten Beträge, aber nie Wallet oder Zugangsdaten, und gehen nie ins Repository.
4. **Bevor etwas Persönliches öffentlich würde**, sagt Claude es vorher ausdrücklich.
5. **Im Chat** fragt Claude nie nach Seed-Phrase, Private Key oder Token.
6. Öffentlich bleiben bewusst: `signals.json` (gemeldete Signale für die App), Ledger-Liste, harmlose Einstellungen. Alte Versionen von `my-settings.js` bleiben in der GitHub-Historie sichtbar (bei Bedarf: neues Repository).

## 4b. Zugänge und Geheimnisse (nur die Namen!)

| Secret | Inhalt | Wo man den Wert wiederbekommt |
|---|---|---|
| `TELEGRAM_TOKEN` | Token des Bots **@WolfDeskBuddyBot** | Telegram → **@BotFather** (blauer Haken!) → `/mybots` → Wolf Desk → API Token. **Nie „Revoke“ tippen.** |
| `TELEGRAM_CHAT` | private Chat-ID mit dem Bot | Secret löschen, Bot „hallo“ schreiben, Test starten → Bot schickt die ID |
| `TELEGRAM_CHANNEL` | ID des Signal-Kanals (beginnt mit `-100`) | Secret löschen, im Kanal posten, Test starten → Bot schickt „Kanal gefunden“ |
| `WALLET` | Hyperliquid-Adresse (öffentlich, nur lesend) | Hyperliquid / Ledger |
| `PRIVATE_SETTINGS` | JSON mit Einschätzungen und Zielen je Position (5d) | App: ⚙️ → „🔒 Private Daten für den Wächter“ kopiert es; bei GitHub Secret anlegen bzw. „Update“ |

Der Bot ist im Kanal **Admin** mit „Nachrichten posten“. Nur der BotFather mit blauem Haken ist echt.

---

## 5. Aufbau der App (120 Dateien, fast alle im Hauptordner)

**Einstellungen:** `config.js` (Empfehlungen) · `ledger-markets.js` (deine Ledger-Märkte, Standard für „Handelbare Märkte“) · `my-settings.js` (deine Abweichungen, Einschätzungen, Ziele, **geänderte Watchlist, handelbare Märkte**; von der App erzeugt, gilt auch für den Wächter)

**Daten-Kern (`core-*.js`)**
- Schnittstelle & Konto: `core-api`, `core-stream`, `core-store`, `core-health`, `core-account`, `core-calc`, `core-positions`, `core-stops`
- Risiko: `core-risk` (Regeln, Ausstiegsplan, Hebel), `core-guard` (Stop-Check gegen ATR, Abkühlphase), **`core-trail`** (SL nachziehen nach Struktur), **`core-levpreview`** (Hebel-Vorschau: Liquidation, Puffer, Margin-Anteil)
- Handel & Auswertung: `core-trades`, `core-performance` (ehrlicher Gewinn aus Hyperliquids PnL-Verlauf), `core-fees` (Gebühren/Funding), `core-patience` (Geduld-Statistik)
- Signale: `core-indicators`, `core-signals`, `core-scanner`, `core-fib`, `core-elliott`, `core-patterns`, `core-candlesticks`, `core-confirm` (🛡-Siegel), **`core-trendgate`** (Short-Filter nach Tagestrend), **`core-feedplan`** (Trade-Karte aus gemeldetem Signal)
- Märkte: `core-universe` (Top-Coins bzw. deine Liste), `core-hotscan`, `core-market` (Markt-Bias, Fear & Greed mit Stand), `core-watchlist`, **`core-tradeable`** (handelbare Märkte, Marktsuche)
- Positionen: `core-path` (Trade-Weg), `core-plans` (Ziele je Position), `core-autoplan` (automatischer Plan)
- Sonstiges: `core-backtest`, `core-settings`, `core-views` (Einschätzung), `core-alerts` (Wächter-Logik, Tagebuch, Berichte), `core-format`

**Anzeige (`ui-*.js`):** `ui-chart` (Zeichnung) + **`ui-chartview`** (Bedienung: wischen, zoomen, Fadenkreuz, eigene Linien), `ui-home`, `ui-market`, `ui-feed`, `ui-views`, `ui-signals`, `ui-trade`, `ui-coin`, `ui-performance`, `ui-testpage` (Konto, System, dazu Trade-Weg `pathBar`, Plan-Ampel `planLine`, `positionPlan`), `ui-risk`, `ui-backtest`, `ui-settings`, **`ui-tradeable`**, **`ui-export`** (Datei „Daten für Claude“), **`ui-watchlist-edit`** (Watchlist in ⚙️), `ui-parts` (gemeinsame Bausteine, Hebel-Regler mit Vorschau, ⓘ)

**Neu seit 8a:**
- Kern: `core-exitcalc` (Ausstiegsrechner: Menge für X % der offenen Position, abgerundet auf die Nachkommastellen des Marktes, Plan-Hinweis) · `core-totalrisk` (Summe über alle Positionen, wenn alle Stops greifen) · `core-journalmeasure` (Tagebuch-Messwerte: Zone erreicht, größter Lauf ins Plus/Minus) · `core-gesture` (Entscheidung für Wisch-Gesten) · `core-privacy` (keine Beträge in `my-settings.js`)
- Anzeige: `ui-position` (Positions-Übersicht fürs Blatt, Mini-Balken und Gesamt-Risiko-Zeile für die Startseite, Ausstiegsrechner, Stop von Hand) · `ui-sheet` (alle Blätter: nach unten wegwischen, Zurück-Pfeil, Zurück-Knopf nach Sprung in einen Tab) · `ui-swipe` (Tab-Wechsel durch Wischen)
- **Neu seit 8b:** `core-benchmark` (Maßstab als Signalgeber: Zustand, Plan, Wechsel „neu im Trend“, Meldungs-Prüfung, Kennzeichen im Tagebuch) · `core-bmtext` (Telegram-Text der Maßstab-Signale)
- Das **Positions-Blatt** ist das frühere Markt-Blatt (`ui-coin.js`) bei offener Position: Kurs → Trade-Weg → Plan-Ampel → Regeln → Werte → „Mehr Details“ → Ausstiegsrechner → (Stop von Hand) → Chart → Teilverkäufe → Ziele.

**Rahmen:** `index.html`, `main.js`, `styles.css`, `manifest.json`, `tests.html` + `test-*.js`, `watcher.js`, `.github/workflows/wolf-watch.yml`

**Versionsnummer:** `index.html` hat `<meta name="app-version" content="8b">` und eine Import-Map mit `?v=8b` je Datei (auch `tests.html`). Bei jedem Update erhöhen und neue Dateien eintragen; seit 6a gibt es nur noch **eine** Import-Liste (index.html), `tests.html` übernimmt sie von dort; die App erkennt neue Versionen selbst und lädt neu.

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
- **Short-Filter (5a):** `signals.shortFilter` = aus · mild (Tageskurs unter EMA 200) · mittel (+ tiefere Hochs/Tiefs oder EMA 8<21<55 im Tageschart) · streng (+ Retest der EMA 200 in 10 Tagen). Standard **aus**, bis der Backtest die Stufe bestimmt. Gilt für App, Wächter (über my-settings.js) und alle Stile; Tagebuch speichert die Stufe je Signal (`sf`)
- **Hebel-Vorschau / Liquidation (5b):** Abstand ≈ min(90 / Hebel, 100 / Hebel − 50 / Höchsthebel des Marktes); Hyperliquids Wartungs-Margin ist die Hälfte der Anfangs-Margin beim Höchsthebel. Beispiel ALGO (max. 5×): bei 5× nur ~10 % statt ~18 %; Achse links bis 2× Stop-Abstand, weiter weg steht „← Liq“ am Rand
- **Indikatoren:** EMA 8/21/55/200 · RSI 14 · ATR 14 · MACD 12/26/9
- **Maßstab-Signale (8b, `CONFIG.benchmark`):** Tages-EMA 20 über EMA 100 und Kurs über der Tages-EMA 20 · Auslöser: an der letzten abgeschlossenen 4H-Kerze erfüllt, an der davor nicht · Einstieg zum Kurs · Stop 2 × ATR 14 (Tag) · Ziele 2R / 3R / 4R / 6R · nur Long · geführt als Stil Swing (Hebel-Obergrenze 5×, Tagebuch 14 Tage) · keine Meldung, wenn der Kurs seit Kerzenschluss mehr als 0,5R gelaufen ist · Schalter `alerts.benchmark` (⚙️ → Telegram → „Signale nach Maßstab“), aus = alte Engine wie bis 8a

---

## 7. Update-Routine

1. ZIP in der Dateien-App speichern, antippen → Ordner `wolf-desk-XX`.
2. Bei GitHub **angemeldet** sein.
3. `…/upload/main` → „choose your files“ → Durchsuchen → Ordner → „Auswählen“ → „Alle auswählen“ → Öffnen → **Commit changes**.
4. ~10 Min. warten, App komplett schließen und neu öffnen (aktualisiert sich selbst), `tests.html?v=XX` prüfen.
5. Betrifft es den Wächter: Test starten (Run workflow).

**Einstellungen/Watchlist/handelbare Märkte an den Wächter:** ⚙️ → „Für den Wächter übernehmen“ (öffentlich, ohne Einschätzungen und Ziele). **Einschätzungen und Ziele:** ⚙️ → „🔒 Private Daten für den Wächter“ → bei GitHub Secret `PRIVATE_SETTINGS` einfügen. Datei: → „In Dateien sichern“ → Ordner Claude → **Sichern** → `my-settings.js` hochladen. Vorher alte Datei im Ordner löschen.

**Stolperfallen:** „Uploads are disabled“ = nicht angemeldet · iPhone hängt „2“ an doppelte Namen · Brave behandelt lange Adressen manchmal als Suche (immer mit `https://` eintippen) · Platzhalter nie wörtlich übernehmen · Dateien-Suche findet auch Texte, die den Namen enthalten · Nach dem Upload zeigt Brave evtl. noch die alte Testseite (`?v=XX` anhängen) · Paket gebaut heißt nicht hochgeladen: nach jedem Paket prüfen, ob die Versionsnummer bei GitHub stimmt.

**Code als ZIP holen (z. B. für einen neuen Chat):** Adresse `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen → Herunterladen → landet unter Downloads.

**Notfall:** Datei bei GitHub öffnen → Uhr-Symbol (History) → ältere Version zurückspielen. Wächter-Fehler: Actions → Lauf → „watch“ → roter Schritt.

---

## 8. Telegram-Wächter

- Alle 15 Min. (GitHub teils später), kostenlos bei öffentlichem Repository.
- **Je Lauf:** Konto prüfen (Alarm/Entwarnung mit Beruhigung) → Tagebuch auswerten und mit echten Trades verknüpfen → Trades 60 Tage laden → **Abkühlphase** melden → **handelbare Märkte bzw. Top 150** scannen (seit 8b: Tageskerzen aller Märkte, 4H-Kerzen nur für Märkte im Aufwärtstrend, Wechsel „neu im Trend“ suchen; mit Schalter aus wie früher Stufe 1/Stufe 2 der alten Engine + Watchlist) → Signale melden (⭐ bei passender Einschätzung; bei mehreren zuerst die mit dem größten EMA-Abstand in ATR, höchstens `maxPerRun`) → **Ziele offener Positionen** melden (🎯/🏁, eigener Plan → Signal → automatischer Plan) → Marken deiner Einschätzungen → Wochenbericht (mit Umsetzung, Einschätzung, **Geduld**) → `signals.json` veröffentlichen.
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
          PRIVATE_SETTINGS: ${{ secrets.PRIVATE_SETTINGS }}
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

**Probelauf ohne Internet (für Claude):** Hyperliquid, CoinGecko und Telegram in Node nachbilden (`globalThis.fetch` ersetzen), Kurse als stetige Funktion der Zeit erzeugen (sonst passen Kerzen und Marktpreis nicht zusammen und es gibt keine Signale), dann `watcher.js` mit `TEST_RUN=true`, danach zweimal normal laufen lassen. Erwartung: Testnachrichten, Signale in den Kanal, zweiter Lauf ohne Meldungen. Wichtig für die Nachbildung: Einstiege und Trade-Zeiten an einem festen Zeitpunkt verankern (nicht an „jetzt“), sonst sehen die Trades in jedem Lauf neu aus und Ziel-Meldungen kommen doppelt. **Sichtprüfung (seit 8a):** Playwright mit Chromium ist in Claudes Umgebung vorhanden; die App lässt sich in iPhone-Größe (390 × 844, Touch) mit nachgebildeter Schnittstelle laden, bedienen (Tippen, Wischen über CDP) und fotografieren. `tests.html` läuft dort ebenfalls.

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

Etappe 5a (Signale schärfen, Schritt 1): Short-Filter nach Tagestrend in drei Stufen, Backtest vergleicht alle Stufen über dieselben Signale (Empfehlung: beste Summe, mind. ⅓ der Shorts bleibt), Einstellung unter ⚙️ → Signalgeber, Versionsschnitt im Tagebuch

**Backtest-Ausgangslage vor 5a (29.09.2026, 177 Ledger-Märkte, Filter aus):**
- Swing 180 Tage: 1.334 Trades, −0,04R/Trade, PF 0,92 · Long +0,02R (524) · Short −0,07R (810) · Score 85+ +0,03R (56) · Siegel trennt nicht (mit −0,06R / ohne +0,12R) · Nachziehen Plan −50,4R / Struktur −52,4R
- Daytrade 45 Tage: 1.729 Trades, +0,03R/Trade, PF 1,05 · Long +0,18R (1.229, 49 %) · Short −0,35R (500, 30 %) · Score 85+ −0,01R · Nachziehen Plan +46,4R / Struktur +52,7R
- Stabil in beiden: Shorts und bärische Ereignisse schwach. Nicht stabil: Umkehr-Kerzen (Swing gut, Daytrade schlecht). Markt-Tabellen wegen 5–13 Trades je Markt nicht zum Filtern nutzen.

Etappe 5b (Sicherheits-Korrektur): Liquidations-Näherung rechnet den Höchsthebel des Marktes ein (vorher bei Coins mit max. 3×/5× zu optimistisch; Anlass: ALGO-Trade mit Liquidation vor dem Stop) · gilt für Trade-Karte, Rechner, Hebel-Vorschau und Signalgeber-Empfehlung

Etappe 5c (Sicherheit & Handling, keine Änderung an der Signal-Berechnung): Stop-Check schlägt nie einen Stop hinter der Liquidation vor (sagt stattdessen: Hebel passt nicht, verkleinern/schließen) · Nachziehen nie hinter die Liquidation · kein Signal für Coins mit offener Position oder solange das letzte Signal des Coins noch läuft (App: Heiße Coins/Signalgeber, Wächter) · Regelverstöße auf der Startseite als kompakter Hinweis, Antippen öffnet die Liste, ohne Verstöße nichts · Backtest lässt dem iPhone alle 40 ms Luft (kein Einfrieren) · Export „📤 Daten für Claude“ (Einstellungen und Backtest): Markdown-Datei mit Einstellungen, Konto, Positionen samt Regel-Prüfung, eigenen Trades, Signalen und den letzten Backtests je Stil

Etappe 5d (Datenschutz): Einschätzungen und Ziele je Position aus dem öffentlichen `my-settings.js` in das GitHub-Secret `PRIVATE_SETTINGS` verschoben (Knopf „🔒 Private Daten“, Wächter liest das Secret, Hinweis in ⚙️, falls die alte Datei noch private Daten enthält) · Datenschutz-Regeln im Masterplan

Etappe 5e (Bedienung Signalgeber, Wunsch des Nutzers: „klobig“): im Signale-Tab nur noch ein Suchfeld (Coin eingeben, Enter), Analyse öffnet als Blatt von unten mit Kurzzeile (Score, empfohlener Hebel), Chart, Stil-Zeile und Trade-Karte-Knopf; alles Weitere unter „Details ▾“ eingeklappt · Stil-Knöpfe und Watchlist-Chips entfernt, immer „Auto“ · Watchlist wird unter ⚙️ gepflegt

Etappe 5f: Telegram-Signal neu gegliedert (eigene Gestaltung nach dem Vorbild klar strukturierter Signal-Kanäle, nicht kopiert): Kopf „📌 WOLF DESK #WD-0001“ (fortlaufende Nummer im Wächter-Gedächtnis, auch im Tagebuch), Richtung · Coin · Stil, Hebel-Spanne (Hälfte bis sicherer Höchsthebel aus Stop, Stil und Höchsthebel des Marktes), Einstieg, TP1–TP4, Stop mit Abstand, Begründung aus Trend/Struktur und Auslösern, „Ungültig bei Schluss unter …“, Score/Siegel/Kurs · Trade-Karte: Stop umschalten zwischen Plan-Stop und ATR-Vorschlag (Position, Hebel und Ziele rechnen sofort neu, auch nach „Live-Kurs als Einstieg“) · Korrektur: Hebel-Spanne und -Empfehlung nie über dem Höchsthebel des Marktes

Etappe 5g: Stop-Check der offenen Position nennt, was es kostet: „Greift der Stop, beträgt der Verlust ca. X $ (Y % vom Konto), gegenüber jetzt noch Z $ mehr“; liegt der Stop hinter der Liquidation, zählt die ganze Margin (lossAtStop in core-guard)

Etappe 6a (Handwerk, keine Signal-Änderung): **Plan-Ampel** je Position (🟢 Plan intakt, laufen lassen · 🟡 knapp mit besserem Stop · 🔴 Plan kaputt, besser schließen, mit Grund: kein Stop, Liquidation vor Stop, Stop im Rauschen ohne sinnvollen Stop, Struktur gebrochen, Einschätzung oder Signal ungültig) in Positionskarte und Positions-Blatt; nur bei 🔴 Verlust bei Auslösung und Orientierung „Stop zuerst / Ziel zuerst / Stop in 24 Std.“ (Zufallslauf aus ATR, keine Vorhersage) · **Backtest-Speicher**: Zwischenstand je Coin, „Weitermachen“ nach Neuladen, Ergebnis bleibt gespeichert, keine Selbst-Aktualisierung während eines Laufs, je Stil nur der letzte Lauf, Statuszeile unter dem Start-Knopf · **Speicher** in ⚙️ (Größe, Backtest-Daten bzw. Zwischenspeicher löschen, persönliche Daten bleiben) · Export-Dateiname mit Uhrzeit und Inhalt · **Tagebuch-Archiv** (abgeschlossene Signale dauerhaft in `signals.json` → `archive`, öffentlich unbedenklich ohne echte Trades; wird bei jedem Lauf aus dem veröffentlichten Zweig nachgeladen) · Tests für Positionen/Stops · Aufräumen: `esc` zentral in core-format, Begründungen (`topReasons`) im Kern (core-reasons), tote Reste der alten Signalgeber-Schnellwahl entfernt, eine einzige Import-Liste · Einstellungs-Hinweise hinter ⓘ bzw. kürzer

Etappe 7a–7c: siehe Abschnitt 10 (Engine 2 A/A2, Maßstab, „Trend oder Seitwärts?“, Stichprobe).

Etappe 8a (Bedienung, keine Signal-Änderung): **Positionen nur noch auf der Startseite**, direkt unter dem Kontowert, je Zeile ein Mini-Trade-Weg · Zeile **„Greifen alle Stops: −X $ (Y %) · n long / m short“** (gelb ab der Hälfte des Tagesverlust-Limits, rot ab dem Limit, Erklärung hinter ⓘ) · **Positions-Blatt** beim Antippen (Trade-Weg oben, Plan-Ampel, alle Werte der früheren Konto-Karte, „Mehr Details“), Block „Offene Positionen“ im Konto entfernt · **Ausstiegsrechner** im Positions-Blatt (Prozent der noch offenen Position frei eintippen, Menge mit Kopier-Knopf, Gegenwert, Gewinn ca., Rest, Plan-Hinweis zum Übernehmen) · **Stop von Hand** im Positions-Blatt statt im Risiko-Tab · **Blätter** nach unten wegwischen, Zurück-Pfeil (Trade-Karte ⇄ Vollanalyse, Position → Analyse), Zurück-Knopf nach „Im Rechner anpassen“ · **Tab-Wechsel durch Wischen** (nicht auf Charts, in Blättern, in Eingaben, am Rand) · Suchfeld im Signale-Tab ganz oben · **Tagebuch-Messwerte** je Signal (Stunden bis zur Zone, größter Lauf ins Plus und ins Minus in R; im Archiv von `signals.json`, öffentlich unbedenklich) · **Export** mit Einzel-Trades und Messwerten · **Datenschutz:** Startkapital nicht mehr in `my-settings.js` · 104 neue Tests (601).

Etappe 8b (Signalgeber auf Maßstab, vom Nutzer am 05.10. entschieden: „alles auf Maßstab“, Telegram sofort, Backtest danach): **Telegram meldet nach dem Maßstab** statt nach der alten Engine (Regel in Abschnitt 6), ein Signal-Typ „Trendfolge“, nur Long, Text ohne Score · **Versionsschnitt:** Tagebuch-Einträge und Archiv tragen `eng: 'bm'`, alles ohne Kennzeichen ist die alte Engine; der Wochenbericht wertet getrennt aus · **Schalter** in ⚙️ zum Zurückdrehen · **Backtest:** vierte Wahl „Neu im Trend“ (Maßstab mit Einstieg nur beim Wechsel, also die Telegram-Regel), Vergleichstabelle aller Engines mit Entwicklung und Bestätigung und einem Urteil zur Telegram-Regel · **App:** Zeile „📈 Maßstab“ im Signalgeber-Blatt (im Trend seit …, Plan zum Kurs, Knopf „Trade-Karte nach Maßstab“), „Letzte Signale“ und Trade-Karte zeigen „Trendfolge · Maßstab“ statt Score · 32 neue Tests (633). **Bewusst offen:** Heiße Coins scannen noch mit der alten Engine; das Kopf-Etikett im Signalgeber („KEIN SIGNAL“) meint ebenfalls die alte Engine.
**Ehrlicher Stand zu 8b:** Die Regel „neu im Trend“ ging ungetestet scharf. Belegt war nur der Maßstab mit Einstieg an jeder Kerze (Swing +0,14R, aber Entwicklung −0,20R / Bestätigung +0,35R; Daytrade +0,09R, TP1 nur bei 4 % der Trades erreicht). Der Stop liegt meist 8–17 % entfernt, TP1 entsprechend 16–34 %: wenige, weite Trades, Gewinn durch Laufenlassen. Der Daytrade-Maßstab unterscheidet sich im Backtest nur durch die Haltedauer, deshalb gibt es live einen Signal-Typ.

**Experten-Analyse (30.09.2026, Rollenspiel):** Aufbau gut (Kern/Anzeige/Wächter getrennt, keine Kreis-Abhängigkeiten, App und Wächter teilen den Kern). Später: Backtest mit Entwicklungs-/Bestätigungszeitraum, Slippage und Funding, Überlebende-Verzerrung beachten (heutige Ledger-Liste), Korrelation offener Positionen, Regelbrüche im Wochenbericht, Markt-Bias als Kandidat. Bewusst nicht: neu schreiben, mehr Indikatoren.

---

## 10. Offene Aufgaben (nächste Pakete)

**Etappe 7a (Engine 2, Etappe A – umgesetzt):** `core-engine2.js`. Trend-Zeitebene (Swing: Woche aus Tageskerzen gebaut, Daytrade/Scalp: Tag) → Zonen-Zeitebene (Swing Tag, Daytrade 4H, Scalp 1H) → Auslöser (Swing 4H, Daytrade 1H, Scalp 15M). Pflicht: Struktur (HH/HL der Trend-Zeitebene, bei Seitwärts die Zonen-Zeitebene) · Fib-Zone des letzten Impulses (0,5 bis Golden Pocket 0,65, Toleranz ¼ ATR; maßgeblich ist der Docht der Reaktion) · Reaktion = **Umkehrpunkt-Regel des Nutzers** (Umkehrkerze Doji/Dragonfly/Hammer/Engulfing, danach schließt der Körper der nächsten Kerze jenseits des Körpers der Kerze vor der Umkehrkerze) oder Liquiditäts-Sweep · Chance/Risiko bis TP1 mind. **1 : 2**. Einstieg zum Schluss der Bestätigung, Stop hinter der Reaktion + ½ ATR, Ziele: Impuls-Extrem, 1,272 / 1,618 / 2,0. Punkte (A, max. 85): Großwetter 20/10 · Fib GP 20 / 0,5 10 · Key Level 15 + Liquidität 10 · RSI 10/5 · MACD 5 · EMA 8>21 5. Bremse: RSI der Zonen-Zeitebene ≥ 80 (Long) / ≤ 20 (Short). Im **Backtest wählbar** („Alte Engine“ / „Engine 2“), Ergebnis je Stil und Engine gespeichert, Block **„Hält es in beiden Zeiträumen?“** (erste ⅔ = Entwicklung, letztes ⅓ = Bestätigung) und **„Alte Engine gegen Engine 2“**. Im Signalgeber eine Zeile „🧭 Engine 2 (Test)“ mit Signal oder Grund und Zone. Telegram unverändert alte Engine. Dazu: Backtest-„Weitermachen“ hing auf dem iPhone → Speicherzugriffe mit Zeitlimit, Speichern im Hintergrund, kompakte Ablage.
**Backtest 30.09. alt gegen Engine 2 A (175 Märkte):** Swing −0,03 → −0,04R, Daytrade ±0,00 → −0,20R, Scalp +0,05 → −0,08R; Engine 2 mit fast doppelt so vielen Trades, nur ~20 % Treffer (Stop im Rauschen, Ziel weit weg), Shorts tiefrot (Short-Filter wirkte nicht). Aber Longs besser: Swing +0,01 → +0,12R, Scalp +0,09 → +0,22R.
**Etappe 7b (Engine 2 A2, Feinschliff):** Struktur der Trend-Zeitebene ist strikt Pflicht (keine Ausweichregel) · Short-Filter (Einstellung, z. B. „Mittel“) gilt auch für Engine 2 · 0,5er nur mit Key Level, sonst Golden Pocket · Stop hinter die Zone (unter GP bzw. Reaktion, was weiter weg ist) mit ¼ ATR der Zonen-Zeitebene · TP1 bei 2R, danach Impuls-Extrem und Erweiterungen · Platz bis zum Impuls-Extrem mind. 2R · ein Signal je Impuls (Backtest).
**Etappe 7c (Messen statt Raten):** Backtest-Tabelle **„Trend oder Seitwärts?“** (Tages-ADX 14 beim Einstieg: < 20 seitwärts, 20–25 Übergang, > 25 Trend, dazu „nur ab ADX 20/25“) für alle Engines · dritte Wahl **„Maßstab“** = stumpfe Trendfolge (Long, wenn Tages-EMA 20 > EMA 100 und Kurs darüber, Stop 2 ATR, Ziele 2/3/4/6R) als ehrliche Vergleichslinie, erscheint im Vergleich alt/E2 · Markt-Auswahl **„Stichprobe“** = jeder zweite handelbare Markt alphabetisch (fest, ~88 Märkte, halbe Rechenzeit). Statistik-Faustregel: Für einen Vorteil von ~0,1R braucht man rund 500+ Trades je Lauf; ein Lauf mit 1.000+ Trades ist belastbar.
Recherche-Ergebnis (01.10.): Trendfolge in Krypto am besten belegt, aber vor allem long (Long-Short-Portfolios ohne signifikanten Vorteil) – deckt sich mit eigenen Daten; Volatilitäts-angepasste Positionsgröße als Hauptquelle risikobereinigter Rendite; Marktphasen-abhängige Signale; Funding + Open Interest als Gedränge-Warnung (Kandidat: Funding-Bremse, Hyperliquid liefert Verlauf).
**Engine 2 – gestraffter Plan (vom Nutzer am 01.10.2026 bestätigt, gilt für Etappe B und später):** höchstens ca. **8 aktive Bausteine**, geordnet nach **5 Fragen**:
1. **Richtung:** Struktur (HH/HL), dazu höchstens ADX (Tag) als Seitwärts-Sperre
2. **Ort:** Fib-Zone + **ein** gemeinsamer Topf „Zonen-Belege“ (Key Level, VWAP-Periodenschluss Woche/Monat, Order Block, eigene blaue Chart-Linien, Nadaraya-Band in Trendrichtung) – je mehr Belege, desto stärker, zählt aber als ein Faktor
3. **Auslöser:** Umkehrpunkt-Regel des Nutzers oder Liquiditäts-Sweep; RSI-Divergenz als Bestätigung (normale = Umkehr, versteckte = Trendfortsetzung, passt zum Golden Pocket)
4. **Bremse:** Überdehnung – Nadaraya am Gegenband **nur zusammen mit** RSI überkauft/überverkauft (ICP-Lehre: im Trend läuft der Kurs am Band entlang); dazu Funding extrem + Open Interest steigend
5. **Risiko:** Chance/Risiko mind. 1 : 2, Stop hinter der Zone
**MACD und EMA 8/21 fliegen raus** (Schwung doppelt, im Backtest Rauschen). Neue Kandidaten ersetzen statt hinzukommen und müssen im Backtest in beiden Zeiträumen tragen. Nadaraya wird in **beide Richtungen** genutzt (Rückenwind und Bremse), ohne Repainting.
**Datenquelle:** Binance (öffentlich, ohne Anmeldung) als zweite Quelle für Volumen (VWAP) und lange Historie (Woche/Monat, Etappe C), Hyperliquid als Rückfall; Namens-Übersetzung (z. B. kPEPE → 1000PEPE), Hyperliquid-eigene Coins nur aus Hyperliquid.
**Backtest-Anzeige (geplant):** Erwartungswert-Formel E = p · Ø Gewinn − (1 − p) · Ø Verlust − Kosten: Trefferquote · Ø Gewinn · Ø Verlust · Kosten in R · Gewinnschwelle; Zeilen mit/ohne Divergenz, mit/ohne Nadaraya-Rückenwind, Fehltrades, die die Bremse verhindert hätte.

**Backtest 01.10. (175 Märkte, alt / Engine 2 A2 / Maßstab):** Maßstab Swing +0,14R (846 Trades, PF 1,39), Daytrade +0,09R (1.569, PF 1,50) – schlägt beide Engines (E2 Swing −0,01R, Daytrade −0,24R). Aber: Maßstab Swing Entwicklung (120 T.) −0,20R, Bestätigung (60 T.) +0,35R → verdient vor allem in Rallyes, d. h. stark marktphasenabhängig. ADX je Coin hilft NICHT (beim Maßstab seitwärts sogar am besten, ADX hinkt; bei E2 seitwärts leicht negativ). Konsequenz: **Maßstab ist die neue Basis**, Engine-2-Bausteine kommen einzeln als Verbesserungen darauf und müssen ihn in beiden Zeiträumen schlagen. Export enthält Zeiträume/Phasen noch nicht (nachziehen).

**ERSTE TAGEBUCH-AUSWERTUNG (05.10.2026, 18 Signale seit 27.09., 12 abgeschlossen, alle long):** Summe −1,26R, Ø −0,11R (Daytrade 8 Signale Ø −0,08R, Swing 4 Signale Ø −0,15R) · 5 Gewinner (2× TP2, 3× TP1), 6 Stops, 1 abgelaufen, Treffer 42 % · Gewinner Ø +1,07R, Verlierer Ø −0,94R → Gewinnschwelle 47 % · kein Signal kam über TP2 hinaus · Haltedauer Daytrade im Mittel ~20 Std., zwei liefen die vollen 72 Std.; zwei Swing-Signale 6 Tage offen · Score 85+ (4 Signale) +0,30R gegen −1,56R darunter (8), zu wenig für ein Urteil · Bild deckt sich mit dem Backtest (um die Null). **Zu klein, um Regeln festzuzurren**; deshalb seit 8a die Messwerte (Zone, Lauf ins Plus/Minus), nächste Auswertung ab ca. 40–50 abgeschlossenen Signalen.
**Eigene Trades (05.10., ohne Beträge):** 29 abgeschlossen, 31 % Treffer bei Verhältnis Ø Gewinn zu Ø Verlust 1,6 (Gewinnschwelle 39 %) · **in Teilen verkauft: 6 Trades, 83 % Treffer, klar im Plus · alles auf einmal: 23 Trades, 17 % Treffer, klar im Minus** → der Ausstieg in Teilen ist der größte Hebel, größer als jede Signal-Änderung · zum Zeitpunkt der Auswertung 10 Positionen, alle long, freies Kapital unter 1 %, Summe aller Stops über dem Tagesverlust-Limit → Anlass für die Gesamt-Risiko-Zeile (8a).
**Wünsche des Nutzers vom 05.10. (ändern Signale, laufen über Backtest und Tagebuch-Messwerte, nicht über ein Anzeige-Paket):** Ziele beim Swing zu eng · TP-Auswahl je Stil (Scalp/Daytrade/Swing) überarbeiten · Chance/Risiko mind. 1 : 2, besser 1 : 3 (Vermutung des Nutzers: geht nur mit früheren Einstiegen; passt zum Befund vom 30.09. „Stop im Rauschen, Ziel weit weg“ → Kandidat Rücksetzer-Einstieg Golden Pocket) · Haltedauer zu lang, Signale müssten genauer kommen (Backtest-Zeile „Haltedauer bis TP1 / bis Stop“ ergänzen). Hinweis aus den Daten: TP1 liegt heute bei 1R ab Zonenmitte; weitere Ziele allein drücken die Trefferquote. Offen: „Diskrepanz bei SL“ (Nutzer schickt Beschreibung oder Screenshot; falls zwei Stellen verschiedene Stops zeigen, hat das Vorrang).

**NACH 8b ZUERST (vom Nutzer am 05.10. so bestellt):**
- **Backtest der Telegram-Regel:** in der App Backtest → „Neu im Trend“ → Handelbare Märkte → Swing (und danach Daytrade), dann „📤 Daten für Claude“ schicken. Entscheidung danach: bleibt die Regel, bekommt sie einen Filter, oder Schalter zurück. Maßgeblich: Ø R, Entwicklung und Bestätigung beide im Plus, mindestens einige hundert Trades.
- **Danach das Kompass-Paket** (Punkte 1 und 2 unten: Binance als zweite Datenquelle, dann Zyklus-Kompass). Der Kompass ist zugleich der Marktphasen-Schutz, der dem Maßstab fehlt.
- **Heiße Coins auf Maßstab umstellen** (Liste „neu im Trend / im Trend“ statt alter Engine) und das Kopf-Etikett im Signalgeber anpassen.

**SAMMELLISTE für die nächsten Pakete (Stand 05.10.2026, mit dem Nutzer abgestimmt), Reihenfolge:**
1. **Paket 8c – Binance als zweite Datenquelle** (Marktdaten-Adresse `data-api.binance.vision`, `/api/v3/klines`, ohne Schlüssel; Spot-Namen, daher kPEPE → PEPEUSDT mal 1000) (öffentlich, ohne Anmeldung, CORS): lange Historie seit 2017/2019 für Woche/Monat und Zyklus-Tests, Volumen für VWAP; Namens-Übersetzung (kPEPE → 1000PEPE …), HL-eigene Coins nur aus Hyperliquid; Erreichbarkeit aus DE prüfen.
2. **Zyklus-Kompass** (Woche/Monat, nicht scharf): BTC über/unter Bull Market Support Band (20W SMA + 21W EMA) · 🟢 Bulle (Wochenschluss über steigendem Band) · 🟡 Warnung (erster Wochenschluss darunter → Risiko halbieren, Hinweis „Teil der Zyklus-Gewinne sichern“) · 🔴 Bär (2 Wochenschlüsse darunter + Band dreht nach unten, Monatsschluss bestätigt → keine neuen Trendfolge-Longs, „Gewinne sichern“) · zurück auf 🟢 nach 2 Wochenschlüssen über steigendem Band · Halving-Uhr als Info (Hochs bisher 12–18 Monate nach Halving; Bärenmärkte ~1 Jahr). **Rotation** als zweite Anzeige: Stärke je Coin gegen BTC (COIN/BTC im Wochenchart), Rotations-Breite (Anteil Coins, die BTC über 4–12 Wochen schlagen), ETH/BTC; Altseason oft Spätphase (2018: Alts toppten nach BTC). **Bär-Modus bei 🔴:** gespiegelter Maßstab-Short + Setup „Rallye von unten ans Band bzw. 0,5–0,618, Abprall“, weitere Stops, halbes Risiko, große liquide Märkte, Coins schwach gegen BTC. Eigener Knopf „Rückzug jetzt“; keine scharfe Tages-Notbremse. Prüfung mit Binance-Historie an 2018 und 2022.
3. **Markt-Phasen-Filter** für den Maßstab: BTC-Trend + Marktbreite (Anteil Coins über EMA 100), abgestuft voll/halb/Pause; Positionsgröße nach Volatilität.
4. **Steuer-Bereich** (DE, keine Kirchensteuer): Perps = Termingeschäfte § 20 EStG, 25 % + 5,5 % Soli (26,375 %), Verluste voll verrechenbar (JStG 2024), Sparer-Pauschbetrag einstellbar (Rest nach Bank-Nutzung), Funding verrechnet oder getrennt (wählbar); Jahr wählbar; Gewinne, Verluste, Gebühren, Funding in USD und EUR (EZB-Tageskurs), Bemessungsgrundlage, Steuer, Gewinn nach Steuern, nach Monat und Coin; **PDF zum Teilen** (Übersicht + Trade-Liste); nur auf dem iPhone, nie ins Repository; Hinweis „keine Steuerberatung“.
5. ~~Ausstiegsrechner im Positions-Blatt~~ **erledigt in 8a.**
6. **Backtest-Auswertungen/Export:** Erwartungswert-Formel (Trefferquote · Ø Gewinn · Ø Verlust · Kosten in R · Gewinnschwelle) · Tabelle „Wann eingestiegen?“ (Wochenende/Wochentage, Asien/Europa/US-Session, nur Auswertung) · **Haltedauer bis TP1 / bis Stop** · **Ziel-Varianten je Stil nebeneinander** (Wunsch 05.10.) · Export mit Zeiträumen und Phasen-Tabellen · später Benchmark-Varianten.
7. **Indikator-Bausteine einzeln auf den Maßstab** (gestraffter Plan oben): Rücksetzer-Einstieg Golden Pocket (auch als Antwort auf „frühere Einstiege“), Umkehrpunkt-Regel, Nadaraya beidseitig, RSI-Divergenzen, VWAP-Levels, Liquidations-Häufungen als Zonen-Beleg, Funding/OI-Bremse, „Ausbruch mit Retest“.
8. **Bedienung:** Ampel 🟠 „Wendesignal · beobachten“, „Auf der Lauer“-Liste, Trade-Karte ohne Signal, Chance/Risiko ab jetzt in der Positionskarte, Ziele eigener Pläne mind. 2R.
9. ~~Positions-Blatt von der Startseite, Positionen aus dem Konto~~ **erledigt in 8a.**

**POLITUR-LISTE (vom Nutzer am 03.10. ausdrücklich gewünscht: darf nicht vergessen werden):**
10. **Backtest aus der Menüleiste** hinter ⚙️ (Leiste dann vier Punkte; `.tabbar` hat heute fünf Spalten).
11. **Ziele im Positions-Blatt** als eine Zeile „Ziele ändern ›“ statt vier Knöpfen untereinander.
12. **Konto-Tab:** Kosten und Statistik zum Aufklappen (Seite ist ohne Positionen kürzer, aber noch lang).
13. **Wallet-Adresse und System-Seite in ⚙️** (heute nur über den kleinen „Live“-Punkt erreichbar).
14. **Fußnote bei Heiße Coins** („Läuft, solange die App offen ist …“) hinter ⓘ.
15. **Tab-Wechsel merkt sich die Stelle** (springt heute immer nach oben).
16. **Ästhetischer Blick** auf die ganze App, sobald Screenshots da sind (Nutzer wollte am 05.10. nicht alle Bilder neu kopieren; kommt, wenn ohnehin Screenshots anfallen).
17. **Korrelation offener Positionen** als Ergänzung zur Gesamt-Risiko-Zeile (aus der Experten-Analyse).
18. Kleinigkeit aus dem 8a-Test: `test-backtest` „Nachziehen nach Struktur hebt den Stop“ hängt vom Ausstiegsplan ab (rot bei Plan 100/0/0/0, schon in 7c so); Test unabhängig von der Einstellung machen.

Hintergrund-Recherche (02.10.): Großteil des Handels algorithmisch (Market Maker ziehen sich im Stress zurück, Liquidations-Kaskaden wie 10.10.2025 mit >19 Mrd. $, Ausführungs-Algos am VWAP, Trendfolge-Fonds); Hyperliquid ist on-chain transparent (Positionen, Liquidationen, OI).
**Hinweis für lange Chats:** Mit diesem Masterplan und dem Code-ZIP lässt sich jederzeit ein frischer Chat starten (spart Limit). Modellwahl: zum Sammeln reicht ein kleineres Modell, gebaut wird mit dem großen.

Offen für Engine 2 (Sammelliste): Etappe B (Order Blocks, Nadaraya ohne Repainting, RSI-Divergenzen, VWAP-Levels, ADX-Sperre, Funding-Bremse), Etappe A3 Setup-Typ „Ausbruch mit Retest“ (vom Seitwärts-Filter ausgenommen), „Auf der Lauer“-Liste, Ampel-Stufe 🟠 „Wendesignal · beobachten“, Trade-Karte ohne Signal („Als Long/Short prüfen“), Chance/Risiko ab jetzt in der Positionskarte, Ziele eigener Pläne mind. 2R, Etappe C mit zweiter Datenquelle für Woche/Monat (Hyperliquid erst seit 2023; Dreieck-Ausbruch erst bei Monatsschluss + Retest, Beispiele XLM/QNT).

**ENGINE 2 – Bauplan (vom Nutzer am 30.09.2026 unterschrieben, ersetzt die bisherigen Einzelschritte):**
Grundsatz: weniger, dafür die richtigen Faktoren – nach der Handschrift des Nutzers (Top-down, Nadaraya + Smart Money als Hauptansatz). Die heutige Engine gewichtet fast umgekehrt (MA-Kreuzungen viele Punkte, Ort/Zone kaum, kein Warten auf Reaktion, kein Wochen-/Monatschart).
- **Pflicht (sonst kein Signal):** Struktur passt · Kurs in einer Zone · **Reaktion** (am besten Liquiditäts-Sweep: Stich unter gleiche Tiefs und Schluss wieder darüber; sonst Umkehrkerze/CHoCH, abgeschlossene Kerze) · **Chance/Risiko mind. 1,5–2** (Stop hinter Zone/Order Block + Puffer, erstes Ziel an der nächsten Gegenzone)
- **Punkte:** Großwetterlage Woche/Monat (Trend + Muster) 20 · Fibonacci (Golden Pocket 0,618–0,65 voll, 0,5 halb) 20 · **SMC-Konfluenz** (Order Block, Liquiditätszone, Key Level/horizontale Zone, **eigene blaue Chart-Linien des Nutzers** – für den Wächter über das Secret) 25 · **Nadaraya-Watson** (ohne Repainting) am passenden Band, nur mit der Struktur 15 · RSI 10 · MACD (Drehen/Divergenz) 5 · MA-Kreuzungen 5
- **Bremsen (hartes Nein):** RSI-Extrem gegen die Richtung (Tag über 80 bei Long, unter 20 bei Short) · Nadaraya gegen die Richtung · Muster gegen die Richtung (Doppel-/Dreifachtop, SKS am Widerstand) · V-Erholung ohne Rücksetzer
- **Zeitebenen:** Swing Woche / Tag / 4H · Daytrade Tag / 4H / 1H
- **Etappen:** A (vorhandene Teile: Wochen-Trend, Fib, Key Levels, RSI, Reaktion als Pflicht, CRV) → B (Order Blocks, Liquiditäts-Sweep, Nadaraya) → C (Muster im Wochen-/Monatschart: Bull Flag, SKS, Dreiecke; Ausweichregel für junge Coins ohne genug Historie)
- **Vorgehen:** Engine 2 läuft zuerst nur **neben** der alten in App und Backtest; entwickeln an den ersten 120 Tagen, bestätigen an den letzten 60; scharf (Telegram) erst, wenn in beiden Zeiträumen bei Swing und Daytrade besser, mit Versionsschnitt im Tagebuch. Ziel: lieber 3 gute Signale pro Woche als 30 mittelmäßige.
- **Backtest-Lage 30.09. (Ausgangspunkt):** Short-Filter „Mittel“ (aktiv) verbessert alle drei Stile (Swing −48→−33R, Daytrade −11→+79R, Scalp +87→+132R), die übrigen Shorts bleiben aber negativ · Longs Daytrade +0,15R, Scalp +0,09R, Swing ±0 · Nachziehen Struktur besser bei Swing/Daytrade, schlechter bei Scalp · Score/Siegel trennen nicht · 500–770 Signale je Stil ohne Einstieg (Signale zu früh) · Umkehrkerzen und Dreiecks-Ausbruch wiederholt vorn.

**Frühere Einzelschritte (in Engine 2 aufgegangen):** Short-Filter-Stufe nach Backtest festlegen · **Korrektur-Filter für Longs** (Faktoren inkl. Umkehrkerzen und Key-Levels; Anlass ALGO 29.09., SKY 30.09.: Long-Signal Score 89 genau ins Strong High/Order Block 1D bei RSI 82 und NW ▼): Kurs am oberen Nadaraya-Band (ohne Repainting) + bärischer Order Block/Strong High im Tageschart (≤ 1 ATR) + RSI 1D ≥ 80; im Backtest Varianten vergleichen (nur RSI · NW+SMC · alles), Nutzer-Idee: Mehrheit der Faktoren · weitere Kandidaten: MACD-Divergenz, Abstand zur EMA 21 in ATR, positives Funding · danach **Korrektur-Short** (gleiche Erkennung, Ziel mind. 0,5er Retracement, TP2 0,618, Stop über Strong High/Order Block + ½ ATR, nur ab CRV 1,5, Einstieg erst bei Reaktion auf 1H/4H, kleinste Risiko-Stufe, eigene Backtest-Zeile, Ausnahme vom Short-Filter nur mit voller Konfluenz) · **Golden-Pocket-Long mit Reaktion** (DASH, HBAR, NIL) · danach Konfluenz-Stufen/Score überarbeiten (Score trennt aktuell nicht) · Retest-Siegel überdenken (fast jedes Signal hat es)

**Nächstes Politur-Paket (wenn sich Wünsche gesammelt haben):** kleine Haken beim Handling, optische Aufhübschung. **Keine neuen Indikatoren oder Infos** (Wunsch des Nutzers: „da ist wirklich alles drin“).
- Lightweight Charts wurde bewusst nicht genommen: Claude hat beim Bauen kein Internet und könnte die Bibliothek nicht testen; die eigene Umsetzung ist voll getestet.
- Nachziehen: Backtest-Vergleich Plan gegen Struktur in der App auf den handelbaren Märkten laufen lassen; ist Struktur klar schlechter, Regel überdenken
- Ledger-Liste: zwischen ORDI und NXPC war im Screenshot eine Zeile abgeschnitten, nach GRIFFAIN evtl. weitere Märkte → über die Suche ergänzen.

**Kleinigkeiten für später:**
- Hebel-Vorschau auch als Was-wäre-wenn am Trade-Weg einer offenen Position (bewusst nicht in 4b, der Nutzer wollte die Trade-Karte)
- Empfehlungs-Markierung „▼ 1×“ am Hebel-Regler ragt bei 1× über den linken Rand
- Weitere Fußnoten nach und nach hinter ⓘ, wenn sie auffallen

---

## 11. Auf Halde, bis Tagebuch und Backtest es tragen (ändert Signale)

Die erste Tagebuch-Auswertung (05.10., Abschnitt 10) war mit 12 Signalen zu klein für Entscheidungen. Alles hier wartet weiter: auf mehr abgeschlossene Signale mit Messwerten und auf den Backtest in beiden Zeiträumen.

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

7. **DASH, 4H, ✅ Lehrbuch-Long (30.09.):** nach HH und Weak High Rücksetzer in die Fib-Zone (0,5 bis Golden Pocket 0,618/0,65) über Strong Low bzw. HL, NW ▲ in der Zone, RSI abgekühlt (~40–50). Einstieg bei Reaktion, Ziele zurück zum Hoch.
8. **HBAR, 4H, ✅ Wunsch-Signal (30.09.):** Spike ins Weak High, danach zügiger Rücksetzer ins Golden Pocket (0,618–0,65 ≈ 0,1034–0,1023) über dem Ausbruchsniveau, RSI von überkauft auf ~66. Long erst bei Reaktion in der Zone.
9. **ALGO, 1D, ❌ Fehlsignal der Engine (29.09.):** Long Score 89 genau ins Strong High / bärischen Order Block, RSI 1D 82, NW ▼. Einstieg am Docht, Stop lag bei 5× hinter der Liquidation (Formel-Fehler, 5b behoben).
10. **SKY, 4H, ❌ Fehlsignal der Engine (30.09.):** Long Score 80 in Weak High / Angebotszone, RSI ~78, NW ▼ an der Spitze. Fall für den Korrektur-Filter.

11. **BTC, PUMP, ETH, Daytrade, ✅ gutes Timing der alten Engine (02.10.):** drei Long-Signale (Score 83, 82 🛡, 88) kurz vor dem Marktanstieg; ETH erreichte TP2 (+1,5R). Passt zum Backtest-Befund: Longs im Daytrade sind die Stärke der alten Engine. (Nachtrag 05.10.: BTC und PUMP aus dieser Gruppe endeten am Stop.)

Hinweis: Repainting-Signale sehen im Nachhinein besser aus als live; die Engine nutzt nur Signale auf abgeschlossenen Kerzen.

---

## 13. Neustart mit einem neuen Claude-Chat

1. Diesen Masterplan anhängen.
2. Den aktuellen Code als ZIP anhängen: `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen (mit `https://`), herunterladen, im Chat anhängen. Ohne ZIP kann Claude einzelne Dateien über `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/main/DATEINAME` lesen, wenn du die Adresse in den Chat schreibst.
3. Diesen Text als erste Nachricht:

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk“ gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang sind der Masterplan und der aktuelle Code. Bitte lies beides und arbeite genau so weiter: modular, Etappen mit Tests (auch mit verstellten Einstellungen), Wächter vor jedem Paket komplett durchspielen, nur geänderte Dateien als ZIP, Schritt-für-Schritt-Anleitungen, ehrliche Einschätzungen und Bremse, wenn ich überpace. Sprich locker mit mir wie ein Kumpel. Prüf zuerst, ob die Versionsnummer im Code zum Masterplan passt. Signal-Änderungen erst, wenn Tagebuch und Backtest sie tragen (Abschnitt 11); Reihenfolge und Politur-Liste in Abschnitt 10.
