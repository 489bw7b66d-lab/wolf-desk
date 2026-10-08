# Wolf Desk – Testplan 2 „Marktphase"

**GÜLTIG seit 08.10.2026, 11:45 (von Jensen festgeschrieben: „fest“).** Fassung 3 (Fassung 1: 07.10., 15:15; Fassung 2: 08.10., 11:30). **Ab jetzt wird an Schaltern, Zeiträumen, Messlatten und Proben nichts mehr geändert;** einzige Ausnahme: Anpassungen der Messung, wenn eine Probe an Zufallskursen durchfällt, und nur vor dem ersten Lauf auf echten Kerzen. Änderungen gegenüber Fassung 1 sind mit **[neu 08.10.]** markiert. Sie setzen die drei Einwände der zweiten Meinung um (Verschiebe-Test, Phasen ab 10 Tagen, Hürde 98 %) und ihre Antwort auf Fassung 2 (08.10., 11:21), die bestätigt, wie die Einwände gemeint waren. Enthält nur öffentliche Marktdaten, keine Beträge und keine Zugangsdaten.

Leitlinie von Jensen: so einfach und so schnell wie möglich, so valide wie nötig.

## 1. Die Frage

Lässt sich an einem festen Schalter erkennen, **wann** Long-Trades im gemeinsamen Rahmen Geld verdienen und wann nicht?

Anlass: Testplan 1 hat gezeigt, dass keiner der fünf Einstiegs-Bausteine den Coin besser wählt als der Zufall. Der Gewinn kam aus dem Rahmen und aus der Marktrichtung. Wenn der Einstieg wenig ausmacht, entscheidet, wann man überhaupt im Markt ist.

Was dieser Plan **nicht** prüft: den frühesten Einstieg in einen Bullrun. Vier Jahre enthalten nur zwei bis drei große Wenden, daran lässt sich nichts beweisen. Geprüft wird der Zustand „Aufwärtsphase heute, ja oder nein" über viele Tage.

## 2. Daten

Dieselben wie in Testplan 1, unverändert: Binance-Spot-Kerzen (Tag und 4 Stunden), Stichtag 06.10.2026, die eingefrorenen 50 Märkte.

| Zeitraum | Wofür | Wie oft ansehen |
|---|---|---|
| Entwicklung: 2020 bis Ende 2023 | Schalter rechnen, Fehler finden | beliebig |
| Prüfung: 2024 bis 25.09.2025 | bestätigen | einmal je Schalter |
| Tresor: 06.10.2025 bis 05.10.2026 | endgültiges Urteil | ein einziges Mal, ganz am Ende |

**Bekannte Vorbelastung, offen benannt:**
- Die Prüfung wurde für einen Phasen-Schalter schon einmal angesehen (Regel 5 aus Testplan 1, dort durchgefallen). Jeder weitere Schalter auf demselben Zeitraum macht einen Zufallstreffer wahrscheinlicher.
- Schalter 3 (BTC über der Tages-EMA 100) fiel zuerst im Nachhinein auf, in den 180 Tagen vor dem 06.10.2026. Diese Tage liegen im Tresor. Für Schalter 3 ist der Tresor deshalb nicht ganz frisch.
- **[neu 08.10.]** Schalter 1 (Bull Market Support Band) ist durch die Zyklen 2017 und 2021 bekannt geworden; er wurde gewählt, weil er sich dort bewährt hat. Auf diesen Jahren ist er nicht frisch.
- **[neu 08.10.]** Schalter 2 (Marktbreite) rechnet nur mit den 50 eingefrorenen Märkten, die es am Stichtag noch gab (Überlebende). Märkte, die vorher verschwunden sind, fehlen; die Breite in schwachen Phasen ist dadurch eher zu gut.
- **[neu 08.10.]** Der Tresor aus Testplan 1 wurde **nie geöffnet** (Protokoll: geöffnet wurden nur die Prüfung für Regel 5 am 07.10. um 00:53 und für „Neu im Trend“ um 01:32).
- Frisch für alle drei ist nur das, was nach dem Stichtag kommt (Live-Beobachtung).

