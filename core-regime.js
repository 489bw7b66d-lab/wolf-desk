// Marktphasen-Schalter (8c, nur Messung): In welcher Phase war BITCOIN beim Einstieg eines Backtest-Trades?
// Zwei Merker je Trade: t = BTC selbst im Maßstab-Zustand (Tages-EMA 20 über EMA 100 und Tagesschluss über der EMA 20),
// a = BTC-Tagesschluss über der Tages-EMA 100. Es zählt nur die letzte Tageskerze, die zum Einstieg schon abgeschlossen war.
// Reine Funktionen, Tests in test-regime.js. Ändert kein Signal und keine Meldung.
import { ema } from './core-indicators.js';

export const REGIME = { fast: 20, slow: 100 };
export const REGIME_ROWS = [['all', 'Alle Trades'], ['trend', 'Nur BTC im Trend'], ['above', 'Nur BTC über EMA 100']];

// Einmal je Lauf vorbereiten: EMA-Reihen über alle Tageskerzen. Die EMA schaut nur zurück,
// der Wert an einer Kerze ist also derselbe, als hätte man die Reihe dort abgeschnitten.
export function regimeIndex(daily, cfg = REGIME) {
  const list = (daily || []).filter((c) => c && c.T > 0 && c.c > 0);
  if (list.length < cfg.slow) return null;
  const closes = list.map((c) => c.c);
  return { T: list.map((c) => c.T), c: closes, fast: ema(closes, cfg.fast), slow: ema(closes, cfg.slow) };
}

// Merker zum Zeitpunkt t (Einstieg). null = zu wenig Tagesdaten davor.
export function regimeAt(idx, t) {
  if (!idx || !(t > 0)) return null;
  let lo = 0, hi = idx.T.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (idx.T[m] <= t) { k = m; lo = m + 1; } else hi = m - 1; }
  if (k < 0) return null;
  const f = idx.fast[k], s = idx.slow[k], c = idx.c[k];
  if (!(f > 0) || !(s > 0)) return null;
  return { t: f > s && c > f ? 1 : 0, a: c > s ? 1 : 0 };
}

// Tabelle über dieselben Trades: alle · nur BTC im Trend · nur BTC über EMA 100, jeweils mit beiden Zeiträumen.
// Gerechnet wird nur über Trades mit Merker, damit alle Zeilen dieselbe Grundlage haben.
export function compareRegime(trades, from, to) {
  const known = (trades || []).filter((x) => x.btc && (x.btc.t === 0 || x.btc.t === 1));
  if (!known.length) return null;
  const cut = to > from ? from + (to - from) * 2 / 3 : null;
  const part = (l) => ({ n: l.length, avgR: l.length ? l.reduce((s, x) => s + x.r, 0) / l.length : null, sum: l.reduce((s, x) => s + x.r, 0) });
  const row = (key, l) => ({ key, ...part(l), dev: cut == null ? null : part(l.filter((x) => x.time < cut)), conf: cut == null ? null : part(l.filter((x) => x.time >= cut)) });
  return { n: known.length, unknown: (trades || []).length - known.length,
    rows: [row('all', known), row('trend', known.filter((x) => x.btc.t === 1)), row('above', known.filter((x) => x.btc.a === 1))],
    out: { trend: part(known.filter((x) => x.btc.t !== 1)), above: part(known.filter((x) => x.btc.a !== 1)) } };
}

// Besteht eine Zeile die Messlatte? Im Schnitt UND in beiden Zeiträumen im Plus, mindestens minTrades Trades.
export const regimeHolds = (row, minTrades = 300) => !!row && row.n >= minTrades && row.avgR > 0 && row.dev?.avgR > 0 && row.conf?.avgR > 0;
