# Wolf Desk – Masterplan

Stand: 01.10.2026 · Etappe 7c · 497 Tests

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
- **Etappen:** jedes Update ist ein Paket mit Nummer (zuletzt 4b) und muss einzeln stabil laufen.
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

## 4. Datenschutz-Regeln (streng, vom Nutzer ausdrücklich gewünscht)

1. **Nie Zugangsdaten, Wallet-Adresse oder Beträge** in Dateien, die ins (öffentliche) Repository gehen.
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

## 5. Aufbau der App (95 Dateien, fast alle im Hauptordner)

**Einstellungen:** `config.js` (Empfehlungen) · `ledger-markets.js` (deine Ledger-Märkte, Standard für „Handelbare Märkte“) · `my-settings.js` (deine Abweichungen, Einschätzungen, Ziele, **geänderte Watchlist, handelbare Märkte**; von der App erzeugt, gilt auch für den Wächter)

**Daten-Kern (`core-*.js`)**
- Schnittstelle & Konto: `core-api`, `core-stream`, `core-store`, `core-health`, `core-account`, `core-calc`, `core-positions`, `core-stops`
- Risiko: `core-risk` (Regeln, Ausstiegsplan, Hebel), `core-guard` (Stop-Check gegen ATR, Abkühlphase), **`core-trail`** (SL nachziehen nach Struktur), **`core-levpreview`** (Hebel-Vorschau: Liquidation, Puffer, Margin-Anteil)
- Handel & Auswertung: `core-trades`, `core-performance` (ehrlicher Gewinn aus Hyperliquids PnL-Verlauf), `core-fees` (Gebühren/Funding), `core-patience` (Geduld-Statistik)
- Signale: `core-indicators`, `core-signals`, `core-scanner`, `core-fib`, `core-elliott`, `core-patterns`, `core-candlesticks`, `core-confirm` (🛡-Siegel), **`core-trendgate`** (Short-Filter nach Tagestrend), **`core-feedplan`** (Trade-Karte aus gemeldetem Signal)
- Märkte: `core-universe` (Top-Coins bzw. deine Liste), `core-hotscan`, `core-market` (Markt-Bias, Fear & Greed mit Stand), `core-watchlist`, **`core-tradeable`** (handelbare Märkte, Marktsuche)
- Positionen: `core-path` (Trade-Weg), `core-plans` (Ziele je Position), `core-autoplan` (automatischer Plan)
- Sonstiges: `core-backtest`, `core-settings`, `core-views` (Einschätzung), `core-alerts` (Wächter-Logik, Tagebuch, Berichte), `core-format`

**Anzeige (`ui-*.js`):** `ui-chart` (Zeichnung) + **`ui-chartview`** (Bedienung: wischen, zoomen, Fadenkreuz, eigene Linien), `ui-home`, `ui-market`, `ui-feed`, `ui-views`, `ui-signals`, `ui-trade`, `ui-coin`, `ui-chart`, `ui-performance`, `ui-testpage` (Konto/Positionen), `ui-risk`, `ui-backtest`, `ui-settings`, **`ui-tradeable`**, **`ui-export`** (Datei „Daten für Claude“), **`ui-watchlist-edit`** (Watchlist in ⚙️), `ui-parts` (gemeinsame Bausteine, Hebel-Regler mit Vorschau, ⓘ)

**Rahmen:** `index.html`, `main.js`, `styles.css`, `manifest.json`, `tests.html` + `test-*.js`, `watcher.js`, `.github/workflows/wolf-watch.yml`

**Versionsnummer:** `index.html` hat `<meta name="app-version" content="7c">` und eine Import-Map mit `?v=7c` je Datei (auch `tests.html`). Bei jedem Update erhöhen und neue Dateien eintragen; seit 6a gibt es nur noch **eine** Import-Liste (index.html), `tests.html` übernimmt sie von dort; die App erkennt neue Versionen selbst und lädt neu.

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

