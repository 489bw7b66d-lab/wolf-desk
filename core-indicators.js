// Technische Indikatoren. Reine Funktionen auf Zahlenreihen, Tests in test-signals.js.
// Alle Rückgaben haben dieselbe Länge wie die Eingabe; wo noch nicht berechenbar: null.

export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period; // Start mit SMA
  out[period - 1] = prev;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// RSI nach Wilder
export function rsi(values, period = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  const calc = () => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  out[period] = calc();
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = calc();
  }
  return out;
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const ef = ema(values, fast), es = ema(values, slow);
  const line = values.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
  const start = line.findIndex((v) => v != null);
  const sig = new Array(values.length).fill(null);
  if (start >= 0) {
    const s = ema(line.slice(start), signal);
    s.forEach((v, i) => { sig[start + i] = v; });
  }
  const hist = line.map((v, i) => (v != null && sig[i] != null ? v - sig[i] : null));
  return { line, signal: sig, hist };
}

// Average True Range nach Wilder. candles: [{h,l,c}]
export function atr(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const tr = candles.map((c, i) => (i === 0 ? c.h - c.l
    : Math.max(c.h - c.l, Math.abs(c.h - candles[i - 1].c), Math.abs(c.l - candles[i - 1].c))));
  let prev = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

// Swing-Hochs/-Tiefs: Kerze ist höher/tiefer als je `side` Kerzen links und rechts.
export function pivots(candles, side = 3) {
  const highs = [], lows = [];
  for (let i = side; i < candles.length - side; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= side; j++) {
      if (candles[i].h <= candles[i - j].h || candles[i].h <= candles[i + j].h) isH = false;
      if (candles[i].l >= candles[i - j].l || candles[i].l >= candles[i + j].l) isL = false;
    }
    if (isH) highs.push({ i, price: candles[i].h });
    if (isL) lows.push({ i, price: candles[i].l });
  }
  return { highs, lows };
}

// Letzte Kreuzung zweier Linien innerhalb der letzten `lookback` Kerzen.
// Ergebnis: { dir: 'up' | 'down', barsAgo } oder null
export function lastCross(fast, slow, lookback) {
  const n = fast.length;
  for (let i = n - 1; i >= Math.max(1, n - lookback); i--) {
    const a = fast[i], b = slow[i], pa = fast[i - 1], pb = slow[i - 1];
    if ([a, b, pa, pb].some((v) => v == null)) return null;
    if (a > b && pa <= pb) return { dir: 'up', barsAgo: n - 1 - i };
    if (a < b && pa >= pb) return { dir: 'down', barsAgo: n - 1 - i };
  }
  return null;
}

// Momentum: Kursänderung über `period` Kerzen, gemessen in ATR (vergleichbar über alle Märkte).
export function momentumAtr(closes, atrNow, period = 10) {
  if (closes.length <= period || !atrNow) return null;
  return (closes.at(-1) - closes.at(-1 - period)) / atrNow;
}

// Volumen der jüngsten Kerzen im Verhältnis zum Durchschnitt davor.
// Liefert die stärkste der letzten `recent` Kerzen: { ratio, barsAgo, up }
export function volumeSpike(candles, avgLen = 20, recent = 3) {
  if (candles.length < avgLen + recent) return null;
  let best = null;
  for (let k = 0; k < recent; k++) {
    const i = candles.length - 1 - k;
    const base = candles.slice(i - avgLen, i).reduce((n, c) => n + c.v, 0) / avgLen;
    if (!(base > 0)) continue;
    const ratio = candles[i].v / base;
    if (!best || ratio > best.ratio) best = { ratio, barsAgo: k, up: candles[i].c >= candles[i].o };
  }
  return best;
}

// RSI verlässt eine Extremzone innerhalb der letzten `lookback` Kerzen.
export function rsiZoneExit(rsiArr, lookback = 3, low = 30, high = 70) {
  const n = rsiArr.length;
  for (let i = n - 1; i >= Math.max(1, n - lookback); i--) {
    const a = rsiArr[i], p = rsiArr[i - 1];
    if (a == null || p == null) return null;
    if (p < low && a >= low) return { dir: 'long', barsAgo: n - 1 - i };
    if (p > high && a <= high) return { dir: 'short', barsAgo: n - 1 - i };
  }
  return null;
}
