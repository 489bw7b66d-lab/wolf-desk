# Wolf Desk – Protokoll zum Testplan

Dieses Protokoll hält fest, was beim Laden der langen Historie festgelegt wurde. Der Testplan selbst (`TESTPLAN.md`, Fassung 3) ist unverändert. Enthält nur öffentliche Marktdaten.

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

## Läufe

(wird nach jedem Lauf ergänzt: Datum, Regel, Zeitraum, Ergebnis)
