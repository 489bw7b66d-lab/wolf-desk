# Wolf Desk – Masterplan

Stand: 08.10.2026, 11:45 · Code: Etappe 8r · 1.099 Tests · auf dem iPhone geprüft bis 8o (1.069 von 1.069 am 08.10. um 09:20), 8p bis 8r noch nicht · **Testplan 1 abgeschlossen: kein Kandidat besteht. Richtungsentscheidung vom 07.10., 16:11: keine weiteren Einstiegsregeln auf Vorteil testen, die App wird zum Setup-Finder (Hinweisgeber)**

Dieses Dokument ersetzt alle früheren Fassungen des Masterplans. Es enthält alles, um Wolf Desk weiterzuentwickeln oder wiederherzustellen, auch in einem neuen Chat.
Es enthält bewusst **keine Zugangsdaten** (Token, Wallet, Chat-IDs) und **keine Kontobeträge**, weil das Repository öffentlich ist.

---

## Übergabe (07.10.2026, 16:30, nach Testplan 1 und der Richtungsentscheidung)

**Was am 07.10. geschah:**
- **Testplan 1 ist durchgemessen, kein Kandidat besteht** (Abschnitt 10, Urteil im `TESTPLAN-PROTOKOLL.md`). Die Regeln 1, 2, 3, 4 und 6 liegen in der Entwicklung auf dem Wert des Zufalls (Plätze 48, 46, 62, 1 und 65 % statt 95 %), Regel 5 fiel in der Prüfung durch. Die Prüfung der fünf Regeln wird nicht geöffnet, der Tresor bleibt zu.
- Der Weg dahin: Lesarten 11 bis 16, Änderung 2 (Grundsatz Körper), Änderung 3 (Regel 1 als schmales 4H-Band), je Regel eine Blindprobe ohne Coin, Datum und Ergebnis. **Alle fünf Regeln hat Jensen in der Blindprobe abgenommen**: Sie finden, was er im Chart sucht. Pakete 8k, 8k1, 8k2.
- **Richtungsentscheidung von Jensen (16:11), Wortlaut in Abschnitt 12:** keine weiteren Einstiegsregeln auf Vorteil testen · die App wird ein Hinweisgeber, der ihm die Suche erspart (**Setup-Finder**), die Analyse macht er von Hand · Bausteine werden nicht nach Backtest-Ergebnis ausgewählt · jede Meldung heißt „Beobachtung“ und behauptet keinen Vorteil.
- **Entwurf Testplan 2 „Marktphase“** liegt vor (`TESTPLAN-2-ENTWURF.md`, noch nicht gültig, nicht im Repository). Die zweite Meinung hat Einwände (Verschiebe-Test, Phasen von mindestens 10 Tagen, Hürde 98 %); **ihr Wortlaut liegt Claude noch nicht vor.** Die Recherche (`RECHERCHE-MARKTPHASEN.md`) hat Jensen um 16:25 geschickt; sie stützt einen schlichten Trendzustand als Schalter und rät, die Schalter nicht nach der Recherche auszutauschen.

**Bestand, am 07.10. um 16:15 im Code nachgesehen (für den Setup-Finder):**
- Die fünf Regeln stehen in `core-ltrules.js` (`signalsOf(rule, M)`), der Markt wird mit `prepare(coin, daily, g)` aus `core-longtest.js` vorbereitet. Beides ist unabhängig von Binance und lässt sich mit Hyperliquid-Kerzen füttern. **Die Regeln nicht anfassen: Es ist genau die Fassung, die Jensen abgenommen hat.**
- Der Wächter (`scan()` in `watcher.js`) lädt heute für jeden handelbaren Markt über dem Mindestumsatz die Tageskerzen (260 Stück) und nur für Märkte im Aufwärtstrend die 4H-Kerzen (260 Stück, rund 43 Tage). Alle fünf Regeln gelten nur im Tagestrend aufwärts: Die Zahl der Abrufe bliebe also gleich, aber Regel 1 braucht 180 Tage 4H-Kerzen (rund 1.080 statt 260 je Markt). **Ob das in 14 Minuten passt, ist nicht gemessen.**
- Einen bärischen Order Block („Platz nach oben“) gibt es im Code noch nicht. Er braucht eine eigene Beschreibung und Jensens Abnahme am Bild.
- Hyperliquid ist aus Claudes Arbeitsumgebung nicht erreichbar (wie Binance). **Aktuelle Funde kann Claude nicht selbst zeichnen; die Vorschau muss in der App laufen.**

**Nächste Schritte:**
1. **8m und 8n laufen auf dem iPhone (08.10., 06:50). Pakete 8n1 und 8o laufen (09:20). Pakete 8p und 8q sind gebaut** (Stop-Check gegen die Tages-ATR, Auswertung nach Stop-Abstand, Diagnose der langen Index-Historie; Datensicherung), noch nicht auf dem iPhone (das ZIP 8q enthält 8p). **Jensen am 08.10., 10:02: Damit ist die App „erstmal fertig“, er konzentriert sich aufs Traden; als Nächstes am liebsten das Erscheinungsbild (Schönheits-OP, mit Datensicherung vorab).** Jensen überlässt Claude die Reihenfolge (10:14). **Festgelegt: 8q Datensicherung → „Umstellen“ → Erscheinungsbild. Jensen hat um 10:29 entschieden, „Umstellen“ sofort zu bauen (bewusst ohne den Tag Abstand der Tempo-Regel): Paket 8r.** Damit ist die App nach seinen Worten „erstmal durch“; als Nächstes das Erscheinungsbild. Befund auf echten Daten (07:07): Die Order-Historie liefert die Stops (bei 45 von 49 Trades gefunden), `crossed` steht in den Fills. Die Ergebnisse der Auswertung bleiben auf dem iPhone und stehen bewusst nicht in diesem öffentlichen Dokument. Jensen spielt es ein und sagt, ob die Kopfzeile „Markt“ zu seinem Bild von TOTAL2 und OTHERS passt; dann im Tab Konto „Trades auswerten“ und Screenshot der Karte (enthält keine Beträge). Jensen hat am 07.10. um 23:25 den ersten Trade aus dem Finder eröffnet (JTO, über „In Trade-Karte übernehmen“, Rahmen-Stop, 1 % Risiko); nach seinen Worten arbeitet er mit den Ansichten „ab 2“ und „ab 3 Bausteinen“.
2. Offene Punkte aus der Abnahme einarbeiten (eine Korrekturrunde je Punkt).
   **Inhalt von Paket 8m (reine Anzeige, kein Wächter; von Jensen am 07.10. zwischen 20:33 und 22:32 festgelegt, gebaut um 23:40):**
   - **„Hyperliquid-Ledger-Perp-Index“** aus den Tageskerzen der handelbaren Märkte (Ledger-Liste, Hyperliquid-Perpetuals; nicht Binance-Spot, nicht die 50 Test-Märkte): Alt-Index = alle ohne BTC, gleichgewichtet; Small-Index = Alt-Index ohne die zehn größten nach 30-Tage-Umsatz (Rangliste je Tag neu aus den Kerzen). Neue Märkte erst nach 110 Tagen Historie. Historie so lang wie möglich (Hyperliquid so weit zurück abfragen, wie es liefert; ungeprüft, wie weit das reicht). Ersatz für TOTAL2 und OTHERS, die nicht abrufbar sind; der gleichgewichtete Index ähnelt eher OTHERS.
   - **Markt-Bias als Kopfzeile der Beobachtungen, drei Ebenen:** BTC-Trend · Trend des Alt-Index · Small-Index gegen Alt-Index als Breite. Dazu „Platz nach oben“ für den Gesamtmarkt über die Sell-Blöcke des Alt-Index (Tag, Woche). **Gestrichen von Jensen (22:29 bis 22:32): BOS, CHoCH, Highs und Lows (Weak High, Strong Low) und die Trendlinie.** Er nutzt sie auch bei LuxAlgo nicht; die Ergänzung von 20:51 war missverständlich.
   - CoinGecko liefert in der App nur den Stand von jetzt (Gesamt-Marktkap., 24h, Dominanz BTC und ETH): als Zusatzzeile „Marktkap. ohne BTC“, keine Kerzenreihe.
   - **Coin-Bias je Beobachtung:** Tagestrend, Stärke gegen BTC über 30 Tage. Reihenfolge in der Zeile: Markt-Bias, Coin-Bias, Setup, Platz nach oben. Nur Information, kein Filter.
   - **Versteckte Divergenzen** im RSI (bullisch: höheres Tief im Kurs, tieferes im RSI; bärisch: tieferes Hoch im Kurs, höheres im RSI). Anlass: Jensens SUI-Chart von 20:48.
   - **Ansicht „alle geprüften Märkte“ mit Suchfeld** (in 8l1 ist ein Coin ohne Baustein und ohne Filter-Merkmal nicht ansehbar).
   - Kein neuer Schalter in Testplan 2; die drei Schalter bleiben.
   **Danach Paket 8n „Deine Trades im Detail“** (nur auf dem iPhone, nichts ins Repository): aus den Fills (90 Tage) je Trade Haltedauer, bester Stand gegen Ergebnis, Einstieg zum Kurs oder per Limit, Markt-Bias beim Einstieg (aus abgeschnittenen Kerzen nachrechenbar; `core-market.js` rechnet ihn aus BTC 40, ETH 20, Breite 25, ETH/BTC 15), Statistik „mit dem Bias“ gegen „gegen den Bias“. **Im Code geprüft: Stop und Hebel von damals stehen nicht in den Fills.** Der Stop bräuchte die Order-Historie von Hyperliquid (Abruf im Code nicht vorhanden, ungeprüft); der Hebel ist voraussichtlich nicht zu bekommen.
   **Ins Paket „Umstellen“ (Wächter):** Bias als Merker im Tagebuch, private Meldung, wenn der Bias bei offener Position dreht.
3. Danach „Umstellen“ (fasst den Wächter an, ein Tag Abstand): Telegram und Heiße Coins melden „Beobachtung“, Erinnerung zum Zeit-Ausstieg, Meldung nach einer Pause. Dabei messen, ob der Wächter die längeren 4H-Reihen schafft.
4. Testplan 2 mit den Einwänden der zweiten Meinung festschreiben und einmal durchlaufen; Ergebnis wird eine Ampel als Anzeige.
5. Exit-Plan-Werkzeug und Schönheits-OP mit Sicherung der App-Daten.

**Lehre für künftige Regeln (von Jensen selbst benannt):** Worte reichen nicht, Claude sieht seine Linien nicht. Reihenfolge deshalb: Jensen zeichnet drei bis fünf Beispiele von Hand (dazu ein, zwei Gegenbeispiele), Claude schreibt die Regel in einfachen Worten zurück, Jensen korrigiert einmal, dann Code, dann Blindprobe als Abnahme.

