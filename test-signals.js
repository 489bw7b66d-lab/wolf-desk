// Tests für Indikatoren und Signal-Logik
import { ema, rsi, macd, atr, pivots, lastCross, momentumAtr, volumeSpike, rsiZoneExit } from './core-indicators.js';
import { lastLeg, fibFns, fibPlan } from './core-fib.js';
import { zigzag, elliott } from './core-elliott.js';
import { mapSymbols } from './core-universe.js';
import { chartPatterns } from './core-patterns.js';
import { candlePatterns } from './core-candlesticks.js';
import { confirmations } from './core-confirm.js';
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
  // Chartmuster
  ['Muster: Bruch Abwärts-Trendlinie', () => {
    const c = Array.from({ length: 120 }, (_, i) => ({ o: 100, c: 100, h: i === 40 ? 130 : i === 80 ? 120 : 101, l: 99 }));
    c[119] = { o: 100, c: 115, h: 116, l: 99 };
    return chartPatterns(c, 2).some((e) => e.name === 'Bruch Abwärts-Trendlinie' && e.dir === 'long' && e.barsAgo === 0);
  }],
  ['Muster: kein Bruch ohne Schluss über der Linie', () => {
    const c = Array.from({ length: 120 }, (_, i) => ({ o: 100, c: 100, h: i === 40 ? 130 : i === 80 ? 120 : 101, l: 99 }));
    return chartPatterns(c, 2).length === 0;
  }],
  ['Muster: Ausbruch aus Seitwärtsphase', () => {
    const c = Array.from({ length: 80 }, (_, i) => ({ o: 100, c: 100, h: i % 12 === 6 ? 101 : 100.5, l: 99 }));
    c[79] = { o: 100, c: 103, h: 103.5, l: 99.8 };
    return chartPatterns(c, 1).some((e) => e.name === 'Ausbruch aus Seitwärtsphase');
  }],
  ['Muster: Doppelboden mit Nackenlinie', () => {
    const c = Array.from({ length: 90 }, (_, i) => ({ o: 90, c: 90, h: i === 60 ? 95 : 91, l: i === 50 ? 80 : i === 70 ? 80.5 : 89 }));
    c[89] = { o: 90, c: 97, h: 97.5, l: 89.5 };
    return chartPatterns(c, 2).some((e) => e.name === 'Doppelboden bestätigt');
  }],
  // Candlesticks
  ['Kerze: Bullish Engulfing nach Rückgang', () => {
    const c = [110, 108, 106, 104, 102, 100].map((p) => ({ o: p + 1, c: p, h: p + 1.5, l: p - 0.5 }));
    c.push({ o: 100, c: 98, h: 100.5, l: 97.8 }, { o: 97.5, c: 101, h: 101.2, l: 97.3 });
    return candlePatterns(c, 2).some((e) => e.name === 'Bullish Engulfing' && e.barsAgo === 0);
  }],
  ['Kerze: Hammer nach Rückgang', () => {
    const c = [100, 98, 96, 94, 92, 91, 90.5].map((p) => ({ o: p + 1, c: p, h: p + 1.2, l: p - 0.3 }));
    c.push({ o: 90, c: 90.5, h: 90.7, l: 87 });
    return candlePatterns(c, 2).some((e) => e.name === 'Hammer');
  }],
  ['Kerze: Hammer im Aufwärtstrend zählt nicht', () => {
    const c = [90, 92, 94, 96, 98, 99, 99.5].map((p) => ({ o: p - 1, c: p, h: p + 0.2, l: p - 1.2 }));
    c.push({ o: 100, c: 100.5, h: 100.7, l: 97 });
    return !candlePatterns(c, 2).some((e) => e.name === 'Hammer');
  }],
  ['Kerze: Drei weiße Soldaten', () => {
    const c = Array.from({ length: 5 }, () => ({ o: 100, c: 100, h: 100.2, l: 99.8 }));
    c.push({ o: 100, c: 102, h: 102.2, l: 99.9 }, { o: 102, c: 104, h: 104.2, l: 101.9 }, { o: 104, c: 106, h: 106.3, l: 103.9 });
    return candlePatterns(c, 2).some((e) => e.name === 'Drei weiße Soldaten');
  }],
  // Balance
  ['Balance: Ereignisse max. 30 Punkte', () => {
    const a = { stack: 'mixed', above200: null, structure: 'range', macdHist: null, rsi: null, events: Array.from({ length: 10 }, () => ({ dir: 'long', bonus: 15 })) };
    return scoreTimeframe(a).long === 30;
  }],
  ['Balance: voller Trend ohne Ereignisse = 70', () => scoreTimeframe({ stack: 'bull', above200: true, structure: 'up', macdHist: 1, macdHistPrev: 0.5, rsi: 60, events: [] }).long === 70],
  ['Balance: Trend + Ereignisse max. 100', () => scoreTimeframe({ stack: 'bull', above200: true, structure: 'up', macdHist: 1, macdHistPrev: 0.5, rsi: 60, events: [{ dir: 'long', bonus: 50 }] }).long === 100],
  // Bestätigungen (Retests)
  ['Retest: BOS mit Rücksetzer aufs Level', () => {
    const c = Array.from({ length: 50 }, (_, i) => ({ o: 100, c: 100, h: i === 30 ? 110 : 101, l: 99 }));
    c[40] = { o: 100, c: 112, h: 113, l: 100 };
    for (let i = 41; i < 45; i++) c[i] = { o: 112, c: 112, h: 113, l: 111 };
    c[45] = { o: 112, c: 111.5, h: 112.5, l: 110.3 };
    for (let i = 46; i < 50; i++) c[i] = { o: 112, c: 113, h: 113, l: 112 };
    const x = confirmations(c, 2).find((e) => e.dir === 'long' && e.type === 'BOS-Retest');
    return x && x.level === 110 && x.barsAgo === 4;
  }],
  ['Retest: Bruch ohne Rücksetzer = kein Siegel', () => {
    const c = Array.from({ length: 50 }, (_, i) => ({ o: 100, c: 100, h: i === 30 ? 110 : 101, l: 99 }));
    c[40] = { o: 100, c: 112, h: 113, l: 100 };
    for (let i = 41; i < 50; i++) c[i] = { o: 112, c: 115, h: 116, l: 114 };
    return !confirmations(c, 2).some((e) => e.type === 'BOS-Retest');
  }],
  ['Retest: Level tief durchbrochen = kein Siegel', () => {
    const c = Array.from({ length: 50 }, (_, i) => ({ o: 100, c: 100, h: i === 30 ? 110 : 101, l: 99 }));
    c[40] = { o: 100, c: 112, h: 113, l: 100 };
    for (let i = 41; i < 50; i++) c[i] = { o: 112, c: 108, h: 112, l: 106 };
    return !confirmations(c, 2).some((e) => e.dir === 'long' && e.type.includes('Retest'));
  }],
  ['Abpraller an Key Level mit Docht', () => {
    const c = Array.from({ length: 30 }, (_, i) => ({ o: 100, c: 100, h: 101, l: i === 10 ? 95 : i === 20 ? 95.3 : 99 }));
    c[29] = { o: 100, c: 100.5, h: 100.8, l: 95.2 };
    return confirmations(c, 2).some((e) => e.type === 'Key-Level-Abpraller' && e.dir === 'long' && e.barsAgo === 0);
  }],
  ['Kein Abpraller ohne Docht', () => {
    const c = Array.from({ length: 30 }, (_, i) => ({ o: 100, c: 100, h: 101, l: i === 10 ? 95 : i === 20 ? 95.3 : 99 }));
    c[29] = { o: 99, c: 95.4, h: 99.2, l: 95.2 };
    return !confirmations(c, 2).some((e) => e.type === 'Key-Level-Abpraller' && e.dir === 'long');
  }],
];
