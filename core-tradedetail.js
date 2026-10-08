// „Deine Trades im Detail“ (8n): Auswertung der eigenen Trades aus den Fills, nur auf dem iPhone, nichts davon ins Repository.
// Von Jensen am 07.10.2026 um 20:33 gewünscht. Je Trade: Stop-Abstand in Tages-ATR (wenn der Stop in der Order-Historie
// steht), Einstieg zum Kurs oder per Limit, bester Stand gegen erreichtes Ergebnis, Haltedauer, Markt-Bias beim Einstieg.
// Statistik getrennt nach „mit dem Bias“ und „gegen den Bias“. Nur beschreibend: Bei wenigen Trades ist jeder Unterschied Zufall.
// Bewusst OHNE Beträge in Dollar: Alles steht in Tages-ATR, in R (wenn der Stop bekannt ist) und in Prozent vom Kurs.
// So lassen sich Screenshots dieser Karte teilen, ohne das Konto offenzulegen. Den Hebel von damals liefern die Fills nicht.
// Reine Funktionen, Tests in test-tradedetail.js.
import { atr } from './core-indicators.js';
import { trendOf } from './core-index.js';
import { mulberry32 } from './core-randombase.js';

export const TD = { atrPeriod: 14, minN: 10, stopWindowMs: 5 * 60e3 };

// Tageskerzen, die zum Zeitpunkt t schon abgeschlossen waren
export const closedBefore = (daily, t) => (daily || []).filter((c) => c.T < t);

// Tages-ATR(14) am letzten abgeschlossenen Tag vor t
export function atrAt(daily, t, period = TD.atrPeriod) {
  const d = closedBefore(daily, t);
  const a = atr(d, period);
  return a.length ? a[a.length - 1] : null;
}

// Durchschnittlicher Ausstiegskurs eines Trades (nur geschlossene Teile)
export function exitAvg(trade) {
  const q = (trade?.exits || []).reduce((s, e) => s + e.sz, 0);
  return q > 0 ? trade.exits.reduce((s, e) => s + e.px * e.sz, 0) / q : null;
}

// Einstieg zum Kurs (Taker) oder per Limit (Maker): aus dem Feld „crossed“ der Fills, die den Trade eröffnet haben.
// Ergebnis: 'Kurs' | 'Limit' | 'gemischt' | null (Feld fehlt)
export function entryKind(trade, fills) {
  const times = new Set((trade?.entries || []).map((e) => e.time));
  const own = (fills || []).filter((f) => f.coin === trade?.coin && times.has(Number(f.time)) && typeof f.crossed === 'boolean');
  if (!own.length) return null;
  const taker = own.filter((f) => f.crossed).length;
  return taker === own.length ? 'Kurs' : taker === 0 ? 'Limit' : 'gemischt';
}

// Stop aus der Order-Historie: die erste Stop-Order zum Schließen (Gegenrichtung) für diesen Coin, gesetzt zwischen
// kurz vor dem Einstieg (5 Minuten) und dem Ende des Trades. Ein später nachgezogener Stop zählt nicht, nur der erste.
// orders: Liste aus „historicalOrders“ von Hyperliquid (Form ungeprüft, deshalb vorsichtig gelesen).
export function stopFor(trade, orders, cfg = TD) {
  const end = trade?.closedAt ?? Infinity, close = trade?.side === 'long' ? 'A' : 'B';
  const list = (orders || []).map((x) => x?.order || x).filter((o) => o && o.coin === trade?.coin && o.side === close
    && Number(o.triggerPx) > 0 && /stop/i.test(String(o.orderType || '')) && Number(o.timestamp) >= trade.openedAt - cfg.stopWindowMs && Number(o.timestamp) <= end);
  list.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  return list.length ? Number(list[0].triggerPx) : null;
}

// Bester Stand (in Richtung des Trades) zwischen Einstieg und Ende aus Stundenkerzen.
// Hinweis: Die Stunde des Einstiegs und die des Ausstiegs zählen ganz mit, das kann den besten Stand leicht überzeichnen.
export function bestPrice(trade, hourly) {
  const end = trade?.closedAt ?? Infinity;
  const cs = (hourly || []).filter((c) => c.T >= trade.openedAt && c.t <= end);
  if (!cs.length) return null;
  return trade.side === 'long' ? Math.max(...cs.map((c) => c.h)) : Math.min(...cs.map((c) => c.l));
}

// Markt-Bias beim Einstieg aus BTC-Tageskerzen und Alt-Index (beide nur bis zum Vortag des Einstiegs).
// 'aufwärts' = BTC und Alts aufwärts · 'abwärts' = beide nicht aufwärts · 'gemischt' sonst. Ohne Alt-Index zählt BTC allein.
export function biasAt(btcDaily, altIndex, t) {
  const b = trendOf(closedBefore(btcDaily, t)), a = trendOf(closedBefore(altIndex, t));
  if (b == null && a == null) return { state: null, btcUp: null, altUp: null };
  const both = [b, a].filter((x) => x != null);
  const state = both.every((x) => x) ? 'aufwärts' : both.every((x) => !x) ? 'abwärts' : 'gemischt';
  return { state, btcUp: b, altUp: a };
}
// Passte der Trade zum Bias? 'mit' | 'gegen' | 'gemischt' | null
export function withBias(side, state) {
  if (!state) return null;
  if (state === 'gemischt') return 'gemischt';
  return (side === 'long') === (state === 'aufwärts') ? 'mit' : 'gegen';
}

