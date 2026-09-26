// Trades aus den Ausführungen (Fills) von Hyperliquid zusammensetzen.
// Ein Trade beginnt, wenn die Position von 0 aus eröffnet wird, und endet, wenn sie wieder 0 ist.
// Reine Funktionen, Tests in test-trades.js.

const EPS = 1e-9;
const n = (v) => Number(v) || 0;

export function tradeHistory(fills) {
  const byCoin = new Map();
  (Array.isArray(fills) ? fills : []).forEach((f) => {
    if (!f?.coin || !Number.isFinite(Number(f.sz))) return;
    if (!byCoin.has(f.coin)) byCoin.set(f.coin, []);
    byCoin.get(f.coin).push(f);
  });
  const trades = [];
  for (const [coin, list] of byCoin) {
    list.sort((a, b) => n(a.time) - n(b.time));
    let cur = null;
    const start = (side, time, partial) => ({ coin, side, openedAt: time, closedAt: null, partial, entries: [], exits: [], fees: 0, realized: 0, maxSz: 0 });
    for (const f of list) {
      const sz = n(f.sz), before = n(f.startPosition), after = before + (f.side === 'B' ? sz : -sz);
      const time = n(f.time), px = n(f.px), fee = n(f.fee), pnl = n(f.closedPnl);
      if (!cur && (Math.abs(after) > EPS || Math.abs(before) > EPS)) cur = start((Math.abs(before) > EPS ? before : after) > 0 ? 'long' : 'short', time, Math.abs(before) > EPS);
      if (!cur) continue;
      cur.maxSz = Math.max(cur.maxSz, Math.abs(before), Math.sign(after) === Math.sign(before || after) ? Math.abs(after) : 0);
      const opening = Math.abs(after) > Math.abs(before) + EPS && Math.sign(after) === Math.sign(before || after);
      if (opening) {
        cur.entries.push({ time, px, sz });
        cur.fees += fee; cur.realized -= fee;
      } else {
        // Schließt (ganz oder teilweise). Ein Seitenwechsel schließt den Trade und eröffnet einen neuen.
        const flip = Math.abs(after) > EPS && Math.sign(after) !== Math.sign(before);
        const closeSz = flip ? Math.abs(before) : sz;
        const share = sz > 0 ? closeSz / sz : 1;
        cur.exits.push({ time, px, sz: closeSz, pnl: pnl - fee * share });
        cur.fees += fee * share; cur.realized += pnl - fee * share;
        if (Math.abs(after) < EPS || flip) {
          cur.closedAt = time; trades.push(cur); cur = null;
          if (flip) { cur = start(after > 0 ? 'long' : 'short', time, false); cur.maxSz = Math.abs(after); cur.entries.push({ time, px, sz: Math.abs(after) }); cur.fees += fee * (1 - share); cur.realized -= fee * (1 - share); }
        }
      }
    }
    if (cur) trades.push(cur);
  }
  trades.forEach((t) => {
    const q = t.entries.reduce((s, e) => s + e.sz, 0);
    t.entryAvg = q > 0 ? t.entries.reduce((s, e) => s + e.px * e.sz, 0) / q : null;
    t.closedSz = t.exits.reduce((s, e) => s + e.sz, 0);
    // Anteil jedes Verkaufs an der größten Positionsgröße dieses Trades
    t.exits.forEach((e) => { e.sharePct = t.maxSz > 0 ? (e.sz / t.maxSz) * 100 : null; });
    t.soldPct = t.maxSz > 0 ? (t.closedSz / t.maxSz) * 100 : null;
  });
  return trades.sort((a, b) => (b.closedAt ?? Infinity) - (a.closedAt ?? Infinity) || b.openedAt - a.openedAt);
}

// Laufender Trade zu einer offenen Position
export const openTradeFor = (trades, coin) => (trades || []).find((t) => t.coin === coin && t.closedAt == null) || null;
export const closedTrades = (trades, max = 10) => (trades || []).filter((t) => t.closedAt != null).slice(0, max);

// Gesamtperformance aufgeteilt: realisiert (schon im Konto) und Buchgewinn (offene Positionen)
export function perfSplit(equity, startCapital, openPnl) {
  if (!(startCapital > 0) || equity == null) return null;
  const total = equity - startCapital;
  const book = openPnl || 0;
  return { total, pct: (total / startCapital) * 100, book, realized: total - book };
}

// Veränderung in Prozent gegenüber dem Vortag (24h)
export const change24h = (price, prevDay) => (price > 0 && prevDay > 0 ? ((price - prevDay) / prevDay) * 100 : null);

// Abstand vom Live-Kurs zum Einstieg: 0 in der Zone, sonst Prozent bis zur nächsten Zonengrenze (+ = Kurs darüber)
export function entryDistance(plan, price) {
  if (!plan || !(price > 0)) return null;
  const [lo, hi] = plan.zone;
  if (price >= lo && price <= hi) return 0;
  return price > hi ? ((price - hi) / hi) * 100 : ((price - lo) / lo) * 100;
}

// Auswertung der eigenen abgeschlossenen Trades: Trefferquote, Ø Gewinn/Verlust,
// Vergleich „in Teilen verkauft“ (Ausstiegsplan) gegen „alles auf einmal“.
export function tradeStats(trades) {
  const list = (trades || []).filter((t) => t.closedAt != null && !t.partial);
  const stat = (l) => {
    const n = l.length, wins = l.filter((t) => t.realized > 0);
    const total = l.reduce((s, t) => s + t.realized, 0);
    return { n, winRate: n ? (wins.length / n) * 100 : null, avg: n ? total / n : null, total };
  };
  if (!list.length) return { n: 0 };
  const wins = list.filter((t) => t.realized > 0), losses = list.filter((t) => t.realized <= 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.realized, 0) / wins.length : null;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.realized, 0) / losses.length : null;
  const sorted = [...list].sort((a, b) => b.realized - a.realized);
  return {
    ...stat(list), avgWin, avgLoss,
    payoff: avgWin != null && avgLoss ? avgWin / Math.abs(avgLoss) : null,
    best: sorted[0], worst: sorted.at(-1),
    split: stat(list.filter((t) => t.exits.length >= 2)),
    single: stat(list.filter((t) => t.exits.length === 1)),
    long: stat(list.filter((t) => t.side === 'long')), short: stat(list.filter((t) => t.side === 'short')),
  };
}
