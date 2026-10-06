# Wolf Desk – Masterplan

Stand: 07.10.2026 (nachts) · Code: Etappe 8j · 852 Tests · auf dem iPhone geprüft bis 8i (838 von 838, drei Entwicklungs-Läufe), 8j noch nicht · **Zufalls-Maßstab ausgewertet: „Neu im Trend" besteht Messlatte A nicht, die vorab festgelegte Folge gilt (Abschnitt 11)**

Dieses Dokument ersetzt den Masterplan „Stand 05.10. · 8b1" und den „Nachtrag 8c". Es enthält alles, um Wolf Desk weiterzuentwickeln oder wiederherzustellen, auch in einem neuen Chat.
Es enthält bewusst **keine Zugangsdaten** (Token, Wallet, Chat-IDs) und **keine Kontobeträge**, weil das Repository öffentlich ist.

---

## 1. Worum es geht

**Wolf Desk** ist eine Trading-App (PWA) für Hyperliquid-Perpetuals, gebaut komplett vom iPhone aus. Gehandelt wird über **Ledger**. Die App liest nur: Sie kann keine Orders setzen, nur anzeigen, rechnen, warnen und erinnern. Geschlossen wird **von Hand**.

**Grenzen von Ledger-Perpetuals (gelten für jeden Vorschlag):** kein Margin-Nachschießen und nur **eine Position pro Coin**. Die App darf nie „Margin nachschießen" oder „zweite Position" vorschlagen. Hebel und Margin stehen mit dem Einstieg fest, deshalb zählt die Rechnung vorher.

- **App:** Marktüberblick, Konto, Positionen mit Trade-Weg, Risiko-Regeln mit Budget, Signalgeber, Trade-Karten mit Hebel-Vorschau, Backtest mit sieben Engines, Statistik, Kosten, Geduld
- **Telegram-Wächter:** läuft alle 15 Minuten bei GitHub, Signale in den Kanal, alles Persönliche privat
- **Signal-Tagebuch:** misst jedes gemeldete Signal und vergleicht es mit den echten Trades