Hinweise für den Bau (alles zuerst im Code nachprüfen):
- `core-ltrules.js`: je Regel eine Zustandsmaschine mit `day(d)` (ein neuer Tag ist abgeschlossen) und `candle(i, d, up)` (4H-Kerze i, `up` = Tagestrend). `signalsOf(rule, M)` liefert eine Map 4H-Index → `{ mk: Merker, viz: Zeichenhilfe }`. Feste Werte in `LTR`; **In `LTR.rv` die Fassung DER Regel erhöhen, deren Code sich ändert** (dann gilt nur ihre Blindprobe nicht mehr; `ruleVer(rule)`). `trendUp` steht jetzt dort und wird vom Vergleich mitbenutzt.
- `core-longtest.js`: `RULES` (mit `blind: true` für die fünf neuen), `fireOf`, `runRule` (zählt verfallene Signale in `trades.missed`), `loadMarkets`, `marketYears`, `blindSample`, `blindOk`, `loadBlind` / `saveBlind` (`wolfdesk.ltblind`), Lücken (`wolfdesk.ltgaps`), `resultText` mit Merker-Zeilen.
- `ui-blindchart.js` zeichnet die Blindprobe als SVG-Text. `ui-longtest.js` sperrt „Entwicklung rechnen“, bis `blindOk` gilt.
- **Der Zufalls-Vergleich wird nicht mehr angefasst.** Fällt eine Regel durch, wird nicht am Würfel und nicht an der Lesart gedreht.
- Vor der Lieferung wie immer: alle Tests, verstellte Einstellungen, Sichtprüfung in iPhone-Größe, Wächter, Zeile „nicht getestet“.

**Offen beim Nutzer:** 8r einspielen (enthält 8p und 8q), danach bei GitHub unter Actions den Wächter einmal mit „Test“ starten und die erste echte Beobachtung abwarten; einmal „Datensicherung speichern“ ausprobieren; einmal „Märkte durchsuchen“ bis zum Ende laufen lassen und die Zeile unter dem Index auf der Startseite schicken (Diagnose der langen Historie) · Wortlaut der Einwände der zweiten Meinung zu Testplan 2 an Claude geben (die Recherche liegt seit 16:25 vor).

**Sachlicher Hinweis zum Konto (Export vom 07.10., 00:43, ohne Beträge):** Das Gesamt-Risiko bis zu den Stops lag bei rund 20 % vom Konto (Budget 6 %), der Tagesverlust bei rund 10 % (Grenze 5 %), bei zwei Positionen lag die Liquidation weniger als 1 % hinter dem Stop. Claude hat es am 07.10. dreimal angesprochen (zuletzt zum Export von 12:57: Gesamt-Risiko weiter rund 20 %, Tagesverlust rund 16 %, bei einer Position die Liquidation 0,1 % hinter dem Stop); Jensen hat nicht darauf geantwortet. Das ist das Muster aus der Selbstanalyse (Hebel zu hoch im Verhältnis zum Stop); der Hebel dagegen ist die Positionsgröße, nicht ein engerer Stop.

**Erste Nachricht für den neuen Chat:**

> Hallo, ich bin Jensen, nenn mich Buddy. Wir haben zusammen „Wolf Desk“ gebaut, eine Trading-PWA für Hyperliquid, komplett vom iPhone aus (Brave, Dateien-App, GitHub im Browser, keine Programmierkenntnisse). Im Anhang: MASTERPLAN.md, TESTPLAN.md, TESTPLAN-PROTOKOLL.md und der aktuelle Code als ZIP. Bitte lies die drei Dokumente ganz, zuerst den Abschnitt „Übergabe“ im Masterplan, und arbeite genau so weiter, wie es in Abschnitt 2 steht (Ton, Regeln, Lehren). Hol dir Datum und Uhrzeit von der Uhr, prüf, ob die Versionsnummer im Code zum Masterplan passt (8r), und lass alle Tests laufen (1.099). Sag mir kurz, was du vorgefunden hast und was du vorhast, bevor du baust. Stand: 8l1 ist eingespielt und abgenommen, 8m und 8n gebaut, Testplan 1 ist abgeschlossen (kein Kandidat besteht), seit der Richtungsentscheidung vom 07.10. wird die App zum Setup-Finder, die lange Historie von Binance ist geladen und eingefroren, Regel 5 ist in der Prüfung durchgefallen. Der Testplan ist seit 06.10.2026 fest, der Zufalls-Vergleich seit Änderung 1 und die Lesarten 11 bis 16 samt Änderung 2 (Grundsatz Körper) und Änderung 3 (Regel 1) seit 07.10.: bitte an allem nichts ändern. Nächster Schritt: siehe „Nächste Schritte“ in der Übergabe (Abnahme von 8m und 8n, dann „Umstellen“). Aussagen über die App nur nach einem Blick in den Code. Keine Disclaimer, ich weiß, dass ich auf eigenes Risiko handle. Keine Beträge oder Zugangsdaten in Dateien fürs Repository. Ich bin Buddy2, du bist Buddy1, und wir berichten dem Chef. 🐺

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
- **Etappen:** Jedes Update ist ein Paket mit Nummer (zuletzt 8r). Die Nummern folgen der Bau-Reihenfolge. Ein Paket, ein Thema.
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
- **Claudes Arbeitsumgebung kann mitten im Chat neu starten** (so geschehen am 07.10. gegen 00:44): Die entpackte Code-Kopie ist dann weg, gelieferte Dateien bleiben. Vor dem nächsten Bau braucht Claude dann das aktuelle ZIP.
- **Umziehen in einen neuen Chat erst bei rund 90 % Füllstand** (von Jensen am 07.10. festgelegt; häufiges Umziehen nervt). Claude sieht keine Anzeige und schätzt deshalb vor jedem Bau-Paket in einer Zeile, ob es noch passt; „umziehen“ sagt Claude erst, wenn ein Paket voraussichtlich nicht mehr ganz hineinpasst, und nennt den Grund. Eine Warnung der App zur Chat-Länge geht vor.

**Lehre vom 07.10.:** Eine Lesart mit einer Frist „danach“ immer darauf prüfen, ob die Bestätigung nach dem Einstieg liegen kann (Lesart 12, von der zweiten Meinung gefunden) · im selben Chat lag schon ein Entwurf von 8k in der Arbeitskopie, an den Claude keine Erinnerung hatte: nicht übernommen, sondern Zeile für Zeile gegen die Lesarten gelesen und neu geprüft.

**Lehren aus Fehlern (05. und 06.10.):** Datum aus dem Masterplan abgeleitet statt von der Uhr → zu Unrecht gebremst · Lage eines Bildmotivs geschätzt statt gemessen → Icon saß schief · fast zum Icon-Tausch geraten, ohne auf den möglichen Datenverlust hinzuweisen · „bestätigt" geschrieben, wo nur „bisher nicht widerlegt" stimmte · einen zugesagten Punkt (Erinnerung zum Zeit-Ausstieg) verschoben: nicht noch einmal.

---

## 3. Adressen

| Wofür | Adresse |
|---|---|
| App | `https://489bw7b66d-lab.github.io/wolf-desk/` |
| Tests | `https://489bw7b66d-lab.github.io/wolf-desk/tests.html?v=8r` |
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

## 5. Aufbau der App (148 Dateien, fast alle im Hauptordner)

