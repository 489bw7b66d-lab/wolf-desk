// ENGINE 2 · Etappe A (7a) – nach dem Bauplan des Nutzers (Masterplan „ENGINE 2“). Läuft zunächst nur NEBEN der alten
// Engine (Backtest-Vergleich, Hinweis im Signalgeber); Telegram bleibt bei der alten, bis Engine 2 besser ist.
// Top-down: Trend-Zeitebene T → Zonen-Zeitebene Z → Auslöser-Zeitebene G
//   Swing:    T = Woche (aus Tageskerzen gebaut) · Z = Tag · G = 4H
//   Daytrade: T = Tag · Z = 4H · G = 1H          ·  Scalp: T = Tag · Z = 1H · G = 15M
// PFLICHT (sonst kein Signal): Struktur passt · Kurs in der Fib-Zone (0,5 bis Golden Pocket) · Reaktion (Umkehrpunkt-Regel
//   des Nutzers oder Liquiditäts-Sweep) · Chance/Risiko bis TP1 mind. CRV_MIN
// PUNKTE (Etappe A, max. 85; Nadaraya 15 folgt in Etappe B): Großwetterlage 20 · Fibonacci 20 · Konfluenz (Key Level,
//   Liquidität) 25 · RSI 10 · MACD 5 · MA-Kreuzung 5
// BREMSE: RSI der Zonen-Zeitebene über 80 (Long) bzw. unter 20 (Short)
// Reine Funktionen, Tests in test-engine2.js.
import { ema, rsi, macd, atr, pivots } from './core-indicators.js';
import { CONFIG } from './config.js';
import { gatePasses } from './core-trendgate.js';

// A2 (7b): Stop hinter die Zone mit Puffer der ZONEN-Zeitebene, TP1 bei 2R, strengere Pflicht, Short-Filter, ein Signal je Impuls
export const E2 = { crvMin: 2, pivotSide: 2, tolAtr: 0.25, stopAtrZ: 0.25, tp1R: 2 };
const TFMAP = { swing: { T: 'w', Z: '1d', G: '4h' }, intraday: { T: '1d', Z: '4h', G: '1h' }, scalp: { T: '1d', Z: '1h', G: '15m' } };

// Wochenkerzen aus Tageskerzen (Woche beginnt Montag, UTC)
export function toWeekly(daily) {
  const out = [];
  for (const c of daily || []) {
    const d = new Date(c.t), wd = (d.getUTCDay() + 6) % 7;
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - wd);
    const w = out.at(-1);
    if (w && w.t === start) { w.h = Math.max(w.h, c.h); w.l = Math.min(w.l, c.l); w.c = c.c; w.T = c.T; w.v = (w.v || 0) + (c.v || 0); }
    else out.push({ t: start, T: c.T, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v || 0 });
  }
  return out;
}

// Struktur aus den letzten zwei Swing-Hochs und -Tiefs
export function structure(candles, side = E2.pivotSide) {
  const pv = pivots(candles, side);
  const [h1, h2] = pv.highs.slice(-2), [l1, l2] = pv.lows.slice(-2);
  if (!h1 || !h2 || !l1 || !l2) return { trend: 'range', pv };
  if (h2.price > h1.price && l2.price > l1.price) return { trend: 'up', pv };
  if (h2.price < h1.price && l2.price < l1.price) return { trend: 'down', pv };
  return { trend: 'range', pv };
}

// Letzter Impuls in Richtung dir: Long = letztes bestätigtes Swing-Tief bis höchstes Hoch danach
export function impulse(candles, dir, side = E2.pivotSide) {
  const pv = pivots(candles, side);
  const start = (dir === 'long' ? pv.lows : pv.highs).at(-1);
  if (!start) return null;
  const after = candles.slice(start.i + 1);
  if (after.length < 2) return null;
  const ext = dir === 'long' ? Math.max(...after.map((c) => c.h)) : Math.min(...after.map((c) => c.l));
  const range = Math.abs(ext - start.price);
  if (!(range > 0)) return null;
  const lvl = (f) => (dir === 'long' ? ext - f * range : ext + f * range);
  return { from: start.price, to: ext, range, f50: lvl(0.5), f618: lvl(0.618), f65: lvl(0.65), pv };
}