**Wofür der Nutzer die App will (06.10. so gesagt):** Sie soll das lästige Heraussuchen von Coins erleichtern, also vorsortieren, was er sonst mit eigenem Auge im Chart sucht. Ein Hinweisgeber („das kannst du traden, behalte das im Auge"), dessen Hinweise auf Messung beruhen. Das System wird nicht umgeworfen, es geht nach Plan weiter und alles wird durchgetestet. Der Spaß am Traden soll dabei bleiben.

**Selbstanalyse des Nutzers:** Stärke = Einstiege. Schwächen = zu hoher Hebel im Verhältnis zum Stop, zu enge Stops, zu wenig Geduld beim Laufenlassen; in Bullenphasen gut verdient, beim Übergang in den Bärenmarkt die Gewinne nicht gesichert. Die Konto-Statistik bestätigt es (Stand 06.10., ohne Beträge): 36 Trades in 90 Tagen, 33 % Treffer, Gewinn zu Verlust 1,68 zu 1 · **in Teilen verkauft: 9 Trades, 89 % Treffer, klar im Plus · alles auf einmal: 27 Trades, 15 % Treffer, klar im Minus** · ein Verlust-Trade kostete im Schnitt gut 4 % vom Konto. Der Ausstieg in Teilen und die Positionsgröße sind die größten Hebel, größer als jede Signal-Änderung.

---

## 2. Zusammenarbeit (Regeln, die sich bewährt haben)

- Der Nutzer heißt Jensen, Anrede **„Buddy"**, keine Programmierkenntnisse, arbeitet nur am iPhone (Brave, Dateien-App, GitHub im Browser).
- **Ton:** locker und herzlich wie ein Werkstatt-Kumpel (✅, 🐺, „Klasse, Buddy!"), dabei ehrlich. Running Gag: Buddy1 (Claude) und Buddy2 (Jensen) berichten dem „Chef".
- **Keine Disclaimer** („kein Finanzberater", „Entscheidung liegt bei dir"): Der Nutzer hat ausdrücklich gesagt, dass er auf eigenes Risiko handelt. Sachliche Hinweise bei riskanten Werten und die Bremse beim Überpacen bleiben.
- **Eigene Ideen von Claude sind erwünscht**, laufen aber über dieselbe Messlatte wie alles andere.
- **Modular:** Jede Datei hat eine Aufgabe; der Rechen-Kern wird nie nebenbei verändert, Neues kommt in eigene Dateien.
- **Etappen:** Jedes Update ist ein Paket mit Nummer (zuletzt 8g). Die Nummern folgen der Bau-Reihenfolge. Ein Paket, ein Thema.
- **Vor jedem Paket:** alle Tests grün, zusätzlich mit vielen verstellten Einstellungen, der Wächter komplett durchgespielt (Testlauf, normaler Lauf, keine doppelten Meldungen), Sichtprüfung in iPhone-Größe.
- **Lieferung:** nur geänderte Dateien als ZIP mit eigenem Ordner, dazu eine Schritt-für-Schritt-Anleitung und eine Zeile „nicht getestet".
- **Vor größeren Änderungen:** Datum und Uhrzeit von der Uhr holen, Bestand prüfen (Versionsnummer!), offene Punkte im Masterplan durchgehen, Plan zeigen, dann bauen.
- **Aussagen über die App** nur nach einem Blick in den Code, sonst ausdrücklich als Vermutung kennzeichnen.
- **Sammeln statt kleckern:** erst mehrere Punkte sammeln, dann ein Paket. Keine neuen Kästen, wo eine Zeile reicht. Neue Funktionen bringen keine Fußnoten mit; Erklärungen stehen hinter einem **ⓘ** (`tipInline`, `tipHead` in `ui-parts.js`).
- **Messen vor Ändern:** Alles, was Signale verändert, braucht Backtest und Tagebuch (Abschnitt 11).
- **Regeln vor dem Test festlegen**, Nachbarwerte nur zur Prüfung der Stabilität, keine Parameter nach dem besten Backtest wählen.
- **Tempo-Regel (von Jensen am 05.10. festgelegt, jederzeit widerrufbar):** Reine Mess- und Anzeige-Pakete dürfen am selben Tag aufeinander folgen. Jedes Paket, das Wächter, Telegram oder Einstellungen anfasst, bekommt einen Tag Abstand zum vorigen. In beiden Fällen ist das vorige Paket auf dem iPhone geprüft (Testseite grün, einmal benutzt), bevor das nächste gebaut wird. Bei jedem Paket steht die Zeile „auf dem iPhone geprüft am …".
- **Zweite Meinung:** Jensen holt sich im alten Chat hin und wieder eine zweite Meinung zum Stand und bringt sie ein. Claude prüft sie, auch gegen den Code, und ordnet sie ein.
- **Dateien für Claude:** in der Dateien-App lange drücken → Teilen → Claude. Kopieren und Einfügen überträgt nur die Adresse. Den ZIP-Link kann Claude nicht selbst laden; einzelne Dateien nur über Adressen, die der Nutzer in den Chat schreibt (Claudes Abruf kann eine veraltete Kopie liefern).
- **Umziehen in einen neuen Chat erst bei rund 90 % Füllstand** (von Jensen am 07.10. festgelegt; häufiges Umziehen nervt). Claude sieht keine Anzeige und schätzt deshalb vor jedem Bau-Paket in einer Zeile, ob es noch passt; „umziehen“ sagt Claude erst, wenn ein Paket voraussichtlich nicht mehr ganz hineinpasst, und nennt den Grund. Eine Warnung der App zur Chat-Länge geht vor.

**Lehren aus Fehlern (05. und 06.10.):** Datum aus dem Masterplan abgeleitet statt von der Uhr → zu Unrecht gebremst · Lage eines Bildmotivs geschätzt statt gemessen → Icon saß schief · fast zum Icon-Tausch geraten, ohne auf den möglichen Datenverlust hinzuweisen · „bestätigt" geschrieben, wo nur „bisher nicht widerlegt" stimmte · einen zugesagten Punkt (Erinnerung zum Zeit-Ausstieg) verschoben: nicht noch einmal.

---

## 3. Adressen

| Wofür | Adresse |
|---|---|
| App | `https://489bw7b66d-lab.github.io/wolf-desk/` |
| Tests | `https://489bw7b66d-lab.github.io/wolf-desk/tests.html?v=8j` |
| Repository | `https://github.com/489bw7b66d-lab/wolf-desk` |
| Code als ZIP | `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` |
| Hochladen | `https://github.com/489bw7b66d-lab/wolf-desk/upload/main` |
| Datei löschen | `https://github.com/489bw7b66d-lab/wolf-desk/delete/main/DATEINAME` |
| Läufe (Wächter, Seitenbau) | `https://github.com/489bw7b66d-lab/wolf-desk/actions` |
| Wächter starten | `https://github.com/489bw7b66d-lab/wolf-desk/actions/workflows/wolf-watch.yml` |
| Zeitplan bearbeiten | `https://github.com/489bw7b66d-lab/wolf-desk/edit/main/.github/workflows/wolf-watch.yml` |
| Secrets | `https://github.com/489bw7b66d-lab/wolf-desk/settings/secrets/actions` |
| Veröffentlichte Signale | `https://raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/signals/signals.json` |
| Einzelne Datei roh lesen | `https://raw.githubusercontent.com/489bw7b66d-lab/wolf-desk/main/DATEINAME` |

---

## 4. Datenschutz-Regeln (streng, vom Nutzer ausdrücklich gewünscht)

1. **Nie Zugangsdaten, Wallet-Adresse oder Beträge** in Dateien, die ins öffentliche Repository gehen. „Für den Wächter übernehmen" lässt seit 8a auch das Startkapital weg (`core-privacy.js`). Die `my-settings.js` vom 05.10. enthält keinen Betrag mehr. Echte Kontowerte in zwei Test-Dateien wurden in 8c durch erfundene Zahlen ersetzt. Alte Fassungen bleiben in der GitHub-Historie sichtbar (ganz weg nur mit neuem Repository).
2. **Einschätzungen und Ziele je Position** gehören ins Secret `PRIVATE_SETTINGS`, nicht in `my-settings.js`.
3. **Exporte für Claude** („📤 Daten für Claude") enthalten Beträge, aber nie Wallet oder Zugangsdaten, und gehen nie ins Repository. Claude schreibt Beträge aus Exporten und Screenshots in keine Datei.
4. **Bevor etwas Persönliches öffentlich würde**, sagt Claude es vorher ausdrücklich.
5. **Im Chat** fragt Claude nie nach Seed-Phrase, Private Key oder Token.
6. Öffentlich bleiben bewusst: `signals.json`, Ledger-Liste, harmlose Einstellungen.
7. Für Screenshots gibt es den Privatmodus (Auge oben rechts): Beträge aus, Prozente bleiben.

### 4b. Zugänge und Geheimnisse (nur die Namen)

| Secret | Inhalt | Wo man den Wert wiederbekommt |
|---|---|---|
| `TELEGRAM_TOKEN` | Token des Bots **@WolfDeskBuddyBot** | Telegram → **@BotFather** (blauer Haken!) → `/mybots` → Wolf Desk → API Token. **Nie „Revoke" tippen.** |
| `TELEGRAM_CHAT` | private Chat-ID mit dem Bot | Secret löschen, dem Bot „hallo" schreiben, Test starten → Bot schickt die ID |
| `TELEGRAM_CHANNEL` | ID des Signal-Kanals (beginnt mit `-100`) | Secret löschen, im Kanal posten, Test starten → Bot schickt „Kanal gefunden" |
| `WALLET` | Hyperliquid-Adresse (öffentlich, nur lesend) | Hyperliquid / Ledger |
| `PRIVATE_SETTINGS` | JSON mit Einschätzungen und Zielen je Position | App: ⚙️ → „🔒 Private Daten für den Wächter" kopiert es; bei GitHub Secret anlegen bzw. „Update" |

Der Bot ist im Kanal **Admin** mit „Nachrichten posten". Nur der BotFather mit blauem Haken ist echt.

---

## 5. Aufbau der App (141 Dateien, fast alle im Hauptordner)

**Einstellungen:** `config.js` (Empfehlungen) · `ledger-markets.js` (Ledger-Märkte, Standard für „Handelbare Märkte") · `my-settings.js` (nur die **Abweichungen** von der Empfehlung, dazu Watchlist und handelbare Märkte; von der App erzeugt, gilt auch für den Wächter). **Wichtig:** Ändert ein Paket eine Empfehlung in `config.js`, gilt der neue Wert sofort überall, wo der Nutzer keine eigene Abweichung gespeichert hat.

**Daten-Kern (`core-*.js`)**
- Schnittstelle und Konto: `core-api`, `core-stream`, `core-store`, `core-health`, `core-account`, `core-calc`, `core-positions`, `core-stops`
- Risiko: `core-risk` (Regeln, Ausstiegsplan, Hebel), `core-guard` (Stop-Check gegen ATR, Abkühlphase), `core-trail` (Stop nachziehen nach Struktur), `core-levpreview` (Hebel-Vorschau), `core-totalrisk` (Summe, wenn alle Stops greifen), **`core-riskbudget`** (8e: Ampel fürs Gesamt-Risiko, Budget für neue Trades), `core-exitcalc` (Ausstiegsrechner)
- Handel und Auswertung: `core-trades`, `core-performance` (Gewinn aus Hyperliquids PnL-Verlauf, größter Rückgang), `core-fees`, `core-patience`
- Signale: `core-indicators`, `core-signals`, `core-scanner`, `core-fib`, `core-elliott`, `core-patterns`, `core-candlesticks`, `core-confirm`, `core-trendgate` (Short-Filter), `core-feedplan`, `core-reasons`, `core-engine2`, `core-benchmark` (Maßstab als Signalgeber, Haltedauer, Tagebuch-Fenster), `core-bmtext` (Telegram-Text)
- Backtest: `core-backtest` (Simulation, Lauf), `core-btstore` (Speicher; Feldlisten `KEEP` je Trade und `compactRun` je Markt: **neue Felder müssen dort eingetragen werden, sonst gehen sie beim Speichern verloren**), `core-regime` (8c: BTC-Merker), `core-exitcompare` (8c: Ausstiegs-Varianten), `core-donchian` (8d), `core-btmetrics` (8d: Funding-Schätzung, Pareto, Haltedauer), `core-randombase` (8f: Zufalls-Maßstab), **`core-binance`** (8h: lange Historie von Binance, eigene Datenbank `wolfdesk-bn`, Protokoll in `wolfdesk.bn`), **`core-longtest`** (8i: Messmaschine für den Testplan, Ergebnisse in `wolfdesk.lt`)
- Märkte: `core-universe`, `core-hotscan`, `core-market`, `core-watchlist`, `core-tradeable`
- Positionen: `core-path` (Trade-Weg), `core-plans`, `core-autoplan`, `core-planstate` (Plan-Ampel)
- Sonstiges: `core-settings`, `core-views`, `core-alerts` (Wächter-Logik, Tagebuch, Berichte), `core-journalmeasure`, `core-gesture`, `core-privacy`, `core-format`

**Anzeige (`ui-*.js`):** `ui-chart` + `ui-chartview`, `ui-home`, `ui-market`, `ui-feed`, `ui-views`, `ui-signals`, `ui-trade` (Trade-Karte mit Risiko-Budget), `ui-coin`, `ui-position`, `ui-performance`, `ui-testpage`, `ui-risk`, `ui-backtest`, **`ui-binance`** (8h: Zeile „Lange Historie“ im Backtest), **`ui-longtest`** (8i: Zeile „Testplan-Läufe“), `ui-settings`, `ui-storage`, `ui-tradeable`, `ui-export`, `ui-watchlist-edit`, `ui-sheet`, `ui-swipe`, **`ui-notice`** (8e: einmaliger Hinweis nach einem Update), `ui-parts`

**Rahmen:** `index.html`, `main.js`, `styles.css`, `manifest.json`, `tests.html` + 42 Dateien `test-*.js`, `watcher.js`, `.github/workflows/wolf-watch.yml`, Icons `icon-180/192/512.png` (seit 8c der goldene Wolfskopf)

**Versionsnummer:** `index.html` hat `<meta name="app-version" content="8j">` und eine Import-Liste mit `?v=8j` je Datei. Bei jedem Update erhöhen und neue Dateien eintragen. `tests.html` führt die Test-Dateien einzeln auf: neue Test-Dateien dort importieren und an die Liste `all` anhängen. Die App erkennt neue Versionen selbst und lädt neu.

**Speicher auf dem iPhone (geht beim Neu-Hinzufügen der App sehr wahrscheinlich verloren, es gibt noch keine Funktion zum Wiedereinlesen):** Wallet-Adresse, Startkapital, Einschätzungen, Ziele, eigene Chart-Linien, Stops von Hand, Backtests, Geduld-Daten, **Stichtag und eingefrorene Marktliste der langen Historie** (deshalb das Protokoll kopieren und an Claude geben, es kommt als `TESTPLAN-PROTOKOLL.md` ins Repository).

---

## 6. Geltende Werte

- **Risiko pro Trade (seit 8e):** Stufen **0,5 / 1 / 2 %**, gelb ab **1 %**, rot ab **2 %** · **Tagesverlust** max. **5 %** · **Gesamt-Risiko „Greifen alle Stops"** gelb ab **4 %**, rot ab **6 %** vom Konto (die rote Grenze ist zugleich das Risiko-Budget) · **Margin je Trade** höchstens **25 %** des Freien · Hebel max. 20× · Liquidation mind. 1 % hinter dem Stop · freies Kapital gelb unter 10 %, rot unter 2 % (Nutzer: rot unter 8 %)
- Begründung der kleinen Stufen: größter Rückgang im Backtest 19R (Daytrade) bis 126R (Donchian). Bei 2 % Risiko wären 19R schon −38 % vom Konto.
- **Kein Limit** für die Anzahl offener Positionen; die Bremsen sind Abkühlphase, Gesamt-Risiko und Budget.
- **Stop-Check:** rot unter 1,0 × ATR, gelb unter 1,5 × ATR, Vorschlag 1,5 × ATR (Setup-Zeitebene: Swing 4H, Daytrade 1H). Nie ein Stop hinter der Liquidation.
- **Abkühlphase:** nach 2 Verlust-Trades in Folge für 4 Std.: Banner, Risiko-Vorschlag halbiert, Telegram.
- **Ausstiegsplan:** Empfehlung TP1 20 · TP2 25 · TP3 25 · TP4 15 · Runner 15 %. Der Nutzer hat einen eigenen Plan (TP1 20 · TP2 30 · TP3 30 · TP4 0 · Runner 20 %). **Der Backtest rechnet mit dem Plan des Nutzers.**
- **Stop nachziehen (Struktur):** frühestens ab TP1, nur bestätigte Swing-Tiefs/-Hochs, Puffer ½ ATR, nur in Gewinnrichtung, spätestens ab TP2 Einstieg plus Gebühren.
- **Markt-Bias:** BTC 40 · ETH 20 · Marktbreite 25 · ETH/BTC 15 % (Nutzer: Marktbreite über EMA 55).
- **Wächter:** Mindestumsatz 15 Mio. $ (Nutzer), handelbare Märkte = Ledger-Liste (175 Märkte).
- **Short-Filter:** Nutzer „mittel". Spielt seit 8b für Telegram keine Rolle mehr (nur Long).
- **Maßstab-Signale (`CONFIG.benchmark`, seit 8b in Telegram):** Tages-EMA 20 über EMA 100 und Kurs über der Tages-EMA 20 · Auslöser „neu im Trend": an der letzten abgeschlossenen 4H-Kerze erfüllt, an der davor nicht · Einstieg zum Kurs · Stop 2 × ATR 14 (Tag) · Ziele 2R / 3R / 4R / 6R · nur Long · mind. 110 Tage Historie · keine Meldung, wenn der Kurs seit Kerzenschluss mehr als 0,5R gelaufen ist · **Ausstieg spätestens nach 10 Tagen** (`holdDays`, Zeile im Signal, Tagebuch-Fenster 10 Tage; alte Engine 14 bzw. 3) · Schalter `alerts.benchmark` unter ⚙️ → Telegram.
- **Backtest:** 180 Tage Swing, 45 Tage Daytrade, 14 Tage Scalp · Zeit-Ausstieg nach 60 Setup-Kerzen (Swing 10 Tage, Daytrade 2,5 Tage) · Gebühren je Seite nach dem echten Satz · **Funding-Schätzung 0,03 % je Tag Haltedauer für Longs** (seit 8d; Hyperliquids Grundsatz, der echte Satz schwankt) · Slippage nicht eingerechnet · Entwicklung = erste zwei Drittel, Bestätigung = letztes Drittel.
- **Indikatoren:** EMA 8/21/55/200 · RSI 14 · ATR 14 · MACD 12/26/9.
- **Liquidations-Näherung:** Abstand ≈ min(90 / Hebel, 100 / Hebel − 50 / Höchsthebel des Marktes).

---

## 7. Update-Routine

1. ZIP in der Dateien-App sichern, antippen → Ordner `wolf-desk-XX`. Ältere ZIPs vorher löschen (das iPhone hängt sonst „2" an).
2. Bei GitHub **angemeldet** sein.
3. `…/upload/main` → „choose your files" → Durchsuchen → Ordner → „Auswählen" → „Alle auswählen" → Öffnen → **Commit changes**.
4. Unter **Actions** prüfen, dass „pages build and deployment" einen grünen Haken bekommt.
5. `tests.html?v=XX` öffnen: Die Zahl der Tests muss stimmen.
6. App schließen und neu öffnen. Betrifft es den Wächter: Test starten (Run workflow).

**Wenn die Testseite die alte Zahl zeigt:** Die Dateien liegen im Repository, aber die Webseite ist nicht neu gebaut. Probe: `https://489bw7b66d-lab.github.io/wolf-desk/NEUE-DATEI.js` öffnen; kommt „404", ist der Seitenbau gescheitert. Abhilfe: Actions → den roten Lauf „pages build and deployment" antippen → „…" → **Re-run all jobs**. (So geschehen am 05.10. abends: GitHub-Störung von 21:10 bis ca. 23:30, sieben Wächter-Läufe und ein Seitenbau abgebrochen, Meldung „job was not acquired by Runner".)

**Einstellungen an den Wächter:** ⚙️ → „Für den Wächter übernehmen" → „In Dateien sichern" → Ordner Claude (alte Datei dort vorher löschen) → `my-settings.js` hochladen. **Einschätzungen und Ziele:** ⚙️ → „🔒 Private Daten für den Wächter" → bei GitHub ins Secret `PRIVATE_SETTINGS`.

**Stolperfallen:** „Uploads are disabled" = nicht angemeldet · Brave behandelt lange Adressen manchmal als Suche (immer mit `https://`) · Platzhalter nie wörtlich übernehmen · Paket gebaut heißt nicht hochgeladen · der graue Knopf „Speichern und anwenden" ist kein Fehler (wird nur aktiv, wenn gerade etwas geändert wurde) · rote Wächter-Läufe muss man nicht nachholen, der nächste Lauf prüft den aktuellen Stand.

**Notfall:** Datei bei GitHub öffnen → Uhr-Symbol (History) → ältere Version zurückspielen. Wächter-Fehler: Actions → Lauf → „watch" → roter Schritt.

---

## 8. Telegram-Wächter

- Alle 15 Min. (GitHub startet teils später), kostenlos bei öffentlichem Repository, Zeitlimit 14 Min. je Lauf, normal knapp 4 Min.
- **Je Lauf:** Konto prüfen (Regelverstöße gesammelt melden, Entwarnung erst bei Grün) → Tagebuch auswerten und mit echten Trades verknüpfen → Trades 60 Tage laden → Abkühlphase melden → handelbare Märkte scannen (Tageskerzen aller Märkte, 4H-Kerzen nur für Märkte im Aufwärtstrend, Wechsel „neu im Trend" suchen) → Signale melden (höchstens `maxPerRun`, zuerst die mit dem größten EMA-Abstand in ATR; kein Signal für Coins mit offener Position oder laufendem Signal) → Ziele offener Positionen melden → Marken der Einschätzungen → Wochenbericht → `signals.json` veröffentlichen.
- **Gedächtnis:** `.watch-state.json` im GitHub-Zwischenspeicher. **Veröffentlichung:** Zweig `signals`.
- Seit 8e meldet der Wächter auch „Gesamtrisiko bis Stops" ab 6 % als Regelverstoß.

**Zeitplan** (`.github/workflows/wolf-watch.yml`):

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

**Für Claude: Prüfen ohne Internet**
- **Tests in Node:** `echo '{"type":"module"}' > package.json`, dann alle `test-*.js` aus `tests.html` importieren und jede Funktion aufrufen (Ergebnis `true` = bestanden). Für verstellte Einstellungen `CONFIG` vor dem Import der Tests ändern. Die `package.json` danach wieder löschen, sie gehört nicht ins Paket.
- **Wächter-Probelauf:** Hyperliquid, CoinGecko und Telegram in Node nachbilden (`globalThis.fetch` ersetzen, Start mit `node --import mock.mjs watcher.js`). Kurse als stetige Funktion der Zeit erzeugen, sonst passen Kerzen und Marktpreis nicht zusammen. Für ein Signal „neu im Trend": Aufwärtstrend, zwei Tage Delle von 8 %, Erholung genau in der letzten abgeschlossenen 4H-Kerze. Erst `TEST_RUN=true`, dann zweimal normal: Testnachrichten, Signale in den Kanal, zweiter Lauf ohne Meldungen. Für Konto-Regeln eine offene Position samt Stop-Order nachbilden (`clearinghouseState`, `frontendOpenOrders` mit `isTrigger`, `triggerPx`, `reduceOnly`). Einstiege an einem festen Zeitpunkt verankern.
- **Sichtprüfung:** Playwright mit Chromium ist vorhanden. App über einen lokalen Server laden (390 × 844, Touch), `window.fetch` und `WebSocket` per Init-Skript ersetzen, `wolfdesk.address` im Speicher setzen, tippen, fotografieren. `tests.html` läuft dort ebenfalls.
- **Werkzeug-Falle:** `pkill -f` mit einem Muster, das auch im eigenen Befehl steht, beendet die eigene Shell. Server mit `setsid` starten und laufen lassen.

---

## 9. Was gebaut ist

**Etappen 1 bis 3 (Grundlage):** Daten-Kern · Risiko-Modul, Stop-Erkennung, Positionsgrößen-Rechner, Performance · Signalgeber mit Scalp/Daytrade/Swing, Heiße Coins, Fibonacci, Elliott, Chartmuster, Candlesticks · Startseite, Trade-Karte, Marktsuche · automatische Stilwahl mit Hebel-Obergrenzen, Ausstiegsplan TP1 bis TP4 plus Runner · Live-Chart, Hebel-Regler, PWA-Icon · bearbeitbare Watchlist, Retest-Siegel · Marktüberblick (Bias-Tacho, Fear & Greed) · Privatmodus · Telegram-Wächter mit Tagebuch, Beruhigung, Verknüpfung mit echten Trades, Wochenbericht · Einstellungen mit Zahnrad und Export für den Wächter · „Meine Einschätzung" · Kosten-Karte · Trade-Weg in den Positionskarten · Ziele je Position und automatischer Plan.

**Etappe 4:** Risiko-Stufen, Stop-Check gegen ATR, Abkühlphase, Geduld-Statistik (4a) · Trade-Karte aus laufendem Signal, Hebel-Vorschau, handelbare Märkte (Ledger), ⓘ statt Fußnoten (4b) · bedienbare Charts ohne Fremdbibliothek, Coin-Logos (4c) · ehrlicher Gewinn aus dem PnL-Verlauf, Stop nachziehen nach Struktur (4d).

**Etappe 5:** Short-Filter in drei Stufen (5a) · Liquidations-Näherung mit Höchsthebel des Marktes (5b) · nie ein Stop hinter der Liquidation, kein Signal bei offener Position, Export „Daten für Claude" (5c) · private Daten ins Secret (5d) · schlanker Signalgeber mit Suchfeld (5e) · neu gegliedertes Telegram-Signal mit Nummer, Stop umschalten auf der Trade-Karte (5f) · Stop-Check nennt die Kosten (5g).

**Etappe 6a:** Plan-Ampel je Position, Backtest-Speicher mit „Weitermachen", Speicher-Übersicht, Tagebuch-Archiv.

**Etappe 7:** Engine 2 (Struktur, Fib-Zone, Umkehrpunkt-Regel des Nutzers, Chance/Risiko) als Test neben der alten Engine (7a, 7b) · „Maßstab" als stumpfe Trendfolge, ADX-Tabelle, Stichprobe (7c).

**Etappe 8a (Bedienung):** Positionen nur noch auf der Startseite mit Mini-Trade-Weg, Zeile „Greifen alle Stops", Positions-Blatt mit Ausstiegsrechner und Stop von Hand, Blätter wegwischen, Tab-Wechsel durch Wischen, Tagebuch-Messwerte.

**Etappe 8b und 8b1:** Telegram meldet nach dem Maßstab („neu im Trend", nur Long), Versionsschnitt im Tagebuch (`eng: 'bm'`), Schalter zum Zurückdrehen, vierte Backtest-Wahl „Neu im Trend" · Backtest-Verzeichnis (`bt:index`), gespeicherte Ergebnisse laden wieder. **Bewusst offen:** Heiße Coins und das Kopf-Etikett im Signalgeber meinen noch die alte Engine.

**Etappe 8c (05.10., Messung):** Marktphasen-Schalter (BTC-Merker je Trade), Ausstiegs-Vergleich, 10-Tage-Hinweis im Signal, Tagebuch-Fenster 10 Tage, Engine-Vergleich nur bei gleichen Märkten, neues Icon (Variante B), echte Kontowerte aus den Tests entfernt. *Auf dem iPhone geprüft am 05.10.*

**Etappe 8d (05.10. abends, Messung):** Donchian 20/10 als fünfte Engine (nur Swing, eigene Simulation), Funding in den Kosten aller Engines, „Gewinn aus den besten 15 %" und „Ø Haltedauer". *Auf dem iPhone geprüft am 06.10. gegen 00:45.*

**Etappe 8e „Geld schützen" (06.10. morgens):** neue Risiko-Werte (Abschnitt 6), eigene Grenzen fürs Gesamt-Risiko, Risiko-Budget auf der Trade-Karte, einmaliger Hinweis nach dem Update (`wolfdesk.notice.8e`), Konto-Statistik mit „Ø Gewinn / Ø Verlust vom Konto" und Pareto. Folge: Positionen mit mehr als 2 % Risiko erscheinen rot und werden einmal gesammelt gemeldet. *Auf dem iPhone geprüft am 06.10. morgens.*

**Etappe 8f „Zufalls-Maßstab" (06.10. vormittags, Messung):** sechste Engine „Zufall" für alle drei Stile: zufällige Einstiege, nur Long, derselbe Plan wie der Maßstab ohne Trend-Bedingung, derselbe Zeit-Ausstieg, dieselben Kosten. 20 Durchgänge, der Würfel hängt an der Kerzenzeit (`rollAt`), also wiederholbar; im Schnitt ein Einstieg je 280 freien Setup-Kerzen (Scalp 700). Block „Regel oder nur Marktrichtung?" mit Zufall Ø, Spanne und „Neu im Trend" (✓ über, ✗ unter, · innerhalb der Spanne). Gespeichert werden je Durchgang sechs Zahlen; Trade-Liste und übrige Kennzahlen zeigen den ersten Durchgang. *Auf dem iPhone geprüft am 06.10. nachmittags (744 von 744, drei Läufe gerechnet).*

**Etappe 8g „Backtest aufräumen und zu Ende messen" (06.10. abends, Messung und Anzeige):**
- **Seite aufgeräumt** (Wunsch des Nutzers): die Regel als Auswahlfeld statt sechs Knöpfen, gespeicherte Läufe hinter „Gespeicherte Läufe (n) ▾" (zu, bis man sie antippt), der Einleitungstext hinter ⓘ. Die drei Stil-Knöpfe bleiben.
- **Siebte Engine „Zufall zu Donchian"** (`swing:rd`, nur Swing): zufällige Einstiege an Tagesschlüssen, derselbe Stop und derselbe Ausstieg wie Donchian (Stop oder Tagesschluss unter dem 10-Tage-Tief, kein Zeitlimit), im Schnitt ein Einstieg je 40 freien Tagen, 20 Durchgänge.
- **Beide Messlatten getrennt** im Block „Regel oder nur Marktrichtung?": A (besser als Zufall) und B (verdient Geld), jeweils mit Begründung. Der Block erscheint jetzt auch bei der Regel selbst („Neu im Trend", Donchian), sobald der passende Zufalls-Lauf auf denselben Märkten gespeichert ist.
- 13 neue Tests (757). Geprüft: Tests auch mit acht verstellten Einstellungen, Testseite und Bedienung im Browser, Wächter-Probelauf (unverändert). *Auf dem iPhone geprüft am 06.10. gegen 22:30: Testseite 757 von 757. Die aufgeräumte Backtest-Seite und der Lauf „Zufall zu Donchian" sind noch nicht benutzt.*
- **Offen beim Nutzer:** „Zufall zu Donchian" auf den handelbaren Märkten rechnen (Donchian vom 06.10. 00:51 ist mit Funding gerechnet und kann bleiben).

**Etappe 8h „Binance-Datenquelle“ (06.10. nachts, reines Mess-Paket):**
- **Neue Zeile „Lange Historie (Binance)“ im Backtest** (zugeklappt unter dem Start-Knopf). Ablauf: Verbindung testen → Märkte prüfen → Vorschau ansehen und kopieren → einfrieren und 4H-Kerzen laden. Jeder Schritt lässt sich anhalten und fortsetzen.
- **Stichtag** = Tag (UTC), an dem „Märkte prüfen“ zum ersten Mal getippt wird; fest, nie verschoben. **Tresor** = die 365 Tage davor; diese Kerzen werden **nicht geladen** (jede Kerzen-Anfrage endet an der Tresor-Grenze, per Test abgesichert). Einzige Berührung: ein „Lebenszeichen“ je Markt (gibt es in den letzten drei Tagen vor dem Stichtag eine Kerze, ja oder nein; kein Kurs wird gelesen oder gespeichert).
- **Auswahl** (Präzisierungen zum Testplan, von Jensen und der zweiten Meinung am 06.10. bestätigt; der Testplan selbst ist unverändert): handelbare Märkte, bei Binance seit mind. 730 Tagen vor dem Stichtag, Handel bis zur Tresor-Grenze und am Stichtag, höchstens 50, sortiert nach dem **Binance-Umsatz der 30 Tage vor der Tresor-Grenze**. **Sperrfrist:** keine Einstiege in den letzten 10 Tagen vor der Tresor-Grenze, Trades zählen nach Einstiegsdatum (`periodOf` liefert `dev`, `check`, `sperre`, `vault`).
- **Gegenprobe:** Tagesschluss zwei Tage vor der Tresor-Grenze bei Hyperliquid und Binance, höchstens 5 % Abweichung; sonst scheidet der Markt aus („anderer Coin?“). War der Coin damals bei Hyperliquid noch nicht gelistet, steht „ohne Gegenprobe“ in der Liste: **vor dem Einfrieren von Hand ansehen.** Namens-Ausnahmen kommen in `OVERRIDE` und `SKIP` in `core-binance.js`.
- **Daten:** Spot-Kerzen 1d und 4h ab 01.01.2020 von `data-api.binance.vision`, Form wie Hyperliquid (t, T, o, h, l, c, v; Tageskerzen zusätzlich Umsatz q), UTC, k-Coins mal 1000. Kompakt in Spalten gespeichert (rund 0,6 MB je Markt), eigene Datenbank, „Backtest-Daten löschen“ fasst sie nicht an. Lücken je Markt werden gezählt. Für die Regeln: `candlesOf('4h', coin)` und `candlesOf('1d', coin)`.
- 38 neue Tests (795). Geprüft: Tests auch mit acht verstellten Einstellungen, Testseite und kompletter Ablauf im Browser in iPhone-Größe mit nachgebildetem Binance, Wächter-Start (Testlauf und zweimal normal; der Wächter ist unverändert, ein Signal wurde nicht nachgespielt).
- **8h1 (06.10., 23:45, Korrektur):** Auf dem iPhone blieb „Märkte prüfen“ nach 24 von 175 Märkten mit „nicht erreichbar“ stehen, „Weitermachen“ half nicht. Stichtag ist damit der **06.10.2026**. Vermutete Ursache (nicht nachprüfbar, hier kein Internet): Für unbekannte Märkte schickt Binance eine Fehlerantwort, die der Browser nicht durchlässt, und das sieht aus wie „kein Netz“. Lösung: Scheitert ein Markt zweimal, während die BTC-Probe dazwischen klappt, gilt er als „nicht bei Binance“; scheitert auch die Probe, wird angehalten. Das Protokoll listet diese Märkte namentlich („Nicht bei Binance: …“), **vor dem Einfrieren ansehen, ob ein bekannter Binance-Coin darunter ist.** 5 neue Tests (800). Lehre: Fehlerantworten fremder Dienste im Browser immer mit durchspielen.
- **Nicht getestet:** der echte Abruf von Binance aus der App (hier kein Internet). Scheitert der Verbindungstest auf dem iPhone, holt der Wächter die Kerzen (eigenes Paket mit einem Tag Abstand). Ebenfalls ungeprüft: ob jeder Hyperliquid-Name bei Binance denselben Coin meint (dafür Gegenprobe und Vorschau).
- **Erledigt (06./07.10.):** Stichtag **06.10.2026**, Liste mit **50 Märkten eingefroren**, Tages- und 4H-Kerzen bis 05.10.2025 vollständig auf dem iPhone. Protokoll: `TESTPLAN-PROTOKOLL.md` (kommt mit dem nächsten Paket ins Repository). Befunde: 175 geprüft, 103 erfüllen alle Bedingungen, 34 nicht bei Binance, 36 unter zwei Jahren, 2 mit Handelsende vor der Tresor-Grenze · Gegenprobe bei 49 von 50 ok, ICP ohne Gegenprobe (eindeutiger Name, bleibt) · neun Märkte beginnen erst 2024 (ENA, ETHFI, EIGEN, WIF, TAO, W, PYTH, POL, kNEIRO): Entwicklung läuft auf 41 Märkten, Prüfung auf 50 · POL ohne die alte MATIC-Historie · PAXG (Gold-Token) ist dabei, weil handelbar · je eine fehlende 4H-Kerze bei 15 Märkten, die es seit Januar 2020 gibt (vermutlich dieselbe Binance-Wartungspause Anfang 2020; beim Engine-Bau das Datum nachsehen).
- **Für das Engine-Paket vormerken:** Simulation auf 4H-Kerzen; im Code nachsehen, dass bei Stop und Ziel in derselben Kerze der Stop zählt; Vergleichsregeln (auch Donchian) laufen im gemeinsamen Rahmen mit Zeit-Ausstieg nach 10 Tagen, sonst reicht die Sperrfrist nicht; Regel 5 richtet die Tagesschlüsse nach Zeitstempel aus und mittelt über die Märkte, die es am jeweiligen Tag gab; Wochen beginnen montags UTC, Monate am Ersten UTC.

**Etappe 8i „Messmaschine“ (07.10. kurz nach Mitternacht, reines Mess-Paket):**
- **Neue Zeile „Testplan-Läufe“ im Backtest** (unter „Lange Historie“): Regel wählen, „Entwicklung rechnen“ (beliebig oft), „Prüfung ansehen (einmalig)“ mit Rückfrage, „Ergebnis kopieren“. Die Prüfung wird je Regel einmal gerechnet, in `wolfdesk.lt` gespeichert und danach nur noch gezeigt. Ohne geöffnete Prüfung wird der Zeitraum nicht einmal simuliert. Der Tresor ist gesperrt.
- **Enthaltene Regeln:** Vergleichsregeln „Neu im Trend“ und Donchian 20/10 (beide im gemeinsamen Rahmen; Donchian also mit Zeit-Ausstieg nach 10 Tagen statt seines eigenen Ausstiegs) und **Regel 5** (Marktphasen-Schalter, Kandidat). Die Regeln 1, 2, 3, 4 und 6 kommen im nächsten Paket.
- **Rahmen fest im Code** (`LT` in `core-longtest.js`, unabhängig von den Einstellungen der App): Einstieg zum Schluss der 4H-Signalkerze, Stop 2 × ATR(14) der letzten abgeschlossenen Tageskerze, Ziele 2R / 3R / 4R mit 20 / 30 / 30 %, Rest 20 % läuft (Stop ab dem zweiten Ziel auf Einstieg, danach stufenweise), Zeit-Ausstieg nach 10 Tagen, ein offener Trade je Markt, Gebühr fest 0,045 % je Seite, Funding 0,03 % je Tag. Berühren Stop und Ziel dieselbe Kerze, zählt der Stop (im Code nachgesehen, `simulateTrade`). Mindestens 110 abgeschlossene Tageskerzen vor einem Einstieg.
- **Zufalls-Vergleich:** 200 Durchgänge; je Markt und Kalendermonat so viele Zufalls-Einstiege wie die Regel, ohne Überschneidung im selben Markt. Gezeigt wird, besser als wie viel Prozent der Durchgänge die Regel liegt (A ab 95 %). **Spanne der Regel:** 1.000 Ziehungen ganzer Kalendermonate, 5. bis 95. Perzentil.
- **Regel 5:** Zufalls-Einstiege, im Schnitt einer je 280 freien 4H-Kerzen, nur wenn am letzten Tagesschluss der gleichgewichtete Schnitt der 28-Tage-Veränderung aller Märkte, die es damals gab, im Plus lag. Verglichen wird mit Zufall ohne Schalter (gleich viele je Markt und Monat).
- **Urteil:** A und B je Zeitraum; Kandidaten, die in der Entwicklung bei A und B durchfallen, sind abgelegt (keine Prüfung); Vergleichsregeln werden nie abgelegt und gehen nie in den Tresor.
- Gegenprobe im Test: „Neu im Trend“ und Donchian der Messmaschine feuern an denselben Kerzen wie die Regeln der App (`bmFlip`, `donchianSignal`). Tempo: alle 50 Märkte mit 200 Durchgängen in rund 1,5 Sekunden am Rechner.
- 38 neue Tests (838). Geprüft: alle Tests, die neuen auch mit vier verstellten Einstellungen (der Test hängt nicht an den Einstellungen), Testseite und Ablauf im Browser in iPhone-Größe, Wächter-Start (unverändert).
- **Nicht getestet:** Tempo und Speicher auf dem iPhone mit den echten 50 Märkten; die Ergebnisse auf echten Kerzen (hier nur nachgebildete Kurse).
- **Offen beim Nutzer:** Entwicklung für alle drei Regeln rechnen und die Ergebnisse an Claude geben. **Die Prüfung von Regel 5 noch nicht öffnen**, bis die Maschine an den beiden Vergleichsregeln plausibel aussieht (ein Fehler in der Maschine würde sonst einen Blick in die Prüfung verbrauchen).
- **Für 8j vormerken:** Regeln 1, 2, 3, 4, 6 als weitere `fire`-Funktionen; Wochen beginnen montags UTC, Monate am Ersten UTC (VWAP); Datum der fehlenden 4H-Kerze nachsehen.

**Etappe 8j „Änderung 1: neuer Zufalls-Vergleich“ (07.10. nachts, reines Mess-Paket):**
- **Anlass:** Die ersten Läufe mit 8i (Neu im Trend +0,13R, Platz 7 % · Donchian +0,26R, Platz 0 % · Regel 5 +0,24R, Platz 42 %) zeigten zwei Fehler im Vergleich; die zweite Meinung hat beide bestätigt. (1) Angleichen je Markt und Monat wählt Markt-Monate im Nachhinein aus: Der Zufall darf vor dem Auslöser einsteigen (verzerrt gegen Ausbruch- und Trendregeln, für Rücksetzer-Regeln). (2) Regel 5 ist ein Zeit-Filter und wurde gegen fast dieselben Tage gemessen. **Die drei Ergebnisse sind ungültig; daraus keine Schlüsse ziehen.** Die App zeigt sie nicht mehr an.
- **Neuer Vergleich für alle Einstiegsregeln (Fassung 2):** Zu jedem Einstieg der Regel steigt der Zufall **zur selben 4H-Kerze in einem zufälligen zulässigen Markt** ein. Zulässig: genug Historie, Vorbedingung der Regel erfüllt (Tagestrend aufwärts; bei Donchian keine), in diesem Durchgang nicht schon im Trade; der Markt der Regel selbst darf gezogen werden. Kein zulässiger Markt: auslassen und zählen. **Messlatte A fragt damit nur noch: Ist dieser Markt an dieser Stelle besser als ein beliebiger zulässiger Markt zur selben Zeit?** Das „Wann“ prüfen Regel 5 und Messlatte B.
- **Regel 5 gepaart:** je Durchgang Zufalls-Einstiege über Zeit und Märkte (im Schnitt einer je 280 freien Kerzen), eingeteilt nach Schalterstand. Kennzahl: Ø R an minus Ø R aus. A bestanden, wenn die Differenz in mindestens 95 % der Durchgänge über 0 liegt; B: Ø R bei Schalter an im Plus. Dazu Anteil der Tage mit Schalter an und Zahl der Wechsel (die wahre Stichprobe).
- **Nur beschreibend:** „Rahmen allein“ = Ø R, wenn man an jeder 5. Kerze jedes Marktes einsteigt.
- **Nachweis an Zufallskursen (fester Test):** Auf Kursen ohne jeden Vorteil liegt Donchian mit dem alten Vergleich im Schnitt bei 0 % der Durchgänge, mit dem neuen um 50 % (40 Kurs-Sätze: 0 % gegen 51 %). Der alte Vergleich bleibt nur für diesen Test im Code (`randomMatchedOld`).
- **Von Jensen am 07.10. ausdrücklich bestätigt. Danach wird am Würfel nichts mehr geändert, egal wie die Regeln abschneiden.** Eingetragen als „Änderung 1“ im `TESTPLAN-PROTOKOLL.md` (der Testplan selbst bleibt unverändert).
- Außerdem: „−0,00R“ behoben. 14 neue Tests (852). Geprüft: alle Tests, Testseite und Ablauf im Browser in iPhone-Größe. Wächter unverändert (keine Datei des Wächters berührt), diesmal nicht erneut gestartet.
- **Nicht getestet:** Ergebnisse und Tempo auf dem iPhone mit echten Kerzen.
- **Offen beim Nutzer:** Entwicklung für alle drei Regeln neu rechnen und die Texte an Claude geben. Prüfung von Regel 5 erst öffnen, wenn Claude die Maschine freigibt.

**Kleinigkeiten, die noch offen sind:** `config.js` enthält seit der ersten Version `startCapital: 1500` (Jensen klärt, ob Platzhalter oder echter Betrag) · `core-totalrisk.js` enthält noch die alte Funktion `totalRiskStatus` (wird nicht mehr benutzt, die Tests dazu laufen weiter).

---

## 10. Was gemessen ist

### Backtests (175 handelbare Märkte, Ø R pro Trade nach Kosten)

| Engine | Swing 180 Tage | Daytrade 45 Tage | Scalp 14 Tage |
|---|---|---|---|
| Neu im Trend | **+0,15R** (588 Trades, mit Funding) | **+0,11R** (528, mit Funding) | +0,04R (306) |
| Zufall (Ø über 20 Durchgänge) | +0,15R (rund 525) | +0,10R (rund 550) | nicht gerechnet |
| Donchian 20/10 | **+0,31R** (568, mit Funding) | nur Swing | nur Swing |
| Maßstab (jede Kerze im Trend) | +0,14R (846) | +0,09R (1.569) | nicht gerechnet |
| Alte Engine | −0,03R (1.314) | ±0,00R (1.736) | +0,05R (1.671) |
| Engine 2 | −0,01R (565) | −0,24R (810) | −0,08R (2.455) |

Läufe ohne den Vermerk „mit Funding" sind von vor 8d und stehen etwas zu gut da.

### Die beiden Trendregeln im Einzelnen (Swing, mit Funding, 06.10.)

| | Neu im Trend | Donchian 20/10 |
|---|---|---|
| Treffer | 49 % | 33 % |
| Entwicklung (erste 120 Tage) | −0,26R (254 Trades) | −0,23R (279) |
| Bestätigung (letzte 60 Tage) | +0,46R (334) | +0,83R (289) |
| Größter Rückgang | 80R | 126R |
| Ø Haltedauer | 8,1 Tage | 16,4 Tage |
| Gewinn aus den besten 15 % | 215 % | 242 % |
| Profit-Faktor | 1,45 | 1,54 |

- **Keine der beiden besteht die Messlatte B** (beide in der Entwicklungsphase im Minus, fast dieselbe Summe von rund −65R).
- **Pro Tag gebundenes Kapital sind beide gleich:** rund 0,019R je Haltetag. Das spricht dafür, dass beide vor allem die Marktrichtung messen. Genau das prüft der Zufalls-Maßstab.
- **Der ganze Gewinn steckt in den besten 15 % der Trades.** Frühes Aussteigen schneidet genau diese Läufer ab.
- **Daytrade „Neu im Trend" (mit Funding, 06.10.):** 528 Trades, 55 % Treffer, Entwicklung +0,12R, Bestätigung +0,08R, Rückgang 21R. Formal bestanden, aber **nur „bisher nicht widerlegt"**: Die 45 Tage liegen komplett in einer guten Phase (BTC die ganze Zeit über der Tages-EMA 100), Entwicklung und Bestätigung sind zwei Stücke derselben Rallye. TP1 wurde nur bei 1 % der Trades erreicht, der Gewinn kommt aus dem Zeit-Ausstieg.
- **Telegram meldet die Swing-Variante** (4H-Kerzen, 10 Tage); besser abgeschnitten hat die Daytrade-Variante (1H-Kerzen, 2,5 Tage). Das sind zwei verschiedene Regeln.

### Zufalls-Maßstab (06.10., 175 Märkte, 20 Durchgänge, mit Funding)

| | Zufall Ø | Spanne der 20 Durchgänge | Neu im Trend | Lage |
|---|---|---|---|---|
| **Swing** gesamt | +0,15R | +0,06R bis +0,22R | +0,15R | innerhalb |
| Swing Entwicklung | −0,07R | −0,17R bis +0,02R | −0,26R | **darunter** |
| Swing Bestätigung | +0,56R | +0,40R bis +0,71R | +0,46R | innerhalb |
| **Daytrade** gesamt | +0,10R | +0,06R bis +0,13R | +0,11R | innerhalb |
| Daytrade Entwicklung | +0,11R | +0,06R bis +0,18R | +0,12R | innerhalb |
| Daytrade Bestätigung | +0,06R | +0,01R bis +0,12R | +0,08R | innerhalb |

Rund 525 (Swing) bzw. 550 (Daytrade) Trades je Durchgang, „Neu im Trend" 588 bzw. 528.

**Urteil nach der vorab festgelegten Messlatte A: nicht bestanden, in keinem Stil.** „Neu im Trend" verdient dasselbe wie zufällige Long-Einstiege mit demselben Stop und Zeit-Ausstieg, bei Swing in der schwachen Phase sogar weniger als jeder der 20 Durchgänge. Der Vorteil gegenüber der alten Engine war also Marktrichtung plus der Rahmen aus weitem Stop und Zeit-Ausstieg, nicht der Auslöser. Auch das Daytrade-Ergebnis („bisher nicht widerlegt") erklärt sich damit: Zufall kommt im selben Zeitraum auf dieselben Werte.

**Was der Lauf zusätzlich zeigt:** Die Marktphase entscheidet alles. Dieselben Zufalls-Einstiege bringen bei Swing in den ersten 120 Tagen −0,07R und in den letzten 60 Tagen +0,56R. Wer die Phase erkennt, hat den Vorteil; welcher Einstieg, ist zweitrangig.

**Hypothese aus dem ersten Durchgang (im Nachhinein gesehen, nur ein Durchgang, auf frischen Daten prüfen):** Bei den Zufalls-Einstiegen liegt „nur BTC über Tages-EMA 100" in beiden Zeiträumen im Plus (Swing: 247 Trades, +0,20R / +0,50R). Bei „Neu im Trend" tat derselbe Filter das nicht.

**Noch offen:** Ergebnis des Zufalls-Maßstabs für Donchian (seit 8g rechenbar, Lauf des Nutzers steht aus).

### Was durchgefallen ist

- **„Neu im Trend" als Einstiegsregel** (Messlatte A, siehe Zufalls-Maßstab oben).
- **Marktphasen-Schalter nach BTC:** „Nur BTC im Trend" verschlechtert beide Regeln (Swing Neu im Trend −0,03R statt +0,15R; die ausgesiebten Trades waren die besten). „Nur BTC über EMA 100" hebt den Schnitt, die Entwicklungsphase bleibt im Minus.
- **Andere Ausstiege:** „Nach TP1 Stop auf Einstieg" und „TP1 bei 1R, dann Einstieg" bringen denselben Schnitt wie der heutige Plan; TP1 bei 1R hebt nur die Trefferquote.
- **Tages-ADX je Coin** als Filter hilft bei „Neu im Trend" nicht.
- **Score, Siegel und Short-Signale** der alten Engine trennen nicht bzw. verlieren.
- **Engine 2** (Struktur, Fib-Zone, Umkehrpunkt, Liquiditäts-Sweep) schlägt den Maßstab in keinem Stil. Einzelbefunde von dort: Der Liquiditäts-Sweep stellte fast alle Daytrade-Trades und verlor; Umkehrkerzen und die 0,5er-Zone lagen im Plus, aber mit nur 30 bis 60 Trades.

### Hypothesen (im Nachhinein entdeckt, nur auf frischen Daten prüfbar)

- Donchian aus ruhigen Phasen: Tages-ADX unter 20 beim Einstieg brachte +0,73R (247 Trades), im laufenden Trend −0,05R.
- Die besten Trades kamen, bevor BTC selbst im Trend war. Laut Recherche eher ein zu langsamer BTC-Filter als ein echter Vorlauf der Altcoins.
- „Ausbruch aus Dreieck" lag bei der alten Engine vorn (+0,22R, 108 Swing-Trades).

### Live

- **Tagebuch alte Engine (bis 05.10.):** 12 abgeschlossene Signale, alle long, Ø −0,11R, 42 % Treffer. Zu klein für Regeln.
- **Tagebuch „Neu im Trend" (seit 05.10.):** noch jung. Aussagekräftig ab 40 bis 50 abgeschlossenen Signalen.

### Recherche vom 05.10. (Bericht im Chat als Dokument)

- **Belegt nach Kosten, mittlere Stärke:** Filter auf das Momentum des Gesamtmarkts über rund 28 Tage (Longs nur in Aufwärtsphasen) · volatilitätsabhängige Positionsgröße · Donchian-Ensemble mit nachlaufendem Stop. Beide Hauptstudien sind nicht begutachtet und warnen vor zu optimistischen Ergebnissen.
- **Nicht belegt:** 20-Wochen-SMA, 21-Wochen-EMA, Bull Market Support Band als eigene Signale · Altseason und BTC-Dominanz als Timing · Marktbreite bei Krypto · Einstieg nach Retest (Aktien-Statistik spricht eher dagegen) · Funding als kurzfristiges Signal · Open Interest · hohes Ausbruchsvolumen.
- **Größe zählt:** Momentum sitzt bei großen, liquiden Coins; kleine Coins drehen schon auf Wochenbasis.
- **Haltedauer:** Stunden eher Rückkehr zum Mittel, 1 bis 4 Wochen Momentum, darüber Umkehr.
- **Vorgehen:** längere Datenbasis (Binance ab 2020), wenige vorab festgelegte Kandidaten, Kosten vollständig, nachlaufenden Stop statt fester Haltedauer testen.

### Peter Brandt (Tabelle seines Handelskontos, selbst berichtet, und Nachlese)

Rund 54 % Treffer, Gewinne im Schnitt viermal so groß wie Verluste, rund 80 % des Gewinns aus den besten 15 % der Trades, Verlust je Fehltrade rund 0,16 % vom Konto. Methode: waagrechte klassische Chartmuster im Wochen- und Tageschart, Einstieg am Ausbruch, Risiko 0,6 bis 0,7 % pro Trade, kein Aufstocken, „Last Day Rule" für den Stop, 3-Tage-Trailing-Stop für den Ausstieg. Nach eigener Aussage liegt der Vorteil im Risiko-Management, nicht im Muster.

### Telegram-Signalgruppen (Screenshots des Nutzers)

Trefferquoten von 85 bis 91 % entstehen durch nahe Ziele und weite Stops, gezeigt werden nur Gewinner. Kein Leistungsnachweis; keine API-Schlüssel, keine Zahlungen. Brauchbar: Setup „Ausbruch mit Retest", „nach TP1 Rest auf Einstieg" (gemessen: kein Unterschied), Zeile „letzte 10 / 20 Signale" mit echten Tagebuch-Zahlen samt Verlierern.

---

## 11. Messlatten und vorab festgelegte Folge

### Methoden-Prüfung von außen (06.10. abends, vom Nutzer veranlasst)

Der Nutzer hat bezweifelt, dass die gewachsene Testreihe richtig aufgebaut ist, und den Prüfauftrag (`PRUEFAUFTRAG-BACKTEST.md`) von einer anderen KI mit Quellen prüfen lassen (Perplexity). Einordnung durch Claude:

**Trifft zu und wird übernommen:**
- **Die Schlussfolgerung war zu stark formuliert.** Richtig ist: **„Kein nachweisbarer Vorteil unter diesen Bedingungen"**, nicht „die Regel ist Zufall". Dasselbe gilt umgekehrt für die Plus-Ergebnisse (+0,15R, Donchian +0,31R): Auch sie sind statistisch nicht abgesichert. Chartanalyse als solche ist damit weder widerlegt noch belegt.
- **Effektive Stichprobe:** 175 Märkte laufen gemeinsam. 588 Trades entsprechen eher 60 bis 180 unabhängigen Beobachtungen; die Unsicherheit eines Mittelwerts liegt grob bei ±0,3R und mehr.
- **Ein einziger Zeitraum mit einem Phasenwechsel**, eine mehrfach angesehene Bestätigungsphase, viele Vergleiche ohne Korrektur.
- **Zeitliche Verteilung:** Die Regel stieg anders über die Zeit verteilt ein als der Zufall (254 zu 334 gegen 346 zu 179). Ein fairer Zufalls-Vergleich würfelt mit derselben zeitlichen Verteilung.
- **20 Durchgänge sind wenig**; mehrere hundert bis tausend sind besser.
- **Nötig:** 3 bis 5 Jahre Historie mit mindestens drei verschiedenen Marktphasen, ein fest weggeschlossener Schlusszeitraum, der nur einmal angesehen wird, eine vorab festgelegte kurze Liste von Hypothesen, Unsicherheitsangaben über Zeitblöcke.

**Trifft nicht zu oder ist ungenau:**
- Der empfohlene „Permutationstest" (die Ergebnisse der Regel untereinander mischen) ändert den Mittelwert nicht und prüft so nichts. Gemeint sein kann nur: Einstiegszeitpunkte zufällig verschieben.
- Unser Zufalls-Vergleich zieht keine einzelnen Kerzen neu, er wählt Einstiege im echten Kursverlauf. Die Zeitstruktur bleibt erhalten; der Einwand „Block-Bootstrap statt Zufalls-Kerzen" trifft ihn nicht (für Unsicherheitsangaben sind Zeitblöcke trotzdem richtig).
- Mehrfachvergleiche machen falsche **Treffer** wahrscheinlicher. Unser Befund ist aber, dass **nichts** besteht; eine Korrektur macht das Bestehen schwerer, nicht leichter. Die Beweislast bleibt bei der Regel.
- Die Quellen sind überwiegend Blogs; die Aussagen decken sich aber mit der bekannten Fachliteratur (White, Reality Check; Bailey und López de Prado, Deflated Sharpe; Harvey, Liu, Zhu).

**Folge:** Auf 180 Tagen werden keine weiteren Regeln mehr „entschieden". Erst lange Historie, dann ein **vorab geschriebener Testplan** (siehe Reihenfolge). Ergebnisse auf 180 Tagen heißen ab jetzt „Hinweis".

**Messlatte A, besser als Zufall:** Die Regel liegt in **beiden** Zeiträumen über der Spanne des Zufalls-Maßstabs (schwächster bis stärkster von 20 Durchgängen, dieselben Märkte, derselbe Stil).

**Messlatte B, verdient Geld:** im Schnitt **und** in beiden Zeiträumen im Plus, mindestens ca. 300 Trades.

**Scharf wird nur, was A und B besteht.** A allein heißt nur: Der Auslöser ist besser als Würfeln; die Regel kann in der schwachen Phase trotzdem Geld verlieren.

**Vorab festgelegte Folge (vom Nutzer am 06.10. bestätigt, bevor das Ergebnis da war):** Liegt „Neu im Trend" in einem der beiden Zeiträume innerhalb oder unter der Zufalls-Spanne, gilt der Vorteil als **Marktrichtung**, nicht als Leistung der Regel. Dann gelten die Signale als **Beobachtung**, und der Schwerpunkt der Arbeit geht in die **Erkennung der Marktphase mit langer Historie** (Binance). **Abweichung des Nutzers vom Vorschlag der zweiten Meinung:** Einstiegsregeln werden trotzdem weiter getestet (Kandidaten in Abschnitt 14), jede nach A und B.

**Weitere feste Regeln:** Regeln vor dem Test festlegen · auf späteren, unbenutzten Daten prüfen (die Bestätigungsphase der 180 Tage wurde inzwischen bei jedem Vergleich angesehen und gilt nicht mehr als unbenutzt; frisch sind nur lange Historie und Live-Tagebuch) · Long und Short getrennt · Gebühren, Funding, später Slippage einrechnen · jede Änderung an Signalen mit Versionsschnitt im Tagebuch · keine Trefferquoten-Versprechen.

**Die Folge ist am 06.10. eingetreten:** „Neu im Trend" liegt in keinem Zeitraum über der Zufalls-Spanne (Abschnitt 10); nach der Methoden-Prüfung genauer: **kein nachweisbarer Vorteil unter diesen Bedingungen**. Damit gilt: Die Telegram-Signale sind **Beobachtungen**, keine geprüften Einstiege. In 8h bekommen sie diese Bezeichnung in App und Telegram. Der Schwerpunkt geht in die Erkennung der Marktphase mit langer Historie (Binance, Merker, Zyklus-Kompass). Einstiegsregeln werden weiter getestet, jede zuerst gegen ihren eigenen Zufalls-Maßstab.

**Was trotzdem trägt:** der Rahmen aus weitem Stop, kleinem Risiko, Verkauf in Teilen und Laufenlassen (eigene Statistik des Nutzers, Brandt, Recherche) und das Bankroll-Management aus 8e.

**Sachlicher Stand für das Handeln:** Solange nichts A und B besteht und das Live-Tagebuch jung ist, bleibt die kleinste Risiko-Stufe die passende Wahl.

---

## 12. Gültige Reihenfolge

**Reihenfolge am 06.10. abends vom Nutzer geändert („so einfach und so schnell wie möglich, so valide wie nötig"):** erst der **Testplan** (erledigt: `TESTPLAN.md`, vom Nutzer am 06.10. um 22:12 bestätigt, seitdem fest; **gehört zusammen mit diesem Masterplan in jeden neuen Chat**), dann **Binance** (Punkt 4, nächster Bau-Schritt), dann **Umstellen** (Punkt 1). Binance ist vom iPhone des Nutzers aus erreichbar (Test-Adresse im Browser geprüft, 06.10.); offen ist, ob die App selbst laden darf. Der Nutzer hat ein Binance-Konto; es wird nicht gebraucht, und API-Schlüssel kommen nie in App oder Repository.

**Stand:** 8j (Änderung 1: neuer Zufalls-Vergleich) ist gebaut, noch nicht eingespielt. Danach 8k: die Regeln 1, 2, 3, 4 und 6 (in 8i und 8j steht dafür teils noch „8j“). Ursprünglicher Wortlaut: die sechs Regeln aus dem Testplan als Engines auf der langen Historie (Paket 8i), danach „Umstellen“.

1. **Umstellen** (Nummer wird beim Bau vergeben; hieß erst 8g, dann 8h; fasst den Wächter an: ein Tag Abstand zu 8e, also frühestens 07.10.; vom Nutzer bestätigt, dass es direkt nach „Geld schützen" kommt):
   - Heiße Coins und das Kopf-Etikett im Signalgeber auf „Neu im Trend". Telegram und Heiße Coins melden **beide Varianten, getrennt gekennzeichnet:** „Trendfolge · Swing" (Wechsel auf 4H, Ausstieg nach 10 Tagen) und „Trendfolge · Daytrade" (Wechsel auf 1H, Ausstieg nach 2,5 Tagen), eigenes Kennzeichen je Variante im Tagebuch. Stop und Ziele sind bei beiden gleich. Ein Coin, ein Signal: Welche Variante zuerst auslöst, gilt. **Die Regel ist beim Zufalls-Maßstab durchgefallen: Die Signale heißen in App und Telegram „Beobachtung"** (Wortlaut vor dem Bau mit dem Nutzer abstimmen).
   - **Erinnerung zum Zeit-Ausstieg** per privatem Telegram (fest zugesagt, nicht noch einmal verschieben; vorher im Code prüfen, was der Wächter für offene Positionen schon meldet und wie Position und Signal verknüpft sind).
   - **Schatten-Modus:** neue Regeln schreiben still ins Tagebuch, ohne Meldung im Kanal. Erster Kandidat: Donchian 20/10.
   - **Meldung nach einer Pause:** Der Wächter sagt privat, wie lange er still war.
   - Schalter zum Zurückdrehen, Versionsschnitt im Tagebuch. Vorher prüfen, ob der Wächter die zusätzlichen 1H-Abrufe in 14 Minuten schafft.
2. ~~Kleines Mess-Paket: Zufalls-Maßstab für Donchian, Messlatten A und B getrennt~~ erledigt in 8g.
3. **Testplan vorab schreiben (kein Code, zusammen mit dem Nutzer, vor dem ersten Lauf auf langer Historie):** **sechs Hypothesen (am 06.10. abends mit dem Nutzer festgelegt, Liste damit geschlossen):** (1) horizontaler Widerstand bzw. Ausbruch mit Retest · (2) Fibonacci-Rücklauf mit Reaktion · (3) VWAP · (4) SMC, genau ein Baustein: **Liquidity Sweep** (vom Nutzer gewählt; Hinweis aus Engine 2: der dortige Sweep-Auslöser verlor im Daytrade, das war aber eine andere Definition auf 180 Tagen und entscheidet nichts) · (6) **Order Block als Unterstützung** (Rücksetzer in einen bullischen Order Block, vom Nutzer ergänzt; als eigene Hypothese geführt und nicht in (1) versteckt; Order Blocks als Widerstand betreffen Ziele und Ausstiege und sind bei reinem Long-Test kein Einstieg, sie kommen später als Filter „kein Long direkt unter einem bärischen Order Block" in Frage) · (5) von Claude gewählt: Marktphasen-Filter „28-Tage-Momentum des Gesamtmarkts" (Longs nur bei positivem Momentum; laut Recherche der am besten belegte Baustein und die einzige Hypothese, die die Marktphase selbst prüft). „Neu im Trend" und Donchian laufen als Vergleichsregeln mit, zählen aber nicht als neue Kandidaten. Jede Hypothese bekommt eine fest beschriebene Regel ohne Nachjustieren; der genaue Wortlaut wird im Testplan mit dem Nutzer festgelegt · Daten in Entwicklung, Prüfung und einen **weggeschlossenen Schlusszeitraum** teilen, der nur einmal angesehen wird · Zufalls-Vergleich mit derselben zeitlichen Verteilung der Einstiege und mehreren hundert Durchgängen · Unsicherheit über Wochenblöcke angeben · vorher festlegen, was als bestanden gilt und wann abgebrochen wird.
4. **Binance als zweite Datenquelle** (Voraussetzung für den Testplan): lange Historie ab 2020 für alle Vergleiche und frische Daten; Marktdaten-Adresse `data-api.binance.vision`, `/api/v3/klines`, ohne Schlüssel; Namens-Übersetzung (z. B. kPEPE → 1000PEPE bzw. PEPEUSDT mal 1000), Hyperliquid-eigene Coins nur aus Hyperliquid; Erreichbarkeit aus Deutschland prüfen.
4. **Marktphase messen:** fünf Merker je Backtest-Trade: 28-Tage-Momentum des Gesamtmarkts (bester Filter laut Recherche) · Wochentrend des Coins (20-Wochen-Schnitt) · Marktbreite (nur behalten, wenn sie zusätzlich etwas erklärt) · relative Stärke gegen BTC über 30 Tage · Coin-Größe nach Tagesumsatz. Dazu BTC gegen das Bull Market Support Band und die **echte Slippage aus dem Tagebuch** (Abstand Signalkurs zu tatsächlichem Einstieg).
5. **VWAP und SMC** als Anzeige im Chart und als Messung im Backtest („mit Beleg" gegen „ohne Beleg"). VWAP nach dem Vorbild „VWAP Periodic Close" (LuxAlgo): VWAP je Periode (Tag, Woche, Monat, Quartal, Jahr), Schlusswert am Periodenende als waagrechte Linie, Quelle HLC3. Eigene Umsetzung, kein kopierter Code. Volumen aus Hyperliquid-Kerzen, die Linien weichen deshalb leicht von TradingView ab. Als Regel erst nach bestandenen Messlatten.
6. **Zyklus-Kompass** (Abschnitt 15).
7. **Finale Schönheits-OP:** Icon-Tausch auf dem Home-Bildschirm zusammen mit einer Sicherung zum Wiederherstellen der App-Daten, dazu die Politur-Liste.

---

## 13. Sammelliste, Politur und Halde

### Sammelliste (noch keinem Paket zugeordnet)

- Echter Funding-Verlauf je Coin statt der Pauschale; Slippage in den Backtest-Kosten.
- 3-Tage-Trailing-Stop nach Brandt als Ausstiegs-Variante (Tag mit dem höchsten Hoch merken; Schluss unter dessen Tief = Setup-Tag; Unterschreiten des Setup-Tag-Tiefs = Ausstieg). Last Day Rule nur im Backtest gegen den 2-ATR-Stop messen, nicht übernehmen.
- Backtest-Auswertungen: Erwartungswert-Formel, „Wann eingestiegen?" (Wochentage, Sessions), Haltedauer bis TP1 / bis Stop, Ziel-Varianten je Stil.
- Wünsche des Nutzers zu den Signalen: Ziele beim Swing zu eng, Chance/Risiko mind. 1 : 2, Haltedauer zu lang, frühere Einstiege (Kandidat Rücksetzer ins Golden Pocket).
- Bedienung: Ampel 🟠 „Wendesignal · beobachten", „Auf der Lauer"-Liste, Trade-Karte ohne Signal, Chance/Risiko ab jetzt in der Positionskarte, Ziele eigener Pläne mind. 2R, Zeile „letzte 10 / 20 Signale" im Telegram-Signal.
- Steuer-Bereich (Deutschland, keine Kirchensteuer): Perps als Termingeschäfte, Abgeltungsteuer plus Soli, Sparer-Pauschbetrag einstellbar, Funding wählbar, Jahr wählbar, USD und EUR, PDF zum Teilen; nur auf dem iPhone, nie ins Repository; Hinweis „keine Steuerberatung". Rechtsstand vor dem Bau prüfen.
- **Sell-Block über dem Kurs (Regel des Nutzers, 06.10.):** Er geht keinen Long ein, wenn über dem aktuellen Kurs ein großer bärischer Order Block liegt, auch nicht, wenn er sich in einer höheren Zeiteinheit „versteckt". Für die Signale später neu besprechen. Vorschlag: zuerst als **Information** an jeder Beobachtung („Platz nach oben: x R bis zum nächsten Sell-Block, Zeitebene"), geprüft über 4H, Tag und Woche; als Merker im Backtest mitschreiben; erst nach Messung als Filter.
- Korrelation offener Positionen als Ergänzung zum Gesamt-Risiko.
- Hebel-Vorschau als Was-wäre-wenn am Trade-Weg einer offenen Position.
- Ledger-Liste: nach GRIFFAIN evtl. weitere Märkte, über die Suche ergänzen.

### Politur-Liste (vom Nutzer ausdrücklich gewünscht: darf nicht vergessen werden)

10. Backtest aus der Menüleiste hinter ⚙️ (Leiste dann vier Punkte).
11. Ziele im Positions-Blatt als eine Zeile „Ziele ändern ›" statt vier Knöpfen.
12. Konto-Tab: Kosten und Statistik zum Aufklappen.
13. Wallet-Adresse und System-Seite in ⚙️ (heute nur über den „Live"-Punkt).
14. Fußnote bei Heiße Coins hinter ⓘ.
15. Tab-Wechsel merkt sich die Stelle.
16. Ästhetischer Blick auf die ganze App, sobald Screenshots anfallen.
17. Korrelation offener Positionen (siehe Sammelliste).
18. ~~Test „Nachziehen nach Struktur" unabhängig vom Ausstiegsplan~~ erledigt in 8c.
- Markierung „▼ 1×" am Hebel-Regler ragt bei 1× über den linken Rand.

**Vom Nutzer abgelehnt (nicht wieder vorschlagen):** „Max. Drawdown" umbenennen, Zeile „aktuell x % unter dem Hoch" (06.10.: „lass alles wie es ist"). Lightweight Charts als Fremdbibliothek. Mehr Indikatoren ohne Messung.

### Auf Halde (ändert Signale, wartet auf Messlatten und frische Daten)

Signal-Vorlauf verkürzen · Konfluenz-Stufen A/B/C · Golden Pocket 0,618 bis 0,65 mit Reaktion · Mindest-Stop der alten Engine anheben · Nadaraya-Watson (ohne Repainting) als Überdehnungs-Filter, nie gegen die Struktur · SMC-Bausteine (Order Blocks, FVG, Premium/Discount, Weak/Strong High/Low, gleiche Hochs/Tiefs) · MACD-Divergenz · Auswertung pro Markt · Korrektur-Filter für Longs (Anlass ALGO, SKY) und Korrektur-Short · Funding/Open-Interest-Bremse · Bär-Modus.

---

## 14. Strategie-Kandidaten

Eigene Recherche des Nutzers (sechs Kandidaten, jeweils mit „Evidenz" und „Schwachstelle"):

| Nr. | Kandidat | Stand |
|---|---|---|
| 5 | Donchian-Ausbruch 20/10, Stop 2 ATR | gemessen (Abschnitt 10), läuft als Nächstes im Schatten-Modus |
| 6 | Trend-Pullback mit Strukturbestätigung (Tages-EMA 21/55, 4H-Schluss über dem Rücklaufhoch, Stop unter dem Rücklauftief) | nächster Test-Kandidat; nah an Engine 2 |
| 1 | Scalp Trend-Pullback (15M-Trend, EMA 21/55, Session-VWAP) | zurückgestellt (Wächter alle 15 Min., Scalp im Bereich der Slippage) |
| 2 | Bollinger-Range-Reversion | zurückgestellt (braucht Seitwärts-Erkennung) |
| 3 | Opening-Range-Breakout | schwach für Krypto (kein Handelsstart) |
| 4 | Momentum zum Handelsschluss | passt nicht zu Krypto |

Weitere Kandidaten aus den Messungen: Ausbruch mit Retest (Muster-Erkennung `chartPatterns` vorhanden; Recherche spricht eher für den direkten Ausbruch) · Rücksetzer im Aufwärtstrend nur mit der Umkehrpunkt-Regel des Nutzers (`reversalPoint` in `core-engine2`) · größenabhängiger Einstieg (Ausbruch bei großen, Rücksetzer bei kleinen Coins) · Donchian nur aus ruhigen Phasen.

Jeder Kandidat: Regel vorab festlegen, als eigene Backtest-Engine, nach A und B bewerten, bei Erfolg zuerst in den Schatten-Modus.

---

## 15. Zyklus-Kompass (geplant)

**Rahmen des Nutzers.** Zeitebenen: Monat/Woche = übergeordnete Marktphase · Tag = Rotation und Trendbestätigung · 4H und kleiner = Einstieg, kein Beweis für einen neuen Zyklus.

Sieben Phasen:
1. **Akkumulation / Bodenbildung:** keine nachhaltigen neuen Tiefs, Wochenrange, erste höhere Tiefs. Kleine Einstiege nach bestätigtem Ausbruch.
2. **Bitcoin-Führung:** BTC steigt, Dominanz steigt, Alt/BTC-Paare fallen. BTC priorisieren; Altcoins müssen relative Stärke zeigen.
3. **Frühe Rotation:** BTC stabil, mehrere liquide Altcoins brechen gegen BTC aus, Marktbreite bessert sich.
4. **Breite Altcoin-Season:** viele Altcoins steigen in USD und schlagen BTC. Stärkste liquide Coins handeln, nicht die bisherigen Verlierer.
5. **Sektorrotation:** mehrere Coins eines Sektors schlagen über 7/30 Tage BTC und den Altcoin-Markt.
6. **Euphorie / Distributionsverdacht:** parabolische Anstiege, weniger Coins auf neuen Hochs, Fehlausbrüche, überfüllte Hebelpositionen. Gewinne staffeln, Risiko reduzieren.
7. **Altcoinwinter / Risk-off:** breite Altcoin-Schwäche. Kapital schützen, weniger handeln.

**Entscheidungsregel des Nutzers:** Übereinstimmung von Preisstruktur in USD, relativer Stärke gegen BTC, Marktbreite über viele Coins und Sektoren, Volumen und Liquidität. Bei Widerspruch: Übergangsphase, kleinere Positionen oder abwarten. BTC → große Altcoins → kleinere Altcoins ist eine mögliche Rotation, kein Pflichtablauf. Der Halving-Kalender allein ist kein Signal.

**Umsetzung:** Start mit drei Zuständen (grün, gelb, rot), die sieben Phasen als Erklärung dahinter · Anzeige „x von 4 Signalen stimmen überein" je Coin, zunächst nur als Information · Kern der Ampel: BTC gegen das Bull Market Support Band (20-Wochen-SMA und 21-Wochen-EMA) im Wochenchart: grün = Wochenschluss über steigendem Band, gelb = erster Wochenschluss darunter (Risiko halbieren, Hinweis „Teil der Gewinne sichern"), rot = zwei Wochenschlüsse darunter und Band dreht · aus Hyperliquid rechenbar: Preisstruktur, relative Stärke, Marktbreite, Funding teilweise · nicht ohne Weiteres: Sektoren (bräuchte eine Liste von Hand), Historie von Dominanz und Altcoin-Marktwert, Spotvolumen · Dominanz und Altseason nur als Beschreibung, nicht als Auslöser · Prüfung mit Binance-Historie an 2018 und 2022 · eigener Knopf „Rückzug jetzt", keine scharfe Tages-Notbremse.

---

## 16. Setup-Katalog (Trading-Handschrift des Nutzers)

Vorgehen beim Chart: Struktur zuerst → Konfluenz (Key Level, RSI Tag/Woche, MACD bzw. Divergenz, Fib, SMC-Zonen, Nadaraya-Band) → Bestätigung aus der höheren Zeitebene → Ziele an SMC-Zonen, die auf Fib-Levels liegen. **Mehrheit der Faktoren** statt „alles oder nichts". **Umkehrpunkt-Regel:** Umkehrkerze (Doji, Dragonfly, Hammer, Engulfing), danach schließt der Körper der nächsten Kerze jenseits des Körpers der Kerze vor der Umkehrkerze.

1. **VIRTUAL, ✅ Ausbruch + Retest (mit Trend):** horizontaler Widerstand mehrfach getestet, Ausbruch mit Momentum, zwei Retests von oben, Einstieg am Retest, Stop unter dem Retest-Tief.
2. **ZEC, 1D, Konfluenz-Short (Kontra):** Fib-Extension 2,618 + RSI Tag/Woche überkauft + MACD Tag dreht + Weak High + Key Level + NW ▼. Ziele: SMC-Zonen auf Fib. Stop über dem Weak High.
3. **Konfluenz-Long (Spiegel zu 2):** Golden Pocket + RSI überverkauft + MACD dreht + Discount/Order Block/FVG/Strong Low + Key Level + NW ▲.
4. **SUI, 1D/4H, Short mit übergeordnetem Trend:** altes Hoch / Strong High + RSI überkauft + MACD-Divergenz (4H) + NW ▼ auf 1D und 4H.
5. **ICP, 4H, ❌ Negativbeispiel:** sieben NW-▼ im Aufwärtstrend nach bullischem BOS. Lehre: NW nur mit der Struktur; eine Serie von ▼ bei neuen Hochs zeigt Trendstärke.
6. **NIL, 4H, Golden-Pocket-Reaktion:** Rücksetzer nach starkem Impuls ins Golden Pocket, RSI tief; Auslöser erst bei Reaktion. Ziele 1,0 und 1,618.
7. **DASH, 4H, ✅ Lehrbuch-Long:** nach HH und Weak High Rücksetzer in die Fib-Zone über Strong Low, NW ▲, RSI abgekühlt. Einstieg bei Reaktion.
8. **HBAR, 4H, ✅ Wunsch-Signal:** Spike ins Weak High, zügiger Rücksetzer ins Golden Pocket über dem Ausbruchsniveau. Long erst bei Reaktion in der Zone.
9. **ALGO, 1D, ❌ Fehlsignal der alten Engine:** Long Score 89 genau ins Strong High / bärischen Order Block, RSI 1D 82, NW ▼.
10. **SKY, 4H, ❌ Fehlsignal der alten Engine:** Long Score 80 in Weak High / Angebotszone, RSI ~78, NW ▼.
11. **BTC, PUMP, ETH, Daytrade:** drei Long-Signale der alten Engine kurz vor einem Marktanstieg; ETH erreichte TP2, BTC und PUMP endeten am Stop.

Hinweis: Repainting-Signale sehen im Nachhinein besser aus als live; gerechnet wird nur auf abgeschlossenen Kerzen.

---

## 17. Neustart mit einem neuen Claude-Chat

1. Diesen Masterplan **und `TESTPLAN.md`** anhängen (Dateien-App → lange drücken → Teilen → Claude).
2. Den aktuellen Code als ZIP anhängen: `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen, herunterladen, in der Dateien-App lange drücken → Teilen → Claude.
3. Falls vorhanden: den letzten Export („📤 Daten für Claude") und das Wolfskopf-Bild müssen nicht mehr mit, die Icons liegen im Repository.
4. Diesen Text als erste Nachricht:

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk" gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang sind der Masterplan und der aktuelle Code. Bitte lies beides und arbeite genau so weiter, wie es in Abschnitt 2 steht. Hol dir zuerst Datum und Uhrzeit von der Uhr, prüf dann, ob die Versionsnummer im Code zum Masterplan passt (8j), und lass die Tests laufen (852). Der Testplan ist bestätigt und fest; bitte nichts daran ändern. Danach geht es nach der Reihenfolge in Abschnitt 12 weiter (nächster Schritt: Paket 8k mit den Regeln 1, 2, 3, 4 und 6 aus dem Testplan; `TESTPLAN-PROTOKOLL.md` gehört mit in den Chat): erst den Bestand prüfen und mir kurz sagen, was du vorhast. Aussagen über die App bitte nur, nachdem du im Code nachgesehen hast. Keine Disclaimer, ich weiß, dass ich auf eigenes Risiko handle.
