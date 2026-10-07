// Setup-Finder (8l, Vorschau): sucht auf Jensens handelbaren Märkten nach den fünf Bausteinen, die er in den Blindproben
// abgenommen hat. Er behauptet KEINEN Vorteil: In Testplan 1 war kein Baustein besser als der Zufall. Jede Zeile heißt
// „Beobachtung“. Es gibt keinen Score und keine Trefferquote; sortiert wird nach der Zahl der Bausteine je Coin.
// Die Bausteine sind die festgeschriebenen Regeln aus core-ltrules.js, unverändert (dieselbe Fassung wie in den Blindproben).
import { prepare, LT } from './core-longtest.js';
import { signalsOf, NEW_RULES } from './core-ltrules.js';
import { pack } from './core-binance.js';
import { ema } from './core-indicators.js';
import { toWeekly } from './core-engine2.js';
import { sellBlocks, roomAbove } from './core-sellblock.js';

const DAY = 864e5, H4 = 4 * 36e5;
export const FINDER = {
  bars: 6,          // „aktuell“ = die letzten 6 abgeschlossenen 4H-Kerzen (24 Stunden), von Jensen gewählt
  h4Days: 200,      // so viele Tage 4H-Kerzen lädt die App je Markt (Regel 1 schaut 180 Tage zurück)
  dailyDays: 700,   // Tageskerzen für die Sell-Blöcke auf Tag und Woche
  showR: 3,         // im Bild wird ein Sell-Block nur eingezeichnet, wenn er höchstens so viele R über dem Kurs liegt
};
export const BLOCK_NAME = { r1: 'Key-Level', r2: 'Fib-Rücklauf', r3: 'VWAP', r4: 'Sweep', r6: 'Order Block' };

// Braucht der Markt überhaupt die langen 4H-Kerzen? Nur im Tagestrend aufwärts (Tages-EMA 20 über EMA 100) und mit genug Historie.
// Alle fünf Bausteine gelten nur dann. Das hält die Zahl der Abrufe klein.
export function trendNow(daily) {
  const n = daily?.length || 0;
  if (n < LT.minDays) return false;
  const c = daily.map((x) => x.c), f = ema(c, LT.emaFast)[n - 1], s = ema(c, LT.emaSlow)[n - 1];
  return f > 0 && s > 0 && f > s;
}

// Markt aus Hyperliquid-Kerzen vorbereiten (nur abgeschlossene Kerzen übergeben!)
export const liveMarket = (coin, daily, h4) => prepare(coin, daily, pack(h4));

// Aktuelle Funde eines Marktes: je Baustein der jüngste Fund in den letzten `bars` abgeschlossenen 4H-Kerzen
export function findsOf(M, bars = FINDER.bars) {
  const out = [];
  for (const rule of NEW_RULES) {
    let hit = null;
    for (const [i, s] of signalsOf(rule, M)) if (i >= M.n - bars && M.dOf[i] + 1 >= LT.minDays && (!hit || i > hit.i)) hit = { rule, i, ago: M.n - 1 - i, t: M.g.t[i] + H4, mk: s.mk, viz: s.viz };
    if (hit) out.push(hit);
  }
  return out;
}

// Liegt der Order Block (Regel 6) in der Fib-Zone (Regel 2)? Reine Information.
export function fibBlockOverlap(finds) {
  const fib = finds.find((f) => f.rule === 'r2'), ob = finds.find((f) => f.rule === 'r6');
  if (!fib || !ob) return false;
  const z = fib.viz?.h?.bands?.[0], bands = ob.viz?.h?.bands || [];
  if (!z || !bands.length) return false;
  const lo = Math.min(...bands.map((b) => b[0])), hi = Math.max(...bands.map((b) => b[1]));
  return hi >= z[0] && lo <= z[1];
}

// Sell-Blöcke über dem Kurs auf 4H, Tag und Woche. dailyLong: lange Tagesreihe (abgeschlossene Tage).
export function sellSets(M, dailyLong) {
  const g = M.g, h4 = []; for (let k = 0; k < M.n; k++) h4.push({ t: g.t[k], o: g.o[k], h: g.h[k], l: g.l[k], c: g.c[k] });
  const days = dailyLong?.length ? dailyLong : M.daily;
  const weeks = toWeekly(days).filter((w) => w.T + 1 - w.t >= 7 * DAY); // nur abgeschlossene Wochen
  return [{ tf: '4H', blocks: sellBlocks(h4) }, { tf: 'Tag', blocks: sellBlocks(days) }, { tf: 'Woche', blocks: sellBlocks(weeks) }];
}

// Eintrag für die Liste. price: aktueller Kurs (sonst letzter 4H-Schluss).
export function coinEntry(coin, M, dailyLong = null, price = null) {
  const finds = findsOf(M);
  if (!finds.length) return null;
  const px = price > 0 ? price : M.g.c[M.n - 1], d = M.dOf[M.n - 1], R = d >= 0 && M.atr[d] > 0 ? LT.atrMult * M.atr[d] : null;
  return { coin, finds, n: finds.length, price: px, R, room: roomAbove(px, sellSets(M, dailyLong), R), overlap: fibBlockOverlap(finds), M };
}

// Reihenfolge: mehr Bausteine zuerst (Jensens „Mehrheit der Faktoren“), dann der frischere Fund, dann der Name. Kein Backtest-R.
export function sortEntries(list) {
  const fresh = (e) => Math.min(...e.finds.map((f) => f.ago));
  return [...list].sort((a, b) => b.n - a.n || fresh(a) - fresh(b) || (a.coin < b.coin ? -1 : 1));
}
export const countByBlock = (list) => Object.fromEntries(NEW_RULES.map((r) => [r, list.filter((e) => e.finds.some((f) => f.rule === r)).length]));
export const agoText = (t, now = Date.now()) => { const h = Math.max(0, Math.round((now - t) / 36e5)); return h < 1 ? 'gerade eben' : `vor ${h} Std.`; };

// Zeichnung für einen Fund: die Zeichenhilfe der Regel, dazu der nächste Sell-Block (rot, ab der Kerze, aus der er stammt),
// wenn er nah genug liegt, und der Kurs von jetzt als Linie. Das Bild selbst endet weiter an der Signalkerze.
export function vizWithRoom(find, entry) {
  const v = JSON.parse(JSON.stringify(find.viz)), room = entry.room;
  if (!v.h) return v;
  if (room && room.state !== 'frei' && entry.R > 0 && (room.bottom - entry.price) / entry.R <= FINDER.showR) {
    const g = entry.M?.g; let k = null;
    if (g && room.t != null) { k = 0; while (k < g.n && g.t[k] < room.t) k++; }
    v.h.bands = [...(v.h.bands || []), [room.bottom, room.top, 'Sell ' + room.tf, 'bad', k]];
  }
  if (entry.price > 0 && find.ago > 0) v.h.lines = [...(v.h.lines || []), { y: entry.price, l: 'jetzt' }];
  return v;
}
