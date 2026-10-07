// Setup-Finder (8l, Vorschau): sucht auf Jensens handelbaren Märkten nach den fünf Bausteinen, die er in den Blindproben
// abgenommen hat. Er behauptet KEINEN Vorteil: In Testplan 1 war kein Baustein besser als der Zufall. Jede Zeile heißt
// „Beobachtung“. Es gibt keinen Score und keine Trefferquote; sortiert wird nach der Zahl der Bausteine je Coin.
// Die Bausteine sind die festgeschriebenen Regeln aus core-ltrules.js, unverändert (dieselbe Fassung wie in den Blindproben).
import { prepare, LT } from './core-longtest.js';
import { signalsOf, NEW_RULES, bodyBottomAt } from './core-ltrules.js';
import { pack } from './core-binance.js';
import { ema, rsi } from './core-indicators.js';
import { toWeekly } from './core-engine2.js';
import { sellBlocks, roomAbove, roomByTf, blocksAbove } from './core-sellblock.js';
import { CONFIG } from './config.js';
import { relStrength } from './core-index.js';

const DAY = 864e5, H4 = 4 * 36e5;
export const FINDER = {
  bars: 6,          // „aktuell“ = die letzten 6 abgeschlossenen 4H-Kerzen (24 Stunden), von Jensen gewählt
  h4Days: 200,      // so viele Tage 4H-Kerzen lädt die App je Markt (Regel 1 schaut 180 Tage zurück)
  dailyDays: 700,   // Tageskerzen für die Sell-Blöcke auf Tag und Woche
  showR: 3,         // im Bild wird ein Sell-Block nur eingezeichnet, wenn er höchstens so viele R über dem Kurs liegt
  minBlocks: 2,     // Standardansicht: Coins ab zwei Bausteinen (Jensens „Mehrheit der Faktoren“), umschaltbar
  crowd: 1 / 3,     // löst ein Baustein bei mehr als einem Drittel der geprüften Märkte aus, ist es der Markt, nicht der Coin
};
export const BLOCK_NAME = { r1: 'Key-Level', r2: 'Fib-Rücklauf', r3: 'VWAP', r4: 'Sweep', r6: 'Order Block' };
export const FLAG_NAME = { gp: 'Golden Pocket', os: 'RSI überverkauft', div: 'bullische Divergenz' };

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

// Gilt ein Fund noch? Jede Regel hat ihr eigenes „ungültig“; ein Fund, den der Kurs seither erledigt hat, ist überholt.
// Geprüft werden nur abgeschlossene Kerzen NACH der Signalkerze. Das ist kein neuer Filter, sondern die Regel zu Ende gedacht.
//  Order Block: 4H-Schluss unter dem Tief des Blocks · Sweep: 4H-Schluss unter dem Tief · VWAP: 4H-Schluss mehr als ½ ATR unter
//  dem Level · Key-Level: Tagesschluss unter dem Band · Fib: Tagesschluss unter 0,786.
export function stillValid(find, M) {
  const g = M.g, v = find.viz || {}, i = find.i;
  const h4Below = (y) => { for (let k = i + 1; k < M.n; k++) if (g.c[k] < y) return true; return false; };
  const dayBelow = (y) => { for (let d = M.dOf[i] + 1; d <= M.dOf[M.n - 1]; d++) if (M.daily[d].c < y) return true; return false; };
  if (find.rule === 'r6') { const lo = Math.min(...(v.h?.bands || []).filter((b) => b[3] !== 'bad').map((b) => b[0])); return !(Number.isFinite(lo) && h4Below(lo)); }
  if (find.rule === 'r4') { const y = v.h?.lines?.[0]?.y; return !(y > 0 && h4Below(y)); }
  if (find.rule === 'r3') { const L = (v.h?.lines || []).find((x) => x.hot); if (!L) return true; for (let k = i + 1; k < M.n; k++) { const a = M.atr[M.dOf[k]]; if (a > 0 && g.c[k] < L.y - 0.5 * a) return false; } return true; }
  if (find.rule === 'r1') { const b = (v.h?.bands || [])[0]; return !(b && dayBelow(b[0])); }
  if (find.rule === 'r2') { const L = (v.d?.lines || []).find((x) => x.l === '0,786'); return !(L && dayBelow(L.y)); }
  return true;
}