// Wo steht der Kurs in der Fib-Zone? 'gp' (0,618–0,65), 'half' (0,5–0,618) oder null
export function fibZone(price, imp, tol, dir) {
  if (!imp) return null;
  const inside = (a, b) => price >= Math.min(a, b) - tol && price <= Math.max(a, b) + tol;
  if (inside(imp.f618, imp.f65)) return 'gp';
  if (inside(imp.f50, imp.f618)) return 'half';
  return null;
}

// ---- Umkehrkerzen und die Umkehrpunkt-Regel des Nutzers ----
const body = (c) => Math.abs(c.c - c.o);
export function reversalCandle(c, prev, dir) {
  if (!c) return null;
  const rng = c.h - c.l;
  if (!(rng > 0)) return null;
  const b = body(c), up = c.h - Math.max(c.o, c.c), lo = Math.min(c.o, c.c) - c.l;
  if (b <= 0.1 * rng) return (dir === 'long' ? lo >= 0.6 * rng : up >= 0.6 * rng) ? (dir === 'long' ? 'Dragonfly Doji' : 'Gravestone Doji') : 'Doji';
  if (dir === 'long' && lo >= 2 * b && up <= Math.max(b, 0.25 * rng)) return 'Hammer';
  if (dir === 'short' && up >= 2 * b && lo <= Math.max(b, 0.25 * rng)) return 'Shooting Star';
  if (prev && dir === 'long' && c.c > c.o && prev.c < prev.o && c.c >= prev.o && c.o <= prev.c) return 'Bullish Engulfing';
  if (prev && dir === 'short' && c.c < c.o && prev.c > prev.o && c.c <= prev.c && c.o >= prev.o) return 'Bearish Engulfing';
  return null;
}
// Regel: Umkehrkerze (k-1), danach schließt der Körper der nächsten Kerze (k) jenseits des Körpers der Kerze VOR der Umkehrkerze (k-2)
export function reversalPoint(candles, dir) {
  const n = candles?.length || 0;
  if (n < 3) return null;
  const k2 = candles[n - 3], rv = candles[n - 2], k = candles[n - 1];
  const name = reversalCandle(rv, k2, dir);
  if (!name) return null;
  const ok = dir === 'long' ? k.c > k.o && k.c > Math.max(k2.o, k2.c) : k.c < k.o && k.c < Math.min(k2.o, k2.c);
  return ok ? { name, low: Math.min(rv.l, k.l, k2.l), high: Math.max(rv.h, k.h, k2.h) } : null;
}
// Liquiditäts-Sweep: letzte Kerze sticht unter das letzte Swing-Tief (Short: über das Hoch) und schließt wieder darüber
export function liquiditySweep(candles, dir, side = E2.pivotSide) {
  const n = candles?.length || 0;
  if (n < 10) return null;
  const pv = pivots(candles.slice(0, -1), side);
  const lvl = (dir === 'long' ? pv.lows : pv.highs).at(-1);
  if (!lvl) return null;
  const k = candles[n - 1];
  const ok = dir === 'long' ? k.l < lvl.price && k.c > lvl.price : k.h > lvl.price && k.c < lvl.price;
  return ok ? { name: 'Liquiditäts-Sweep', low: k.l, high: k.h, level: lvl.price } : null;
}

// Key Level: früheres Swing-Hoch/-Tief in der Nähe der Zone; Liquidität: zwei Tiefs (Hochs) fast gleich hoch
export function confluence(candles, zoneMid, tol, dir, side = E2.pivotSide) {
  const pv = pivots(candles, side);
  const all = [...pv.highs, ...pv.lows];
  const key = all.some((p) => Math.abs(p.price - zoneMid) <= tol * 2);
  const same = (dir === 'long' ? pv.lows : pv.highs).slice(-6);
  let liq = false;
  for (let i = 0; i < same.length && !liq; i++) for (let j = i + 1; j < same.length; j++) {
    if (Math.abs(same[i].price - same[j].price) <= tol * 0.6 && Math.abs(same[i].price - zoneMid) <= tol * 4) { liq = true; break; }
  }
  return { key, liq };
}

