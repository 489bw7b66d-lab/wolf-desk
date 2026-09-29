// Manueller Trailing-Stop nach Struktur (seit 4d). Die App setzt keine Orders, sie sagt dir nur: „SL auf … nachziehen“.
// Regeln (mit Buddy abgestimmt):
//  1. frühestens ab TP1 (vorher bleibt der ursprüngliche Stop, der Trade braucht Luft)
//  2. nur bestätigte Struktur auf der Setup-Zeitebene (Swing 4H, Daytrade 1H): ein neues höheres Tief (Short: tieferes Hoch)
//     nach der Eröffnung, aus abgeschlossenen Kerzen mit je 2 Kerzen links und rechts
//  3. Stop mit Puffer (½ ATR) hinter dieses Tief, nicht direkt drauf
//  4. nur in Gewinnrichtung: ein Vorschlag kommt nur, wenn er deinen jetzigen Stop verbessert
//  5. Sicherheitsnetz: spätestens ab TP2 Stop auf Einstieg plus Gebühren (Ein- und Ausstieg)
// Reine Funktion trailStop hat Tests in test-trail.js.
import { CONFIG } from './config.js';
import { pivots, atr } from './core-indicators.js';
import { setupTf } from './core-guard.js';

export const TRAIL = { bufferAtr: 0.5, pivotSide: 2, minGapPct: 0.3, minMovePct: 0.1 };

export function trailStop({ side, entry, stop = null, mark, hits = 0, candles = null, atrValue = null, openedAt = 0, feePct = 0.045, cfg = TRAIL, liq = null }) {
  if (!(hits >= 1) || !(entry > 0) || !(mark > 0)) return null;
  const sg = side === 'long' ? 1 : -1;
  let best = null;

  // 2./3. Struktur: neuestes Swing-Tief (Short: -Hoch) nach der Eröffnung, das höher (tiefer) ist als das vorige
  if (candles?.length > 2 * cfg.pivotSide + 2 && atrValue > 0) {
    const { lows, highs } = pivots(candles, cfg.pivotSide);
    const piv = sg > 0 ? lows : highs;
    for (let k = piv.length - 1; k >= 1; k--) {
      const cur = piv[k], prev = piv[k - 1];
      if (candles[cur.i].t < openedAt) break;
      if ((cur.price - prev.price) * sg > 0) {
        best = { stop: cur.price - sg * cfg.bufferAtr * atrValue, kind: 'struktur', pivot: cur.price, at: candles[cur.i].t };
        break;
      }
    }
  }
  // 5. Sicherheitsnetz ab TP2: Einstieg plus Gebühren
  if (hits >= 2) {
    const be = entry * (1 + sg * (2 * feePct) / 100);
    if (!best || (be - best.stop) * sg > 0) best = { stop: be, kind: 'einstieg' };
  }
  if (!best) return null;
  // Nie einen Stop vorschlagen, der hinter der Liquidation liegt (würde nie greifen)
  if (liq > 0 && (best.stop - liq) * sg <= 0) return null;
  // Stop muss mit etwas Abstand hinter dem Kurs liegen, sonst wäre er sofort ausgelöst
  if ((mark * (1 - sg * cfg.minGapPct / 100) - best.stop) * sg <= 0) return null;
  // 4. nur, wenn es deinen Stop spürbar verbessert
  if (stop != null && (best.stop - stop) * sg <= entry * cfg.minMovePct / 100) return null;
  return best;
}

// Wie viele Ziele erreicht sind: verkauft (Trade-Weg ✓) oder vom Kurs schon überschritten
export const hitsFromPath = (path) => (path?.tps || []).filter((t) => t.reached || t.passed).length;

// Kurzer Text für Karte und Telegram
export function trailText(tr, tf, fmt = (x) => String(x)) {
  if (!tr) return '';
  return tr.kind === 'struktur'
    ? `SL auf ${fmt(tr.stop)} nachziehen (neues ${tr.stop < tr.pivot ? 'höheres Tief' : 'tieferes Hoch'} ${String(tf).toUpperCase()} bei ${fmt(tr.pivot)})`
    : `SL auf ${fmt(tr.stop)} nachziehen (Einstieg plus Gebühren, TP2 erreicht)`;
}

// ATR aus den Kerzen (für Wächter und App gleich)
export const atrOf = (candles) => (candles?.length > 20 ? atr(candles, CONFIG.indicators.atrPeriod).at(-1) : null);

// App: Kerzen der Setup-Zeitebene im Hintergrund laden und 10 Min. merken (Anzeigen zeichnen jede Sekunde neu)
const cache = new Map();
export function trailCandles(coin, tf, loader) {
  const key = coin + '|' + tf, hit = cache.get(key);
  if (!hit || (!hit.loading && Date.now() - hit.at > 10 * 60e3)) {
    cache.set(key, { ...(hit || {}), loading: true });
    Promise.resolve(loader(coin, tf, true)).then((c) => cache.set(key, { candles: c, atr: atrOf(c), at: Date.now() }))
      .catch(() => cache.set(key, { candles: hit?.candles || null, atr: hit?.atr || null, at: Date.now() }));
  }
  return hit?.candles ? hit : null;
}

// Vorschlag für eine offene Position (App und Wächter): Setup-Zeitebene des Stils, erreichte Ziele aus dem Trade-Weg
export function trailForPosition(p, hits, openedAt, style, loader, fee = 0.045) {
  if (!p || !(hits >= 1)) return null;
  const tf = setupTf(style);
  // Ohne Kerzen (noch nicht geladen) gibt es nur das Sicherheitsnetz ab TP2
  const c = trailCandles(p.coin, tf, loader);
  const tr = trailStop({ side: p.side, entry: p.entry, stop: p.stop, mark: p.mark, hits, candles: c?.candles || null, atrValue: c?.atr || null, openedAt: openedAt || 0, feePct: fee, liq: p.liq });
  return tr && { ...tr, tf };
}