**Experten-Analyse (30.09.2026, Rollenspiel):** Aufbau gut (Kern/Anzeige/Wächter getrennt, keine Kreis-Abhängigkeiten, App und Wächter teilen den Kern). Später: Backtest mit Entwicklungs-/Bestätigungszeitraum, Slippage und Funding, Überlebende-Verzerrung beachten (heutige Ledger-Liste), Korrelation offener Positionen, Regelbrüche im Wochenbericht, Markt-Bias als Kandidat. Bewusst nicht: neu schreiben, mehr Indikatoren.

---

## 10. Offene Aufgaben (nächste Pakete)

**Etappe 7a (Engine 2, Etappe A – umgesetzt):** `core-engine2.js`. Trend-Zeitebene (Swing: Woche aus Tageskerzen gebaut, Daytrade/Scalp: Tag) → Zonen-Zeitebene (Swing Tag, Daytrade 4H, Scalp 1H) → Auslöser (Swing 4H, Daytrade 1H, Scalp 15M). Pflicht: Struktur (HH/HL der Trend-Zeitebene, bei Seitwärts die Zonen-Zeitebene) · Fib-Zone des letzten Impulses (0,5 bis Golden Pocket 0,65, Toleranz ¼ ATR; maßgeblich ist der Docht der Reaktion) · Reaktion = **Umkehrpunkt-Regel des Nutzers** (Umkehrkerze Doji/Dragonfly/Hammer/Engulfing, danach schließt der Körper der nächsten Kerze jenseits des Körpers der Kerze vor der Umkehrkerze) oder Liquiditäts-Sweep · Chance/Risiko bis TP1 mind. **1 : 2**. Einstieg zum Schluss der Bestätigung, Stop hinter der Reaktion + ½ ATR, Ziele: Impuls-Extrem, 1,272 / 1,618 / 2,0. Punkte (A, max. 85): Großwetter 20/10 · Fib GP 20 / 0,5 10 · Key Level 15 + Liquidität 10 · RSI 10/5 · MACD 5 · EMA 8>21 5. Bremse: RSI der Zonen-Zeitebene ≥ 80 (Long) / ≤ 20 (Short). Im **Backtest wählbar** („Alte Engine“ / „Engine 2“), Ergebnis je Stil und Engine gespeichert, Block **„Hält es in beiden Zeiträumen?“** (erste ⅔ = Entwicklung, letztes ⅓ = Bestätigung) und **„Alte Engine gegen Engine 2“**. Im Signalgeber eine Zeile „🧭 Engine 2 (Test)“ mit Signal oder Grund und Zone. Telegram unverändert alte Engine. Dazu: Backtest-„Weitermachen“ hing auf dem iPhone → Speicherzugriffe mit Zeitlimit, Speichern im Hintergrund, kompakte Ablage.
**Backtest 30.09. alt gegen Engine 2 A (175 Märkte):** Swing −0,03 → −0,04R, Daytrade ±0,00 → −0,20R, Scalp +0,05 → −0,08R; Engine 2 mit fast doppelt so vielen Trades, nur ~20 % Treffer (Stop im Rauschen, Ziel weit weg), Shorts tiefrot (Short-Filter wirkte nicht). Aber Longs besser: Swing +0,01 → +0,12R, Scalp +0,09 → +0,22R.
**Etappe 7b (Engine 2 A2, Feinschliff):** Struktur der Trend-Zeitebene ist strikt Pflicht (keine Ausweichregel) · Short-Filter (Einstellung, z. B. „Mittel“) gilt auch für Engine 2 · 0,5er nur mit Key Level, sonst Golden Pocket · Stop hinter die Zone (unter GP bzw. Reaktion, was weiter weg ist) mit ¼ ATR der Zonen-Zeitebene · TP1 bei 2R, danach Impuls-Extrem und Erweiterungen · Platz bis zum Impuls-Extrem mind. 2R · ein Signal je Impuls (Backtest).
**Etappe 7c (Messen statt Raten):** Backtest-Tabelle **„Trend oder Seitwärts?“** (Tages-ADX 14 beim Einstieg: < 20 seitwärts, 20–25 Übergang, > 25 Trend, dazu „nur ab ADX 20/25“) für alle Engines · dritte Wahl **„Maßstab“** = stumpfe Trendfolge (Long, wenn Tages-EMA 20 > EMA 100 und Kurs darüber, Stop 2 ATR, Ziele 2/3/4/6R) als ehrliche Vergleichslinie, erscheint im Vergleich alt/E2 · Markt-Auswahl **„Stichprobe“** = jeder zweite handelbare Markt alphabetisch (fest, ~88 Märkte, halbe Rechenzeit). Statistik-Faustregel: Für einen Vorteil von ~0,1R braucht man rund 500+ Trades je Lauf; ein Lauf mit 1.000+ Trades ist belastbar.
Recherche-Ergebnis (01.10.): Trendfolge in Krypto am besten belegt, aber vor allem long (Long-Short-Portfolios ohne signifikanten Vorteil) – deckt sich mit eigenen Daten; Volatilitäts-angepasste Positionsgröße als Hauptquelle risikobereinigter Rendite; Marktphasen-abhängige Signale; Funding + Open Interest als Gedränge-Warnung (Kandidat: Funding-Bremse, Hyperliquid liefert Verlauf).
Offen für Engine 2 (Sammelliste): Etappe B (Order Blocks, Nadaraya ohne Repainting), „Auf der Lauer“-Liste, Ampel-Stufe 🟠 „Wendesignal · beobachten“, Trade-Karte ohne Signal („Als Long/Short prüfen“), Chance/Risiko ab jetzt in der Positionskarte, Ziele eigener Pläne mind. 2R, Etappe C mit zweiter Datenquelle für Woche/Monat (Hyperliquid erst seit 2023; Dreieck-Ausbruch erst bei Monatsschluss + Retest, Beispiele XLM/QNT).

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