## 3. Die Messung (wie bei Regel 5, schon gebaut und geprüft)

- Je Durchgang Zufalls-Einstiege über Zeit und Märkte, im Schnitt einer je 280 freien 4H-Kerzen, ein offener Trade je Markt.
- Gemeinsamer Rahmen aus Testplan 1, unverändert: nur Long, Stop 2 × Tages-ATR(14), Teilverkäufe bei 2R / 3R / 4R mit 20 / 30 / 30 %, Rest läuft, Zeit-Ausstieg nach 10 Tagen, Gebühr 0,045 % je Seite, Funding 0,03 % je Tag.
- Jeder Einstieg wird nach dem Schalterstand am letzten abgeschlossenen Tag eingeteilt: an oder aus.
- Kennzahl: **Ø R bei Schalter an minus Ø R bei Schalter aus.**
- 200 Durchgänge mit festem Würfel.
- **Einteilung, festgeschrieben [neu 08.10.]:** nach dem Schalterstand am letzten abgeschlossenen Tag **vor der Einstiegskerze**.
- **[neu 08.10.] Sperrfrist (aus Fassung 1 nachgetragen):** keine Einstiege in den letzten 10 Tagen vor der Grenze zur Prüfung und vor der Grenze zum Tresor, damit kein Trade in den nächsten Zeitraum hineinläuft.
- **[neu 08.10.] Verschiebe-Test (Placebo-Schalter):** Der An/Aus-Verlauf des Schalters (je Tag an oder aus, im jeweiligen Zeitraum) wird als Ganzes im Kreis um k Tage verschoben. **Alle zulässigen k werden je einmal gerechnet**, von 60 bis Länge des Zeitraums minus 60 Tage (im Kreis wäre „Länge minus 10“ fast der echte Schalter). Kein Würfel, keine Wiederholung (in der Prüfung, rund 630 Tage, sind das rund 510 Verschiebungen). **Die Trades bleiben dieselben:** alle Trades der 200 Durchgänge zusammen; nur ihre Einteilung an/aus kommt aus dem verschobenen Verlauf (Stand am letzten abgeschlossenen Tag vor der Einstiegskerze). Je Verschiebung dieselbe Kennzahl. So entsteht ein Schalter mit denselben Phasenlängen und demselben Anteil „an“, der aber nichts über den Markt weiß.
- Der Tagestrend des einzelnen Coins spielt keine Rolle (wie bei Regel 5). Zusätzlich nur beschreibend: dieselbe Rechnung nur mit Coins im Tagestrend aufwärts.

## 4. Wann ein Schalter besteht

- **A, der Schalter trennt:** Die Differenz „an minus aus" ist verlässlich über null, in Entwicklung **und** Prüfung. Verlässlich heißt:
  1. in mindestens **98 %** der 200 Durchgänge über null **[neu 08.10.: vorher 95 %; drei Schalter werden geprüft, die Hürde ist deshalb strenger]**,
  2. **[neu 08.10.] Verschiebe-Test:** Die Differenz des echten Schalters ist größer als bei mindestens 98 % aller zulässigen Verschiebungen.
  Das Neu-Ziehen ganzer Kalendermonate (Fassung 1, Bedingung 2) wird **nur noch berichtet**, nicht als Bedingung **[neu 08.10.: Vorschlag der zweiten Meinung; bei langsamen Schaltern zu milde, durch den Verschiebe-Test abgedeckt]**. Verlässlich heißt damit: beides muss stimmen.