// Eine Zeile je Trade. ctx: { fills, orders, daily: {COIN: [...]}, hourly: {key: [...]}, btc, alt }
export function detailRow(trade, ctx = {}) {
  const sign = trade.side === 'long' ? 1 : -1, entry = trade.entryAvg;
  const daily = ctx.daily?.[trade.coin], A = atrAt(daily, trade.openedAt);
  const ex = exitAvg(trade), closed = trade.closedAt != null;
  const best = bestPrice(trade, ctx.hourly?.[trade.coin + '|' + trade.openedAt]);
  const stop = stopFor(trade, ctx.orders);
  const inA = (d) => (A > 0 && d != null ? d / A : null);
  const R = stop != null && entry > 0 ? Math.abs(entry - stop) : null;
  const res = closed && ex != null && entry > 0 ? sign * (ex - entry) : null;
  const top = best != null && entry > 0 ? Math.max(0, sign * (best - entry)) : null;
  const bias = biasAt(ctx.btc, ctx.alt, trade.openedAt);
  return {
    coin: trade.coin, side: trade.side, openedAt: trade.openedAt, closedAt: trade.closedAt ?? null, closed, partial: !!trade.partial,
    holdH: ((trade.closedAt ?? ctx.now ?? Date.now()) - trade.openedAt) / 36e5,
    kind: entryKind(trade, ctx.fills),
    stopAtr: R != null ? inA(R) : null,
    resPct: res != null ? (res / entry) * 100 : null, resAtr: inA(res), resR: R > 0 && res != null ? res / R : null,
    bestAtr: inA(top), bestR: R > 0 && top != null ? top / R : null,
    leftAtr: res != null && top != null ? inA(top - res) : null,
    coinUp: trendOf(closedBefore(daily, trade.openedAt)),
    bias: bias.state, btcUp: bias.btcUp, altUp: bias.altUp, fit: withBias(trade.side, bias.state),
  };
}

