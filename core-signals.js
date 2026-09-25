// Signal-Logik: Timeframe-Analyse, Scores, Entscheidung, Trade-Plan.
// Reine Funktionen ohne Netzwerk. Tests in test-signals.js.
import { ema, rsi, macd, atr, pivots, lastCross, momentumAtr, volumeSpike, rsiZoneExit } from './core-indicators.js';
import { lastLeg, fibPlan } from './core-fib.js';
import { elliott } from './core-elliott.js';
import { chartPatterns } from './core-patterns.js';
import { candlePatterns } from './core-candlesticks.js';
import { confirmations } from './core-confirm.js';

// Gewichtung der Ereignisse (Punkte). Trendzustand max. 70, Ereignisse max. 30 je Timeframe und Richtung.
export const EVENT_POINTS = {
  goldenCross: 15, patternDaily: 15, pattern4h: 10, ema55x200: 8, ema21x55: 7, ema8x21: 5, macdCross: 4,
  rsiExit: 6, momentum: 4, momentumStrong: 7, volume: 5, volumeStrong: 8, candle: 4, candleStrong: 5, elliott: 8,
};
export const EVENT_CAP = 30;

// Elliott erst ab 4H (darunter zu viel Rauschen)
export const ELLIOTT_TFS = ['4h', '1d'];

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

export function analyzeTimeframe(candles, tf = '') {
  const closes = candles.map((c) => c.c);
  const E8 = ema(closes, 8), E21 = ema(closes, 21), E55 = ema(closes, 55), E200 = ema(closes, 200);
  const e8 = last(E8), e21 = last(E21), e55 = last(E55), e200 = last(E200);
  const m = macd(closes);
  const pv = pivots(candles);
  const stack = e8 != null && e21 != null && e55 != null
    ? (e8 > e21 && e21 > e55 ? 'bull' : e8 < e21 && e21 < e55 ? 'bear' : 'mixed') : 'mixed';

  // Kreuzungen als Ereignisse (je frischer, desto relevanter)
  const events = [];
  const add = (cross, upName, downName, bonus, strong = false) => {
    if (!cross) return;
    events.push({ name: cross.dir === 'up' ? upName : downName, dir: cross.dir === 'up' ? 'long' : 'short', barsAgo: cross.barsAgo, bonus, strong });
  };
  const P = EVENT_POINTS;
  add(lastCross(E8, E21, 3), 'EMA 8/21 Kreuzung aufwärts', 'EMA 8/21 Kreuzung abwärts', P.ema8x21);
  add(lastCross(E21, E55, 5), 'EMA 21/55 Kreuzung aufwärts', 'EMA 21/55 Kreuzung abwärts', P.ema21x55);
  const gc = lastCross(E55, E200, 10);
  if (tf === '1d') add(gc, 'Golden Cross (55/200 Tag)', 'Death Cross (55/200 Tag)', P.goldenCross, true);
  else add(gc, `EMA 55/200 Kreuzung aufwärts`, `EMA 55/200 Kreuzung abwärts`, P.ema55x200);
  add(lastCross(m.line, m.signal, 3), 'MACD-Kreuzung aufwärts', 'MACD-Kreuzung abwärts', P.macdCross);

  // RSI: Verlassen der Extremzonen
  const R = rsi(closes);
  const rz = rsiZoneExit(R);
  if (rz) events.push({ name: rz.dir === 'long' ? 'RSI verlässt überverkauft' : 'RSI verlässt überkauft', dir: rz.dir, barsAgo: rz.barsAgo, bonus: P.rsiExit, strong: false });

  // Momentum in ATR
  const atrNow = last(atr(candles));
  const mom = momentumAtr(closes, atrNow);
  if (mom != null && Math.abs(mom) >= 3) {
    events.push({ name: `Starkes Momentum (${mom > 0 ? '+' : '−'}${Math.abs(mom).toFixed(1).replace('.', ',')} ATR)`, dir: mom > 0 ? 'long' : 'short', barsAgo: 0, bonus: Math.abs(mom) >= 5 ? P.momentumStrong : P.momentum, strong: false });
  }

  // Plötzlicher Volumenanstieg
  const vs = volumeSpike(candles);
  if (vs && vs.ratio >= 2.5) {
    events.push({ name: `Volumen-Spike ×${vs.ratio.toFixed(1).replace('.', ',')}`, dir: vs.up ? 'long' : 'short', barsAgo: vs.barsAgo, bonus: vs.ratio >= 4 ? P.volumeStrong : P.volume, strong: false });
  }

  // Bruch langfristiger Chartmuster (nur 1D und 4H)
  if (tf === '1d' || tf === '4h') {
    chartPatterns(candles, atrNow).forEach((e) => events.push({ ...e, bonus: tf === '1d' ? P.patternDaily : P.pattern4h, strong: tf === '1d' }));
  }

  // Candlestick-Muster (nur im passenden Umfeld erkannt)
  {
    const strongC = ['Bullish Engulfing', 'Bearish Engulfing', 'Morning Star', 'Evening Star'];
    candlePatterns(candles, atrNow).forEach((e) => events.push({ ...e, bonus: strongC.includes(e.name) ? P.candleStrong : P.candle, strong: false, candle: true }));
  }

  const close = last(closes);
  const ew = ELLIOTT_TFS.includes(tf) ? elliott(pivots(candles, 5), close) : null;

  return {
    tf, close,
    ema8: e8, ema21: e21, ema55: e55, ema200: e200,
    above200: e200 == null ? null : close > e200,
    rsi: last(R), momentum: mom, volumeRatio: vs?.ratio ?? null,
    macdHist: last(m.hist), macdHistPrev: m.hist[m.hist.length - 2],
    atr: atrNow,
    stack, structure: structureOf(pv), pivots: pv, events, elliott: ew,
    confirmations: confirmations(candles, atrNow),
  };
}

