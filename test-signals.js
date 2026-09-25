// Tests für Indikatoren und Signal-Logik
import { ema, rsi, macd, atr, pivots, lastCross, momentumAtr, volumeSpike, rsiZoneExit } from './core-indicators.js';
import { lastLeg, fibFns, fibPlan } from './core-fib.js';
import { zigzag, elliott } from './core-elliott.js';
import { mapSymbols } from './core-universe.js';
import { heat, styleCheck, pickStyle, switchStyle } from './core-scanner.js';
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
  ['Plan: Stop-Abstand zwischen 0,5 und 3,25 ATR', () => {
    const a = analyzeTimeframe(up), p = tradePlan('long', a, keyLevels([a], a.close));
    return p.R >= 0.5 * a.atr - 1e-9 && p.R <= 3.25 * a.atr + 1e-9;
  }],
  ['Plan: Methode ist Fibonacci oder ATR', () => ['fib', 'atr'].includes(tradePlan('long', analyzeTimeframe(up), { resistance: [], support: [] }).method)],
  ['Plan: kein Signal = kein Plan', () => tradePlan('neutral', analyzeTimeframe(up), { resistance: [], support: [] }) === null],
  ['Plan: Widerstand vor TP1 wird gewarnt', () => {
    const a = analyzeTimeframe(up), p0 = tradePlan('long', a, { resistance: [], support: [] });
    if (!(p0.tps[0] > p0.entry)) return false;
    const p = tradePlan('long', a, { resistance: [(p0.entry + p0.tps[0]) / 2], support: [] });
    return p.warnings.some((w) => w.type === 'level');
  }],
  ['Key Levels: Widerstände über, Unterstützungen unter Kurs', () => {
    const a = analyzeTimeframe(up), k = keyLevels([a], a.close);
    return k.resistance.every((p) => p > a.close) && k.support.every((p) => p < a.close);
  }],

  // Kreuzungen, Momentum, Volumen, RSI-Zonen
  ['Kreuzung aufwärts wird erkannt', () => lastCross([1, 2, 4], [2, 3, 3], 3)?.dir === 'up'],
  ['Kreuzung vor 1 Kerze', () => lastCross([1, 4, 5], [2, 3, 3], 3)?.barsAgo === 1],
  ['Keine Kreuzung = null', () => lastCross([5, 6, 7], [1, 2, 3], 3) === null],
  ['Golden Cross im Tageschart ist starkes Ereignis', () => {
    // lange Abwärtsphase, dann steiler Anstieg → EMA 55 kreuzt die 200 nach oben
    const c = Array.from({ length: 260 }, (_, i) => { const p = i < 200 ? 200 - i * 0.5 : 100 + (i - 200) * 6; return { t: i, T: i, o: p, h: p + 1, l: p - 1, c: p, v: 1 }; });
    let found = false;
    for (let n = 205; n <= 260 && !found; n++) found = analyzeTimeframe(c.slice(0, n), '1d').events.some((e) => e.strong && e.dir === 'long');
    return found;
  }],
  ['Momentum: +10 in 10 Kerzen bei ATR 2 = +5 ATR', () => near(momentumAtr([...Array(5).fill(0), 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110], 2), 5)],
  ['Volumen-Spike ×5 wird gefunden', () => {
    const c = Array.from({ length: 30 }, (_, i) => ({ o: 1, c: 2, v: i === 29 ? 5 : 1 }));
    const s = volumeSpike(c); return near(s.ratio, 5) && s.up && s.barsAgo === 0;
  }],
  ['Volumen-Spike: rote Kerze = abwärts', () => volumeSpike(Array.from({ length: 30 }, (_, i) => ({ o: 2, c: 1, v: i === 29 ? 5 : 1 }))).up === false],
  ['RSI verlässt überverkauft = Long', () => rsiZoneExit([40, 25, 28, 35])?.dir === 'long'],
  ['RSI verlässt überkauft = Short', () => rsiZoneExit([60, 75, 72, 65])?.dir === 'short'],
  ['RSI bleibt überkauft = kein Ereignis', () => rsiZoneExit([60, 75, 78, 80]) === null],
  // Fibonacci
  ['Fib: Leg Long = letztes Tief vor letztem Hoch', () => { const l = lastLeg({ highs: [{ i: 5, price: 120 }], lows: [{ i: 1, price: 80 }, { i: 8, price: 100 }] }, 'long'); return l.low === 80 && l.high === 120; }],
  ['Fib: 0,618-Retracement von 100 → 200 = 138,2', () => near(fibFns({ low: 100, high: 200 }, 'long').retr(0.618), 138.2)],
  ['Fib: 1,618-Extension von 100 → 200 = 261,8', () => near(fibFns({ low: 100, high: 200 }, 'long').ext(1.618), 261.8)],
  ['Fib Short: 1,618-Extension von 200 → 100 = 38,2', () => near(fibFns({ low: 100, high: 200 }, 'short').ext(1.618), 38.2)],
  ['Fib-Plan: Kurs in Zone → Einstieg jetzt, Ziele 1,0/1,272/1,618', () => {
    const p = fibPlan('long', { low: 100, high: 200 }, 145, 10);
    return p.entry === 145 && near(p.tps[0], 200) && near(p.tps[1], 227.2) && near(p.tps[2], 261.8);
  }],
  ['Fib-Plan: Stop unter Swing-Tief mit Puffer', () => near(fibPlan('long', { low: 100, high: 200 }, 145, 20).stop, 95)],
  ['Fib-Plan: zu weiter Stop → hinter 0,786', () => near(fibPlan('long', { low: 100, high: 200 }, 145, 10).stop, 200 - 78.6 - 2.5)],
  ['Fib-Plan: Kurs über der Zone → Limit in der Zone', () => fibPlan('long', { low: 100, high: 200 }, 180, 10).entryMode.startsWith('Limit')],
  ['Fib-Plan: tiefer als 0,786 = kein Setup', () => fibPlan('long', { low: 100, high: 200 }, 110, 10) === null],
  // Elliott
  ['Zickzack: abwechselnd Hoch/Tief', () => zigzag({ highs: [{ i: 2, price: 10 }, { i: 3, price: 12 }], lows: [{ i: 1, price: 5 }] }).map((p) => p.t).join('') === 'LH'],
  ['Elliott: Welle 3 erkannt (W2 bei 61,8 %)', () => {
    const e = elliott({ lows: [{ i: 1, price: 100 }, { i: 3, price: 107.64 }], highs: [{ i: 2, price: 120 }] }, 115);
    return e?.wave === 3 && e.bias === 'long' && near(e.target, 107.64 + 1.618 * 20);
  }],
  ['Elliott: Welle 2 unter Start = keine Zählung', () => elliott({ lows: [{ i: 1, price: 100 }, { i: 3, price: 95 }], highs: [{ i: 2, price: 120 }] }, 110) === null],
  ['Elliott: Welle 5 läuft (keine Überlappung W4/W1)', () => {
    const e = elliott({ lows: [{ i: 1, price: 100 }, { i: 3, price: 110 }, { i: 5, price: 135 }], highs: [{ i: 2, price: 120 }, { i: 4, price: 150 }] }, 140);
    return e?.wave === 5 && e.bias === 'long';
  }],
  ['Elliott: Überlappung W4 in W1 = keine Welle 5', () => {
    const e = elliott({ lows: [{ i: 1, price: 100 }, { i: 3, price: 110 }, { i: 5, price: 118 }], highs: [{ i: 2, price: 120 }, { i: 4, price: 150 }] }, 125);
    return e?.wave !== 5;
  }],
  ['Elliott: Abwärts-Impuls Welle 3', () => elliott({ highs: [{ i: 1, price: 200 }, { i: 3, price: 192.36 }], lows: [{ i: 2, price: 180 }] }, 185)?.bias === 'short'],
  // Universum und Auswahl
  ['CoinGecko → Hyperliquid: PEPE wird kPEPE, Stablecoins raus', () => mapSymbols(['btc', 'usdt', 'pepe', 'xyzcoin'], ['BTC', 'kPEPE', 'ETH']).join(',') === 'BTC,kPEPE'],
  ['Hitze: kein Signal = 0', () => heat({ dir: 'neutral' }) === 0],
  ['Hitze: Golden Cross zählt mehr', () => {
    const base = { dir: 'long', total: { long: 70, short: 20 }, waves: [], events: [] };
    return heat({ ...base, events: [{ dir: 'long', strong: true, barsAgo: 3 }] }) > heat(base);
  }],
  // Vier Ziele
  ['Fib-Plan: TP4 = Extension 2,0', () => near(fibPlan('long', { low: 100, high: 200 }, 145, 10).tps[3], 300)],
  ['ATR-Plan: vier Ziele bis 4R', () => { const p = tradePlan('long', { ...analyzeTimeframe(up), pivots: { highs: [], lows: [] } }, { resistance: [], support: [] }); return p.tps.length === 4 && near(p.tps[3] - p.entry, 4 * p.R); }],
  // Stil-Auswahl
  ['Stil: kein Signal = ungeeignet', () => styleCheck({ dir: 'neutral', plan: null }, { minTp1Pct: 1 }).ok === false],
  ['Stil: TP1 zu nah = ungeeignet', () => styleCheck({ dir: 'long', plan: { entry: 100, tps: [100.2] }, scores: [{ long: 60, short: 10 }], total: { long: 80 } }, { minTp1Pct: 0.4 }).ok === false],
  ['Stil: Trend widerspricht = ungeeignet', () => styleCheck({ dir: 'long', plan: { entry: 100, tps: [103] }, scores: [{ long: 10, short: 60 }], total: { long: 80 } }, { minTp1Pct: 0.4 }).ok === false],
  ['Stil: alles passt = geeignet mit Score', () => styleCheck({ dir: 'long', plan: { entry: 100, tps: [103] }, scores: [{ long: 60, short: 10 }], total: { long: 80 } }, { minTp1Pct: 0.4 }).score === 80],
  ['Bester Stil: höchster Score', () => pickStyle({ swing: { ok: true, score: 70 }, intraday: { ok: true, score: 85 }, scalp: { ok: false } }) === 'intraday'],
  ['Bester Stil: Gleichstand → Swing', () => pickStyle({ swing: { ok: true, score: 80 }, intraday: { ok: true, score: 80 }, scalp: { ok: true, score: 80 } }) === 'swing'],
  ['Bester Stil: keiner passt = null', () => pickStyle({ swing: { ok: false }, intraday: { ok: false }, scalp: { ok: false } }) === null],
  ['Stil umschalten behält Auswahl-Infos', () => { const r = { styles: { a: 1 }, best: 'swing', all: { scalp: { coin: 'X', mode: 'scalp' } } }; const n = switchStyle(r, 'scalp'); return n.mode === 'scalp' && n.best === 'swing' && n.styles.a === 1; }],
];
