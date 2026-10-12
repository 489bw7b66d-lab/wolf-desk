// Zyklus-Kompass (8w): Einordnung der Marktphase nach Jensens Rahmen (Masterplan, Abschnitt 15). Nur Anzeige, ohne Messung.
// Testplan 2 hat gezeigt: Das Bull Market Support Band trennt nicht verlässlich und reagiert spät (2023 den Start verpasst,
// 2022 Erholungen über das Band). Die Ampel ist deshalb ein Hinweis zum Gewinne-Sichern, keine Regel.
// Feste Regeln (Jensen, 12.10.2026, „bau mir was Schönes“; Vorlage Masterplan 15):
//  Ampel (BTC, abgeschlossene Wochen): grün = Wochenschluss über dem steigenden Band · gelb = erster Wochenschluss darunter,
//  im Band oder über einem Band, das nicht mehr steigt · rot = mindestens zwei Wochenschlüsse darunter und das Band fällt.
//  Band = 20-Wochen-SMA und 21-Wochen-EMA; „steigt“ = SMA 20 höher als vor 4 Wochen.
//  Phasen: 1 Akkumulation · 2 Bitcoin-Führung · 3 Frühe Rotation · 4 Breite Alt-Season · 5 Sektorrotation (nicht messbar,
//  Hyperliquid liefert keine Sektoren) · 6 Euphorie / Distributionsverdacht · 7 Risk-off. Reine Funktionen, Tests in test-compass.js.
import { closedWeeks } from './core-exitplan.js';
import { ema } from './core-indicators.js';

export const KOMPASS = { sma: 20, ema: 21, slopeWeeks: 4, rsLead: 3, rsAlts: 5, fngHot: 80, btcHot: 20 };
export const PHASES = [
  null,
  { n: 1, short: 'Boden', name: 'Akkumulation / Bodenbildung', text: 'Keine nachhaltigen neuen Tiefs, erste höhere Tiefs.', todo: 'Klein einsteigen, erst nach bestätigtem Ausbruch.' },
  { n: 2, short: 'BTC führt', name: 'Bitcoin-Führung', text: 'BTC steigt und läuft den Alts davon.', todo: 'BTC priorisieren; Altcoins müssen relative Stärke zeigen.' },
  { n: 3, short: 'Rotation', name: 'Frühe Rotation', text: 'BTC stabil, erste Alts holen auf oder ziehen vorbei.', todo: 'Die liquiden Alts mit relativer Stärke beobachten.' },
  { n: 4, short: 'Alt-Season', name: 'Breite Alt-Season', text: 'Viele Alts steigen und schlagen BTC, auch die kleineren.', todo: 'Die stärksten liquiden Coins handeln, nicht die Nachzügler.' },
  { n: 5, short: 'Sektoren', name: 'Sektorrotation', text: 'Ein Sektor nach dem anderen läuft.', todo: 'Nicht messbar: Hyperliquid liefert keine Sektoren.' },
  { n: 6, short: 'Euphorie', name: 'Euphorie / Distributionsverdacht', text: 'Überhitzung oder erste Schwäche nach einem Anstieg.', todo: 'Gewinne staffeln, Stops nachziehen, Risiko reduzieren.' },
  { n: 7, short: 'Risk-off', name: 'Altcoinwinter / Risk-off', text: 'Breite Schwäche, BTC unter dem Band.', todo: 'Kapital schützen, weniger handeln.' },
];