// Punkte für Long und Short, je max. 100.
export function scoreTimeframe(a) {
  // Trendzustand: max. 70 Punkte je Richtung
  let L = 0, S = 0;
  if (a.stack === 'bull') L += 20; else if (a.stack === 'bear') S += 20;
  if (a.above200 === true) L += 10; else if (a.above200 === false) S += 10;
  if (a.structure === 'up') L += 18; else if (a.structure === 'down') S += 18;
  if (a.macdHist != null) {
    if (a.macdHist > 0) { L += 6; if (a.macdHistPrev != null && a.macdHist > a.macdHistPrev) L += 4; }
    if (a.macdHist < 0) { S += 6; if (a.macdHistPrev != null && a.macdHist < a.macdHistPrev) S += 4; }
  }
  if (a.rsi != null) {
    if (a.rsi >= 50 && a.rsi <= 70) L += 12; else if (a.rsi > 70) L += 4;
    if (a.rsi < 50 && a.rsi >= 30) S += 12; else if (a.rsi < 30) S += 4;
  }
  // Ereignisse: max. 30 Punkte je Richtung, damit kein Einzelsignal den Trend überstimmt
  let eL = 0, eS = 0;
  (a.events || []).forEach((e) => { if (e.dir === 'long') eL += e.bonus; else eS += e.bonus; });
  if (a.elliott?.bias === 'long') eL += EVENT_POINTS.elliott; else if (a.elliott?.bias === 'short') eS += EVENT_POINTS.elliott;
  return { long: L + Math.min(EVENT_CAP, eL), short: S + Math.min(EVENT_CAP, eS), base: { long: L, short: S } };
}

// Gewichtung: höherer Timeframe zählt mehr (Trend, Setup, Trigger).
export function combineScores(scores, weights = [0.4, 0.35, 0.25], daily = null) {
  let L = 0, S = 0;
  scores.forEach((s, i) => { L += s.long * weights[i]; S += s.short * weights[i]; });
  // 200er Tageslinie als übergeordneter Filter
  if (daily?.above200 === true) L += 5; else if (daily?.above200 === false) S += 5;
  return { long: Math.min(100, Math.round(L)), short: Math.min(100, Math.round(S)) };
}

export function decide(score, cfg) {
  if (score.long >= cfg.minScore && score.long - score.short >= cfg.minGap) return 'long';
  if (score.short >= cfg.minScore && score.short - score.long >= cfg.minGap) return 'short';
  return 'neutral';
}

// Trade-Plan auf dem Setup-Timeframe. Stop hinter der letzten Struktur, Ziele in R-Vielfachen.
export function tradePlan(dir, a, levels) {
  if (dir === 'neutral' || !a.atr || !a.close) return null;
  const fib = fibPlan(dir, lastLeg(a.pivots, dir), a.close, a.atr);
  if (fib) return { ...fib, warnings: planWarnings(dir, fib.entry, fib.tps, a, levels) };
  const atrPlan = atrTradePlan(dir, a);
  return { ...atrPlan, warnings: [{ type: 'method', text: 'Kein sauberes Fibonacci-Setup, Plan nach ATR berechnet' }, ...planWarnings(dir, atrPlan.entry, atrPlan.tps, a, levels)] };
}

function planWarnings(dir, entry, tps, a, levels) {
  const long = dir === 'long';
  const warnings = [];
  const blocker = long ? levels.resistance.find((p) => p > entry && p < tps[0]) : levels.support.find((p) => p < entry && p > tps[0]);
  if (blocker != null) warnings.push({ type: 'level', price: blocker, text: long ? 'Widerstand liegt vor TP1' : 'Unterstützung liegt vor TP1' });
  if (long && a.rsi > 70) warnings.push({ type: 'rsi', text: 'RSI überkauft, Rücksetzer abwarten' });
  if (!long && a.rsi < 30) warnings.push({ type: 'rsi', text: 'RSI überverkauft, Erholung abwarten' });
  return warnings;
}

// Ersatz-Plan nach ATR, wenn Fibonacci nicht passt.
function atrTradePlan(dir, a) {
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
  const tps = [1, 2, 3, 4].map((m) => entry + s * m * R);
  return { method: 'atr', dir, zone, entry, stop, tps, R, stopLabel: 'hinter Struktur / ATR', tpLabels: ['1R', '2R', '3R', '4R'],
    entryMode: 'Zone am aktuellen Kurs', stopDistPct: (R / entry) * 100 };
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