**Einstellungen:** `config.js` (Empfehlungen) · `ledger-markets.js` (Ledger-Märkte, Standard für „Handelbare Märkte") · `my-settings.js` (nur die **Abweichungen** von der Empfehlung, dazu Watchlist und handelbare Märkte; von der App erzeugt, gilt auch für den Wächter). **Wichtig:** Ändert ein Paket eine Empfehlung in `config.js`, gilt der neue Wert sofort überall, wo der Nutzer keine eigene Abweichung gespeichert hat.

**Daten-Kern (`core-*.js`)**
- Schnittstelle und Konto: `core-api`, `core-stream`, `core-store`, `core-health`, `core-account`, `core-calc`, `core-positions`, `core-stops`
- Risiko: `core-risk` (Regeln, Ausstiegsplan, Hebel), `core-guard` (Stop-Check gegen ATR, Abkühlphase), `core-trail` (Stop nachziehen nach Struktur), `core-levpreview` (Hebel-Vorschau), `core-totalrisk` (Summe, wenn alle Stops greifen), **`core-riskbudget`** (8e: Ampel fürs Gesamt-Risiko, Budget für neue Trades), `core-exitcalc` (Ausstiegsrechner)
- Handel und Auswertung: `core-trades`, `core-performance` (Gewinn aus Hyperliquids PnL-Verlauf, größter Rückgang), `core-fees`, `core-patience`
- Signale: `core-indicators`, `core-signals`, `core-scanner`, `core-fib`, `core-elliott`, `core-patterns`, `core-candlesticks`, `core-confirm`, `core-trendgate` (Short-Filter), `core-feedplan`, `core-reasons`, `core-engine2`, `core-benchmark` (Maßstab als Signalgeber, Haltedauer, Tagebuch-Fenster), `core-bmtext` (Telegram-Text)
- Backtest: `core-backtest` (Simulation, Lauf), `core-btstore` (Speicher; Feldlisten `KEEP` je Trade und `compactRun` je Markt: **neue Felder müssen dort eingetragen werden, sonst gehen sie beim Speichern verloren**), `core-regime` (8c: BTC-Merker), `core-exitcompare` (8c: Ausstiegs-Varianten), `core-donchian` (8d), `core-btmetrics` (8d: Funding-Schätzung, Pareto, Haltedauer), `core-randombase` (8f: Zufalls-Maßstab), **`core-binance`** (8h: lange Historie von Binance, eigene Datenbank `wolfdesk-bn`, Protokoll in `wolfdesk.bn`), **`core-longtest`** (8i: Messmaschine für den Testplan, Ergebnisse in `wolfdesk.lt`), **`core-ltrules`** (8k: die Regeln 1, 2, 3, 4, 6 des Testplans), **`core-finder`** (8l: Setup-Finder, aktuelle Funde auf den handelbaren Märkten), **`core-sellblock`** (8l: Sell-Block und „Platz nach oben“), **`core-index`** (8m: Hyperliquid-Ledger-Perp-Index und Markt-Bias als Kopfzeile, Speicher `wolfdesk.hlindex`), **`core-tradedetail`** (8n: Deine Trades im Detail), **`core-stopcheck`** (8p: Stop-Check gegen die Tages-ATR), **`core-backup`** (8q: Datensicherung), **`core-observe`** (8r: Texte und Entscheidungen des Wächters für Beobachtung, Zeit-Ausstieg, Bias-Wechsel)
- Märkte: `core-universe`, `core-hotscan`, `core-market`, `core-watchlist`, `core-tradeable`
- Positionen: `core-path` (Trade-Weg), `core-plans`, `core-autoplan`, `core-planstate` (Plan-Ampel)
- Sonstiges: `core-settings`, `core-views`, `core-alerts` (Wächter-Logik, Tagebuch, Berichte), `core-journalmeasure`, `core-gesture`, `core-privacy`, `core-format`

**Anzeige (`ui-*.js`):** `ui-chart` + `ui-chartview`, `ui-home`, `ui-market`, `ui-feed`, `ui-views`, `ui-signals`, `ui-trade` (Trade-Karte mit Risiko-Budget), `ui-coin`, `ui-position`, `ui-performance`, `ui-testpage`, `ui-risk`, `ui-backtest`, **`ui-binance`** (8h: Zeile „Lange Historie“ im Backtest), **`ui-longtest`** (8i: Zeile „Testplan-Läufe“), **`ui-blindchart`** (8k: Kerzenbild der Blindprobe, seit 8l auch für den Finder), **`ui-finder`** (8l: Karte „Setup-Finder“ im Tab Signale), **`ui-tradedetail`** (8n: Karte „Deine Trades im Detail“ im Tab Konto), `ui-settings`, `ui-storage`, `ui-tradeable`, `ui-export`, `ui-watchlist-edit`, `ui-sheet`, `ui-swipe`, **`ui-notice`** (8e: einmaliger Hinweis nach einem Update), `ui-parts`

**Rahmen:** `index.html`, `main.js`, `styles.css`, `manifest.json`, `tests.html` + 44 Dateien `test-*.js`, `watcher.js`, `.github/workflows/wolf-watch.yml`, Icons `icon-180/192/512.png` (seit 8c der goldene Wolfskopf)

**Versionsnummer:** `index.html` hat `<meta name="app-version" content="8r">` und eine Import-Liste mit `?v=8r` je Datei. Bei jedem Update erhöhen und neue Dateien eintragen. `tests.html` führt die Test-Dateien einzeln auf: neue Test-Dateien dort importieren und an die Liste `all` anhängen. Die App erkennt neue Versionen selbst und lädt neu.

**Speicher auf dem iPhone (geht beim Neu-Hinzufügen der App sehr wahrscheinlich verloren, es gibt noch keine Funktion zum Wiedereinlesen):** Wallet-Adresse, Startkapital, Einschätzungen, Ziele, eigene Chart-Linien, Stops von Hand, Backtests, Geduld-Daten, **Stichtag und eingefrorene Marktliste der langen Historie, Ergebnisse der Testplan-Läufe und bestätigte Blindproben** (deshalb das Protokoll kopieren und an Claude geben, es kommt als `TESTPLAN-PROTOKOLL.md` ins Repository).

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
- **Für 8k vormerken:** Regeln 1, 2, 3, 4, 6 als weitere `fire`-Funktionen; Wochen beginnen montags UTC, Monate am Ersten UTC (VWAP); Datum der fehlenden 4H-Kerze nachsehen.

**Etappe 8j „Änderung 1: neuer Zufalls-Vergleich“ (07.10. nachts, reines Mess-Paket):**
- **Anlass:** Die ersten Läufe mit 8i (Neu im Trend +0,13R, Platz 7 % · Donchian +0,26R, Platz 0 % · Regel 5 +0,24R, Platz 42 %) zeigten zwei Fehler im Vergleich; die zweite Meinung hat beide bestätigt. (1) Angleichen je Markt und Monat wählt Markt-Monate im Nachhinein aus: Der Zufall darf vor dem Auslöser einsteigen (verzerrt gegen Ausbruch- und Trendregeln, für Rücksetzer-Regeln). (2) Regel 5 ist ein Zeit-Filter und wurde gegen fast dieselben Tage gemessen. **Die drei Ergebnisse sind ungültig; daraus keine Schlüsse ziehen.** Die App zeigt sie nicht mehr an.
- **Neuer Vergleich für alle Einstiegsregeln (Fassung 2):** Zu jedem Einstieg der Regel steigt der Zufall **zur selben 4H-Kerze in einem zufälligen zulässigen Markt** ein. Zulässig: genug Historie, Vorbedingung der Regel erfüllt (Tagestrend aufwärts; bei Donchian keine), in diesem Durchgang nicht schon im Trade; der Markt der Regel selbst darf gezogen werden. Kein zulässiger Markt: auslassen und zählen. **Messlatte A fragt damit nur noch: Ist dieser Markt an dieser Stelle besser als ein beliebiger zulässiger Markt zur selben Zeit?** Das „Wann“ prüfen Regel 5 und Messlatte B.
- **Regel 5 gepaart:** je Durchgang Zufalls-Einstiege über Zeit und Märkte (im Schnitt einer je 280 freien Kerzen), eingeteilt nach Schalterstand. Kennzahl: Ø R an minus Ø R aus. A bestanden, wenn die Differenz in mindestens 95 % der Durchgänge über 0 liegt; B: Ø R bei Schalter an im Plus. Dazu Anteil der Tage mit Schalter an und Zahl der Wechsel (die wahre Stichprobe).
- **Nur beschreibend:** „Rahmen allein“ = Ø R, wenn man an jeder 5. Kerze jedes Marktes einsteigt.
- **Nachweis an Zufallskursen (fester Test):** Auf Kursen ohne jeden Vorteil liegt Donchian mit dem alten Vergleich im Schnitt bei 0 % der Durchgänge, mit dem neuen um 50 % (40 Kurs-Sätze: 0 % gegen 51 %). Der alte Vergleich bleibt nur für diesen Test im Code (`randomMatchedOld`).
- **Von Jensen am 07.10. ausdrücklich bestätigt. Danach wird am Würfel nichts mehr geändert, egal wie die Regeln abschneiden.** Eingetragen als „Änderung 1“ im `TESTPLAN-PROTOKOLL.md` (der Testplan selbst bleibt unverändert).
- Außerdem: „−0,00R“ behoben. 14 neue Tests (852). Geprüft: alle Tests, Testseite und Ablauf im Browser in iPhone-Größe. Wächter unverändert (keine Datei des Wächters berührt), diesmal nicht erneut gestartet.
- **Nicht getestet:** Ergebnisse und Tempo auf dem iPhone mit echten Kerzen.
- **Erledigt (07.10., 00:38):** Entwicklung für alle drei Regeln mit dem neuen Vergleich gerechnet (Zahlen in Abschnitt 10 und im Protokoll). Lauf auf dem iPhone unter einer Sekunde. **Claude hat die Maschine freigegeben:** Der Zufall kommt auf dieselbe Zahl an Trades wie die Regel, „Rahmen allein“ ist in beiden Läufen gleich, die Zahlen der Regeln selbst sind dieselben wie in 8i.
- **Erledigt (07.10., 00:53):** Prüfung von Regel 5 einmal geöffnet. **Nicht bestanden** (A in der Prüfung: 78 % statt 95 %). Regel 5 geht nicht in den Tresor und wird nicht nachgebessert. Zahlen in Abschnitt 10 und im Protokoll.

**Etappe 8k „Die fünf Regeln“ (07.10. vormittags, reines Mess-Paket):**
- **Regeln 1, 2, 3, 4 und 6** des Testplans in der neuen Datei `core-ltrules.js`, nach den Lesarten 11 bis 16 und Änderung 2 (Wortlaut im Protokoll). Jede Regel läuft einmal vorwärts über die Kerzen und benutzt an einer Kerze nur, was bei ihrem Schluss bekannt war. Die Vorbedingung (Tagestrend) prüft dieselbe Funktion wie beim gewürfelten Markt.
- **Am Zufalls-Vergleich nichts geändert.** Nachweis an Zufallskursen ohne Vorteil (30 Sätze mit je 10 Märkten): Die fünf Regeln liegen im Schnitt zwischen 38 % und 58 % der Durchgänge, die beiden Vergleichsregeln bei 53 % und 46 %.
- **Blindprobe:** Knopf „Blindprobe ansehen“ je Regel, fünf Einstiege der Entwicklung als Kerzenbild (Tages- und 4H-Bild bei den Regeln 1 und 2, sonst 4H), ohne Coin, Datum, Kurse, Ergebnis und ohne Kerzen danach; es wird kein Trade gerechnet. „Das ist, was ich meine“ gibt „Entwicklung rechnen“ frei, „Nein: Rückmeldung kopieren“ lässt die Regel gesperrt.
- **Merker** je Trade (nur beschreibend) in Anzeige und Text, dazu „Einstiege je Markt und Jahr“ und „Signale verfallen (Trade war offen)“.
- **Kleinigkeiten:** Testplan-Läufe, Stand der Blindproben und das Datum fehlender 4H-Kerzen stehen im Export „Daten für Claude“; das Datum der Lücke erscheint unter den Testplan-Läufen, sobald einmal geladen wurde.
- 71 neue Tests (923), darunter je Regel „schaut nicht in die Zukunft“ (Signale auf abgeschnittener Reihe = Signale auf voller Reihe) und Gegenrechnungen von Grund auf für die Regeln 2, 4 und 6. Geprüft: alle Tests, die Tests der Messmaschine und der Regeln mit vier Sätzen verstellter Einstellungen, Testseite und kompletter Ablauf im Browser in iPhone-Größe mit nachgebildeten Kursen (Blindprobe, Sperre, Bestätigung, Lauf, Export). Wächter: keine seiner 34 Dateien berührt, nicht erneut gestartet.
- **Nicht getestet:** alles auf echten Kerzen (hier gibt es keine): wie oft die Regeln feuern, wie die Blindprobe-Bilder auf echten Kursen aussehen, Tempo auf dem iPhone. Auf Zufallskursen feuert Regel 2 selten (unter einem Einstieg je Markt und Jahr); erreicht sie keine 300 Trades, besteht sie B nicht, und es wird nichts gelockert.
- **Bekannt, kosmetisch:** Die Ausprägungen der Merker sind alphabetisch sortiert („9 bis 16 Wochen“ vor „bis 8 Wochen“).

**8k1 „Grundsatz Körper“ (07.10., 11:50, reines Mess-Paket, ersetzt 8k):**
- Änderung 2 als Grundsatz: Regel 1 nimmt Körper-Swings als Level, zählt Berührungen nur mit Körperkante und misst den Retest an der Körper-Unterkante; Regel 3 misst die Annäherung an der Körper-Unterkante. Regel 2 wie in 8k, Regel 4 und 6 unverändert. Fassung der Regeln 2 (`LTR.ver`): Blindproben und Ergebnisse einer älteren Fassung gelten nicht mehr und werden nicht gezeigt.
- Blindprobe Regel 1: × markiert Tage, an denen nur ein Docht die Zone antippt; fehlt ein × in den fünf Bildern, kommt gezielt ein sechstes dazu.
- 7 neue Tests (930): Körper-Berührung, Docht ohne Körper, Plateau, Tick-Fall, Docht allein ist keine VWAP-Annäherung, gezieltes sechstes Bild, alte Fassung wird nicht gezeigt. Geprüft: alle Tests, Testseite und Ablauf im Browser in iPhone-Größe, Nachweis an Zufallskursen neu gerechnet (Plätze 44 bis 58 %). Wächter unberührt.
- **Nicht getestet:** alles auf echten Kerzen. Regel 1 feuert mit Körper-Berührungen deutlich seltener; ob sie und Regel 2 die 300 Trades erreichen, ist offen.

**8k2 „Regel 1 als schmales 4H-Band“ (07.10., 14:45, reines Mess-Paket, ersetzt 8k1):**
- **Änderung 3:** Regel 1 neu nach Jensens Bildern (Wortlaut im Protokoll, Lesart 12). Fassung je Regel (`LTR.rv`): Regel 1 hat Fassung 3 und braucht eine neue Blindprobe, die Bestätigungen der Regeln 2, 3, 4 und 6 bleiben gültig.
- **Blindprobe Regel 1:** erstes Bild jetzt ein 4H-Chart über die Berührungen (bis 420 Kerzen, ältere Berührungen werden als Zahl genannt), zweites Bild die letzten Tage vergrößert. Die Suche nach Einstiegen läuft Markt für Markt mit Pausen, damit die Seite nicht einfriert.
- **Speicher-Verbindung:** Auf dem iPhone ließ sich die Blindprobe zeitweise nicht mehr öffnen; nach einem Neustart der App ging es wieder (von Jensen mit 👍 quittiert, nicht ausdrücklich bestätigt). Vermutete Ursache: iOS kappt die Verbindung zum Kerzen-Speicher, wenn die App im Hintergrund war. `core-binance.js` verwirft die Verbindung jetzt bei einem Fehler oder nach 8 Sekunden ohne Antwort beim Lesen und versucht es einmal neu. Im Browser nachgestellt (Fehler und Hänger). `core-btstore.js` hat dasselbe Muster und ist noch nicht geändert.
- **Protokoll:** Abnahmen der Blindproben, Prüfung von „Neu im Trend“ (01:32, von Jensen geöffnet), Datum der fehlenden 4H-Kerze (19.02.2020, 12:00 UTC).
- 3 neue Tests (933). Geprüft: alle Tests, Tests der Messmaschine und der Regeln mit vier Sätzen verstellter Einstellungen, Testseite und Ablauf im Browser in iPhone-Größe, Größe wie auf dem iPhone (50 Märkte, volle Historie: Regel 1 rund 1,5 Sekunden am Rechner), Nachweis an Zufallskursen (Regel 1 bei 48 %). Wächter unberührt.
- **Nicht getestet:** alles auf echten Kerzen; ob die neu aufgebaute Speicher-Verbindung das Problem auf dem iPhone wirklich behebt; Tempo der Blindprobe von Regel 1 auf dem iPhone.

**Etappe 8l „Setup-Finder, Vorschau“ (07.10., 17:00, reines Anzeige-Paket):**
- **Neue Karte „Setup-Finder · Vorschau“ ganz oben im Tab Signale.** „Märkte durchsuchen“ prüft die handelbaren Märkte über dem Mindestumsatz: erst den Tagestrend (Tageskerzen, wie „Heiße Coins“; kommen aus dem Zwischenspeicher, wenn dieser sie gerade geholt hat), dann nur für Märkte im Tagestrend aufwärts die 4H-Kerzen der letzten 200 Tage. Darauf laufen die fünf festgeschriebenen Regeln aus `core-ltrules.js`, **unverändert** (per Test: Der Fund ist derselbe, den die abgenommene Regel liefert).
- **„Aktuell“** = in den letzten 6 abgeschlossenen 4H-Kerzen ausgelöst (24 Stunden, von Jensen gewählt), je Baustein der jüngste Fund, mit Alter in Stunden.
- **Liste:** je Coin eine Zeile „Beobachtung · n Bausteine“, die Bausteine als Marken, sortiert nach Zahl der Bausteine, dann nach dem frischeren Fund. **Kein Score, keine Trefferquote, kein Backtest-R.** Filter je Baustein mit Zähler. Antippen klappt die Bilder auf (dasselbe Kerzenbild wie in der Blindprobe).
- **Sell-Block und „Platz nach oben“** (`core-sellblock.js`, von Jensen am 07.10. um 16:25 bis 16:32 beschrieben und bestätigt, Spiegelbild von Regel 6): Auslöser ist ein Schluss unter dem jüngsten bestätigten Swing-Tief, unter dem noch keine Kerze geschlossen hat; Block = die letzte steigende Kerze davor, von der Eröffnung bis zum Hoch (Höhe von Claude festgelegt, Jensen war dazu „überfragt“); gültig, bis eine Kerze über dem Hoch schließt (ein Docht bricht ihn nicht). Geprüft auf 4H, Tag und Woche (Woche aus Tageskerzen, nur abgeschlossene Wochen). Die Zeile nennt den Abstand vom Kurs bis zur Unterkante des nächsten Blocks in R (ein R = 2 × Tages-ATR) mit Zeitebene, oder „Kurs im Sell-Block“, oder „frei“. **Nur Information, kein Filter.** Eigene Umsetzung, kein Code von LuxAlgo; die Streifen sehen ähnlich aus, sind aber nicht deckungsgleich.
- **Im Bild:** Gold = Level oder Zone des Bausteins, Rot = nächster Sell-Block ab seiner Entstehungskerze (nur wenn er höchstens 3 R über dem Kurs liegt), Linie „jetzt“ = aktueller Kurs. Das Bild endet an der Signalkerze.
- **Zeile „Order Block in der Fib-Zone“**, wenn beide Bausteine da sind und sich am Preis überschneiden (Jensens Anmerkung von 16:29, reine Information).
- **Nicht enthalten, mit Absicht:** Telegram, Heiße Coins, Tagebuch. Das ist Schritt 2 („Umstellen“) und fasst den Wächter an.
- 30 neue Tests (963). Geprüft: alle Tests, Testseite und kompletter Ablauf im Browser in iPhone-Größe mit nachgebildetem Hyperliquid (Marktliste, Tageskerzen, lange 4H-Reihen, laufende Kerze wird verworfen). Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** der echte Abruf von Hyperliquid (hier nicht erreichbar): ob 200 Tage 4H-Kerzen in einem Abruf kommen, wie lange der Durchlauf auf dem iPhone dauert (mit 1,3 Sekunden Abstand je Abruf: bei 175 Märkten grob 4 Minuten für die Tageskerzen, wenn sie nicht schon im Zwischenspeicher liegen), wie viele Funde es gibt und wie die Bilder auf echten Kursen aussehen. Bei kürzerer Historie als im Test (200 statt 2.000 Tage) können einzelne Funde abweichen, vor allem bei alten Order Blocks.

**Etappe 8l1 „Setup-Finder, Überarbeitung nach der ersten Abnahme“ (07.10., 20:15, reines Anzeige-Paket):**

Jensens Rückmeldung zu 8l auf echten Kursen (07.10., ab 16:46): 82 Märkte im Tagestrend aufwärts, 60 von 65 geprüften mit Fund („der spuckt immer weiter aus“); VWAP 47, Sweep 27, Order Block 14, Key-Level 4, Fib 0. Der Wochen-Sell-Block verdeckte das Bild. Einzelne Funde waren vom Kurs schon überholt. Zu den Key-Level-Funden: TIA „würde ich auch so setzen“; ASTER unter einem Tages-Sell-Block eher Short; JTO kein Trade (ABC-Korrektur); VIRTUAL nur mit engem Stop; DOT hängt an der Wellenzählung. HBAR: bei ihm Golden Pocket plus Buy-Block = klarer Long, die App zeigte keinen Fib-Fund, weil Regel 2 auf das bestätigte Hoch und eine Reaktion wartet. Sein Wunsch für die Vorsortierung: RSI mit Divergenzen und die Lage des Kurses in den Fib-Levels.

- **Nur noch gültige Funde** (`stillValid`): Ein Fund ist überholt, wenn nach der Signalkerze gilt: Order Block = 4H-Schluss unter dem Tief des Blocks · Sweep = 4H-Schluss unter dem Sweep-Tief · VWAP = 4H-Schluss mehr als ½ Tages-ATR unter dem auslösenden Level · Key-Level = Tagesschluss unter dem Band · Fib = Tagesschluss unter 0,786. Überholte Funde werden gezählt und als Zeile genannt, nicht gezeigt. **Die Regeln selbst sind unberührt** (`core-ltrules.js` nicht angefasst).
- **Ansicht „Alle / ab 2 Bausteinen / ab 3“, Voreinstellung ab 2** (Jensens Wahl). Hinweis „Marktbewegung“, wenn ein Baustein bei mehr als einem Drittel der geprüften Märkte gleichzeitig auslöst.
- **„Platz nach oben“ je Zeitebene** (Woche · Tag · 4H, die höhere zuerst; Jensen: höhere Zeitebenen wirken stärker). **Im Bild nur noch 4H-Sell-Blöcke** (die nächsten zwei, höchstens 3 R über dem Kurs); Tag und Woche stehen als Text.
- **Bild:** Beschriftungen werden auseinandergeschoben, wenn sie übereinander lägen; im VWAP-Bild trägt nur das auslösende Level einen Namen; je Fund „seit der Signalkerze ±x R“.
- **Fib-Lage (nur Information und Filter, kein Baustein):** Tageschart, Anker an den Kerzenkörpern (von Jensen am 07.10. so festgelegt: unten der tiefste Punkt des Körpers, oben der höchste Punkt des Körpers). Anstieg = vom jüngsten bestätigten Körper-Swing-Tief zur höchsten Körper-Oberkante seither, mindestens 6 Tages-ATR; sonst das Swing-Tief davor (höchstens 4 Schritte). Zeile „Fib: Kurs bei 0,64 des letzten Anstiegs · Golden Pocket“ (0,618 bis 0,65). Anders als Regel 2 ein **Zustand**, kein Auslöser. Die 6 ATR und die 4 Schritte hat Claude gewählt; Jensen hat sie noch nicht am Bild gesehen.
- **RSI (nur Information und Filter):** RSI 14 auf Tag und 4H, Tag zuerst (Jensen bewertet den Tag stärker), überverkauft unter 30, überkauft über 70. Divergenz aus den Schlusskursen der letzten beiden bestätigten Swing-Punkte (5 Kerzen davor und danach, jüngster höchstens 30 Kerzen alt): tieferes Tief im Kurs, höheres im RSI = bullisch; Hochs gespiegelt = bärisch. „Im Entstehen“: Der Schluss von jetzt liegt unter dem letzten Swing-Tief, der RSI darüber.
- **Filter** Golden Pocket, RSI überverkauft, bullische Divergenz: zeigen **alle geprüften Märkte im Tagestrend aufwärts**, auch ohne Baustein. Fib-Lage, RSI und Platz nach oben gehen nicht in die Reihenfolge ein.
- **Knopf „In Trade-Karte übernehmen“** (Jensens Wunsch, 07.10. abends) im aufgeklappten Eintrag: öffnet die Trade-Karte als Long zum Live-Kurs, Stop 2 × Tages-ATR darunter, Ziele bei 2R / 3R / 4R / 6R wie beim Maßstab (`tradeResult` in `core-finder.js`). Die Karte heißt dann „Beobachtung · Setup-Finder“, trägt einen Hinweis mit den Bausteinen und hat keinen Score; der Knopf „Vollanalyse“ fehlt dort (die alte Analyse kennt diese Form nicht). Risiko-Budget, Abkühlphase und Hebel-Grenzen der Trade-Karte gelten unverändert. Dafür zwei Zeilen in `ui-trade.js` (nur Anzeige).
- **Fehler gefunden beim Schreiben der Tests:** `rsiInfo` lieferte bei zu wenig Kerzen „überverkauft“ statt nichts. Behoben, Test dazu.
- 30 neue Tests (993). Geprüft: alle Tests, die Tests von Messmaschine, Regeln und Finder mit vier Sätzen verstellter Einstellungen, Testseite und kompletter Ablauf im Browser in iPhone-Größe mit nachgebildetem Hyperliquid (Liste, Umschalter, Bild, Trade-Karte aus dem Finder, „Im Rechner anpassen“). Wächter: keine seiner Dateien berührt (`ui-trade.js`, `core-finder.js` und `core-sellblock.js` lädt er nicht).
- **Nicht getestet:** alles auf echten Kursen. Ob Fib-Lage und RSI-Divergenz mit Jensens Chart übereinstimmen (HBAR), ob die Schwelle von 6 Tages-ATR den Anstieg trifft, den er zeichnen würde, wie lang die Liste „ab 2 Bausteinen“ wirklich wird, und die Trade-Karte aus dem Finder mit echtem Konto.

**Etappe 8m „Markt-Bias aus eigenem Index“ (07.10., 23:40, reines Anzeige-Paket):**
- **„Hyperliquid-Ledger-Perp-Index“** (`core-index.js`): aus den Tageskerzen der Märkte, die der Finder ohnehin in Stufe 1 lädt (handelbare Märkte über dem Mindestumsatz). Alt-Index = alle ohne BTC, je Tag das Mittel der Tagesänderungen (Schluss, Eröffnung, Hoch, Tief gegen den Schluss vom Vortag), Start bei 100. Small-Index = dasselbe ohne die zehn umsatzstärksten; die Rangliste nutzt den Umsatz in USD der 30 Tage **vor** dem bewerteten Tag. Ein Markt zählt erst nach 110 Tagen mit; nach einer Lücke in seinen Kerzen an dem Tag nicht; unter 5 Mitgliedern gibt es keinen Wert.
- **Historie so lang wie möglich:** Beim ersten Durchlauf fragt die App nach dem Finder je Markt die Tageskerzen ab 01.01.2023 ab (ein Abruf je Markt, mit dem üblichen Abstand) und speichert den Index in `wolfdesk.hlindex` (nur Marktdaten, im Test rund 64 kB für 650 Tage). Danach wird er aus den kurzen Reihen fortgeschrieben (angekettet, ohne Sprung); nach mehr als 140 Tagen Pause wird neu aufgebaut. Bis die lange Historie da ist, zeigt die Kopfzeile den Index aus den kurzen Reihen (rund 150 Tage).
- **Kopfzeile „Markt“ über den Beobachtungen, drei Ebenen:** BTC aufwärts oder nicht · Alts aufwärts oder nicht (jeweils Tages-EMA 20 über EMA 100, ab 110 Tagen) · Small Caps stärker, schwächer oder gleichauf gegen die Alts (Unterschied der 30-Tage-Veränderung in Prozentpunkten, „gleichauf“ innerhalb eines Punkts). Dazu „Platz nach oben (Alts)“: Abstand in Prozent bis zum nächsten Sell-Block über dem Alt-Index, Woche und Tag getrennt. **Kein Score, keine Ampelzahl, kein Filter.** BOS, CHoCH, Highs und Lows und die Trendlinie sind nicht enthalten (von Jensen gestrichen).
- **Zusatzzeile** „Marktkap. ohne BTC“ aus CoinGecko (Stand von jetzt), wenn die Markt-Karte die Daten schon geholt hat.
- **Coin-Bias je Zeile:** „Tagestrend aufwärts · stärker / schwächer als BTC (± x Prozentpunkte in 30 Tagen)“. Der Tagestrend ist bei jedem gezeigten Coin aufwärts, weil nur solche Märkte geprüft werden.
- **Versteckte Divergenzen** im RSI (`rsiInfo`): versteckt bullisch = höheres Tief im Schlusskurs, tieferes im RSI; versteckt bärisch = tieferes Hoch im Kurs, höheres im RSI. Aus den Tiefs und aus den Hochs je höchstens eine Angabe; beide können nebeneinander stehen. Der Filter „bullische Divergenz“ meint weiter nur die klassische.
- **Ansicht „Alle geprüften“** (alle Märkte im Tagestrend aufwärts, auch ohne Baustein) und **Suchfeld**. Ist ein gesuchter Coin nicht im Tagestrend aufwärts, sagt die App das.
- 35 neue Tests (1.028). Geprüft: alle Tests, die Tests von Messmaschine, Regeln, Finder und Index mit vier Sätzen verstellter Einstellungen, Testseite und kompletter Ablauf im Browser in iPhone-Größe mit nachgebildetem Hyperliquid (24 Märkte: Kopfzeile, Speicher, Suche, alle Ansichten, Trade-Karte). Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** alles auf echten Kursen. Wie weit Hyperliquid Tageskerzen zurückgibt und ob die Abfrage ab 2023 in einem Abruf kommt; wie lange der einmalige Aufbau auf dem iPhone dauert (ein Abruf je Markt zusätzlich); ob der gleichgewichtete Index Jensens Bild von TOTAL2 und OTHERS trifft; ob die Index-Sell-Blöcke sinnvoll liegen (Hoch und Tief des Index sind Mittelwerte, kein gehandelter Kurs).
- **Bekannte Grenze:** Die Mitglieder sind die Märkte von heute. Märkte, die es nicht mehr gibt, fehlen in der Vergangenheit des Index.

**Etappe 8n „Deine Trades im Detail“ (08.10., 06:50, reines Anzeige-Paket, nur auf dem iPhone):**
- **Neue Karte im Tab Konto**, Knopf „Trades auswerten“. Grundlage: die Fills der letzten 90 Tage, die die App ohnehin lädt (Trades, die vor dem Fenster begonnen haben, fallen heraus). Je Trade ein Abruf der Stundenkerzen, je Coin die Tageskerzen (Zwischenspeicher), einmal die Order-Historie (`historicalOrders`).
- **Je Trade:** Haltedauer · Einstieg zum Kurs oder per Limit (Feld `crossed` der eröffnenden Fills; gemischt, wenn beides) · Ergebnis und bester Stand in Tages-ATR des Coins beim Einstieg, „liegen gelassen“ = bester Stand minus Ergebnis · Stop-Abstand in ATR und alles zusätzlich in R, **wenn** der Stop in der Order-Historie steht (die erste Stop-Order zum Schließen für den Coin, gesetzt ab 5 Minuten vor dem Einstieg; ein später nachgezogener Stop zählt nicht) · Markt-Bias beim Einstieg (BTC und Alt-Index aus 8m, Tages-EMA 20 über EMA 100, nur Tage vor dem Einstieg; aufwärts / abwärts / gemischt; ohne gespeicherten Alt-Index zählt BTC allein) · Coin im Tagestrend oder nicht.
- **Tabellen:** Alle · mit dem Bias · gegen den Bias · Markt gemischt; dazu zum Kurs gegen per Limit und Coin im Trend gegen Coin gegen Trend. Je Gruppe Trades, Anteil im Plus, Ø Ergebnis, Ø bester Stand, Ø liegen gelassen. Unter 10 Trades je Gruppe steht ausdrücklich, dass der Unterschied Zufall sein kann.
- **Bewusst ohne Dollar-Beträge** (kein Gewinn, keine Größe, keine Gebühren in der Karte und in den Zeilen; per Test geprüft), damit Jensen Screenshots teilen kann. Nichts davon wird gespeichert oder exportiert.
- **Nicht möglich:** der Hebel von damals (steht nicht in den Fills).
- 21 neue Tests (1.049). Geprüft: alle Tests, mit vier Sätzen verstellter Einstellungen, Ablauf im Browser in iPhone-Größe mit nachgebildeten Fills, Order-Historie und Kerzen (12 Trades, Long und Short). Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** mit echten Daten. Ob Hyperliquid `historicalOrders` so liefert, wie hier gelesen (Felder `order.coin`, `side`, `triggerPx`, `orderType`, `timestamp`; nach Claudes Kenntnis der Schnittstelle, nicht geprüft); fehlt der Stop überall, liegt es vermutlich daran. Ob `crossed` in den aggregierten Fills steht. Der beste Stand zählt die ganze Stunde des Einstiegs und des Ausstiegs mit und kann leicht zu hoch sein.

**Etappe 8n1 „Index auf der Startseite“ (08.10., 07:30, reines Anzeige-Paket, Wunsch von Jensen 07:07):**
- **Startseite, Karte Marktüberblick, zwischen den Tachos und der Marktkapitalisierung:** Bild des Hyperliquid-Ledger-Perp-Index. Alts gold, Small Caps blau, beide am ersten Tag des Ausschnitts = 100; EMA 20 und EMA 100 der Alts gestrichelt (über die ganze Reihe gerechnet); nächster Tages-Sell-Block über dem Index als roter Streifen. Ausschnitt 90 Tage, 180 Tage oder alles; bei mehr als Faktor 3 im Bild logarithmisch. Darunter: Veränderung im Ausschnitt und „Alts aufwärts / nicht aufwärts“. Der Tacho „Markt-Bias“ bleibt unverändert (alte Rechnung aus `core-market.js`).
- **Index sofort gespeichert:** Beim ersten Aufbau wird der Index aus den kurzen Reihen gleich gespeichert (`full: false`), damit Startseite und Trade-Auswertung ihn haben, auch wenn die lange Historie noch fehlt oder abbricht. Die lange Historie wird dann höchstens einmal je 20 Stunden erneut versucht. Nach jeder Änderung meldet der Finder das der Startseite (Ereignis `wolfdesk-index`).
- **Befund:** Auf Jensens iPhone zeigte die Kopfzeile während des ersten Durchlaufs „Historie ab 09.05.2026“, also den Index aus den kurzen Reihen; die lange Historie lädt erst nach dem Finder. Die Trade-Auswertung lief vorher und hatte deshalb noch keinen Alt-Index.
- 6 neue Tests (1.055). Geprüft: alle Tests, vier Sätze verstellter Einstellungen, Startseite in iPhone-Größe mit nachgebildeten Daten (alle drei Ausschnitte, lineare und logarithmische Skala). Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** auf echten Kursen; wie weit die lange Historie wirklich zurückreicht.

**Etappe 8o „Top 10 gegen Rest, Tacho aus dem Index, Würfel-Vergleich“ (08.10., 09:45, reines Anzeige-Paket, von Jensen um 09:00 freigegeben):**
- **Breite neu: Top 10 gegen Rest.** Anlass: Auf echten Kursen liefen Alts und Small Caps fast deckungsgleich, weil der Small-Index zu fast 90 % aus denselben Märkten besteht. Neu ist eine dritte Reihe „Top 10“ (die zehn umsatzstärksten, Rangliste wie bisher aus den 30 Tagen davor, mindestens 3 Märkte); die Breite vergleicht den Rest (Small-Index) mit den Top 10. Speicherfassung 2 (`wolfdesk.hlindex`): Fassung 1 wird einmal neu aufgebaut.
- **Bild auf der Startseite:** Alts gold, Top 10 weiß, Rest blau, Beschriftungen entzerrt.
- **Tacho „Markt-Bias“ spricht jetzt mit derselben Stimme wie der Index**, sobald ein Index gespeichert ist und BTC-Tageskerzen da sind: BTC-Trend und Alt-Trend je ±40, Breite (Rest gegen Top 10, mehr als ein Punkt) ±20; Stufen Long-Markt / leicht bullisch / gemischt / leicht bärisch / Short-Markt. Zeile darunter: BTC ▲ · Alts ▲ · Rest oder Top 10 stärker · Breite (Top 50 über EMA 50, alte Rechnung). Ohne Index zeigt der Tacho wie bisher den alten Bias. **Geprüft: Der Wächter nutzt `core-market.js` nicht**; die Gewichte des alten Bias in den Einstellungen wirken damit nur noch, solange kein Index gespeichert ist.
- **Trade-Auswertung:** je Gruppe zusätzlich Ø Haltedauer und Ø Stop-Abstand in ATR.
- **Würfel-Vergleich der eigenen Trades** (Antwort auf Jensens Frage „der Würfel ist genauso gut?“): Für jeden abgeschlossenen Trade derselbe Einstieg, dieselbe Haltedauer, dieselbe Richtung, aber ein zufälliger anderer Markt aus der handelbaren Liste, 500 Durchgänge mit festem Würfel. Gemessen bei beiden gleich: Schluss der letzten abgeschlossenen 4H-Kerze vor dem Einstieg bis vor dem Ausstieg, in 4H-ATR(14) des Coins; ohne Stops und Teilverkäufe, es geht nur um die Wahl des Coins. Trades unter 4 Stunden zählen nicht. Urteil mit derselben Hürde wie im Testplan (95 %); unter 10 Trades „noch zu wenige“. Lädt einmal die 4H-Kerzen aller handelbaren Märkte (ein Abruf je Markt). Bekannte Grenze: Die Würfel-Märkte sind die von heute.
- 14 neue Tests (1.069). Geprüft: alle Tests, vier Sätze verstellter Einstellungen, Startseite, Finder und Trade-Karte mit Würfel-Vergleich in iPhone-Größe mit nachgebildeten Daten. Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** auf echten Kursen; Dauer des Würfel-Vergleichs auf dem iPhone. Offen aus 8n1: ob die lange Index-Historie auf dem iPhone durchläuft (am 08.10. stand „lange Historie folgt“); mit Fassung 2 wird sie ohnehin neu geladen.

**Etappe 8p „Stop-Check gegen die Tages-ATR“ (08.10., 10:40, reines Anzeige-Paket, von Jensen um 10:02 freigegeben):**
- **Befund auf echten Daten (08.10., 09:40 bis 09:56; Zahlen ohne Beträge):** 42 Trades in 90 Tagen, Stop im Schnitt 0,9 Tages-ATR, bester Stand im Schnitt 1,2 Tages-ATR, Ergebnis im Schnitt 0,0 ATR; „in Teilen verkauft“ (Trade erreichte TP1) fast immer im Plus, „alles auf einmal“ (meist ausgestoppt) fast immer im Minus. Würfel-Vergleich: 38 Trades, Coin-Wahl über 79 % der Würfel-Durchgänge, also leicht besser, aber vom Zufall nicht zu unterscheiden (Hürde 95 %). Mit/gegen Bias: alle Trades „mit dem Bias“ (der Markt war nach der Tagesregel die ganze Zeit aufwärts), kein Vergleich möglich. Jensen: Er hat meist die Stops der App übernommen. Im Code geprüft: Die alte Score-Engine (`atrTradePlan` in `core-signals.js`) setzt den Stop 1 bis 3 ATR **der Setup-Zeitebene** vom Einstieg; in Tages-ATR liegt das oft unter 1. Der alte Stop-Check maß ebenfalls gegen die Setup-ATR und meldete solche Stops als „genug Luft“.
- **Stop-Check jetzt gegen die Tages-ATR** (`core-stopcheck.js`, eigene Datei, der Wächter lädt sie nicht): in der Trade-Karte, im Rechner (Tab Risiko) und bei offenen Positionen. Grenzen wie in den Einstellungen (rot unter 1,0, gelb unter 1,5), Vorschlag ist der **Rahmen-Stop 2 × Tages-ATR** (ein Tipp übernimmt ihn, die Leiter nennt ihn „Rahmen-Stop“, bei gleichem Risiko wird die Position kleiner). Die Plan-Stops der alten Score-Signale selbst sind unverändert; die Karte warnt nur und bietet den Rahmen-Stop an.
- **Trade-Auswertung:** neue Tabelle „Stop-Abstand“ (unter 1 · 1 bis 1,5 · ab 1,5 Tages-ATR) mit Vergleich unter 1 gegen ab 1,5.
- **Diagnose der langen Index-Historie:** Unter dem Index auf der Startseite steht jetzt, wie viele Märkte beim letzten Versuch lang geladen wurden und wann („noch kein vollständiger Versuch“, wenn der Lauf vorher endete). Grund: Bei Jensen stand nach zwei Durchläufen noch „lange Historie folgt“.
- 8 neue Tests (1.077). Geprüft: alle Tests, vier Sätze verstellter Einstellungen, Trade-Karte mit engem Stop (Warnung, Übernahme des Rahmen-Stops), Finder, Startseite, Trade-Auswertung in iPhone-Größe mit nachgebildeten Daten. Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** auf echten Kursen; der Rechner-Check im Tab Risiko nur über die Tests (in der Nachbildung fehlten Kontodaten).

**Etappe 8q „Datensicherung“ (08.10., 11:00, vor der Schönheits-OP):**
- **Einstellungen → Speicher → „Datensicherung speichern“:** alle Einträge der App unter `wolfdesk.` im Browser-Speicher als eine JSON-Datei (`wolf-desk-sicherung-JJJJ-MM-TT-HHMM.json`), auf dem iPhone über das Teilen-Menü („In Dateien sichern“), sonst als Download. Nicht gesichert: Zwischenspeicher (`universe`, `autoplans`, `patience`) und das Protokoll der langen Binance-Historie (`bn`, die Kerzen liegen in einer eigenen Datenbank). Backtest-Läufe in der Datenbank ebenfalls nicht. Das Tagebuch liegt beim Wächter.
- **„Datensicherung einspielen“:** Datei wählen, Rückfrage mit Datum und Zahl der Einträge, dann werden die Einträge geschrieben (Gleichnamiges überschrieben, nichts gelöscht) und die App lädt neu. Fremde, kaputte, leere oder zu neue Dateien werden mit Grund abgelehnt.
- **Die Datei enthält die Wallet-Adresse und kann Beträge enthalten: Sie gehört nie ins Repository.**
- 9 neue Tests (1.086). Geprüft: alle Tests, Speichern und Einspielen im Browser in iPhone-Größe (Download-Weg). Wächter: keine seiner Dateien berührt.
- **Nicht getestet:** der Weg über das Teilen-Menü auf dem iPhone und das Einlesen einer Datei aus der Dateien-App.

**Etappe 8r „Umstellen“ (08.10., 11:45, fasst den Wächter an; auf Jensens Wunsch ohne den Tag Abstand):**
- **Telegram meldet Beobachtungen statt Maßstab-Signale** (`alerts.observe: true` in `config.js`; `false` schaltet zurück auf den Maßstab). Ablauf im Wächter: Stufe 1 wie bisher die Tageskerzen aller handelbaren Märkte über dem Mindestumsatz; Märkte im Tagestrend aufwärts (`trendNow`) bekommen **einmal je neuer 4H-Kerze** (Merker `obsAt`) die 4H-Kerzen der letzten 200 Tage, darauf läuft derselbe Finder wie in der App (`coinEntry`). Gemeldet wird, wenn ein Baustein **auf der letzten abgeschlossenen 4H-Kerze** ausgelöst hat **und** mindestens 2 Bausteine gültig sind (Jensens „ab 2“), höchstens `maxPerRun` je Lauf, mehr Bausteine zuerst; nicht bei offener Position oder laufender Beobachtung im Tagebuch, nicht unter `alerts.minVolumeUsd`. Text: „Beobachtung“, Bausteine, Markt-Bias (zwei Zeilen), Kurs, Rahmen-Stop 2 × Tages-ATR, Ziele 2R/3R/4R/6R, Platz nach oben, Zeit-Ausstieg 10 Tage, „kein geprüftes Signal“. **Kein Score.**
- **Tagebuch** schreibt jede Beobachtung still mit (`eng: 'obs'`, `blocks`: beteiligte Bausteine), Fenster 10 Tage wie der Rahmen; die Wochen-Auswertung zeigt Beobachtungen als eigene Gruppe. In der App heißen sie im Feed „Beobachtung · Setup-Finder“.
- **Zeit-Ausstieg privat:** Läuft eine offene Position seit 10 Tagen (`benchmark.holdDays`), kommt einmal je Trade eine Erinnerung.
- **Bias-Wechsel privat:** Der Wächter rechnet bei jedem Lauf den Markt-Bias aus dem eigenen Index (dieselben Tageskerzen, kein Abruf mehr). Wechselt er zwischen bullisch (ab +20), gemischt und bärisch, während eine Position offen ist, kommt eine Meldung mit den offenen Positionen und dem Hinweis, wenn eine gegen den Markt steht. Der erste Lauf meldet nichts.
- **Tacho abgestuft** (Jensen 10:23: Zeiger auf Anschlag ungewöhnlich): BTC und Alts zählen ±40 nur, wenn der Tagesschluss auf derselben Seite der EMA 20 liegt wie der Trend, sonst ±20 („Rücksetzer“ bzw. „Erholung“ in der Zeile). Gilt auch für den Bias-Wechsel im Wächter.
- **Fehler behoben:** „rot: nächster Tages-Sell-Block“ stand unter dem Index-Bild, auch wenn der Streifen außerhalb des Bildes lag.
- **Nicht umgestellt:** „Heiße Coins“ auf der Startseite rechnet weiter mit der alten Engine; der Finder im Tab Signale ersetzt ihn inhaltlich. „Meldung nach einer Pause“ aus der Richtungsentscheidung: Die Meldung „Abkühlphase vorbei“ gibt es schon; falls etwas anderes gemeint war, ist es offen.
- 13 neue Tests (1.099). Geprüft: alle Tests, vier Sätze verstellter Einstellungen, **Trockenlauf des Wächters in Node mit nachgebildetem Hyperliquid und Telegram** (24 Märkte, eine offene Position seit 11 Tagen): zwei Beobachtungen in den Kanal, Zeit-Ausstieg, Bias-Wechsel und Ziel-Meldung privat, Testnachricht; zweiter Lauf in derselben 4H-Kerze meldet nichts doppelt. Startseite in iPhone-Größe.
- **Nicht getestet:** mit echten Daten bei GitHub. Dauer im echten Lauf: grob 1,3 Sekunden je Markt im Aufwärtstrend, sechsmal am Tag (bei 80 Märkten rund 2 Minuten zusätzlich), der Lauf hat 14 Minuten.

**Kleinigkeiten, die noch offen sind:** `startCapital: 1500` in `config.js` ist ein Platzhalter (geklärt am 07.10. über den Export: Der Nutzer hat einen eigenen Wert als Abweichung gespeichert, er liegt nur auf dem iPhone und geht nicht an den Wächter); die Zeile bleibt, wie sie ist · `core-totalrisk.js` enthält noch die alte Funktion `totalRiskStatus` (wird nicht mehr benutzt, die Tests dazu laufen weiter).

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

### Lange Historie (Binance), Entwicklung 2020 bis 2023 (07.10., App 8j, Zufalls-Vergleich Fassung 2)

Gemeinsamer Rahmen des Testplans, 41 Märkte mit Kerzen in der Entwicklung, 200 Durchgänge. **Nur die Entwicklung, also Hinweise, kein Urteil.** Prüfung bei keiner Regel angesehen, Tresor gesperrt.

| | Trades | Ø R | Spanne (Monate) | Zufall, selbe Kerze | Platz | Rahmen allein | A | B |
|---|---|---|---|---|---|---|---|---|
| Neu im Trend (Vergleich) | 935 | +0,13R | ±0,00R bis +0,25R | +0,14R (+0,11R bis +0,18R) | 28 % | +0,09R | nein | ja |
| Donchian 20/10 (Vergleich, 10 Tage Zeit-Ausstieg) | 883 | +0,26R | +0,07R bis +0,43R | +0,21R (+0,18R bis +0,25R) | 99 % | +0,09R | ja | ja |

**Regel 5 (Kandidat, gepaart):** Schalter an Ø +0,16R (rund 350 Trades je Durchgang) · Schalter aus Ø +0,02R (rund 309) · Differenz Ø +0,14R (+0,01R bis +0,26R) · über 0 in 96 % der Durchgänge · Schalter an 56 % der 1.433 Tage, 86 Wechsel. A knapp bestanden (nötig 95 %), B bestanden.

**Regel 5, Prüfung 2024 bis 25.09.2025 (einmal geöffnet am 07.10. um 00:53):** Schalter an Ø +0,05R (rund 259 Trades je Durchgang) · aus Ø −0,01R (rund 275) · Differenz Ø +0,06R (−0,07R bis +0,19R) · über 0 in 78 % der Durchgänge · Schalter an 49 % der 634 Tage, 59 Wechsel. **A nicht bestanden, B bestanden, 609 Trades. Urteil nach Testplan: nicht bestanden, kein Tresor.** Genau gesagt: kein nachweisbarer Vorteil unter diesen Bedingungen. Die Richtung ist in beiden Zeiträumen dieselbe (an besser als aus), der Abstand ist in der Prüfung aber nicht vom Zufall zu trennen. Der Schalter bleibt als beschreibender Merker brauchbar, als Regel wird er nicht scharf und nicht nachjustiert (andere Fenster als 28 Tage wären ein neuer Testplan).

Einordnung durch Claude:
- **Neu im Trend:** Der gewählte Coin ist nicht besser als ein beliebiger Coin im Aufwärtstrend zur selben Zeit.
- **Donchian:** An Ausbruchs-Tagen verdient schon der Zufall +0,21R, der Rahmen allein +0,09R. Der größte Teil kommt also vom Zeitpunkt; der ausbrechende Coin legt rund +0,05R drauf. Donchian hatte den leichteren Vergleich (sein Zufall darf jeden Markt ziehen, auch schwache; bei den anderen Regeln muss der gewürfelte Markt im Aufwärtstrend sein). Die 99 % sind deshalb weniger stark, als sie aussehen.
- **Regel 5:** Die 96 % sind zu günstig gelesen, denn alle Durchgänge laufen durch dieselbe Marktgeschichte. Die wahre Stichprobe sind die 86 Wechsel in vier Jahren.
- Die drei Ergebnisse aus 8i (alter Vergleich) sind ungültig und stehen nur noch im Protokoll.

### Testplan 1, die fünf Einstiegs-Bausteine (07.10., 14:54, App 8k2, Entwicklung 2020 bis 2023)

| Regel | Trades | Ø Regel | Ø Zufall, selbe Kerze | Platz | A | B |
|---|---|---|---|---|---|---|
| 1 · Key-Level mit Retest | 750 | +0,10R | +0,10R | 48 % | nein | ja |
| 2 · Fibonacci-Rücklauf | 74 | +0,22R | +0,23R | 46 % | nein | ja |
| 3 · VWAP | 1.222 | +0,13R | +0,12R | 62 % | nein | ja |
| 4 · Liquidity Sweep | 1.101 | +0,08R | +0,12R | 1 % | nein | ja |
| 6 · Order Block | 936 | +0,14R | +0,14R | 65 % | nein | ja |

„Rahmen allein“ bei allen +0,09R. **Urteil: kein Kandidat besteht** (A verlangt 95 % in Entwicklung und Prüfung). Kein nachweisbarer Vorteil bei der Wahl des Coins: Jeder Baustein verdient, was ein zufälliger Markt im Aufwärtstrend zur selben Kerze verdient. Der Sweep liegt unter dem Zufall. Regel 2 feuert zu selten (74 Trades). Donchian bleibt die einzige Regel mit A in der Entwicklung (99 %, Vergleichsregel, Prüfung nicht angesehen). Merker und alle Einzelheiten im Protokoll. Prüfung der fünf Regeln nicht geöffnet, Tresor zu.

### Was durchgefallen ist

- **Die fünf Einstiegs-Bausteine als Auswahl des Coins** (Testplan 1, siehe oben) und der Marktphasen-Schalter nach 28-Tage-Momentum (Regel 5, Prüfung).

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

**Geltung seit der Richtungsentscheidung vom 07.10.2026 (16:11):** Die Messlatten A und B gelten weiter für alles, was „scharf“ heißen soll, also für alles, was einen Vorteil behauptet. **Der Setup-Finder ist bewusst nicht scharf:** Er behauptet keinen Vorteil, seine Meldungen heißen „Beobachtung“, er zeigt keinen Score und keine Trefferquote. Seine Messlatte ist eine andere: „Findet er, was Jensen im Chart suchen würde?“ Geprüft wird das mit Bildern, die Jensen abnimmt, nicht mit Backtest-R. Bausteine werden nicht nach Backtest-Ergebnis ausgewählt oder gereiht: Ohne Vorteil gegenüber dem Zufall ist die Rangfolge selbst Zufall.

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

### Richtungsentscheidung von Jensen (07.10.2026, 16:11), gilt vor allem Älteren in diesem Abschnitt

**Anlass:** Testplan 1 hat ergeben, dass keiner der fünf Einstiegs-Bausteine besser ist als der Zufall. Jensens Recherche vom 07.10. (`RECHERCHE-MARKTPHASEN.md`, liegt Claude nicht vor) deckt sich laut Jensen damit: Eine Studie mit 7.846 technischen Regeln und Korrektur für Vielfach-Tests lässt fast nichts übrig; Rückhalt hat nur der schlichte Trendzustand.

**Entscheidung:**
1. Es werden keine weiteren Einstiegsregeln mehr auf Vorteil getestet.
2. Ziel ist, die App für Jensen brauchbar zu machen: ein Hinweisgeber, der ihm die Suche erspart. Die Analyse macht er von Hand.
3. Bausteine werden nicht nach Backtest-Ergebnis ausgewählt.

**Setup-Finder** (ersetzt die Idee „die besten fünf Indikatoren“):
- Bausteine: die fünf in den Blindproben abgenommenen Regeln in ihrer festgeschriebenen Fassung (Key-Level mit Ausbruch und Retest, Fib-Rücklauf mit Reaktion, VWAP, Liquidity Sweep, Order Block als Unterstützung). Grundsatz Körper bleibt.
- Messlatte: „Findet er, was Jensen im Chart suchen würde?“ Nicht: „Schlägt er den Markt?“
- Jede Meldung heißt „Beobachtung“ und behauptet keinen Vorteil. Kein Score, der Güte vortäuscht, keine Trefferquote.
- Treffen mehrere Bausteine beim selben Coin zusammen, steht er weiter oben (Jensens „Mehrheit der Faktoren“). Sortierung nach Zahl der Bausteine, nicht nach Backtest-R.
- Zeile „Platz nach oben“: Abstand in R bis zum nächsten bärischen Order Block über dem Kurs, geprüft auf 4H, Tag und Woche, mit Angabe der Zeitebene. Zuerst nur Information, kein Filter.
- Marktliste: Jensens handelbare Märkte (Hyperliquid/Ledger), nicht die 50 Binance-Märkte des Tests.
- Das Tagebuch schreibt je Beobachtung still mit, welche Bausteine beteiligt waren und wie es ausging. Nur beschreibend.

**Was vom Testen bleibt:**
- Testplan 2 „Marktphase“ einmal durchlaufen, wie entworfen, mit den Einwänden der zweiten Meinung (Verschiebe-Test, Phasen von mindestens 10 Tagen, Hürde 98 %). Schalter nicht nach der Recherche austauschen. Ergebnis wird eine Ampel als Anzeige.
- Optional und nur beschreibend: die fünf Regeln nach Schalterstand auswerten. Daraus wird keine Auswahl abgeleitet.
- Testplan 1: Der Tresor bleibt zu.

**Reihenfolge:**
1. Setup-Finder mit „Platz nach oben“ (zuerst als Vorschau in der App, Paket 8l)
2. Umstellen: Telegram und Heiße Coins melden „Beobachtung“, Erinnerung zum Zeit-Ausstieg (fest zugesagt), Meldung nach einer Pause (fasst den Wächter an: Tempo-Regel beachten)
3. Testplan 2 und Marktphasen-Ampel
4. Exit-Plan-Werkzeug (Zielzonen und Teilverkäufe vorab festlegen, die App erinnert) und Schönheits-OP mit Sicherung der App-Daten

**Entfallen damit:** Testplan 3 „Abschöpfen“ als eigener Test (der Gedanke lebt im Exit-Plan-Werkzeug weiter) · der Schatten-Modus für Donchian · ein Testplan zur Coin-Auswahl nach relativer Stärke und eine getestete Kombination zweier Bausteine (beides waren Vorschläge von Claude vom 07.10.).

**Sachlicher Stand für das Handeln:** Kein Baustein hat einen Vorteil gezeigt. Was trägt, ist der Rahmen: kleines Risiko je Trade, weiter Stop, Verkauf in Teilen. Die kleinste Risiko-Stufe bleibt die passende Wahl.

### Ältere Fassungen (zur Nachvollziehbarkeit)

**Reihenfolge am 06.10. abends vom Nutzer geändert („so einfach und so schnell wie möglich, so valide wie nötig"):** erst der **Testplan** (erledigt: `TESTPLAN.md`, vom Nutzer am 06.10. um 22:12 bestätigt, seitdem fest; **gehört zusammen mit diesem Masterplan in jeden neuen Chat**), dann **Binance** (Punkt 4, nächster Bau-Schritt), dann **Umstellen** (Punkt 1). Binance ist vom iPhone des Nutzers aus erreichbar (Test-Adresse im Browser geprüft, 06.10.); offen ist, ob die App selbst laden darf. Der Nutzer hat ein Binance-Konto; es wird nicht gebraucht, und API-Schlüssel kommen nie in App oder Repository.

**Stand (07.10., 14:45):** 8k2 ist gebaut; auf dem iPhone läuft 8k1. Blindproben der Regeln 2, 3, 4, 6 bestätigt, Regel 1 neu aufgesetzt (Änderung 3), noch nichts gerechnet. **Reihenfolge von Jensen am 07.10. um 08:29 entschieden: erst Testplan 1 zu Ende (8k), dann Testplan 2 „Marktphase“, danach „Umstellen“.** Früherer Stand: 8j (Änderung 1: neuer Zufalls-Vergleich) ist eingespielt und geprüft, die Maschine ist freigegeben. Regel 5 ist in der Prüfung durchgefallen (07.10.). **Nächster Bau-Schritt war 8k, in einem frischen Chat** (Füllstand dieses Chats am 07.10. um 00:45 nach Schätzung bei 75 bis 80 %; außerdem ist Claudes entpackte Code-Kopie durch einen Neustart der Arbeitsumgebung weg). In den neuen Chat gehören: Masterplan, `TESTPLAN.md`, `TESTPLAN-PROTOKOLL.md` und der aktuelle Code als ZIP. 8k: die Regeln 1, 2, 3, 4 und 6 (in 8i und 8j steht dafür teils noch „8j“). Ursprünglicher Wortlaut: die sechs Regeln aus dem Testplan als Engines auf der langen Historie (Paket 8i), danach „Umstellen“.

**Gewichtung nach den ersten Läufen (07.10., 01:28, von Jensen bestätigt):**

Anlass: Jensens Frage, ob jetzt ein Modell Vorrang bekommt, das den Beginn von Bullruns so früh wie möglich erkennt und die Gewinne abschöpft.

Einordnung durch Claude:
- **Was die Messung stützt:** Mit Schalter aus verdient der Rahmen ungefähr null (+0,02R und −0,01R), mit Schalter an liegt er im Plus (+0,16R und +0,05R). „Nur in Aufwärtsphasen profitabel“ ist damit ein **Hinweis**, kein Befund: Genau der Phasen-Schalter (Regel 5) ist in der Prüfung durchgefallen. Das Erkennen der Phase ist der schwere Teil.
- **„So früh wie möglich“ ist nicht prüfbar:** Vier Jahre enthalten zwei bis drei Bullrun-Starts; jedes Modell würde auf diese Stellen zugeschnitten. Prüfbar ist der **Zustand** (Aufwärtsphase heute, ja oder nein) über viele Tage und Wechsel, gepaart an gegen aus wie bei Regel 5. Früher erkennen heißt mehr Fehlalarme; das Ziel ist „früh genug, und ein Fehlstart kostet wenig“ (das Zweite regelt die Positionsgröße).
- **Der größere Nutzen liegt vermutlich am Ende eines Laufs:** „Schalter aus“ als Signal zum Verkleinern und Teilverkaufen trifft Jensens Schwäche, Gewinne beim Übergang in den Bärenmarkt nicht zu sichern.

Reihenfolge:
1. **Testplan 1 zu Ende bringen** (8k: Regeln 1, 2, 3, 4, 6). Er ist fest und beantwortet seit Änderung 1 die Frage „welcher Coin“.
2. **Testplan 2 „Marktphase“**, vorab geschrieben, bevor etwas läuft: höchstens drei Kandidaten (Vorschläge, noch nicht festgelegt: BTC gegen das Bull Market Support Band · Marktbreite · BTC über Tages-EMA 100), gepaart an gegen aus gemessen, Frühzeitigkeit nur beschreibend (Tage nach dem Tief, Fehlalarme). Gehört zum Zyklus-Kompass (Abschnitt 15).
3. **Testplan 3 „Abschöpfen“:** nachlaufender Stop gegen den heutigen Zeit-Ausstieg, dazu „Schalter aus“ als Ausstieg.

Einschränkungen: Die Prüfung 2024 bis 2025 wurde für einen Phasen-Schalter schon einmal angesehen; jeder weitere Kandidat darauf macht einen Zufallstreffer wahrscheinlicher, frisch ist nur der Tresor. Möglich: BTC bei Binance bis 2017 zurückholen (Bärenmarkt 2018), das bleibt aber eine Handvoll Zyklen. „Umstellen“ (unten) kommt nach Testplan 2 (von Jensen am 07.10. um 08:29 entschieden).

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

- Anzeige „Key-Level im Chart“ für das Vorsortieren, aber erst nach dem Ergebnis von Regel 1 und mit deren Definition (damit Chart und Messung dasselbe zeigen).
- Für Testplan 2: BTC bei Binance bis 2017 zurückholen (Bärenmarkt 2018).
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

**Vom Nutzer abgelehnt (nicht wieder vorschlagen):** „Max. Drawdown" umbenennen, Zeile „aktuell x % unter dem Hoch" (06.10.: „lass alles wie es ist"). Lightweight Charts als Fremdbibliothek. Mehr Indikatoren ohne Messung. **Am 07.10. geprüft und verworfen (Jensen: „du hast mich überzeugt“):** „Donchian MA Bands“ (LuxAlgo): Ausbruch aus einem Kanal auf geglättetem Kurs, zu nah an Donchian, schaltet spät aus, viele Stellschrauben · „DonAlt Toolkit“ (BigBeluga): reines Zeichenwerkzeug ohne Regel, Level erst 20 Kerzen später bekannt, die Ideen stecken genauer in Regel 1 und Regel 6. Beide stehen unter CC BY-NC-SA: kein Code davon ins Repository. Weitere Skripte kommen auf eine Liste für nach Testplan 1.

### Auf Halde (ändert Signale, wartet auf Messlatten und frische Daten)

Signal-Vorlauf verkürzen · Konfluenz-Stufen A/B/C · Golden Pocket 0,618 bis 0,65 mit Reaktion · Mindest-Stop der alten Engine anheben · Nadaraya-Watson (ohne Repainting) als Überdehnungs-Filter, nie gegen die Struktur · SMC-Bausteine (Order Blocks, FVG, Premium/Discount, Weak/Strong High/Low, gleiche Hochs/Tiefs) · MACD-Divergenz · Auswertung pro Markt · Korrektur-Filter für Longs (Anlass ALGO, SKY) und Korrektur-Short · Funding/Open-Interest-Bremse · Bär-Modus.

---

## 14. Strategie-Kandidaten

**Stand 07.10.2026 (Richtungsentscheidung): Alle Kandidaten in diesem Abschnitt ruhen.** Es werden keine weiteren Einstiegsregeln mehr auf Vorteil getestet. Die Liste bleibt als Gedächtnis stehen.

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

1. In der Dateien-App bereitlegen: `MASTERPLAN.md` (diese Fassung), `TESTPLAN.md`, `TESTPLAN-PROTOKOLL.md`. Ältere Fassungen vorher löschen, sonst hängt das iPhone eine Nummer an.
2. Den aktuellen Code als ZIP holen: `https://github.com/489bw7b66d-lab/wolf-desk/archive/refs/heads/main.zip` in Brave öffnen und herunterladen.
3. Neuen Chat öffnen und alle vier Dateien anhängen (Dateien-App → lange drücken → Teilen → Claude, oder im Chat über die Büroklammer).
4. Die erste Nachricht aus dem Abschnitt „Übergabe“ (ganz oben) einfügen und senden.
5. Der letzte Export („📤 Daten für Claude“) muss nicht mit. Er enthält Beträge und geht nie ins Repository.
