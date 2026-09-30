// Ampel „Plan-Zustand“ je offener Position (6a): Ist der Trade-Plan noch intakt, knapp oder kaputt?
// Gegen das „Zucken“: Bei 🟢 heißt es klar „laufen lassen, der Stop macht seine Arbeit“. Nur bei 🔴 kommen Zahlen dazu.
// Kaputt, wenn eins davon zutrifft (mit Buddy abgestimmt):
//  - kein Stop gesetzt · Liquidation greift vor dem Stop
//  - Stop im Rauschen (< 1× ATR) und ein ATR-gerechter Stop läge hinter der Liquidation (kein sinnvoller Stop möglich)
//  - Struktur gebrochen: letzte abgeschlossene Kerze der Setup-Zeitebene schließt jenseits des letzten Swing-Tiefs
//    (Short: -Hochs) vor der Eröffnung
//  - deine Einschätzung ist ungültig (Kurs jenseits „ungültig unter/über“) · das Signal zum Trade wurde als ungültig markiert
// Knapp: Stop zwischen 1× und 1,5× ATR oder im Rauschen, aber mit sinnvollem Vorschlag.
// Reine Funktionen, Tests in test-planstate.js.
import { pivots } from './core-indicators.js';

// Letztes bestätigtes Swing-Tief (Long) bzw. -Hoch (Short) vor der Eröffnung; gebrochen, wenn die letzte Kerze jenseits schließt
export function structureBroken(candles, side, openedAt, pivotSide = 2) {
  if (!candles?.length || !(openedAt > 0)) return null;
  const { lows, highs } = pivots(candles, pivotSide);
  const piv = (side === 'long' ? lows : highs).filter((x) => candles[x.i].T <= openedAt);
  if (!piv.length) return null;
  const level = piv.at(-1).price, last = candles.at(-1);
  if (!last || last.T <= openedAt) return null;
  const broken = side === 'long' ? last.c < level : last.c > level;
  return { broken, level };
}

export function viewInvalid(view, side, price) {
  if (!view || view.invalid == null || !(price > 0)) return false;
  const inv = Number(view.invalid);
  if (view.bias === 'long' && side === 'long') return price < inv;
  if (view.bias === 'short' && side === 'short') return price > inv;
  return false;
}

// noise: Ergebnis von stopNoise (core-guard), liqFirst: Liquidation vor Stop, struct: structureBroken, …
export function planState({ hasStop, liqFirst, noise, struct, viewBad, signalBad }) {
  const reasons = [];
  if (!hasStop) reasons.push('kein Stop gesetzt');
  if (liqFirst) reasons.push('die Liquidation greift vor deinem Stop');
  if (noise?.status === 'bad' && noise.suggest?.beyondLiq) reasons.push('der Stop sitzt im Rauschen und bei diesem Hebel passt kein sinnvoller Stop');
  if (struct?.broken) reasons.push('die Struktur ist gebrochen');
  if (viewBad) reasons.push('deine Einschätzung ist ungültig');
  if (signalBad) reasons.push('das Signal wurde ungültig');
  if (reasons.length) return { state: 'broken', reasons };
  if (noise && noise.status !== 'ok') return { state: 'tight', reasons: [noise.status === 'bad' ? 'Stop im Rauschen' : 'Stop nah am Rauschen'], suggest: noise.suggest && !noise.suggest.beyondLiq ? noise.suggest.stop : null }; // nie einen Stop hinter der Liquidation vorschlagen
  return { state: 'ok', reasons: [] };
}

// ---- Orientierung, keine Vorhersage (nur bei 🔴 angezeigt) ----
// Was zuerst? Ohne Trend (Zufallslauf): P(Stop zuerst) = Abstand Ziel / (Abstand Stop + Abstand Ziel)
export function stopFirstProb(distStop, distTarget) {
  if (!(distStop > 0) || !(distTarget > 0)) return null;
  return distTarget / (distStop + distTarget);
}
const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) { // Näherung nach Abramowitz/Stegun
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
// Berührt der Kurs den Stop innerhalb von n Kerzen? Spiegelungsprinzip: 2 · (1 − Φ(d / (σ·√n))), σ ≈ 0,8 · ATR je Kerze
export function touchProb(dist, atr, n) {
  if (!(dist > 0) || !(atr > 0) || !(n > 0)) return null;
  return Math.max(0, Math.min(1, 2 * (1 - phi(dist / (0.8 * atr * Math.sqrt(n))))));
}
