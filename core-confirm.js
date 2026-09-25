// Bestätigungen (Retests): fließen NICHT in den Score ein, sondern werden als Siegel angezeigt.
// - BOS-Retest: Bruch des letzten Hochs im Aufwärtstrend, danach Rücksetzer auf das Level und Halten
// - CHoCH-Retest: erster Bruch gegen den bisherigen Trend (Charakterwechsel), danach Retest und Halten
// - Key-Level-Abpraller: Kurs testet ein mehrfach bestätigtes Level und prallt mit Ablehnungsdocht ab
// Tests in test-signals.js.
import { pivots } from './core-indicators.js';

const LOOK = 40;     // Bruch höchstens 40 Kerzen alt
const RETEST = 10;   // Retest höchstens 10 Kerzen alt

function structureBreak(cs, pv, atr, up) {
  const n = cs.length;
  const levels = up ? pv.highs : pv.lows;
  for (let b = n - 1; b >= Math.max(1, n - LOOK); b--) {
    const prior = levels.filter((p) => p.i < b - 1);
    const L = prior.at(-1);
    if (!L) continue;
    const crossed = up ? cs[b].c > L.price && cs[b - 1].c <= L.price : cs[b].c < L.price && cs[b - 1].c >= L.price;
    if (!crossed) continue;
    // Struktur vor dem Bruch: gegen die Bruchrichtung = CHoCH, mit der Bruchrichtung = BOS
    const [a1, a2] = prior.slice(-2);
    const opp = (up ? pv.lows : pv.highs).filter((p) => p.i < b).slice(-2);
    const against = a1 && a2 && opp.length === 2 && (up
      ? a2.price < a1.price && opp[1].price < opp[0].price
      : a2.price > a1.price && opp[1].price > opp[0].price);
    // Retest: danach Rücklauf an das Level (knapp dran, nicht tief durch) und Schluss wieder jenseits
    for (let j = n - 1; j > b && j >= n - RETEST; j--) {
      const touch = up
        ? cs[j].l <= L.price + 0.3 * atr && cs[j].l >= L.price - 0.5 * atr && cs[j].c > L.price
        : cs[j].h >= L.price - 0.3 * atr && cs[j].h <= L.price + 0.5 * atr && cs[j].c < L.price;
      const holds = up ? cs[n - 1].c > L.price : cs[n - 1].c < L.price;
      if (touch && holds) return { type: against ? 'CHoCH-Retest' : 'BOS-Retest', level: L.price, barsAgo: n - 1 - j };
    }
    return null; // jüngster Bruch ohne Retest
  }
  return null;
}

// Key Level: mind. zwei Pivots (Hochs oder Tiefs) innerhalb 0,5 ATR
function keyLevelBounce(cs, pv, atr, up) {
  const n = cs.length;
  const pts = [...pv.highs, ...pv.lows].filter((p) => p.i < n - 3).map((p) => p.price);
  for (let k = 0; k < 3; k++) {
    const c = cs[n - 1 - k];
    const body = Math.abs(c.c - c.o), wick = up ? Math.min(c.o, c.c) - c.l : c.h - Math.max(c.o, c.c);
    if (wick < Math.max(body, 0.3 * atr)) continue; // kein Ablehnungsdocht
    const probe = up ? c.l : c.h;
    const level = pts.find((p) => Math.abs(p - probe) <= 0.25 * atr
      && pts.filter((q) => Math.abs(q - p) <= 0.5 * atr).length >= 2
      && (up ? c.c > p && cs[n - 1].c > p : c.c < p && cs[n - 1].c < p));
    if (level != null) return { type: 'Key-Level-Abpraller', level, barsAgo: k };
  }
  return null;
}

export function confirmations(candles, atr) {
  if (!atr || candles.length < 30) return [];
  const pv = pivots(candles, 3);
  const out = [];
  for (const up of [true, false]) {
    const dir = up ? 'long' : 'short';
    const sb = structureBreak(candles, pv, atr, up);
    if (sb) out.push({ ...sb, dir });
    const kb = keyLevelBounce(candles, pv, atr, up);
    if (kb) out.push({ ...kb, dir });
  }
  return out;
}