7. **DASH, 4H, ✅ Lehrbuch-Long (30.09.):** nach HH und Weak High Rücksetzer in die Fib-Zone (0,5 bis Golden Pocket 0,618/0,65) über Strong Low bzw. HL, NW ▲ in der Zone, RSI abgekühlt (~40–50). Einstieg bei Reaktion, Ziele zurück zum Hoch.
8. **HBAR, 4H, ✅ Wunsch-Signal (30.09.):** Spike ins Weak High, danach zügiger Rücksetzer ins Golden Pocket (0,618–0,65 ≈ 0,1034–0,1023) über dem Ausbruchsniveau, RSI von überkauft auf ~66. Long erst bei Reaktion in der Zone.
9. **ALGO, 1D, ❌ Fehlsignal der Engine (29.09.):** Long Score 89 genau ins Strong High / bärischen Order Block, RSI 1D 82, NW ▼. Einstieg am Docht, Stop lag bei 5× hinter der Liquidation (Formel-Fehler, 5b behoben).
10. **SKY, 4H, ❌ Fehlsignal der Engine (30.09.):** Long Score 80 in Weak High / Angebotszone, RSI ~78, NW ▼ an der Spitze. Fall für den Korrektur-Filter.

Hinweis: Repainting-Signale sehen im Nachhinein besser aus als live; die Engine nutzt nur Signale auf abgeschlossenen Kerzen.

---

## 13. Neustart mit einem neuen Claude-Chat

1. Diesen Masterplan anhängen.
2. Den aktuellen Code als ZIP anhängen: `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen (mit `https://`), herunterladen, im Chat anhängen. Ohne ZIP kann Claude einzelne Dateien über `raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/main/DATEINAME` lesen, wenn du die Adresse in den Chat schreibst.
3. Diesen Text als erste Nachricht:

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk“ gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang sind der Masterplan und der aktuelle Code. Bitte lies beides und arbeite genau so weiter: modular, Etappen mit Tests (auch mit verstellten Einstellungen), Wächter vor jedem Paket komplett durchspielen, nur geänderte Dateien als ZIP, Schritt-für-Schritt-Anleitungen, ehrliche Einschätzungen und Bremse, wenn ich überpace. Sprich locker mit mir wie ein Kumpel. Prüf zuerst, ob die Versionsnummer im Code zum Masterplan passt. Signal-Änderungen erst nach der ersten Tagebuch-Auswertung; Reihenfolge in Abschnitt 10.
