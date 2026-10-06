# Wolf Desk – Testplan

**Gültig seit 06.10.2026, 22:12 Uhr. Von Jensen bestätigt („der Testplan passt").** Fassung 3. Ab jetzt wird an Regeln, Zeiträumen und Messlatten nichts mehr geändert, bis alle Läufe durch sind. Neue Ideen kommen auf eine Liste für einen späteren, eigenen Testplan. Danach wird nichts mehr geändert, bis alle Läufe durch sind.

Leitlinie von Jensen: so einfach und so schnell wie möglich, so valide wie nötig.

## 1. Die Frage

Leistet ein Einstieg mehr als ein zufälliger Einstieg im selben Markt, zur selben Zeit, mit demselben Stop und Ausstieg? Und verdient er dabei Geld?

## 2. Daten

- **Quelle:** Binance, öffentliche Marktdaten (Spot-Kerzen), ohne Konto und ohne Schlüssel. Jensens Binance-Konto wird nicht gebraucht; API-Schlüssel kommen nie in die App oder ins Repository.
- **Zeitraum:** ab 01.01.2020 bis heute.
- **Märkte:** die handelbaren Märkte, die es auf Binance seit mindestens zwei Jahren gibt, höchstens 50, gewählt nach Umsatz. Die Liste wird einmal festgelegt und dann nicht mehr geändert.
- **Kerzen:** Tag und 4 Stunden.
- Bekannte Schwäche: Coins, die verschwunden sind, fehlen (die Liste zeigt nur Überlebende). Das schönt alle Ergebnisse gleichermaßen, den Vergleich mit dem Zufall aber kaum.

## 3. Drei Zeiträume

| Zeitraum | Wofür | Wie oft ansehen |
|---|---|---|
| **Entwicklung:** 2020 bis Ende 2023 | Regeln rechnen, Fehler finden | beliebig |
| **Prüfung:** 2024 bis 12 Monate vor heute | bestätigen | einmal je Regel |
| **Tresor:** die letzten 12 Monate | endgültiges Urteil | **ein einziges Mal, ganz am Ende**, nur für Regeln, die vorher bestanden haben |

Die App sperrt den Tresor, bis er bewusst geöffnet wird.

## 4. Gemeinsamer Rahmen (für alle Einstiege gleich)

Nur Long · Einstieg zum Schluss der 4H-Signalkerze · Stop 2 × ATR(14) der Tageskerzen · Jensens Ausstiegsplan (Teilverkäufe bei 2R / 3R / 4R, Rest läuft) · Zeit-Ausstieg nach 10 Tagen · ein offener Trade je Markt · Gebühren und Funding-Schätzung wie bisher.

Ein Rahmen für alle ist einfacher und macht die Einstiege vergleichbar. Nachteil: Eine Regel, die einen anderen Ausstieg bräuchte, wird benachteiligt. Das nehmen wir in Kauf.

## 5. Der Zufalls-Vergleich

- Für jede Regel eigene Zufalls-Einstiege: **gleich viele je Kalendermonat** wie die Regel (damit die zeitliche Verteilung übereinstimmt), in denselben Märkten.
- **200 Durchgänge.** Berichtet wird, an welcher Stelle die Regel in der Verteilung liegt.
- Unsicherheit der Regel selbst: Spanne aus dem Ziehen ganzer Monate (nicht einzelner Trades).

## 6. Wann eine Regel besteht

- **A, besser als Zufall:** in Entwicklung **und** Prüfung besser als 95 % der Zufalls-Durchgänge.
- **B, verdient Geld:** in Entwicklung **und** Prüfung im Plus nach Kosten, mindestens 300 Trades insgesamt.
- Wer A und B besteht, darf **einmal** in den Tresor. Besteht er dort wieder beides, wird die Regel scharf (zuerst im Schatten-Modus).
- Bei sechs Regeln ist ein Zufallstreffer möglich. Deshalb zählt nur, was alle drei Zeiträume übersteht.
- **Abbruch:** Fällt eine Regel in der Entwicklung bei A und B durch, wird sie nicht nachgebessert, sondern abgelegt.

## 7. Die sechs Regeln (bestätigt)

Jede Regel gilt nur, wenn der Tagestrend aufwärts zeigt (Tages-EMA 20 über EMA 100), außer Regel 5. Level und Zonen kommen aus dem Tageschart, der Einstieg aus dem 4H-Chart. Das entspricht Jensens Vorgehen: hohe Zeitebenen für die Beurteilung, niedrige für Ein- und Ausstieg.

1. **Key-Level, Ausbruch mit Retest.** Key-Level = eine Preiszone (Breite ½ Tages-ATR), die in den letzten 180 Tagen **mindestens dreimal** angelaufen wurde, von oben oder von unten, wobei zwischen erster und letzter Berührung mindestens vier Wochen liegen. Berührung = Tageshoch oder Tagestief in der Zone, danach dreht der Kurs um mindestens 1 ATR weg. Ausbruch = Tagesschluss über der Zone. Einstieg = der erste 4H-Schluss über der Zone, nachdem der Kurs innerhalb von 10 Tagen in die Zone zurückkam.
   *Merker (nur zur Beschreibung): Zahl der Berührungen, Alter des Levels in Wochen.*
2. **Fibonacci-Rücklauf mit Reaktion.** Impuls = letzte bestätigte Aufwärtsbewegung im **Tageschart** von Swing-Tief zu Swing-Hoch (Swing = höchstes bzw. tiefstes Tageshoch/-tief von je 5 Tagen davor und danach), mindestens 6 Tages-ATR groß. Zone = **0,382 bis 0,65** des Impulses. Einstieg = Jensens Umkehrpunkt-Regel auf 4H in der Zone (Umkehrkerze, danach schließt die nächste Kerze über dem Körper der Kerze vor der Umkehrkerze). Ungültig, sobald ein Tagesschluss unter 0,786 liegt.
   *Merker: Teilzone beim Einstieg (0,382 bis 0,5 · 0,5 bis 0,618 · Golden Pocket 0,618 bis 0,65). Das Urteil gilt für die ganze Zone; die Teilzonen werden nur berichtet.*
3. **VWAP.** Level = die VWAP-Schlusswerte der **letzten vier Wochen** und der **letzten zwei Monate** (Quelle HLC3, aus Tageskerzen gerechnet), so wie Jensens Chart sie zeigt (Beispiel BTC vom 06.10.: vier Wochen- und zwei Monatslinien). Einstieg = der Kurs kommt von oben bis auf ½ ATR an eines dieser Level zurück und eine 4H-Kerze schließt wieder darüber.
   *Merker: welches Level (Woche oder Monat, wie alt, mehrere Level nah beieinander). Der Tages-VWAP bleibt im Test außen vor: Auf 4H-Kerzen entsteht daraus jeden Tag ein neues Level, das würde die anderen beiden überdecken. Er passt zu Einstiegen auf 1H und 15 Minuten und kann später eigens geprüft werden.*
4. **Liquidity Sweep.** Eine 4H-Kerze unterschreitet ein bestätigtes Swing-Tief der letzten 20 Tage (Swing im 4H-Chart, je 5 Kerzen davor und danach) und schließt wieder darüber. Einstieg zum Schluss dieser Kerze. *(Von Jensen nicht kommentiert, bleibt beim Vorschlag.)*
5. **Marktphasen-Filter (kein Einstieg, sondern ein Schalter).** Zufalls-Einstiege, aber nur an Tagen, an denen der gleichgewichtete Schnitt aller Märkte über 28 Tage im Plus liegt. Verglichen wird mit Zufalls-Einstiegen ohne Schalter. Der Tagestrend des einzelnen Coins spielt hier keine Rolle.
6. **Order Block als Unterstützung.** Order Block = die **letzte fallende 4H-Kerze** vor einem Anstieg, der ein bestätigtes Swing-Hoch überschreitet. Unterschieden wird zwischen **Körper** (Eröffnung bis Schluss) und **unterem Docht** (Schluss bis Tief). Einstieg = der Kurs kommt zum ersten Mal in den Block zurück und eine 4H-Kerze **schließt über der Körpermitte**; ihr Docht darf dabei bis zum Tief des Blocks reichen. Ungültig, sobald eine 4H-Kerze unter dem Tief des Blocks (Dochtende) schließt.
   *Merker: Reichte der Rücklauf nur in den Körper oder bis in den Docht?*

**Mitlaufende Vergleichsregeln (zählen nicht als Kandidaten):** „Neu im Trend" und Donchian 20/10.

**Merker** dienen nur der Beschreibung. Aus ihnen werden keine neuen Regeln abgeleitet, ohne dass ein neuer Testplan geschrieben wird.

**Für später notiert, nicht Teil dieses Plans:** „Platz nach oben bis zum nächsten Sell-Block" als Merker an jedem Trade (4H, Tag, Woche), zuerst als Information am Signal · Tages-VWAP auf 1H · Fib-Impulse aus dem Wochenchart.

## 8. Was Jensen gesagt hat (06.10. abends) und wie es eingeflossen ist

- Key-Level über Wochen oder Monate, mehrfach von oben oder unten angelaufen, zählen stärker als kurzfristige Zonen → Regel 1: 180 Tage, mindestens drei Berührungen von beiden Seiten, mindestens vier Wochen Abstand.
- 0,382 gehört dazu, 0,618 und 0,65 sind das Golden Pocket → Regel 2: Zone 0,382 bis 0,65, Teilzonen als Merker.
- Fib-Level beurteilt er im Wochen- und Tageschart, 1H und 4H dienen Ein- und Ausstieg → Impuls aus dem Tageschart, Einstieg auf 4H; gilt als Grundsatz für alle Regeln.
- VWAP: Monat, Woche, Tag → Regel 3 mit Monat und Woche; Tag begründet zurückgestellt.
- Order Block: die Kerze, unbedingt mit Unterscheidung von Docht und Körper → Regel 6.
- Chart-Beispiel BTC (Tageschart mit „VWAP Periodic Close" und SMC): Sein erster Blick zeigt mehrere zurückliegende Wochen- und Monats-Schlusswerte des VWAP gleichzeitig, dazu Strukturmarken (BOS, CHoCH), Weak High, Premium und Equilibrium sowie Order-Block-Zonen → Regel 3 nutzt die letzten vier Wochen- und zwei Monatswerte statt nur der Vorperiode.

## 9. Stand der Vorbereitung

- **Binance ist von Jensens iPhone aus erreichbar** (06.10., 22:12: die Test-Adresse liefert Kerzen im Browser). Noch nicht geprüft: ob die App selbst die Daten laden darf (Abruf aus der App heraus). Das zeigt sich beim ersten Bau; Ausweichweg wäre, dass der Wächter bei GitHub die Kerzen holt und bereitstellt.
- Nächster Schritt: Binance als Datenquelle bauen (reines Mess-Paket), dann die Regeln als Backtest-Engines, dann die Läufe in der Reihenfolge Entwicklung → Prüfung → Tresor.