// ---- Fib-Lage (8l1, nur Information): Wo steht der Kurs im letzten Anstieg? ----
// Von Jensen am 07.10.2026 so beschrieben: Tageschart, Anker an den Kerzenkörpern (unten die tiefste Körper-Unterkante, oben die
// höchste Körper-Oberkante). Anders als Regel 2 wartet die Lage NICHT auf die Bestätigung des Hochs und nicht auf eine Reaktion:
// Sie beschreibt einen Zustand („Kurs im Golden Pocket“), keinen Auslöser.
// Anstieg = vom jüngsten bestätigten Körper-Swing-Tief zur höchsten Körper-Oberkante seither, mindestens 6 Tages-ATR groß.
// Ist der jüngste Anstieg zu klein oder das Tief unterschritten, wird das Swing-Tief davor genommen (höchstens 4 Schritte zurück).
export const FIB_ZONES = [[0.382, 'über 0,382'], [0.5, '0,382 bis 0,5'], [0.618, '0,5 bis 0,618'], [0.65, 'Golden Pocket'], [0.786, 'unter dem Golden Pocket'], [1, 'unter 0,786'], [Infinity, 'Anstieg abgegeben']];
export function fibPosition(daily, atrArr, price, minAtr = 6, steps = 4) {
  const D = daily || [], n = D.length, top = (k) => Math.max(D[k].o, D[k].c), bot = (k) => Math.min(D[k].o, D[k].c);
  let tried = 0;
  for (let p = n - 6; p >= 5 && tried < steps; p--) {
    if (!bodyBottomAt(D, p)) continue;
    tried++;
    let hi = -Infinity, hk = -1; for (let k = p + 1; k < n; k++) if (top(k) > hi) { hi = top(k); hk = k; }
    const lo = bot(p), a = atrArr?.[hk];
    if (!(hi > lo) || !(a > 0) || hi - lo < minAtr * a || price < lo) continue;
    const f = (hi - price) / (hi - lo);
    return { f, zone: FIB_ZONES.find((z) => f < z[0])[1], gp: f >= 0.618 && f <= 0.65, inZone: f >= 0.382 && f <= 0.65, lo, hi, lowAt: p, highAt: hk };
  }
  return null;
}
export const fibText = (x) => (x ? `Fib: Kurs bei ${x.f.toFixed(2).replace('.', ',')} des letzten Anstiegs · ${x.zone}` : '');

// ---- RSI (8l1, nur Information): Stand und Divergenz, auf Tag und 4H ----
// Divergenz so, wie Jensen sie nutzt: Der Kurs macht ein tieferes Tief, der RSI ein höheres (bullisch); bei den Hochs umgekehrt
// (bärisch). Verglichen werden die Schlusskurse der letzten beiden bestätigten Swing-Punkte (5 Kerzen davor und danach).
// „im Entstehen“: Der Schluss von jetzt liegt unter dem letzten bestätigten Swing-Tief, der RSI aber darüber (noch unbestätigt).
export const RSI = { period: 14, low: 30, high: 70, side: 5, recent: 30 };
export function rsiInfo(closes) {
  const c = closes || [], n = c.length, r = rsi(c, RSI.period), now = r[n - 1], S = RSI.side;
  if (now == null || !(now >= 0)) return null;
  const sw = (lowSide) => { const out = []; for (let p = n - 1 - S; p >= S && out.length < 2; p--) { let ok = true; for (let j = 1; j <= S && ok; j++) ok = lowSide ? (c[p] < c[p - j] && c[p] <= c[p + j]) : (c[p] > c[p - j] && c[p] >= c[p + j]); if (ok && r[p] != null) out.push(p); } return out; };
  const lows = sw(true), highs = sw(false);
  // Klassisch (Wende) und versteckt (Fortsetzung), 8m. Versteckt bullisch: höheres Tief im Kurs, tieferes im RSI.
  // Versteckt bärisch: tieferes Hoch im Kurs, höheres im RSI. Aus den Tiefs und aus den Hochs je höchstens eine Angabe.
  const fresh = (list) => list.length && n - 1 - list[0] <= RSI.recent;
  let low = null, high = null;
  if (lows.length === 2 && fresh(lows) && c[lows[0]] < c[lows[1]] && r[lows[0]] > r[lows[1]]) low = 'bullische Divergenz';
  else if (fresh(lows) && c[n - 1] < c[lows[0]] && now > r[lows[0]]) low = 'bullische Divergenz im Entstehen';
  else if (lows.length === 2 && fresh(lows) && c[lows[0]] > c[lows[1]] && r[lows[0]] < r[lows[1]]) low = 'versteckte bullische Divergenz';
  if (highs.length === 2 && fresh(highs) && c[highs[0]] > c[highs[1]] && r[highs[0]] < r[highs[1]]) high = 'bärische Divergenz';
  else if (fresh(highs) && c[n - 1] > c[highs[0]] && now < r[highs[0]]) high = 'bärische Divergenz im Entstehen';
  else if (highs.length === 2 && fresh(highs) && c[highs[0]] < c[highs[1]] && r[highs[0]] > r[highs[1]]) high = 'versteckte bärische Divergenz';
  // div: die eine Angabe wie bis 8l1 (klassisch vor versteckt, Tiefs vor Hochs); divs: alle, für den Text
  const hid = (x) => !!x && x.startsWith('versteckte');
  const div = (low && !hid(low) ? low : null) || (high && !hid(high) ? high : null) || low || high || null;
  const divs = [low, high].filter(Boolean);
  return { now, state: now < RSI.low ? 'überverkauft' : now > RSI.high ? 'überkauft' : '', div, divs };
}
// Tag zuerst (Jensen bewertet den Tag stärker), dann 4H
export function rsiText(day, h4) {
  const part = (name, x) => (x ? `${name} ${Math.round(x.now)}${x.state ? ' ' + x.state : ''}${(x.divs || (x.div ? [x.div] : [])).map((d) => ' · ' + d).join('')}` : '');
  const t = [part('Tag', day), part('4H', h4)].filter(Boolean).join(' · ');
  return t ? 'RSI · ' + t : '';
}

