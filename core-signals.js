// Signal-Logik: Timeframe-Analyse, Scores, Entscheidung, Trade-Plan.
// Reine Funktionen ohne Netzwerk. Tests in test-signals.js.
import { ema, rsi, macd, atr, pivots } from './core-indicators.js';

export const INTERVAL_MS = { '5m': 3e5, '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5 };

// Nur abgeschlossene Kerzen verwenden: die laufende Kerze würde Signale verfälschen.
export function closedCandles(raw, now = Date.now()) {
  return (raw || [])
    .map((c) => ({ t: Number(c.t), T: Number(c.T), o: Number(c.o), h: Number(c.h), l: Number(c.l), c: Number(c.c), v: Number(c.v) }))
    .filter((c) => Number.isFinite(c.c) && Number.isFinite(c.T) && c.T < now)
    .sort((a, b) => a.t - b.t);
}

const last = (arr) => arr[arr.length - 1];

function structureOf(pv) {
  const [h1, h2] = pv.highs.slice(-2), [l1, l2] = pv.lows.slice(-2);
  if (!h1 || !h2 || !l1 || !l2) return 'range';
  if (h2.price > h1.price && l2.price > l1.price) return 'up';
  if (h2.price < h1.price && l2.price < l1.price) return 'down';
  return 'range';
}

export function analyzeTimeframe(candles) {
  const closes = candles.map((c) => c.c);
  const e8 = last(ema(closes, 8)), e21 = last(ema(closes, 21)), e55 = last(ema(closes, 55)), e200 = last(ema(closes, 200));
  const m = macd(closes);
  const pv = pivots(candles);
  const stack = e8 != null && e21 != null && e55 != null
    ? (e8 > e21 && e21 > e55 ? 'bull' : e8 < e21 && e21 < e55 ? 'bear' : 'mixed') : 'mixed';
  return {
    close: last(closes),
    ema8: e8, ema21: e21, ema55: e55, ema200: e200,
    above200: e200 == null ? null : last(closes) > e200,
    rsi: last(rsi(closes)),
    macdHist: last(m.hist), macdHistPrev: m.hist[m.hist.length - 2],
    atr: last(atr(candles)),
    stack, structure: structureOf(pv), pivots: pv,
  };
}

// Punkte für Long und Short, je max. 100.
export function scoreTimeframe(a) {
  let L = 0, S = 0;
  if (a.stack === 'bull') L += 30; else if (a.stack === 'bear') S += 30;
  if (a.above200 === true) L += 15; else if (a.above200 === false) S += 15;
  if (a.structure === 'up') L += 25; else if (a.structure === 'down') S += 25;
  if (a.macdHist != null) {
    if (a.macdHist > 0) { L += 8; if (a.macdHistPrev != null && a.macdHist > a.macdHistPrev) L += 7; }
    if (a.macdHist < 0) { S += 8; if (a.macdHistPrev != null && a.macdHist < a.macdHistPrev) S += 7; }
  }
  if (a.rsi != null) {
    if (a.rsi >= 50 && a.rsi <= 70) L += 15; else if (a.rsi > 70) L += 5;
    if (a.rsi < 50 && a.rsi >= 30) S += 15; else if (a.rsi < 30) S += 5;
  }
  return { long: L, short: S };
}

// Gewichtung: höherer Timeframe zählt mehr (Trend, Setup, Trigger).
export function combineScores(scores, weights = [0.4, 0.35, 0.25]) {
  let L = 0, S = 0;
  scores.forEach((s, i) => { L += s.long * weights[i]; S += s.short * weights[i]; });
  return { long: Math.round(L), short: Math.round(S) };
}

export function decide(score, cfg) {
  if (score.long >= cfg.minScore && score.long - score.short >= cfg.minGap) return 'long';
  if (score.short >= cfg.minScore && score.short - score.long >= cfg.minGap) return 'short';
  return 'neutral';
}

// Trade-Plan auf dem Setup-Timeframe. Stop hinter der letzten Struktur, Ziele in R-Vielfachen.
export function tradePlan(dir, a, levels) {
  if (dir === 'neutral' || !a.atr || !a.close) return null;
  const long = dir === 'long', s = long ? 1 : -1, atrV = a.atr, close = a.close;
  let near = a.ema21 != null ? a.ema21 - s * 0.25 * atrV : close - s * 0.5 * atrV;
  const far = close - s * atrV;
  near = long ? Math.max(near, far) : Math.min(near, far);
  if ((long && near >= close) || (!long && near <= close)) near = close - s * 0.5 * atrV;
  const zone = long ? [near, close] : [close, near];
  const entry = (zone[0] + zone[1]) / 2;

  const swings = long ? a.pivots.lows.filter((p) => p.price < zone[0]) : a.pivots.highs.filter((p) => p.price > zone[1]);
  const swing = swings.length ? last(swings).price : null;
  let stop = swing != null ? swing - s * 0.5 * atrV : entry - s * 1.5 * atrV;
  const dist = Math.abs(entry - stop);
  if (dist < atrV) stop = entry - s * atrV;
  if (dist > 3 * atrV) stop = entry - s * 3 * atrV;
  const R = Math.abs(entry - stop);
  const tps = [1, 2, 3].map((m) => entry + s * m * R);

  const warnings = [];
  const blocker = long ? levels.resistance.find((p) => p > entry && p < tps[0]) : levels.support.find((p) => p < entry && p > tps[0]);
  if (blocker != null) warnings.push({ type: 'level', price: blocker, text: long ? 'Widerstand liegt vor TP1' : 'Unterstützung liegt vor TP1' });
  if (long && a.rsi > 70) warnings.push({ type: 'rsi', text: 'RSI überkauft, Rücksetzer abwarten' });
  if (!long && a.rsi < 30) warnings.push({ type: 'rsi', text: 'RSI überverkauft, Erholung abwarten' });
  return { dir, zone, entry, stop, tps, R, stopDistPct: (R / entry) * 100, warnings };
}

// Nächste Unterstützungen/Widerstände aus den Pivots mehrerer Timeframes.
export function keyLevels(analyses, price, count = 3) {
  const highs = analyses.flatMap((a) => a.pivots.highs.map((p) => p.price));
  const lows = analyses.flatMap((a) => a.pivots.lows.map((p) => p.price));
  const all = [...highs, ...lows];
  const resistance = [...new Set(all.filter((p) => p > price))].sort((a, b) => a - b).slice(0, count);
  const support = [...new Set(all.filter((p) => p < price))].sort((a, b) => b - a).slice(0, count);
  return { resistance, support };
}