// Short-Filter (wie bei der alten Engine, Stufe aus den Einstellungen): Shorts nur mit bärischem Tagestrend
export function e2ShortGate(daily) {
  const closes = (daily || []).map((c) => c.c);
  const e200 = ema(closes, 200).at(-1), e8 = ema(closes, 8).at(-1), e21 = ema(closes, 21).at(-1), e55 = ema(closes, 55).at(-1);
  const close = closes.at(-1);
  if (!(e200 > 0) || !(close > 0)) return { known: false, mild: true, mittel: true, streng: true };
  const mild = close < e200;
  const mittel = mild && (structure(daily).trend === 'down' || (e8 < e21 && e21 < e55));
  const streng = mittel && Math.max(...daily.slice(-10).map((c) => c.h)) >= e200 * 0.99;
  return { known: true, mild, mittel, streng };
}

// ---- Die Bewertung ----
// series: Objekt { '1d': [...], '4h': [...], ... } mit abgeschlossenen Kerzen
export function engine2(series, style = 'swing', opts = {}) {
  const map = TFMAP[style] || TFMAP.swing;
  const Z = series[map.Z], G = series[map.G];
  const T = map.T === 'w' ? toWeekly(series['1d']) : series[map.T];
  if (!Z?.length || !G?.length || !T?.length || Z.length < 30 || G.length < 30) return { ok: false, reason: 'zu wenig Kerzen', style };
  const price = G.at(-1).c;
  const atrZ = atr(Z, 14).at(-1), atrG = atr(G, 14).at(-1);
  if (!(atrZ > 0) || !(atrG > 0)) return { ok: false, reason: 'keine Schwankung messbar', style };
  const tol = E2.tolAtr * atrZ;
  const st = structure(T);
  const rsiZ = rsi(Z.map((c) => c.c), 14).at(-1);
  const best = { ok: false, reason: '', style, price };

  for (const dir of ['long', 'short']) {
    const lng = dir === 'long';
    // Pflicht 1: Struktur (Trend-Zeitebene), sonst höchstens die Zonen-Zeitebene gleichgerichtet
    // A2: Struktur MUSS auf der Trend-Zeitebene passen (keine Ausweichregel mehr)
    if (st.trend !== (lng ? 'up' : 'down')) { best.reason ||= 'Struktur passt nicht'; continue; }
    if (!lng && !gatePasses(e2ShortGate(series['1d']), opts.shortFilter ?? CONFIG.signals.shortFilter)) { best.reason ||= 'Short gesperrt: Tagestrend nicht bärisch'; continue; }
    // Pflicht 2: Zone (Fibonacci des letzten Impulses auf der Zonen-Zeitebene)
    const imp = impulse(Z, dir);
    // Maßgeblich ist, wie tief die Reaktion in die Zone gegriffen hat (Docht der letzten Kerzen), sonst der aktuelle Kurs
    const extreme = lng ? Math.min(...G.slice(-3).map((c) => c.l)) : Math.max(...G.slice(-3).map((c) => c.h));
    const reactionZone = fibZone(extreme, imp, tol, dir) || fibZone(price, imp, tol, dir);
    if (!reactionZone) { best.reason = best.reason === 'Struktur passt nicht' || !best.reason ? `Struktur ${lng ? 'bullisch' : 'bärisch'}, Kurs noch nicht in der Zone` : best.reason; best.watch ||= imp ? { dir, from: Math.min(imp.f50, imp.f65), to: Math.max(imp.f50, imp.f65) } : null; continue; }
    // Bremse
    if (rsiZ != null && (lng ? rsiZ >= 80 : rsiZ <= 20)) { best.reason = `Bremse: RSI ${Math.round(rsiZ)}`; continue; }
    // A2: das 0,5er zählt nur, wenn dort ein Key Level liegt
    const conf = confluence(Z, (imp.f50 + imp.f65) / 2, tol, dir);
    if (reactionZone === 'half' && !conf.key) { best.reason = 'Nur am 0,5er ohne Key Level, warte aufs Golden Pocket'; best.watch = { dir, from: Math.min(imp.f618, imp.f65), to: Math.max(imp.f618, imp.f65) }; continue; }
    // Pflicht 3: Reaktion
    const rev = reversalPoint(G, dir) || liquiditySweep(G, dir);
    if (!rev) { best.reason = `In der Zone (${reactionZone === 'gp' ? 'Golden Pocket' : '0,5'}), warte auf Reaktion`; best.watch = { dir, from: Math.min(imp.f50, imp.f65), to: Math.max(imp.f50, imp.f65) }; continue; }
    // Plan: Einstieg zum Schluss der Bestätigung, Stop hinter Reaktion bzw. Zone, Ziele am Impuls-Extrem und Erweiterungen
    const entry = price;
    // A2: Stop hinter die Zone (Golden Pocket bzw. Reaktion, was weiter weg ist) mit Puffer der ZONEN-Zeitebene – raus aus dem Rauschen
    const stop = lng ? Math.min(rev.low, imp.f65) - E2.stopAtrZ * atrZ : Math.max(rev.high, imp.f65) + E2.stopAtrZ * atrZ;
    const R = Math.abs(entry - stop);
    const sg = lng ? 1 : -1;
    const ext = (f) => (lng ? imp.to + f * imp.range : imp.to - f * imp.range);
    // Chance/Risiko: Platz bis zum alten Impuls-Extrem muss mind. crvMin × Risiko sein
    const crv = ((imp.to - entry) * sg) / R;
    // Ziele: TP1 bei 2R, dann Impuls-Extrem und Erweiterungen (aufsteigend, ohne Doppelte)
    const tps = [...new Set([entry + sg * E2.tp1R * R, imp.to, ext(0.272), ext(0.618), ext(1)].map((x) => +x.toPrecision(10)))]
      .filter((x) => (x - entry) * sg > 0).sort((a, b) => (a - b) * sg).slice(0, 4);
    // Pflicht 4: Chance/Risiko
    if (!(crv >= (opts.crvMin ?? E2.crvMin))) { best.reason = `Chance/Risiko nur 1 : ${crv > 0 ? crv.toFixed(1).replace('.', ',') : '0'}`; continue; }
    // Punkte
    const closes = G.map((c) => c.c), h = macd(closes).hist, e8 = ema(closes, 8).at(-1), e21 = ema(closes, 21).at(-1);
    const pts = {
      gross: st.trend === (lng ? 'up' : 'down') ? 20 : 10,
      fib: reactionZone === 'gp' ? 20 : 10,
      konf: (conf.key ? 15 : 0) + (conf.liq ? 10 : 0),
      rsi: rsiZ == null ? 0 : lng ? (rsiZ < 50 ? 10 : rsiZ < 60 ? 5 : 0) : (rsiZ > 50 ? 10 : rsiZ > 40 ? 5 : 0),
      macd: h.at(-1) != null && h.at(-2) != null && (lng ? h.at(-1) > h.at(-2) : h.at(-1) < h.at(-2)) ? 5 : 0,
      ma: e8 != null && e21 != null && (lng ? e8 > e21 : e8 < e21) ? 5 : 0,
    };
    const score = Object.values(pts).reduce((a, b) => a + b, 0);
    const plan = { dir, entry, stop, zone: [entry, entry], tps, R, stopDistPct: (R / entry) * 100, method: 'engine2', entryMode: 'Reaktion', stopLabel: 'hinter der Zone', crv, warnings: [], impulseKey: `${dir}|${imp.from}|${imp.to}` };
    return { ok: true, style, dir, plan, score, pts, trigger: rev.name, zone: reactionZone, crv, price };
  }
  return best;
}

// Für den Backtest: Engine-2-Ergebnis in die Form bringen, die runBacktest erwartet (wie signalFromSeries)
export function engine2FromSlices(modeKey, tfs, slices) {
  const series = Object.fromEntries(tfs.map((tf, i) => [tf, slices[i]]));
  const r = engine2(series, modeKey);
  if (!r.ok) return { plan: null };
  const G = series[(TFMAP[modeKey] || TFMAP.swing).G];
  return { plan: r.plan, dir: r.dir, total: { long: r.dir === 'long' ? r.score : 0, short: r.dir === 'short' ? r.score : 0 },
    events: [{ name: r.trigger, dir: r.dir }, { name: r.zone === 'gp' ? 'Golden Pocket' : 'Fib 0,5', dir: r.dir }],
    confirms: [], gate: null, analyses: [null, { close: G.at(-1).c }], engine2: r };
}
