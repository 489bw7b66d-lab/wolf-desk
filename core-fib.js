// Fibonacci-Retracement und -Extension für Stop-Loss und Ziele. Tests in test-signals.js.

// Letzte Bewegung (Leg) aus den Pivots: für Long Tief → Hoch, für Short Hoch → Tief.
export function lastLeg(pv, dir) {
  if (dir === 'long') {
    const H = pv.highs.at(-1);
    const L = H && [...pv.lows].reverse().find((p) => p.i < H.i);
    return H && L && H.price > L.price ? { low: L.price, high: H.price, startI: L.i, endI: H.i } : null;
  }
  const L = pv.lows.at(-1);
  const H = L && [...pv.highs].reverse().find((p) => p.i < L.i);
  return H && L && H.price > L.price ? { low: L.price, high: H.price, startI: H.i, endI: L.i } : null;
}

// Retracement: Rücklauf in die Bewegung hinein. Extension: Fortsetzung darüber hinaus.
export function fibFns(leg, dir) {
  const d = leg.high - leg.low;
  return dir === 'long'
    ? { retr: (x) => leg.high - x * d, ext: (x) => leg.low + x * d }
    : { retr: (x) => leg.low + x * d, ext: (x) => leg.high - x * d };
}

const EXTS = [1, 1.272, 1.618, 2, 2.618];
const fmt = (x) => String(x).replace('.', ',');

// Trade-Plan nach Fibonacci. null, wenn die Bewegung kein sauberes Setup hergibt.
export function fibPlan(dir, leg, close, atr) {
  if (!leg || !atr) return null;
  const long = dir === 'long', s = long ? 1 : -1;
  const { retr, ext } = fibFns(leg, dir);
  const d = leg.high - leg.low;
  const depth = long ? (leg.high - close) / d : (close - leg.low) / d; // wie tief der Kurs zurückgelaufen ist
  if (depth > 0.786 || depth < 0) return null; // zu tief (Setup gebrochen) oder schon ausgebrochen

  const zone = [retr(0.618), retr(0.5)].sort((a, b) => a - b);
  const inZone = depth >= 0.5;
  const entry = inZone ? close : (zone[0] + zone[1]) / 2;

  let stop = retr(1) - s * 0.25 * atr, stopLabel = 'unter Swing-Tief (1,0)';
  if (!long) stopLabel = 'über Swing-Hoch (1,0)';
  if (Math.abs(entry - stop) > 3 * atr) { stop = retr(0.786) - s * 0.25 * atr; stopLabel = 'hinter 0,786'; }
  if (Math.abs(entry - stop) < 0.5 * atr) { stop = entry - s * atr; stopLabel = '1 ATR (Fib zu eng)'; }
  const R = Math.abs(entry - stop);

  const targets = EXTS.map((x) => ({ x, price: ext(x) })).filter((t) => (long ? t.price > entry : t.price < entry)).slice(0, 3);
  if (targets.length < 3) return null;

  return {
    method: 'fib', dir, zone, entry, stop, R, stopLabel,
    entryMode: inZone ? 'Kurs in der Zone' : 'Limit in der Zone (Rücksetzer abwarten)',
    tps: targets.map((t) => t.price),
    tpLabels: targets.map((t) => (t.x === 1 ? 'Hoch 1,0' : 'Ext ' + fmt(t.x))).map((l) => (long ? l : l.replace('Hoch', 'Tief'))),
    stopDistPct: (R / entry) * 100,
    leg, depth,
  };
}