// Ampel aus BTC-Tageskerzen. Ergebnis { state: 'gruen' | 'gelb' | 'rot', why, below, rising, lo, hi, close } oder null
export function bandState(btcDaily, cfg = KOMPASS) {
  const W = closedWeeks(btcDaily || []), n = W.length;
  if (n < Math.max(cfg.sma, cfg.ema) + cfg.slopeWeeks) return null;
  const c = W.map((w) => w.c), e = ema(c, cfg.ema);
  const sma = (k) => { let s = 0; for (let j = k - cfg.sma + 1; j <= k; j++) s += c[j]; return s / cfg.sma; };
  const band = (k) => { const a = sma(k), b = e[k]; return [Math.min(a, b), Math.max(a, b)]; };
  const k = n - 1, [lo, hi] = band(k), rising = sma(k) > sma(k - cfg.slopeWeeks);
  let below = 0; for (let j = k; j >= cfg.sma - 1 && c[j] < band(j)[0]; j--) below++;
  let state, why;
  if (c[k] > hi && rising) { state = 'gruen'; why = 'Wochenschluss über dem steigenden Band'; }
  else if (c[k] > hi) { state = 'gelb'; why = 'Wochenschluss über dem Band, aber es steigt nicht mehr'; }
  else if (below >= 2 && !rising) { state = 'rot'; why = `${below} Wochenschlüsse unter dem Band, das Band fällt`; }
  else if (below >= 1) { state = 'gelb'; why = below === 1 ? 'Erster Wochenschluss unter dem Band: Teil der Gewinne sichern' : `${below} Wochenschlüsse unter dem Band, es steigt aber noch`; }
  else { state = 'gelb'; why = 'Wochenschluss im Band'; }
  return { state, why, below, rising, lo, hi, close: c[k] };
}

// Phase nach festen Regeln. x: { band, btcUp, altUp, rs30 (Alt-Index minus BTC in Prozentpunkten, 30 Tage),
// breadth (Rest minus Top 10, Prozentpunkte), fng, btc30 (BTC-Veränderung 30 Tage in %) }
export function phaseOf(x, cfg = KOMPASS) {
  const b = x?.band;
  if (!b) return null;
  let n;
  if (b.state === 'rot') n = x.altUp || x.btcUp ? 1 : 7;
  else if (b.state === 'gelb') n = b.below >= 1 || !b.rising ? 6 : x.btcUp ? 2 : 1;
  else if (x.fng >= cfg.fngHot && x.btc30 >= cfg.btcHot) n = 6;
  else if (x.rs30 == null || x.rs30 <= -cfg.rsLead) n = 2;
  else if (x.rs30 < cfg.rsAlts) n = x.altUp ? 3 : 2;
  else n = x.breadth > 0 && x.altUp ? 4 : 3;
  // „gelb im Band“ ohne vorherige Schwäche und BTC nicht aufwärts: eher Bodenbildung als Distribution
  if (b.state === 'gelb' && b.below === 0 && b.rising === false && !x.btcUp) n = 1;
  return PHASES[n];
}

// „x von 4 stimmen überein“ je Coin: Struktur in USD (Tagestrend), Stärke gegen BTC (30 Tage), Marktbreite, Volumen
export function agreeOf({ up, vsBtc, breadthShare, daily }) {
  const D = daily || [], last = D[D.length - 1], prev = D.slice(-21, -1).map((c) => Number(c.v)).filter((v) => v > 0);
  const avg = prev.length >= 10 ? prev.reduce((a, b) => a + b, 0) / prev.length : null;
  const items = [
    { k: 'Struktur', ok: up == null ? null : !!up, t: 'Tagestrend aufwärts (EMA 20 über EMA 100)' },
    { k: 'Stärke', ok: vsBtc == null ? null : vsBtc > 0, t: 'stärker als BTC über 30 Tage' },
    { k: 'Breite', ok: breadthShare == null ? null : breadthShare > 0.5, t: 'mehr als die Hälfte der Märkte im Tagestrend' },
    { k: 'Volumen', ok: avg == null || !(Number(last?.v) > 0) ? null : Number(last.v) >= avg, t: 'Tagesvolumen über dem 20-Tage-Schnitt' },
  ];
  const known = items.filter((i) => i.ok !== null);
  return { n: known.filter((i) => i.ok).length, of: known.length, items };
}