- **B, an verdient Geld:** Ø R bei Schalter an im Plus nach Kosten, in Entwicklung **und** Prüfung, mindestens 300 Trades bei Schalter an insgesamt, **[neu 08.10.] und mindestens 100 Trades bei Schalter aus je Zeitraum** (sonst ist „aus“ zu dünn für den Vergleich).
- **C, genug Wechsel:** mindestens 10 Wechsel des Schalters in der Entwicklung und mindestens 5 in der Prüfung. Sonst ist das Ergebnis nur ein Hinweis und kann nicht bestehen.
  **[neu 08.10.] Gezählt wird nur eine Phase von mindestens 10 Tagen.** So wird gezählt: Phasen unter 10 Tagen werden beim Zählen der umgebenden Phase zugeschlagen; ein Wechsel zählt, wenn die neue Phase mindestens 10 Tage hält. Der Schalter selbst wird **nicht** geglättet; die Regel betrifft nur das Zählen für C. Die Zahl der Phasen ab 10 Tagen und ihre mittlere Dauer werden berichtet.
- Wer A, B und C besteht, darf einmal in den Tresor. Besteht er dort A und B wieder, wird der Schalter in der App scharf (zuerst als Anzeige).
- **Abbruch:** Fällt ein Schalter in der Entwicklung bei A durch, wird die Prüfung nicht geöffnet. Er wird nicht nachgebessert.

Warum der Verschiebe-Test und C: Bei Regel 5 liefen alle 200 Durchgänge durch dieselbe Marktgeschichte, die 96 % waren deshalb zu günstig gelesen. Die wahre Stichprobe sind die Wechsel des Schalters. Der Verschiebe-Test und die Mindestzahl an Wechseln tragen dem Rechnung. Auch damit bleibt es bei zwei bis drei großen Zyklen: Ein langsamer Schalter lässt sich auf diesen Daten nie sicher beweisen.

