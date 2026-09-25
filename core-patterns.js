// Bruch langfristiger Chartmuster (für 1D und 4H gedacht). Reine Funktionen, Tests in test-signals.js.
// Ergebnis: Liste von Ereignissen { name, dir, barsAgo, level }
import { pivots } from './core-indicators.js';

const RECENT = 5;      // Bruch muss in den letzten 5 Kerzen passiert sein
const MIN_SPAN = 20;   // Linie muss mind. 20 Kerzen lang sein (langfristig)

// Erste Kerze der letzten RECENT, deren Schlusskurs die Linie überwindet (vorher noch nicht)
function firstBreak(candles, lineAt, up, buffer) {
  const n = candles.length;
  for (let j = Math.max(1, n - RECENT); j < n; j++) {
    const beyond = (k) => (up ? candles[k].c > lineAt(k) + buffer : candles[k].c < lineAt(k) - buffer);
    if (beyond(j) && !beyond(j - 1)) return j;
  }
  return -1;
}

// Linie durch zwei Punkte; gültig, wenn zwischen zweitem Punkt und Bruch kein Schlusskurs jenseits lag
function trendline(candles, a, b, up, buffer) {
  const slope = (b.price - a.price) / (b.i - a.i);
  const lineAt = (k) => a.price + slope * (k - a.i);
  if (b.i - a.i < MIN_SPAN / 2 || candles.length - 1 - a.i < MIN_SPAN) return null;
  const j = firstBreak(candles, lineAt, up, buffer);
  if (j < 0) return null;
  for (let k = b.i + 1; k < j; k++) {
    if (up ? candles[k].c > lineAt(k) + buffer : candles[k].c < lineAt(k) - buffer) return null;
  }
  return { j, level: lineAt(j), slope };
}

export function chartPatterns(candles, atrNow) {
  if (!atrNow || candles.length < 60) return [];
  const n = candles.length, buf = 0.2 * atrNow, out = [];
  const pv = pivots(candles.slice(0, n - 1), 5); // Pivots ohne die jüngste Kerze
  const highs = pv.highs.filter((p) => p.i > n - 150), lows = pv.lows.filter((p) => p.i > n - 150);
  const ev = (name, dir, j, level) => out.push({ name, dir, barsAgo: n - 1 - j, level });

  // Trendlinien: fallende Hochs nach oben gebrochen / steigende Tiefs nach unten gebrochen
  const [h1, h2] = highs.slice(-2), [l1, l2] = lows.slice(-2);
  const res = h1 && h2 && h2.price < h1.price ? trendline(candles, h1, h2, true, buf) : null;
  const sup = l1 && l2 && l2.price > l1.price ? trendline(candles, l1, l2, false, buf) : null;
  const triangle = h1 && h2 && l1 && l2 && h2.price < h1.price && l2.price > l1.price;
  if (res) ev(triangle ? 'Ausbruch aus Dreieck' : 'Bruch Abwärts-Trendlinie', 'long', res.j, res.level);
  if (sup) ev(triangle ? 'Bruch aus Dreieck nach unten' : 'Bruch Aufwärts-Trendlinie', 'short', sup.j, sup.level);

  // Seitwärtsphase: enge Spanne über mind. 40 Kerzen, mehrfach getestet, dann Schluss außerhalb
  const base = candles.slice(n - 60, n - RECENT);
  const hi = Math.max(...base.map((c) => c.h)), lo = Math.min(...base.map((c) => c.l));
  if ((hi - lo) / atrNow <= 8) {
    const touchesH = highs.filter((p) => p.i >= n - 60 && hi - p.price <= atrNow).length;
    const touchesL = lows.filter((p) => p.i >= n - 60 && p.price - lo <= atrNow).length;
    const up = firstBreak(candles, () => hi, true, buf), dn = firstBreak(candles, () => lo, false, buf);
    if (up >= 0 && touchesH >= 2) ev('Ausbruch aus Seitwärtsphase', 'long', up, hi);
    if (dn >= 0 && touchesL >= 2) ev('Bruch der Seitwärtsphase nach unten', 'short', dn, lo);
  }

  // Doppelboden / Doppeltop: zwei ähnliche Extreme, Bruch der Nackenlinie dazwischen
  if (l1 && l2 && Math.abs(l1.price - l2.price) <= atrNow && l2.i - l1.i >= 8) {
    const neck = Math.max(...candles.slice(l1.i, l2.i + 1).map((c) => c.h));
    const j = firstBreak(candles, () => neck, true, buf);
    if (j > l2.i) ev('Doppelboden bestätigt', 'long', j, neck);
  }
  if (h1 && h2 && Math.abs(h1.price - h2.price) <= atrNow && h2.i - h1.i >= 8) {
    const neck = Math.min(...candles.slice(h1.i, h2.i + 1).map((c) => c.l));
    const j = firstBreak(candles, () => neck, false, buf);
    if (j > h2.i) ev('Doppeltop bestätigt', 'short', j, neck);
  }
  return out;
}