// Eintrag für die Liste. price: aktueller Kurs (sonst letzter 4H-Schluss). Es gibt ihn für jeden geprüften Markt, auch ohne Baustein:
// Dann kann er trotzdem über die Filter „Golden Pocket“ oder „RSI“ auftauchen.
// finds: nur noch gültige Funde · stale: Zahl der überholten · rooms: Platz nach oben je Zeitebene · sell4h: nächste 4H-Sell-Blöcke
// fib, rsiDay, rsiH4: Fib-Lage und RSI (nur Information) · flags: wofür die Filter den Coin zeigen
export function coinEntry(coin, M, dailyLong = null, price = null) {
  const all = findsOf(M);
  const px = price > 0 ? price : M.g.c[M.n - 1], d = M.dOf[M.n - 1], R = d >= 0 && M.atr[d] > 0 ? LT.atrMult * M.atr[d] : null;
  if (!(R > 0)) return null;
  const finds = all.filter((f) => stillValid(f, M)).map((f) => ({ ...f, since: (px - M.g.c[f.i]) / R }));
  const sets = sellSets(M, dailyLong);
  const fib = fibPosition(M.daily, M.atr, px), rsiDay = rsiInfo(M.daily.map((x) => x.c)), rsiH4 = rsiInfo(Array.from(M.g.c));
  const bull = (x) => !!x?.div && x.div.startsWith('bullische');
  return { coin, finds, n: finds.length, stale: all.length - finds.length, price: px, R, rooms: roomByTf(px, sets, R), room: roomAbove(px, sets, R),
    sell4h: blocksAbove(px, sets.find((s) => s.tf === '4H')?.blocks), overlap: fibBlockOverlap(finds), fib, rsiDay, rsiH4,
    flags: { gp: !!fib?.gp, os: rsiDay?.state === 'überverkauft' || rsiH4?.state === 'überverkauft', div: bull(rsiDay) || bull(rsiH4) }, M };
}
// Ansicht: nur Coins mit mindestens k (noch gültigen) Bausteinen
export const atLeast = (list, k) => (list || []).filter((e) => e.n >= k);
// Marktbewegung: Bausteine, die bei mehr als einem Drittel der geprüften Märkte gleichzeitig auslösen
export function crowdNotes(list, scanned, share = FINDER.crowd) {
  if (!(scanned > 0)) return [];
  const c = countByBlock((list || []).filter((e) => e.n > 0));
  return NEW_RULES.filter((r) => c[r] / scanned > share).map((r) => `${BLOCK_NAME[r]} löst gerade bei ${c[r]} von ${scanned} Märkten aus. Das ist der Markt, nicht der einzelne Coin.`);
}
export const sinceText = (r) => (r == null || !Number.isFinite(r) ? '' : `seit der Signalkerze ${r > 0.05 ? '+' : r < -0.05 ? '−' : '±'}${Math.abs(Math.round(r * 10) / 10).toFixed(1).replace('.', ',')} R`);