// Statistik einer Gruppe (nur geschlossene Trades)
export function groupStats(rows) {
  const L = (rows || []).filter((r) => r.closed && r.resAtr != null);
  const avg = (k) => { const v = L.map((r) => r[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return { n: L.length, winPct: L.length ? (L.filter((r) => r.resAtr > 0).length / L.length) * 100 : null,
    resAtr: avg('resAtr'), bestAtr: avg('bestAtr'), leftAtr: avg('leftAtr'), holdH: avg('holdH'), resPct: avg('resPct'), stopAtr: avg('stopAtr') };
}
// Gruppen für die Tabelle
export function splitStats(rows) {
  const g = (fn) => groupStats((rows || []).filter(fn));
  return {
    all: g(() => true),
    bias: { mit: g((r) => r.fit === 'mit'), gegen: g((r) => r.fit === 'gegen'), gemischt: g((r) => r.fit === 'gemischt') },
    kind: { Kurs: g((r) => r.kind === 'Kurs'), Limit: g((r) => r.kind === 'Limit') },
    coin: { im: g((r) => r.coinUp === (r.side === 'long')), gegen: g((r) => r.coinUp != null && r.coinUp !== (r.side === 'long')) },
    // 8p: Stop-Abstand in Tages-ATR (nur wo der Stop bekannt ist)
    stop: { eng: g((r) => r.stopAtr != null && r.stopAtr < 1), mittel: g((r) => r.stopAtr != null && r.stopAtr >= 1 && r.stopAtr < 1.5), weit: g((r) => r.stopAtr != null && r.stopAtr >= 1.5) },
  };
}

const num = (x, d = 1) => (x == null || !Number.isFinite(x) ? '–' : x.toFixed(d).replace('.', ',').replace('-', '−'));
export const atrTxt = (x) => (x == null ? '–' : `${num(x)} ATR`);
export const holdTxt = (h) => (h == null ? '–' : h < 48 ? `${Math.round(h)} Std.` : `${num(h / 24)} Tage`);
// Eine kurze Aussage zum Vergleich zweier Gruppen, ehrlich über die Menge
export function compareText(a, b, nameA, nameB, minN = TD.minN) {
  if (!a?.n || !b?.n) return `Für den Vergleich ${nameA} gegen ${nameB} fehlen Trades in einer der beiden Gruppen.`;
  const base = `${nameA}: ${a.n} Trades, im Schnitt ${atrTxt(a.resAtr)} · ${nameB}: ${b.n} Trades, im Schnitt ${atrTxt(b.resAtr)}.`;
  return a.n < minN || b.n < minN ? `${base} Noch zu wenige Trades (je Gruppe mindestens ${minN}), der Unterschied kann reiner Zufall sein.` : `${base} Bei dieser Menge ist ein Unterschied von weniger als einer halben ATR noch kein Muster.`;
}

// ---- 8o: Würfel-Vergleich für die eigenen Trades (Jensen, 08.10.: „der Würfel ist genauso gut?“) ----
// Frage: War die Wahl des Coins besser als der Zufall? Für jeden abgeschlossenen Trade derselbe Einstiegszeitpunkt, dieselbe
// Haltedauer und dieselbe Richtung, aber ein zufälliger anderer Markt aus der handelbaren Liste. Gemessen wird bei beiden gleich:
// Schluss der letzten abgeschlossenen 4H-Kerze vor dem Einstieg bis Schluss der letzten vor dem Ausstieg, in 4H-ATR(14) des Coins.
// Stops und Teilverkäufe spielen dabei keine Rolle (sie hängen am eigenen Coin); verglichen wird nur die Wahl des Coins.
// Trades, die kürzer als eine 4H-Kerze liefen, zählen nicht. Fester Würfel, damit derselbe Lauf dasselbe Ergebnis liefert.
export const DICE = { runs: 500, seed: 20261008, minCand: 5, pass: 95 };

// Je Coin einmal vorbereiten: Zeiten, Schlusskurse, 4H-ATR
export function prepH4(candles) {
  const cs = (candles || []).filter((c) => c && c.c > 0);
  return { T: cs.map((c) => c.T), c: cs.map((c) => c.c), atr: atr(cs, TD.atrPeriod) };
}
// Index der letzten Kerze, die vor t abgeschlossen war (-1, wenn keine)
export function lastBefore(P, t) {
  let lo = 0, hi = P.T.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (P.T[m] < t) { k = m; lo = m + 1; } else hi = m - 1; }
  return k;
}
// Bewegung eines Coins zwischen zwei Zeitpunkten in 4H-ATR, in Richtung side. null, wenn nicht messbar.
export function moveAtr(P, side, a, b) {
  if (!P) return null;
  const i = lastBefore(P, a), j = lastBefore(P, b);
  if (i < 0 || j <= i || !(P.atr[i] > 0)) return null;
  return (side === 'short' ? -1 : 1) * (P.c[j] - P.c[i]) / P.atr[i];
}
// trades: [{ coin, side, openedAt, closedAt }], h4: { COIN: Kerzen } → Ergebnis des Vergleichs
export function diceCompare(trades, h4, cfg = DICE) {
  const P = Object.fromEntries(Object.entries(h4 || {}).map(([k, v]) => [k, prepH4(v)]));
  const coins = Object.keys(P), used = [];
  for (const t of trades || []) {
    if (t.closedAt == null) continue;
    const own = moveAtr(P[t.coin], t.side, t.openedAt, t.closedAt);
    if (own == null) continue;
    const cand = coins.filter((c) => c !== t.coin).map((c) => moveAtr(P[c], t.side, t.openedAt, t.closedAt)).filter((x) => x != null);
    if (cand.length < cfg.minCand) continue;
    used.push({ own, cand });
  }
  if (!used.length) return { n: 0 };
  const ownMean = used.reduce((s, u) => s + u.own, 0) / used.length, rnd = mulberry32(cfg.seed), means = [];
  for (let r = 0; r < cfg.runs; r++) { let s = 0; for (const u of used) s += u.cand[Math.floor(rnd() * u.cand.length)]; means.push(s / used.length); }
  means.sort((a, b) => a - b);
  const q = (p) => means[Math.min(means.length - 1, Math.floor(p * means.length))];
  const beat = (means.filter((m) => m < ownMean).length / means.length) * 100;
  return { n: used.length, skipped: (trades || []).filter((t) => t.closedAt != null).length - used.length, own: ownMean, beat, p5: q(0.05), p50: q(0.5), p95: q(0.95), runs: cfg.runs };
}
export function diceText(d, cfg = DICE, minN = TD.minN) {
  if (!d?.n) return 'Kein Trade ließ sich vergleichen (zu kurz oder zu wenige andere Märkte mit Kerzen).';
  const base = `${d.n} Trades verglichen${d.skipped ? `, ${d.skipped} nicht (kürzer als 4 Stunden oder ohne Kerzen)` : ''}. Deine Coins: im Schnitt ${num(d.own)} ATR. Würfel: Mitte ${num(d.p50)} ATR, 90 % der Durchgänge zwischen ${num(d.p5)} und ${num(d.p95)} ATR. Deine Wahl lag über ${Math.round(d.beat)} % der ${d.runs} Würfel-Durchgänge.`;
  const verdict = d.n < minN ? 'Noch zu wenige Trades für ein Urteil.' : d.beat >= cfg.pass ? `Das ist besser als der Zufall (dieselbe Hürde wie im Testplan: ${cfg.pass} %).` : d.beat <= 100 - cfg.pass ? 'Das ist schlechter als der Zufall.' : 'Das ist vom Zufall nicht zu unterscheiden.';
  return `${base} ${verdict}`;
}
