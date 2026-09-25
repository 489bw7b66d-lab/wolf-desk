// Candlestick-Muster, nur im passenden Umfeld gewertet (z. B. Hammer nach Rücksetzer).
// Ergebnis: Liste von Ereignissen { name, dir, barsAgo }. Tests in test-signals.js.

const parts = (c) => ({
  body: Math.abs(c.c - c.o), range: c.h - c.l, up: c.c >= c.o,
  upper: c.h - Math.max(c.o, c.c), lower: Math.min(c.o, c.c) - c.l,
});

// Umfeld: fällt bzw. steigt der Kurs in den 5 Kerzen vor dem Muster?
const fallingBefore = (cs, i) => i >= 5 && cs[i - 1].c < cs[i - 5].c;
const risingBefore = (cs, i) => i >= 5 && cs[i - 1].c > cs[i - 5].c;

function at(cs, i, atr) {
  const out = [];
  const c = cs[i], p = cs[i - 1], pp = cs[i - 2];
  if (!c || !p || !pp) return out;
  const C = parts(c), P = parts(p), PP = parts(pp);

  // Engulfing: Körper umschließt den vorherigen komplett
  if (C.up && !P.up && c.c >= p.o && c.o <= p.c && C.body >= 0.5 * atr && fallingBefore(cs, i - 1)) out.push({ name: 'Bullish Engulfing', dir: 'long' });
  if (!C.up && P.up && c.c <= p.o && c.o >= p.c && C.body >= 0.5 * atr && risingBefore(cs, i - 1)) out.push({ name: 'Bearish Engulfing', dir: 'short' });

  // Hammer / Shooting Star: langer Docht, kleiner Körper
  if (C.range >= 0.8 * atr && C.lower >= 2 * C.body && C.upper <= 0.3 * C.range && fallingBefore(cs, i)) out.push({ name: 'Hammer', dir: 'long' });
  if (C.range >= 0.8 * atr && C.upper >= 2 * C.body && C.lower <= 0.3 * C.range && risingBefore(cs, i)) out.push({ name: 'Shooting Star', dir: 'short' });

  // Morning / Evening Star: große Kerze, kleiner Körper, Umkehrkerze über/unter die Mitte der ersten
  if (!PP.up && PP.body >= 0.6 * atr && P.body <= 0.3 * atr && C.up && c.c > (pp.o + pp.c) / 2 && fallingBefore(cs, i - 2)) out.push({ name: 'Morning Star', dir: 'long' });
  if (PP.up && PP.body >= 0.6 * atr && P.body <= 0.3 * atr && !C.up && c.c < (pp.o + pp.c) / 2 && risingBefore(cs, i - 2)) out.push({ name: 'Evening Star', dir: 'short' });

  // Drei weiße Soldaten / drei schwarze Krähen
  const three = [pp, p, c].map(parts);
  if (three.every((x) => x.up && x.body >= 0.5 * atr && x.upper <= 0.3 * x.body) && p.c > pp.c && c.c > p.c) out.push({ name: 'Drei weiße Soldaten', dir: 'long' });
  if (three.every((x) => !x.up && x.body >= 0.5 * atr && x.lower <= 0.3 * x.body) && p.c < pp.c && c.c < p.c) out.push({ name: 'Drei schwarze Krähen', dir: 'short' });
  return out;
}

// Prüft die letzten beiden abgeschlossenen Kerzen
export function candlePatterns(candles, atrNow) {
  if (!atrNow || candles.length < 8) return [];
  const n = candles.length, out = [];
  for (let k = 0; k < 2; k++) at(candles, n - 1 - k, atrNow).forEach((e) => out.push({ ...e, barsAgo: k }));
  return out;
}