// Reihenfolge: mehr Bausteine zuerst (Jensens „Mehrheit der Faktoren“), dann der frischere Fund, dann der Name. Kein Backtest-R.
// Fib-Lage, RSI und „Platz nach oben“ gehen NICHT in die Reihenfolge ein; sie sind Information und Filter.
export function sortEntries(list) {
  const fresh = (e) => (e.finds.length ? Math.min(...e.finds.map((f) => f.ago)) : 99);
  return [...list].sort((a, b) => b.n - a.n || fresh(a) - fresh(b) || (a.coin < b.coin ? -1 : 1));
}
export const countByBlock = (list) => Object.fromEntries(NEW_RULES.map((r) => [r, list.filter((e) => e.finds.some((f) => f.rule === r)).length]));
export const agoText = (t, now = Date.now()) => { const h = Math.max(0, Math.round((now - t) / 36e5)); return h < 1 ? 'gerade eben' : `vor ${h} Std.`; };

// Zeichnung für einen Fund: die Zeichenhilfe der Regel, dazu die nächsten 4H-Sell-Blöcke über dem Kurs (rot, ab der Kerze,
// aus der sie stammen; nur wenn sie nah liegen) und der Kurs von jetzt als Linie. Blöcke aus Tag und Woche stehen nur als Text
// in der Zeile „Platz nach oben“, sonst verdecken sie das Bild. Im VWAP-Bild trägt nur das auslösende Level einen Namen.
// Das Bild selbst endet weiter an der Signalkerze.
export function vizWithRoom(find, entry) {
  const v = JSON.parse(JSON.stringify(find.viz));
  if (!v.h) return v;
  if (find.rule === 'r3') v.h.lines = (v.h.lines || []).map((L) => (L.hot ? L : { y: L.y }));
  const g = entry.M?.g;
  for (const b of entry.sell4h || []) {
    if (!(entry.R > 0) || (b.bottom - entry.price) / entry.R > FINDER.showR) continue;
    let k = null; if (g && b.t != null) { k = 0; while (k < g.n && g.t[k] < b.t) k++; }
    v.h.bands = [...(v.h.bands || []), [b.bottom, b.top, 'Sell 4H', 'bad', k]];
  }
  if (entry.price > 0 && find.ago > 0) v.h.lines = [...(v.h.lines || []), { y: entry.price, l: 'jetzt' }];
  return v;
}

// 8l1: Übergabe an die Trade-Karte. Baut aus einem Eintrag ein Ergebnis im Format der Engine (wie bmResult):
// Long zum aktuellen Kurs, Stop 2 × Tages-ATR darunter (der gemeinsame Rahmen), Ziele bei 2R / 3R / 4R / 6R wie beim Maßstab.
// Kein Score (total = 0) und das Kennzeichen finder: Die Karte nennt es „Beobachtung“, nicht „Signal“.
export function tradeResult(entry, price = null, tps = CONFIG.benchmark?.tps || [2, 3, 4, 6]) {
  if (!entry || !(entry.R > 0)) return null;
  const px = price > 0 ? price : entry.price, R = entry.R, stop = px - R;
  if (!(px > 0) || !(stop > 0)) return null;
  const style = 'swing', names = (entry.finds || []).map((f) => BLOCK_NAME[f.rule]);
  const plan = { dir: 'long', entry: px, stop, zone: [px, px], tps: tps.map((k) => px + k * R), R, stopDistPct: (R / px) * 100,
    method: 'finder', entryMode: 'Beobachtung: Einstieg zum Kurs', stopLabel: `${LT.atrMult}× ATR (Tag)`, tpLabels: tps.map((k) => `${k}R`), warnings: [] };
  return { coin: entry.coin, finder: true, blocks: names, mode: style, best: style, dir: 'long', plan, tfs: CONFIG.signals.modes[style].tfs, total: { long: 0, short: 0 },
    events: [], waves: [], confirms: [], warnings: [], analyses: [null, { close: px, atr: null }] };
}

// 8m: Coin-Bias für die Zeile. Jeder Eintrag steht im Tagestrend aufwärts (nur solche Märkte werden geprüft);
// dazu die Stärke gegen BTC über 30 Tage in Prozentpunkten (null, wenn BTC-Kerzen fehlen).
export const withBias = (entry, btcDaily) => (entry ? { ...entry, up: true, vsBtc: relStrength(entry.M?.daily, btcDaily) } : entry);
// 8m: Suche über alle geprüften Märkte (Groß- und Kleinschreibung egal, auch Teil des Namens)
export function searchEntries(list, q, name = (e) => e.coin) {
  const s = String(q || '').trim().toLowerCase();
  return s ? (list || []).filter((e) => String(name(e)).toLowerCase().includes(s) || e.coin.toLowerCase().includes(s)) : (list || []);
}