**[neu 08.10.] Warum der Verschiebe-Test:** Er beantwortet die Frage, ob nicht schon die bloße Form eines Schalters (lange Phasen, Anteil „an") eine Trennung vortäuscht. Eine verschobene Kopie hat dieselbe Form, aber keinen Bezug zum Markt. Schlägt der echte Schalter nicht 98 % seiner Kopien, trennt er nicht wegen des Marktes.

## 5. Die drei Schalter

Alle drei wurden am 07.10.2026 um 01:28 als Vorschläge notiert, also vor den Ergebnissen der Regeln 1, 2, 3, 4 und 6. Jeder Schalter nutzt nur Tageskerzen, die am Bewertungstag schon abgeschlossen waren.

1. **BTC über dem Bull Market Support Band.** An, wenn der letzte BTC-Tagesschluss über beiden Linien liegt: dem 20-Wochen-SMA und der 21-Wochen-EMA. Beide Linien werden aus abgeschlossenen Wochen gerechnet (Woche ab Montag UTC). Aus, sobald der Tagesschluss unter einer der beiden liegt.
2. **Marktbreite.** An, wenn mehr als die Hälfte der Märkte im Tagestrend aufwärts ist (Tages-EMA 20 über EMA 100). Gezählt werden die Märkte, die es an dem Tag gibt und die mindestens 110 Tage Historie haben.
3. **BTC über der Tages-EMA 100.** An, wenn der letzte BTC-Tagesschluss über der EMA 100 der BTC-Tageskerzen liegt.

Feste Werte, die nach dem ersten Lauf nicht mehr angefasst werden: 20 und 21 Wochen, Hälfte der Märkte, EMA 20 / 100, EMA 100, 110 Tage.

**Nicht dabei, mit Absicht:** das 28-Tage-Momentum mit anderen Fenstern. Regel 5 ist durchgefallen, und ein neues Fenster wäre ein Nachbessern.

Bekannte Schwäche: Schalter 1 und 3 messen beide den BTC-Trend, nur verschieden schnell. Sie werden ähnlich ausfallen. Bestehen beide, zählt das nicht als zwei unabhängige Bestätigungen.

## 6. Was zusätzlich berichtet wird (nur beschreibend)

- Anteil der Tage mit Schalter an, Zahl der Wechsel, mittlere Dauer einer An-Phase und einer Aus-Phase.
- Ø R an und Ø R aus je Kalenderjahr.
- Dieselbe Rechnung nur mit Coins im Tagestrend aufwärts.
- Wie oft sich zwei Schalter einig sind.

Aus diesen Angaben wird keine neue Regel abgeleitet, ohne dass ein neuer Testplan geschrieben wird.

## 7. Ablauf

1. ✓ Jensen und die zweite Meinung haben den Entwurf gelesen, die Einwände sind eingearbeitet (Fassung 3).
2. ✓ Jensen hat am 08.10.2026 um 11:45 bestätigt. Ab dann wird an Schaltern, Zeiträumen und Messlatten nichts mehr geändert.
3. Bau als reines Mess-Paket: drei Schalter für die vorhandene Messung, das Ziehen ganzer Monate, der Verschiebe-Test, die Mindestzahl an Wechseln (Phasen ab 10 Tagen).
4. Nachweis an Zufallskursen, bevor echte Kerzen gerechnet werden **[neu 08.10.]**:
   - **Ohne Vorteil:** 50 Sätze Zufallskurse mit festem Würfel. Ein Schalter darf in höchstens 3 der 50 Sätze bestehen (rund 5 %).
   - **Mit Vorteil:** 50 Sätze, in denen Trades bei „an“ im Schnitt **+0,1R** mehr bringen, mit denselben Phasenlängen wie der echte BMSB-Schalter (Schalter 1) in der Entwicklung. Der Schalter muss in mindestens **40 der 50 Sätze** bestehen (80 %).
   - Fällt eine Probe durch, darf die Messung angepasst werden, **aber nur vor dem ersten Lauf auf echten Kerzen.** Danach nicht mehr.
5. Entwicklung für alle drei. Prüfung nur für Schalter, die A in der Entwicklung bestehen, je Schalter einmal.
6. Tresor ein einziges Mal, nur für Schalter mit A, B und C in beiden Zeiträumen.

## 8. Vor dem Festschreiben geklärt

- **[neu 08.10.]** Die zweite Meinung hat die Umsetzung der Einwände am 08.10. um 11:21 bestätigt und ergänzt; Fassung 3 enthält das. **Jensen hat um 11:45 festgeschrieben.**
- **[neu 08.10.]** Gilt für Pakete, die den Wächter anfassen, weiter ein Tag Abstand, oder reicht die vorherige Benennung? (Frage der zweiten Meinung; Jensen entscheidet. Betrifft nicht diesen Testplan.)

- **Erkennst du eine Aufwärtsphase an etwas anderem?** Wenn ja, zeig es an zwei oder drei Wochencharts mit deinen Linien von Hand. Dann schreibt Claude es in Worten zurück, und es kann Schalter 3 ersetzen. Nach dem Festschreiben geht das nicht mehr.
- Wenn nicht, bleiben die drei Schalter, wie sie hier stehen. **[neu 08.10.]** Jensens Ergänzung von 20:51 (Altcoin-Markt) ist **kein** neuer Schalter: Der eigene Index (App 8m bis 8r) bleibt Anzeige. Die drei Schalter bleiben.

## 9. Für später notiert, nicht Teil dieses Plans

- Testplan 3 „Abschöpfen": nachlaufender Stop gegen den Zeit-Ausstieg, „Schalter aus" als Signal zum Verkleinern.
- Coin-Auswahl nach relativer Stärke (Anlass: Donchian war in der Entwicklung von Testplan 1 als einzige Regel besser als der Zufall).
- Eine vorab festgelegte Kombination zweier Bausteine aus Testplan 1.
- BTC bei Binance bis 2017 zurückholen, um den Bärenmarkt 2018 als weiteren Zyklus zu haben.
