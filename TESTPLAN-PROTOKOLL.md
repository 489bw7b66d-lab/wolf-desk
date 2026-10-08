# Wolf Desk – Protokoll zum Testplan

Dieses Protokoll hält fest, was beim Laden der langen Historie und vor den Läufen festgelegt wurde. Der Testplan selbst (`TESTPLAN.md`, Fassung 3) ist unverändert; Änderungen daran stehen hier (Änderung 1 und 2). Enthält nur öffentliche Marktdaten.

## Präzisierungen (06.10.2026, von Jensen bestätigt, von der zweiten Meinung geprüft)

- **Stichtag** („heute" im Testplan) = Tag des ersten Prüfens der Märkte, in UTC. Er wird nie verschoben.
- **Tresor** = die 365 Tage vor dem Stichtag. Diese Kerzen werden nicht geladen, bis der Tresor geöffnet wird. Einzige Berührung: je Markt die Abfrage, ob es in den letzten drei Tagen vor dem Stichtag eine Kerze gibt (ja oder nein, kein Kurs).
- **„Nach Umsatz"** = Binance-Umsatz in USDT der 30 Tage vor der Tresor-Grenze.
- **„Seit mindestens zwei Jahren"** = erste Binance-Kerze mindestens 730 Tage vor dem Stichtag.
- **Sperrfrist:** keine Einstiege in den letzten 10 Tagen vor der Tresor-Grenze. Trades zählen nach Einstiegsdatum.
- **Gegenprobe:** Tagesschluss zwei Tage vor der Tresor-Grenze bei Hyperliquid und Binance, höchstens 5 % Abweichung.

## Festlegung

- **Stichtag:** 06.10.2026 (UTC) · **eingefroren am:** 06.10.2026 (UTC), App-Version 8h1
- **Entwicklung:** 01.01.2020 bis 31.12.2023
- **Prüfung:** 01.01.2024 bis 05.10.2025 (Einstiege bis 25.09.2025, danach 10 Tage Sperrfrist)
- **Tresor:** 06.10.2025 bis 05.10.2026 (nicht geladen)
- **Geprüft:** 175 handelbare Märkte · erfüllen alle Bedingungen: 103 · ausgewählt: 50
- **Ausgeschieden:** 34 × nicht bei Binance · 36 × weniger als zwei Jahre bei Binance · 2 × Handel endete vor der Tresor-Grenze
- **Nicht bei Binance:** HYPE, PONS, MON, GRAM, FARTCOIN, VVV, GRASS, AERO, USELESS, PURR, CC, ASTER, MET, AZTEC, CHIP, SPX, SKR, APEX, MNT, KAS, MEGA, FOGO, MELANIA, ZORA, BSV, BRETT, POPCAT, STBL, STABLE, ZETA, GOAT, MERL, MOODENG, GRIFFAIN

## Die 50 Märkte (Reihenfolge nach Umsatz)

| Nr. | Markt | Binance | erste Kerze | Gegenprobe | Lücken 1d | Lücken 4h |
|---|---|---|---|---|---|---|
| 1 | ETH | ETHUSDT | 01.01.2020 | ok | 0 | 1 |
| 2 | BTC | BTCUSDT | 01.01.2020 | ok | 0 | 1 |
| 3 | SOL | SOLUSDT | 11.08.2020 | ok | 0 | 0 |
| 4 | DOGE | DOGEUSDT | 01.01.2020 | ok | 0 | 1 |
| 5 | XRP | XRPUSDT | 01.01.2020 | ok | 0 | 1 |
| 6 | BNB | BNBUSDT | 01.01.2020 | ok | 0 | 1 |
| 7 | AVAX | AVAXUSDT | 22.09.2020 | ok | 0 | 0 |
| 8 | SUI | SUIUSDT | 03.05.2023 | ok | 0 | 0 |
| 9 | WLD | WLDUSDT | 24.07.2023 | ok | 0 | 0 |
| 10 | ENA | ENAUSDT | 02.04.2024 | ok | 0 | 0 |
| 11 | kPEPE | PEPEUSDT × 1000 | 05.05.2023 | ok | 0 | 0 |
| 12 | ADA | ADAUSDT | 01.01.2020 | ok | 0 | 1 |
| 13 | TRX | TRXUSDT | 01.01.2020 | ok | 0 | 1 |
| 14 | LINK | LINKUSDT | 01.01.2020 | ok | 0 | 1 |
| 15 | LTC | LTCUSDT | 01.01.2020 | ok | 0 | 1 |
| 16 | NEAR | NEARUSDT | 14.10.2020 | ok | 0 | 0 |
| 17 | ARB | ARBUSDT | 23.03.2023 | ok | 0 | 0 |
| 18 | kBONK | BONKUSDT × 1000 | 15.12.2023 | ok | 0 | 0 |
| 19 | ZEC | ZECUSDT | 01.01.2020 | ok | 0 | 1 |
| 20 | APT | APTUSDT | 19.10.2022 | ok | 0 | 0 |
| 21 | ETHFI | ETHFIUSDT | 18.03.2024 | ok | 0 | 0 |
| 22 | EIGEN | EIGENUSDT | 01.10.2024 | ok | 0 | 0 |
| 23 | DOT | DOTUSDT | 18.08.2020 | ok | 0 | 0 |
| 24 | SEI | SEIUSDT | 15.08.2023 | ok | 0 | 0 |
| 25 | HBAR | HBARUSDT | 01.01.2020 | ok | 0 | 1 |
| 26 | AAVE | AAVEUSDT | 15.10.2020 | ok | 0 | 0 |
| 27 | WIF | WIFUSDT | 05.03.2024 | ok | 0 | 0 |
| 28 | BCH | BCHUSDT | 01.01.2020 | ok | 0 | 1 |
| 29 | CAKE | CAKEUSDT | 19.02.2021 | ok | 0 | 0 |
| 30 | XLM | XLMUSDT | 01.01.2020 | ok | 0 | 1 |
| 31 | PAXG | PAXGUSDT | 28.08.2020 | ok | 0 | 0 |
| 32 | kSHIB | SHIBUSDT × 1000 | 10.05.2021 | ok | 0 | 0 |
| 33 | CRV | CRVUSDT | 15.08.2020 | ok | 0 | 0 |
| 34 | TAO | TAOUSDT | 11.04.2024 | ok | 0 | 0 |
| 35 | LDO | LDOUSDT | 09.05.2022 | ok | 0 | 0 |
| 36 | kFLOKI | FLOKIUSDT × 1000 | 05.05.2023 | ok | 0 | 0 |
| 37 | W | WUSDT | 03.04.2024 | ok | 0 | 0 |
| 38 | OP | OPUSDT | 01.06.2022 | ok | 0 | 0 |
| 39 | PYTH | PYTHUSDT | 02.02.2024 | ok | 0 | 0 |
| 40 | FIL | FILUSDT | 15.10.2020 | ok | 0 | 0 |
| 41 | TIA | TIAUSDT | 31.10.2023 | ok | 0 | 0 |
| 42 | FET | FETUSDT | 01.01.2020 | ok | 0 | 1 |
| 43 | POL | POLUSDT | 13.09.2024 | ok | 0 | 0 |
| 44 | PENDLE | PENDLEUSDT | 03.07.2023 | ok | 0 | 0 |
| 45 | YGG | YGGUSDT | 24.09.2021 | ok | 0 | 0 |
| 46 | ETC | ETCUSDT | 01.01.2020 | ok | 0 | 1 |
| 47 | GALA | GALAUSDT | 13.09.2021 | ok | 0 | 0 |
| 48 | kNEIRO | NEIROUSDT × 1000 | 16.09.2024 | ok | 0 | 0 |
| 49 | ICP | ICPUSDT | 11.05.2021 | nicht möglich | 0 | 0 |
| 50 | SNX | SNXUSDT | 09.07.2020 | ok | 0 | 0 |

## Anmerkungen (keine Änderung am Plan)

- Neun Märkte beginnen erst 2024 und haben keine Kerzen in der Entwicklung: ENA, ETHFI, EIGEN, WIF, TAO, W, PYTH, POL, kNEIRO. Die Entwicklung läuft auf 41 Märkten, die Prüfung auf 50.
- POL beginnt am 13.09.2024; die Historie des Vorgängers MATIC ist nicht enthalten.
- PAXG ist ein Gold-Token und gehört dazu, weil er handelbar ist.
- ICP ohne Gegenprobe (bei Hyperliquid am Vergleichstag keine Kerze); der Name ist eindeutig.
- 15 der Märkte, die es seit Januar 2020 gibt, haben je eine fehlende 4H-Kerze (vermutlich dieselbe Wartungspause bei Binance).

## Lesarten für die Rechnung (07.10.2026, vor dem ersten Lauf festgeschrieben, von Jensen bestätigt)

1. **Rahmen:** Anteile 20 % bei 2R, 30 % bei 3R, 30 % bei 4R, Rest 20 % läuft (Jensens Ausstiegsplan vom 06.10.). Nach dem zweiten Ziel Stop auf Einstieg, danach stufenweise hinter dem letzten Ziel. Fest im Test-Code; spätere Änderungen am Ausstiegsplan der App ändern den Test nicht.
2. **Zufall „gleich viele je Kalendermonat, in denselben Märkten“:** je Markt und Kalendermonat so viele Zufalls-Einstiege, wie die Regel dort hatte, ohne Überschneidung im selben Markt.
3. **Regel 5:** Zufalls-Einstiege, im Schnitt einer je 280 freien 4H-Kerzen (wie beim bisherigen Zufalls-Maßstab), einmal mit Schalter (die Regel) und 200-mal ohne (der Vergleich). Schalter: gleichgewichteter Schnitt der 28-Tage-Veränderung aller Märkte, die es am letzten abgeschlossenen Tag gab, im Plus.
4. **Donchian als Vergleichsregel** läuft im gemeinsamen Rahmen mit Zeit-Ausstieg nach 10 Tagen, nicht mit seinem eigenen Ausstieg.

Von Claude zusätzlich festgelegt (technisch, ohne Wahl nach Ergebnis):

5. **Gebühr** fest 0,045 % je Seite (Hyperliquid-Grundsatz) statt des persönlichen Satzes, damit jeder Lauf dasselbe ergibt. Funding 0,03 % je Tag wie seit 8d.
6. **Mindestens 110 abgeschlossene Tageskerzen** vor jedem Einstieg, für Regeln und Zufall gleich (wie bei „Neu im Trend“).
7. **Tageswerte** (ATR, EMA, Level) stammen immer von der letzten Tageskerze, die beim Schluss der 4H-Signalkerze schon abgeschlossen war.
8. **„Besser als 95 %“:** Die Regel liegt über mindestens 95 % der Durchgänge (bei 200 also über mindestens 190).
9. **Spanne der Regel:** 1.000 Ziehungen ganzer Kalendermonate des Zeitraums, 5. bis 95. Perzentil des Ø R.
10. **Prüfung** reicht bis zum Beginn der Sperrfrist (Einstiege bis 25.09.2025).

## Änderung 1 (07.10.2026): neuer Zufalls-Vergleich

**Von Jensen am 07.10.2026 ausdrücklich bestätigt („ja ändere das“), nach Prüfung durch die zweite Meinung. Vor dem ersten Lauf eines der Kandidaten 1, 2, 3, 4, 6. Nur die Entwicklung war bis dahin angesehen, Prüfung und Tresor waren zu. Danach wird am Vergleich nichts mehr geändert, egal wie die Regeln abschneiden.**

**Grund:** Lesart 2 (je Markt und Kalendermonat gleich viele Zufalls-Einstiege) wählt Markt-Monate im Nachhinein aus. Ein Markt-Monat mit Signal ist im Rückblick ein besonderer Monat dieses Coins, und der Zufall darf darin vor dem Auslöser einsteigen. Das verzerrt gegen Ausbruch- und Trendregeln und für Rücksetzer-Regeln. Lesart 3 hat Regel 5 (einen Zeit-Filter) gegen Zufall in denselben Monaten gemessen, also gegen fast dieselben Tage.

**Nachweis unabhängig von echten Zahlen:** Auf Zufallskursen ohne jeden Vorteil (40 Sätze mit je 10 Märkten) liegt Donchian mit dem alten Vergleich im Schnitt bei 0 % der Durchgänge, mit dem neuen bei 51 %. Der Nachweis läuft als fester Test mit (test-longtest.js).

**Neue Lesart 2 (ersetzt die alte) für die Regeln 1, 2, 3, 4, 6 und die Vergleichsregeln:**
- Zu jedem Einstieg der Regel (Zeit t, Markt m) steigt der Zufall zur selben 4H-Kerze t in einem zufälligen zulässigen Markt ein.
- Zulässig: zu t genug Historie (110 Tage), die gemeinsame Vorbedingung der Regel erfüllt (Tagestrend aufwärts: Tages-EMA 20 über EMA 100; bei Donchian keine), in diesem Durchgang nicht schon im Trade. Der Markt der Regel selbst darf gezogen werden.
- Gibt es keinen zulässigen Markt, wird der Einstieg ausgelassen und gezählt.
- Derselbe Rahmen, 200 Durchgänge, Platz der Regel in der Verteilung (A ab 95 %).
- Die Frage, die A damit beantwortet: Ist dieser Markt an dieser Stelle besser als ein beliebiger zulässiger Markt zur selben Zeit?
- Zusätzlich nur beschreibend: „Rahmen allein“ (Einstieg an jeder 5. Kerze jedes Marktes). Zählt nicht fürs Urteil.

**Neue Lesart 3 (ersetzt die alte) für Regel 5:**
- Je Durchgang Zufalls-Einstiege über Zeit und Märkte, im Schnitt einer je 280 freien 4H-Kerzen, ein offener Trade je Markt.
- Jeder Einstieg wird nach dem Schalterstand am letzten abgeschlossenen Tag eingeteilt (an / aus).
- Kennzahl: Ø R an minus Ø R aus. A bestanden, wenn die Differenz in mindestens 95 % der 200 Durchgänge über 0 liegt, in Entwicklung und Prüfung. B: Ø R bei Schalter an im Plus. Trades = Ø Zahl der Einstiege bei Schalter an je Durchgang.
- Berichtet werden zusätzlich der Anteil der Tage mit Schalter an und die Zahl der Wechsel.

**Ungültige Ergebnisse (alter Vergleich, App 8i, Entwicklung 2020 bis 2023; bleiben hier stehen, daraus werden keine Schlüsse gezogen):**
- Neu im Trend: 935 Trades, Ø +0,13R · Zufall Ø +0,17R (+0,13R bis +0,21R) · besser als 7 % der Durchgänge
- Donchian 20/10: 883 Trades, Ø +0,26R · Zufall Ø +0,47R (+0,42R bis +0,52R) · besser als 0 %
- Regel 5: 358 Trades, Ø +0,24R · Zufall Ø +0,24R (+0,16R bis +0,33R) · besser als 42 %

Die Zahlen der Regeln selbst (Trades, Ø R) bei „Neu im Trend“ und Donchian hängen nicht am Vergleich und bleiben gültig.

## Lesarten 11 bis 16 für die Regeln 1, 2, 3, 4 und 6 (07.10.2026)

**Vor dem ersten Lauf eines der fünf Kandidaten festgeschrieben. Von Jensen am 07.10.2026 um 09:53 bestätigt („ja mach alles so“), nach Prüfung durch zwei zweite Meinungen (08:03 und 08:10). Bis dahin war von diesen Regeln keine Zahl bekannt. Danach nur noch Fehlerkorrekturen, wenn der Code von der geschriebenen Lesart abweicht, mit Eintrag hier. Keine Änderung einer Lesart nach Sicht von Ergebnissen. Kommt eine Regel nicht auf 300 Trades, besteht sie B nicht; es wird nichts gelockert.**

„Festlegung, nicht im Plan“ heißt: Der Testplan lässt die Stelle offen, ohne Festlegung wäre die Regel nicht rechenbar.

**Lesart 11, für alle fünf Regeln**
- Tages-ATR, EMA und Level stammen vom letzten Tag, dessen Schluss nicht nach dem Schluss der 4H-Signalkerze liegt (die Kerze, die um 00:00 UTC schließt, nutzt den eben beendeten Tag).
- Der Tagestrend (Tages-EMA 20 über EMA 100) wird an der Signalkerze geprüft, mit derselben Funktion wie beim gewürfelten Markt des Vergleichs.
- Swing-Punkt aus Dochten (4H-Swings der Regeln 4 und 6): strikt höher bzw. tiefer als die 5 Kerzen davor und die 5 danach; bei Gleichstand kein Swing. Körper-Swings (4H-Swings der Regel 1, Tages-Swings der Regel 2): siehe Änderung 2. Jeder Swing zählt erst nach seiner Bestätigung (5 Kerzen bzw. 5 Tage später).
- Setups laufen weiter, während im Markt ein Trade offen ist. Ein dadurch verpasster Einstieg ist verbraucht und wird gezählt („Signale verfallen“).
- Fallen an einer Kerze mehrere Level, Tiefs oder Blöcke zusammen, ist das ein Einstieg.

**Lesart 12, Regel 1 (Key-Level, Ausbruch mit Retest), in der Fassung von Änderung 3**
- Mögliche Level: bestätigte **Körper-Swings im 4H-Chart** (Körper-Hochs und Körper-Tiefs, je 5 Kerzen davor und danach) der bis zu 180 Tage vor dem Ausbruchstag, vor dem Ausbruchstag schon bestätigt. *(Level aus Swing-Punkten: Festlegung, nicht im Plan.)*
- **Band = Level plus und minus ¼ 4H-ATR** (Breite ½ ATR(14) der 4H-Kerzen, Stand: Ende des Tages vor dem Ausbruch). Auf Zufallskursen rund 40 % der Breite aus dem Testplan (½ Tages-ATR).
- Berührung = **eine Körperkante einer 4H-Kerze liegt im Band; ein Docht allein zählt nicht.** Sie zählt nur, wenn der Kurs danach deutlich wegdreht: ein 4H-Schluss mindestens 1 **Tages**-ATR jenseits des Bandes, zurück auf der Seite, von der er kam (Seite = 4H-Schluss vor der Berührung, unter oder über dem Level), spätestens 60 Kerzen (10 Tage) nach der letzten Kerze im Band. *(Frist: Festlegung, nicht im Plan.)*
- **Alles, was der Kurs bis zu diesem Wegdrehen am Band tut, ist eine Berührung.** Die nächste beginnt erst danach. Ein Durchlauf (Schluss 1 Tages-ATR auf der anderen Seite) ist keine Berührung. *(Festlegung, nicht im Plan; damit heißt „dreimal“ wirklich dreimal gedreht.)*
- Jede Berührung samt Wegdrehen ist vor dem Ausbruchstag abgeschlossen. Mindestens drei Berührungen, zwischen erster und letzter mindestens 28 Tage.
- Ausbruch = der erste Tagesschluss über dem Band (der Schluss davor lag nicht darüber). Unverändert.
- Retest = die Körper-Unterkante einer 4H-Kerze erreicht die Band-Oberkante, in den 4H-Kerzen nach dem Ausbruchstag und innerhalb von 10 Tagen. Einstieg = der erste 4H-Schluss über dem Band ab der Retest-Kerze, ohne eigene Frist.
- Ein Tagesschluss unter dem Band beendet das Setup. *(Festlegung, nicht im Plan.)*
- Überlappende Bänder: keines wird verworfen; die Merker kommen vom Band mit den meisten Berührungen, bei Gleichstand vom höheren.
- Merker: Zahl der Berührungen · Alter des Levels (erste Berührung bis Ausbruch, in Wochen).

**Lesart 13, Regel 2 (Fibonacci-Rücklauf), zusammen mit Änderung 2**
- Impuls = das letzte bestätigte Swing-Hoch und das letzte bestätigte Swing-Tief davor. Kleiner als 6 ATR (ATR am Tag des Hochs): kein Setup, es wird nicht weiter zurück gesucht.
- Einstieg = Schluss der Bestätigungskerze der Umkehrpunkt-Regel (`reversalPoint` der App, unverändert: Doji, Dragonfly Doji, Hammer, Bullish Engulfing; die Bestätigungskerze ist grün und schließt über dem Körper der Kerze vor der Umkehrkerze).
- Das Setup endet bei einem Tagesschluss unter 0,786, bei einem Tagesschluss über dem Swing-Hoch *(Festlegung, nicht im Plan)* oder wenn ein neues Swing-Hoch bestätigt ist. Einmal ungültig bleibt ungültig.
- Mehrere Einstiege aus demselben Impuls sind erlaubt.
- Merker: Teilzone (0,382 bis 0,5 · 0,5 bis 0,618 · Golden Pocket) · erster oder wiederholter Einstieg aus dem Impuls.

**Lesart 14, Regel 3 (VWAP)**
- Level = VWAP-Schlusswerte (HLC3 mal Binance-Volumen, aus Tageskerzen) der letzten vier abgelaufenen Wochen (ab Montag UTC) und der letzten zwei abgelaufenen Monate (ab dem Ersten UTC). Nur vollständige Wochen und Monate; eine unvollständige wird nicht durch eine ältere ersetzt.
- „Von oben“: **Die Körper-Unterkante** der Kerze davor lag mehr als ½ ATR über dem Level, die dieser Kerze nicht mehr (Änderung 2). Ein Docht allein ist keine Annäherung.
- Einstieg = die erste 4H-Kerze ab der Annäherung, die über dem Level schließt (das kann die Annäherungskerze selbst sein). Danach braucht es eine neue Annäherung von oben.
- Die Annäherung verfällt, wenn eine 4H-Kerze mehr als ½ ATR unter dem Level schließt oder die Woche bzw. der Monat wechselt. *(Festlegung, nicht im Plan.)*
- **Das Urteil gilt für „Annäherung an ein VWAP-Level“:** Der Plan verlangt kein Unterschreiten. Berichtet wird die Zahl der Einstiege je Markt und Jahr.
- Merker: welches Level (Woche oder Monat, wie viele Perioden zurück; bei mehreren das nächstgelegene) · ob weitere Level innerhalb von ½ ATR liegen.

**Lesart 15, Regel 4 (Liquidity Sweep)**
- Swing-Tiefs im 4H-Chart aus den Tiefs der Kerzen, höchstens 20 Tage alt.
- Es zählen nur Tiefs, unter denen seit ihrer Bestätigung noch keine 4H-Kerze geschlossen hat. *(Festlegung, nicht im Plan; von Jensen am 07.10. bestätigt.)* Tiefs, die nur per Docht unterschritten wurden, zählen weiter.
- Signalkerze: eröffnet über dem Tief *(Festlegung, nicht im Plan)*, Tief darunter, Schluss darüber.
- Merker: erster oder wiederholter Sweep dieses Tiefs (bei mehreren Tiefs das jüngste).

**Lesart 16, Regel 6 (Order Block als Unterstützung)**
- Swing-Hochs im 4H-Chart aus den Hochs der Kerzen. Ereignis = der erste 4H-Schluss über dem jüngsten bestätigten Swing-Hoch, über dem noch keine 4H-Kerze geschlossen hat. *(Wahl des Swing-Hochs: Festlegung, nicht im Plan.)*
- Block = die letzte fallende 4H-Kerze vor dieser Kerze: Körper von der Eröffnung bis zum Schluss, Docht vom Schluss bis zum Tief.
- Der Rücklauf zählt ab der Kerze nach dem Ereignis. Nur der erste Rücklauf zählt (zusammenhängende Kerzen mit Tief im Block). Einstieg = die erste davon, die über der Körpermitte schließt.
- Eine Kerze mit Tief unter dem Block ist keine Einstiegskerze und beendet den ersten Rücklauf. Ein 4H-Schluss unter dem Block macht ihn ungültig.
- Keine Altersgrenze (der Plan nennt keine).
- Merker: Rücklauf nur in den Körper oder bis in den Docht · Alter des Blocks.

**Zusätzliche Merker gegenüber dem Testplan (nur beschreibend):** Regel 2 erster oder wiederholter Einstieg · Regel 4 erster oder wiederholter Sweep · Regel 6 Alter des Blocks. Aus Merkern wird ohne neuen Testplan keine Regel abgeleitet.

## Änderung 2 (07.10.2026): Grundsatz Körper

**Von Jensen am 07.10.2026 bestätigt: um 09:53 für Regel 2 („ja mach alles so“), um 11:19 und 11:25 als Grundsatz für alle Regeln („immer mit dem Kerzenkörper rechnen“; Sweep bleibt beim Docht, Key-Level-Berührung nur mit Körper). Ausgearbeitet von der zweiten Meinung (Nachtrag vom 07.10., 11:25), von Claude gegen den Code geprüft. Vor dem ersten Lauf eines der Kandidaten 1, 2, 3, 4, 6; von keiner dieser Regeln war eine Zahl bekannt. Gerechnet wird nur diese eine Fassung, eine Docht-Fassung läuft nicht mit. Damit ist die Frage Körper oder Docht für alle Regeln abgeschlossen.**

**Grund:** Jensens Erfahrung aus dem eigenen Handel: Kerzenkörper liefern bei Strukturbrüchen, Ausbrüchen und vor allem bei Fib-Leveln die besseren Ergebnisse. Eine kurze Recherche am 07.10. fand keine Studie, die Körper und Docht direkt vergleicht; die Änderung stützt sich auf seine Handschrift, nicht auf einen Beleg. Der Test soll prüfen, was er handelt.

**Grundsatz:** Wo ein Level liegt und wann der Kurs es erreicht, entscheidet die Körperkante (Oberkante = das Größere aus Eröffnung und Schluss, Unterkante = das Kleinere). Dochte zählen nur dort, wo sie zum Wesen der Regel gehören.

**Was sich gegenüber dem Wortlaut des Testplans ändert:**
- **Regel 1:** Mögliche Level sind bestätigte Körper-Swings (seit Änderung 3 im 4H-Chart). Berührung = eine Körperkante liegt in der Zone, ein Docht allein zählt nicht (Testplan: Tageshoch oder Tagestief). Retest auf 4H = die Körper-Unterkante erreicht die Zonen-Oberkante. Wegdrehen, Ausbruch und Einstieg laufen über Schlusskurse und bleiben; Zonenbreite, Fristen, vier Wochen und überlappende Zonen bleiben.
- **Regel 2:** Swing-Hoch und Swing-Tief des Impulses kommen aus den Körpern der Tageskerzen (Testplan: Tageshoch und Tagestief). „In der Zone“ wird an der Körper-Unterkante der Umkehrkerze geprüft; danach richtet sich auch der Merker für die Teilzone.
- **Regel 3:** Die Annäherung wird an der Körper-Unterkante gemessen. Einstieg und Verfall laufen über Schlusskurse und bleiben.
- **Gleichstand bei Körper-Swings (Regel 1 und 2):** strikt höher (tiefer) als die 5 Tage davor, höher (tiefer) oder gleich die 5 danach; es zählt der frühere Tag. Grund: Ohne Kurslücke ist die Eröffnung eines Tages der Schluss des Vortags, zwei Nachbartage teilen sich dann dieselbe Körperkante, und mit „strikt auf beiden Seiten“ gäbe es fast nie einen Körper-Swing. Eröffnet der zweite Tag einen Tick höher, zählt der zweite. *(Technische Festlegung von Claude, ohne Wahl nach Ergebnis; per Test abgesichert: Plateau und Tick-Fall ergeben je genau einen Swing.)*

**Bewusst unverändert:**
- **Regel 4 (Sweep):** Ein Sweep ist ein Docht unter ein Tief mit Schluss darüber. Das Swing-Tief bleibt das Docht-Tief, weil dort die Stops liegen. Von Jensen am 07.10. um 11:19 bestätigt.
- **Regel 6 (Order Block):** Körper und Docht sind dort auf Jensens Wunsch schon getrennt. Das 4H-Swing-Hoch bleibt das Docht-Hoch; überschritten wird es per Schlusskurs.
- **Gemeinsamer Rahmen und Zufalls-Vergleich:** Die ATR bleibt die normale mit Dochten, der Stop bleibt 2 × Tages-ATR.

**Folge, vor dem ersten Lauf benannt (aus Zufallskursen, keine echten Kerzen):** Mit Körper-Berührungen feuert Regel 1 deutlich seltener als in der Docht-Fassung, auf Zufallskursen je nach Kursmodell um 40 bis 60 % weniger. Regel 2 feuert dort unter einmal je Markt und Jahr. Ob beide die 300 Trades erreichen, ist offen. Die Blindprobe nennt die Zahl der Einstiege in der Entwicklung, bevor ein Ergebnis bekannt ist. Erreicht eine Regel die 300 nicht, besteht sie B nicht; gelockert wird nichts.

## Änderung 3 (07.10.2026): Regel 1 nimmt ein schmales Band aus dem 4H-Chart

**Von Jensen am 07.10.2026 um 14:05 bestätigt (zur Beschreibung „stimme ich zu“, zum Einstieg „richtig“, zur Breite „ja mach das so“). Vor dem ersten Lauf eines der Kandidaten 1, 2, 3, 4, 6; von keiner dieser Regeln ist eine Zahl bekannt. Zweite Meinung am 07.10. um 14:45: zulässig (siehe „Läufe“). Neue Blindprobe von Jensen um 14:35 abgenommen.**

**Anlass:** Die Blindprobe von Regel 1 (Fassung 2, App 8k1) hat Jensen am 07.10. um 13:17 abgelehnt. Seine Notizen zu den fünf Bildern: Alle fünf 4H-Bilder passen; drei von fünf Tagesbildern passen nicht (Nr. 1 „zu ungenau, letzte Kerze bearish“, Nr. 4 und 5 „eher ein Short-Einstieg“). Danach hat er vier eigene Charts mit von Hand gezeichneten Leveln geschickt (4H-Charts von heute; der Verlauf danach ist ihm bekannt, deshalb dienen sie nur als Beschreibung seiner Handschrift, nicht als Beleg).

**Was Claude daraus gelesen und Jensen bestätigt hat:**
1. Ein Key-Level ist ein schmales waagrechtes Band.
2. Es liegt dort, wo sich Kerzenkörper stauen; Dochte dürfen hindurchstechen.
3. Es zählt, wenn der Kurs dort mehrmals deutlich gedreht hat, von unten oder von oben.
4. Besonders stark ist es, wenn es die Rolle wechselt (erst Widerstand, nach dem Ausbruch Unterstützung).
5. Er zeichnet es im 4H-Chart; die Berührungen verteilen sich über Wochen.
Einstieg: Der Kurs kommt nach dem Ausbruch von oben auf das Band zurück, und eine 4H-Kerze schließt wieder darüber.

**Was sich gegenüber dem Testplan ändert (nur Regel 1):**
- Breite: ½ ATR der **4H-Kerzen** statt ½ Tages-ATR.
- Level und Berührungen kommen aus dem **4H-Chart** statt aus dem Tageschart.
- Mehrere Kontakte am Band vor einem Wegdrehen sind eine Berührung.

**Was bleibt:** mindestens drei Berührungen in 180 Tagen von oben oder unten, vier Wochen zwischen erster und letzter, Wegdrehen um 1 Tages-ATR, Ausbruch per Tagesschluss, Rückkehr binnen 10 Tagen, Einstieg mit dem ersten 4H-Schluss darüber. Punkt 4 (Rollenwechsel) ist kein eigenes Kriterium; er ergibt sich beim Einstieg von selbst, weil das Band nach dem Ausbruch von oben getestet wird.

**Berichtigung:** Claude hatte die neue Breite im Chat auf „ein Fünftel bis ein Viertel“ der alten geschätzt. Gemessen sind es auf Zufallskursen rund 40 %. Jensen wurde darauf hingewiesen; ob das Band schmal genug ist, zeigt die Blindprobe.

**Verworfen:** Claudes Vermutungen „Einstiegskerze muss grün sein“ und „Berührungen nur von unten“ haben Jensens Bilder nicht bestätigt; sie wurden nicht eingebaut.

## Blindprobe vor dem ersten Lauf (07.10.2026, Vorschlag der zweiten Meinung, von Jensen bestätigt)

- Je Regel zeigt die App fünf zufällig gezogene Einstiege der Entwicklung als Kerzenbild: Level oder Zone und die Signalkerze. Ohne Coin, ohne Datum, ohne Kurse, ohne Ergebnis und ohne eine Kerze nach dem Einstieg. Dabei wird kein Trade gerechnet.
- Jensen sagt je Regel „Das ist, was ich meine“ oder „Nein, weil …“. Erst nach der Bestätigung gibt die App „Entwicklung rechnen“ für diese Regel frei.
- Bei „Nein“ wird Code oder Lesart berichtigt, bevor eine Zahl bekannt ist; die Fassung der Regeln steigt und die Blindprobe gilt neu. **Zurzeit Regel 1 Fassung 3 (Änderung 3, App 8k2), die Regeln 2, 3, 4 und 6 Fassung 2 (Grundsatz Körper, App 8k1).** Fassung 1 (App 8k, Regel 1 und 3 noch mit Dochten) wurde nie gerechnet.
- Regel 1: Im ersten Bild (4H-Chart über die Berührungen) steht • für eine Berührung (Körperkante im Band) und × für eine Kerze, bei der nur ein Docht das Band antippt (zählt nicht). Zeigt keines der fünf Bilder ein ×, kommt gezielt ein sechstes dazu, das eines zeigt.
- Zweck: prüfen, ob der Code die Lesart trifft und die Lesart Jensens Handschrift.

**Stand der Blindproben (07.10.2026):** Regel 2 bestätigt (in der App, vor 12:57) · Regel 3 bestätigt um 13:46 („unterschreibe ich jedes Bild“) · Regel 4 bestätigt um 13:47 · Regel 6 bestätigt um 13:48 · **Regel 1 abgelehnt um 13:17** (Fassung 2), neu aufgesetzt mit Änderung 3 (Fassung 3, App 8k2) und **um 14:35 abgenommen**. Seit 8k2 hat jede Regel ihre eigene Fassung: Die Bestätigungen der Regeln 2, 3, 4 und 6 bleiben gültig.

## Nachweis für die fünf Regeln an Zufallskursen (07.10.2026, App 8k2, keine echten Kerzen)

Auf Zufallskursen ohne jeden Vorteil (30 Sätze mit je 10 Märkten, vier Jahre) liegen die Regeln im festen Zufalls-Vergleich im Schnitt bei diesen Plätzen: Regel 1 (Fassung 3) bei 48 %, Regel 2 bei 50 %, Regel 3 bei 44 %, Regel 4 bei 46 %, Regel 6 bei 58 %. Der Vergleich zieht also keine der Regeln systematisch nach oben oder unten. Am Vergleich wurde nichts geändert.

## Nachträge (07.10.2026)

- **Fehlende 4H-Kerze:** 19.02.2020, 12:00 UTC, bei 15 Märkten (aus dem Export vom 07.10., 12:57). Eine Kerze, passt zur vermuteten Wartungspause bei Binance.
- **Reihenfolge:** Solange die Lesart von Regel 1 offen ist, wird bei keinem der fünf Kandidaten „Entwicklung rechnen“ getippt (mit Jensen am 07.10. um 13:46 vereinbart).

## Läufe

(wird nach jedem gültigen Lauf ergänzt: Datum, Regel, Zeitraum, Ergebnis)

### 07.10.2026, 00:38 · App 8j · Zufalls-Vergleich Fassung 2 · Entwicklung (2020 bis 2023)

- **Neu im Trend (Vergleichsregel):** 935 Trades · Ø +0,13R (Spanne ±0,00R bis +0,25R, 48 Monate) · Treffer 48 % · Zufall selbe Kerze Ø +0,14R (+0,11R bis +0,18R, 200 Durchgänge, je rund 935 Trades) · besser als 28 % der Durchgänge · Rahmen allein Ø +0,09R · A nein · B ja
- **Donchian 20/10 (Vergleichsregel):** 883 Trades · Ø +0,26R (Spanne +0,07R bis +0,43R, 48 Monate) · Treffer 47 % · Zufall selbe Kerze Ø +0,21R (+0,18R bis +0,25R, 200 Durchgänge, je rund 882 Trades, 1 ausgelassen) · besser als 99 % der Durchgänge · Rahmen allein Ø +0,09R · A ja · B ja
- **Regel 5, Marktphasen-Schalter (Kandidat):** Schalter an Ø +0,16R (rund 350 Trades je Durchgang) · aus Ø +0,02R (rund 309) · Differenz Ø +0,14R (+0,01R bis +0,26R) · über 0 in 96 % der 200 Durchgänge · Schalter an 56 % der 1.433 Tage, 86 Wechsel · A ja · B ja · Trades 350 (nötig 300)

**Stand danach:** Regel 5 hat die Entwicklung bestanden und darf einmal in die Prüfung. Die Prüfung ist bei keiner Regel angesehen (Stand 07.10.2026, 00:45). Tresor gesperrt. Die Kandidaten 1, 2, 3, 4 und 6 sind noch nicht gelaufen.

### 07.10.2026, 00:53 · App 8j · Zufalls-Vergleich Fassung 2 · Prüfung von Regel 5 (einmalig geöffnet)

- **Regel 5, Prüfung (2024 bis 25.09.2025):** Schalter an Ø +0,05R (rund 259 Trades je Durchgang) · aus Ø −0,01R (rund 275) · Differenz Ø +0,06R (−0,07R bis +0,19R) · über 0 in 78 % der 200 Durchgänge · Schalter an 49 % der 634 Tage, 59 Wechsel
- A: Entwicklung ja · Prüfung nein · B: Entwicklung ja · Prüfung ja · Trades gesamt 609 (nötig 300)

**Urteil: Regel 5 nicht bestanden.** Sie geht nicht in den Tresor und wird nicht nachgebessert. Der Blick in die Prüfung ist für Regel 5 verbraucht. Die Prüfung der Vergleichsregeln ist nicht angesehen. Tresor gesperrt.

### 07.10.2026, 01:32 · App 8j · Zufalls-Vergleich Fassung 2 · Prüfung von „Neu im Trend“ (Vergleichsregel, von Jensen geöffnet; nachgetragen aus dem Export vom 07.10., 12:57)

- **Neu im Trend, Prüfung (2024 bis 25.09.2025):** 858 Trades · Ø ±0,00R (Spanne −0,23R bis +0,25R, 21 Monate) · Treffer 41 % · Zufall selbe Kerze Ø +0,01R (−0,03R bis +0,04R, 200 Durchgänge, je rund 858 Trades) · besser als 30 % der Durchgänge · Rahmen allein Ø +0,02R
- A: Entwicklung nein · Prüfung nein · B: Entwicklung ja · Prüfung nein · Trades gesamt 1.793

**Einordnung:** Vergleichsregel, zählt nicht als Kandidat. Bestätigt den Befund: kein nachweisbarer Vorteil gegenüber einem beliebigen Markt im Aufwärtstrend zur selben Zeit. Die Prüfung von Donchian ist weiter nicht angesehen. Tresor gesperrt.

### 07.10.2026, 14:45 bis 14:51 · vor dem ersten Lauf der fünf Kandidaten

- **Zweite Meinung zu Änderung 3 (14:45): zulässig.** Kein Blick in die Zukunft, keine Schieflage gegen den Vergleich, „eine Berührung je Wegdrehen“ sauber. Von Claude gegen den Code geprüft: Episode (Beginn, Seite, Ende mit Berührung, Durchlauf, Verfall nach 60 Kerzen), überspannende Kerze (beginnt keine Berührung, die Seite ergibt sich aus ihrem Schluss), Swing-Kerze wie jede andere, Gleichstand bei 4H-Körper-Swings wie in Änderung 2, überlappende Bänder. **Eine Abweichung, bewusst belassen:** Band und beide ATR-Werte sind mit dem Stand vom Ende des Tages VOR dem Ausbruch eingefroren (die zweite Meinung schlug den Schluss des Ausbruchstags vor); so hängt die Bandbreite nicht von der Ausbruchskerze ab.
- **Regel 1 hat acht feste Werte:** 180 Tage, Swing 5/5, ¼ 4H-ATR, 1 Tages-ATR, 60 Kerzen, 3 Berührungen, 28 Tage, 10 Tage. Alle vor dem Lauf gesetzt.
- **Bekannte Unschärfe:** Jensens vier Beispiel-Charts für Regel 1 sind vom 07.10.2026 und liegen damit im Tresor-Zeitraum. Sie haben nur die Beschreibung geliefert.
- **Blindprobe Regel 1 (Fassung 3, App 8k2): von Jensen um 14:35 abgenommen** („unterschreibe ich uneingeschränkt“). Damit alle fünf Regeln abgenommen.
- **Zahl der Signale in der Entwicklung, vor jedem Ergebnis festgehalten (14:51, aus den Blindproben):** Regel 1: 2.979 · Regel 2: 255 · Regel 3: 4.981 · Regel 4: 4.131 · Regel 6: 1.566. Claudes Einschätzung vor dem Lauf: Regel 2 erreicht die 300 Trades voraussichtlich nicht.
- **Mit dem ersten Lauf endet die Phase der Änderungen.** Danach nur noch Fehlerkorrekturen, wenn der Code von der geschriebenen Regel abweicht.

### 07.10.2026, 14:54 · App 8k2 · Zufalls-Vergleich Fassung 2 · Entwicklung (2020 bis 2023) · die fünf Kandidaten

- **Regel 1, Key-Level mit Retest (Fassung 3):** 750 Trades · Ø +0,10R (Spanne −0,03R bis +0,22R, 48 Monate) · Treffer 46 % · Zufall selbe Kerze Ø +0,10R (+0,06R bis +0,14R, 200 Durchgänge, je rund 748 Trades, 2 ausgelassen) · besser als 48 % der Durchgänge · Rahmen allein Ø +0,09R · 7,5 Einstiege je Markt und Jahr · 2.229 Signale verfallen · A nein · B ja
  - Merker Berührungen: 3: 341 (Ø +0,13R) · 4: 212 (Ø +0,09R) · 5 und mehr: 197 (Ø +0,05R) · Merker Alter: bis 8 Wochen 64 (Ø +0,09R) · 9 bis 16 Wochen 225 (Ø ±0,00R) · über 16 Wochen 461 (Ø +0,15R)
- **Regel 2, Fibonacci-Rücklauf (Fassung 2):** 74 Trades · Ø +0,22R (Spanne +0,02R bis +0,41R) · Treffer 49 % · Zufall selbe Kerze Ø +0,23R (+0,09R bis +0,38R, je rund 74 Trades) · besser als 46 % · 0,7 Einstiege je Markt und Jahr · 181 Signale verfallen · A nein · B ja (74 von nötigen 300 Trades)
  - Merker Teilzone: 0,382 bis 0,5: 42 (Ø +0,24R) · 0,5 bis 0,618: 25 (Ø +0,26R) · Golden Pocket: 7 (Ø −0,01R) · Merker Einstieg: erster 52 (Ø +0,16R) · wiederholter 22 (Ø +0,37R)
- **Regel 3, VWAP (Fassung 2):** 1.222 Trades · Ø +0,13R (Spanne ±0,00R bis +0,24R) · Treffer 48 % · Zufall selbe Kerze Ø +0,12R (+0,10R bis +0,15R, je rund 1.219 Trades, 3 ausgelassen) · besser als 62 % · 12,3 Einstiege je Markt und Jahr · 3.759 Signale verfallen · A nein · B ja
  - Merker Level: Woche −1: 472 (Ø +0,18R) · Woche −2: 197 (Ø +0,19R) · Woche −3: 159 (Ø +0,07R) · Woche −4: 115 (Ø +0,01R) · Monat −1: 134 (Ø +0,16R) · Monat −2: 145 (Ø −0,02R) · Merker Nachbarn: Level allein 658 (Ø +0,17R) · weitere Level nah 564 (Ø +0,07R)
- **Regel 4, Liquidity Sweep (Fassung 2):** 1.101 Trades · Ø +0,08R (Spanne −0,05R bis +0,20R) · Treffer 48 % · Zufall selbe Kerze Ø +0,12R (+0,09R bis +0,14R, je rund 1.096 Trades, 5 ausgelassen) · besser als 1 % · 11,1 Einstiege je Markt und Jahr · 3.030 Signale verfallen · A nein · B ja
  - Merker Sweep: erster 1.019 (Ø +0,08R) · wiederholt 82 (Ø +0,06R)
- **Regel 6, Order Block (Fassung 2):** 936 Trades · Ø +0,14R (Spanne ±0,00R bis +0,27R) · Treffer 48 % · Zufall selbe Kerze Ø +0,14R (+0,11R bis +0,16R, je rund 934 Trades, 2 ausgelassen) · besser als 65 % · 9,4 Einstiege je Markt und Jahr · 630 Signale verfallen · A nein · B ja
  - Merker Rücklauf: nur Körper 616 (Ø +0,16R) · bis in den Docht 320 (Ø +0,11R) · Merker Alter: unter 3 Tage 629 (Ø +0,15R) · 3 bis 10 Tage 164 (Ø +0,12R) · über 10 Tage 143 (Ø +0,14R)

**Prüfung der Maschine:** Der Zufall kommt bei allen fünf auf dieselbe Zahl an Trades wie die Regel; „Rahmen allein“ liegt wie in den Läufen mit 8j bei +0,09R.

## Urteil Testplan 1 (07.10.2026)

**Kein Kandidat besteht.** Regel 5 ist in der Prüfung durchgefallen (07.10., 00:53). Die Regeln 1, 2, 3, 4 und 6 verfehlen Messlatte A schon in der Entwicklung (Plätze 48 %, 46 %, 62 %, 1 %, 65 % statt mindestens 95 %). A verlangt die 95 % in Entwicklung und Prüfung; damit kann keine der fünf mehr bestehen, gleichgültig, was die Prüfung zeigt. Regel 2 hat zudem nur 74 Trades.

**Genau gesagt:** kein nachweisbarer Vorteil bei der Wahl des Coins unter diesen Bedingungen (jeder Baustein allein, als feste Regel, nur Long, im gemeinsamen Rahmen). Alle fünf liegen im Plus (B in der Entwicklung ja); dieses Plus bringt auch ein zufälliger Markt im Aufwärtstrend zur selben Kerze. Jensens Zusammenspiel mehrerer Bausteine und sein Ermessen sind nicht geprüft. Die Merker sind Beschreibung; aus ihnen wird keine Regel abgeleitet.

**Festgelegt (Jensen, 07.10., 15:04 und 16:11):**
- Die Prüfung der Regeln 1, 2, 3, 4 und 6 wird nicht geöffnet (sie könnte am Urteil nichts ändern und würde den Zeitraum für Testplan 2 verbrauchen). Die Prüfung von Donchian ist ebenfalls nicht angesehen.
- **Der Tresor bleibt zu.** Für Testplan 1 wird er nicht geöffnet.
- Es werden keine weiteren Einstiegsregeln mehr auf Vorteil getestet (Richtungsentscheidung, siehe Masterplan).
- Die fünf Regeln bleiben in ihrer festgeschriebenen Fassung als Bausteine des Setup-Finders erhalten. Dort gilt die Messlatte „Findet er, was Jensen im Chart suchen würde?“, nicht „Schlägt er den Markt?“.


## Nachtrag 08.10.2026: Stand der App 8r (kein Testplan-Lauf)

- Seit dem Urteil zu Testplan 1 wurde **nichts** am Testplan, an den Lesarten, am Zufalls-Vergleich oder an den fünf Regeln geändert (`core-ltrules.js` unverändert seit 8k2, per Dateivergleich geprüft). Der Tresor ist zu. Prüfung der Regeln 1, 2, 3, 4, 6 und von Donchian nicht geöffnet.
- Die fünf Regeln laufen in ihrer festgeschriebenen Fassung als Bausteine des Setup-Finders (App ab 8l, Wächter ab 8r). Dort gilt die Messlatte „Findet er, was Jensen im Chart suchen würde?“.
- **Beschreibend, nicht Teil des Testplans:** Auswertung von Jensens eigenen Trades (90 Tage, 08.10.). Würfel-Vergleich der Coin-Wahl (gleicher Einstieg, gleiche Haltedauer, zufälliger anderer handelbarer Markt, 500 Durchgänge, gemessen in 4H-ATR): 38 von 42 Trades vergleichbar, Coin-Wahl über 79 % der Durchgänge, **nicht vom Zufall zu unterscheiden (Hürde 95 %)**. Daraus wird nichts abgeleitet.
- Testplan 2 „Marktphase“: Entwurf vom 07.10., 15:15, nicht gültig; die Einwände der zweiten Meinung (Verschiebe-Test, Phasen ab 10 Tagen, Hürde 98 %) sind noch einzuarbeiten. Bis er festgeschrieben ist: keine neuen Pakete (zweite Meinung, 08.10.).

## Testplan 2 festgeschrieben (08.10.2026, 11:45)

Jensen hat Fassung 3 von Testplan 2 „Marktphase“ festgeschrieben (Datei `TESTPLAN-2.md`). Verlauf: Fassung 1 am 07.10. um 15:15; Fassung 2 am 08.10. um 11:30 mit den drei Einwänden der zweiten Meinung (Verschiebe-Test, Phasen ab 10 Tagen, Hürde 98 %) nach Claudes Verständnis; Antwort der zweiten Meinung um 11:21 (alle Verschiebungen statt Würfel, Zählweise der Phasen, Monats-Ziehen nur berichten, 50 Sätze je Probe mit festen Hürden, Sperrfrist, mindestens 100 Trades bei „aus“, weitere Vorbelastungen); Fassung 3 um 11:45. Bis hierher wurde **nichts** gerechnet. Der Tresor ist zu, aus Testplan 1 nie geöffnet.

## Testplan 2: Probe an Zufallskursen und Anpassung (08.10.2026, vor dem ersten echten Lauf)

- **Probe bei Claude (Node, App 8s):** 50 Sätze Zufallskurse ohne Drift, je 50 Märkte über die Entwicklung (2020 bis 2023), 200 Durchgänge. Probe mit Vorteil: +0,1R bei „an“, Muster = BMSB eines Zufalls-BTC (ersatzweise; die offizielle Probe in der App nimmt den echten BMSB-Verlauf).
- **Mit der festen Fassung (A1 98 % und Verschiebe-Test 98 %):** ohne Vorteil 0 / 0 / 0 Sätze bestanden (erlaubt 3), mit Vorteil **22 von 50** erkannt (nötig 40) → Probe nicht bestanden. Der Verschiebe-Test erkannte den Vorteil in 50 von 50; A1 war der Engpass.
- Varianten: A1 95 %: ohne Vorteil 0 / 0 / 0, mit Vorteil 37. A1 90 %: 0 / 0 / 0, mit 48. Nur Verschiebe-Test: 1 / 0 / 0, mit 50.
- **Entscheidung Jensen (13:01): A1 wird nur berichtet, als Bedingung zählt allein der Verschiebe-Test ab 98 %.** Zulässig laut Testplan 2, Abschnitt 7 (Anpassung nur vor dem ersten echten Lauf). Nachgerechnet mit dieser Fassung: ohne Vorteil 1 / 0 / 0, mit Vorteil 50 von 50 → bestanden.
- Auf echten Kerzen wurde bis hierher **nichts** gerechnet.
