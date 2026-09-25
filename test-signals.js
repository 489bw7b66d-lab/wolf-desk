// Tests für Indikatoren und Signal-Logik
import { ema, rsi, macd, atr, pivots } from './core-indicators.js';
import { closedCandles, analyzeTimeframe, scoreTimeframe, combineScores, decide, tradePlan, keyLevels } from './core-signals.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;

// Künstliche Märkte: Welle mit Aufwärts- bzw. Abwärtsdrift
function market(n, drift) {
  return Array.from({ length: n }, (_, i) => {
    const base = 100 + drift * i + 4 * Math.sin(i / 4);
    return { t: i, T: i + 0.5, o: base - 0.2, h: base + 1, l: base - 1, c: base, v: 1 };
  });
}
const up = market(260, 0.3), down = market(260, -0.3);
const cfg = { minScore: 65, minGap: 20 };

export const tests = [
  ['EMA: konstante Reihe = konstanter Wert', () => near(ema([5, 5, 5, 5, 5], 3)[4], 5)],
  ['EMA: Start mit Durchschnitt', () => near(ema([1, 2, 3, 4], 3)[2], 2)],
  ['EMA: vor genug Daten = null', () => ema([1, 2], 3)[1] === null],
  ['RSI: nur steigend = 100', () => rsi(Array.from({ length: 30 }, (_, i) => i))[29] === 100],
  ['RSI: nur fallend = 0', () => near(rsi(Array.from({ length: 30 }, (_, i) => 30 - i))[29], 0)],
  ['RSI: Wert zwischen 0 und 100', () => { const v = rsi(up.map((c) => c.c)).at(-1); return v > 0 && v < 100; }],
  ['MACD: Aufwärtstrend = Linie positiv', () => macd(up.map((c) => c.c)).line.at(-1) > 0],
  ['ATR: konstante Spanne 2 = 2', () => near(atr(Array.from({ length: 30 }, () => ({ h: 11, l: 9, c: 10 }))).at(-1), 2)],
  ['Pivots: Spitze wird erkannt', () => pivots([1, 2, 3, 9, 3, 2, 1].map((h) => ({ h, l: h - 1 }))).highs[0].price === 9],
  ['Kerzen: laufende Kerze wird entfernt', () => closedCandles([{ t: 0, T: 99, o: 1, h: 1, l: 1, c: 1 }, { t: 100, T: 199, o: 1, h: 1, l: 1, c: 1 }], 150).length === 1],
  ['Kerzen: Text wird zu Zahlen', () => closedCandles([{ t: '0', T: '9', o: '1', h: '2', l: '0.5', c: '1.5' }], 50)[0].c === 1.5],
  ['Aufwärtstrend: EMA-Stack bullisch', () => analyzeTimeframe(up).stack === 'bull'],
  ['Aufwärtstrend: Struktur höhere Hochs', () => analyzeTimeframe(up).structure === 'up'],
  ['Abwärtstrend: EMA-Stack bärisch', () => analyzeTimeframe(down).stack === 'bear'],
  ['Aufwärtstrend: Long-Score > Short-Score', () => { const s = scoreTimeframe(analyzeTimeframe(up)); return s.long > s.short; }],
  ['Gewichtung: 100/80/60 → 83', () => combineScores([{ long: 100, short: 0 }, { long: 80, short: 0 }, { long: 60, short: 0 }]).long === 83],
  ['Entscheidung: 70 zu 30 = Long', () => decide({ long: 70, short: 30 }, cfg) === 'long'],
  ['Entscheidung: 70 zu 60 = kein Signal', () => decide({ long: 70, short: 60 }, cfg) === 'neutral'],
  ['Entscheidung: 40 zu 80 = Short', () => decide({ long: 40, short: 80 }, cfg) === 'short'],
  ['Plan Long: Stop < Einstieg < TP1 < TP2 < TP3', () => {
    const a = analyzeTimeframe(up), p = tradePlan('long', a, keyLevels([a], a.close));
    return p.stop < p.zone[0] && p.zone[0] < p.zone[1] && p.entry < p.tps[0] && p.tps[0] < p.tps[1] && p.tps[1] < p.tps[2];
  }],
  ['Plan Short: TP3 < TP2 < TP1 < Einstieg < Stop', () => {
    const a = analyzeTimeframe(down), p = tradePlan('short', a, keyLevels([a], a.close));
    return p.tps[2] < p.tps[1] && p.tps[1] < p.tps[0] && p.tps[0] < p.entry && p.zone[1] < p.stop;
  }],
  ['Plan: Stop-Abstand zwischen 1 und 3 ATR', () => {
    const a = analyzeTimeframe(up), p = tradePlan('long', a, keyLevels([a], a.close));
    return p.R >= a.atr - 1e-9 && p.R <= 3 * a.atr + 1e-9;
  }],
  ['Plan: TP2 = 2R', () => { const a = analyzeTimeframe(up), p = tradePlan('long', a, keyLevels([a], a.close)); return near(p.tps[1] - p.entry, 2 * p.R); }],
  ['Plan: kein Signal = kein Plan', () => tradePlan('neutral', analyzeTimeframe(up), { resistance: [], support: [] }) === null],
  ['Plan: Widerstand vor TP1 wird gewarnt', () => {
    const a = analyzeTimeframe(up), p0 = tradePlan('long', a, { resistance: [], support: [] });
    const p = tradePlan('long', a, { resistance: [(p0.entry + p0.tps[0]) / 2], support: [] });
    return p.warnings.some((w) => w.type === 'level');
  }],
  ['Key Levels: Widerstände über, Unterstützungen unter Kurs', () => {
    const a = analyzeTimeframe(up), k = keyLevels([a], a.close);
    return k.resistance.every((p) => p > a.close) && k.support.every((p) => p < a.close);
  }],
];
