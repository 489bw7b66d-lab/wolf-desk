// „Hyperliquid-Ledger-Perp-Index“ (8m) und der Markt-Bias als Kopfzeile der Beobachtungen. Nur Anzeige, kein Filter, kein Signal.
// Von Jensen am 07.10.2026 festgelegt (20:51 bis 22:32): Ersatz für TOTAL2 und OTHERS, die nicht abrufbar sind.
//  - Gerechnet aus den Tageskerzen der handelbaren Märkte (Ledger-Liste, Hyperliquid-Perpetuals), nicht aus Binance-Spot.
//  - Alt-Index: alle Märkte ohne BTC, jeder zählt gleich viel. Small-Index: dasselbe ohne die zehn größten nach 30-Tage-Umsatz.
//  - Ein Markt zählt erst mit, wenn er 110 Tage Historie hat (sonst springt der Index bei jedem neuen Listing).
//  - Bias in drei Ebenen: BTC-Trend, Trend des Alt-Index, Small-Index gegen Alt-Index als Breite.
//  - „Platz nach oben“ für den Gesamtmarkt über die Sell-Blöcke des Alt-Index. BOS, CHoCH, Highs und Lows und die Trendlinie
//    hat Jensen gestrichen (22:29 bis 22:32).
// Gleichgewichtet heißt: Der Index ähnelt eher OTHERS als TOTAL2 (dort bestimmen ETH und wenige Große das Bild).
// Reine Funktionen, Tests in test-index.js. Speicher: wolfdesk.hlindex (nur öffentliche Marktdaten).
import { ema } from './core-indicators.js';
import { toWeekly } from './core-engine2.js';
import { sellBlocks } from './core-sellblock.js';

const DAY = 864e5;
export const IDX = {
  minDays: 110,     // Wartezeit für neu gelistete Märkte
  top: 10,          // so viele der umsatzstärksten fehlen im Small-Index
  volDays: 30,      // Umsatz-Fenster für die Rangliste (nur Tage VOR dem bewerteten Tag)
  minMembers: 5,    // darunter gibt es an dem Tag keinen Indexwert
  perfDays: 30,     // Vergleich Small gegen Alt und Coin gegen BTC
  even: 1,          // Prozentpunkte: innerhalb davon heißt es „gleichauf“
  fast: 20, slow: 100, // Trend wie beim Tagestrend der Coins
  from: Date.UTC(2023, 0, 1), // lange Historie: so weit zurück wird bei Hyperliquid gefragt
  maxGapDays: 140,
  retryHours: 20,   // 8n1: so lange nach einem fehlgeschlagenen Versuch wird die lange Historie nicht erneut geladen  // ist der gespeicherte Index älter, wird er neu aufgebaut statt fortgeschrieben
};
const dayOf = (t) => Math.floor(t / DAY) * DAY;

// series: { COIN: [abgeschlossene Tageskerzen { t, o, h, l, c, v }] }. Ergebnis: { alt, small }, je eine Kerzenreihe ab 100.
// Je Tag: Mittel der Tagesänderungen aller Mitglieder (Schluss, Eröffnung, Hoch, Tief jeweils gegen den Schluss vom Vortag).
// Kein Blick in die Zukunft: Mitgliedschaft (110 Tage) und Rangliste (Umsatz der 30 Tage davor) nutzen nur frühere Tage.
export function buildIndex(series, cfg = IDX) {
  const rows = new Map(); // Tag -> [{ coin, k }]
  const S = {};
  for (const [coin, list] of Object.entries(series || {})) {
    if (coin === 'BTC' || !Array.isArray(list)) continue;
    const cs = list.filter((c) => c && c.c > 0 && c.o > 0).map((c) => ({ ...c, t: dayOf(c.t) }));
    S[coin] = cs;
    // Umsatz in USD als laufende Summe, damit das 30-Tage-Fenster billig ist
    let acc = 0; cs.forEach((c) => { acc += (c.v || 0) * c.c; c.cum = acc; });
    for (let k = cfg.minDays; k < cs.length; k++) {
      if (cs[k].t - cs[k - 1].t !== DAY) continue; // Lücke: an dem Tag zählt der Markt nicht mit
      if (!rows.has(cs[k].t)) rows.set(cs[k].t, []);
      rows.get(cs[k].t).push({ coin, k });
    }
  }
  const days = [...rows.keys()].sort((a, b) => a - b);
  const step = (prev, members) => {
    let o = 0, h = 0, l = 0, c = 0;
    for (const m of members) { const x = S[m.coin][m.k], p = S[m.coin][m.k - 1].c; o += x.o / p; h += x.h / p; l += x.l / p; c += x.c / p; }
    const n = members.length, O = prev * o / n, C = prev * c / n;
    return { o: O, c: C, h: Math.max(prev * h / n, O, C), l: Math.min(prev * l / n, O, C), n };
  };
  const alt = [], small = [];
  let pa = 100, ps = 100;
  for (const t of days) {
    const mem = rows.get(t);
    if (mem.length < cfg.minMembers) continue;
    const a = step(pa, mem); alt.push({ t, T: t + DAY - 1, ...a }); pa = a.c;
    const vol = (m) => { const cs = S[m.coin], hi = cs[m.k - 1].cum, lo = m.k - 1 - cfg.volDays >= 0 ? cs[m.k - 1 - cfg.volDays].cum : 0; return hi - lo; };
    const rest = [...mem].sort((x, y) => vol(y) - vol(x) || (x.coin < y.coin ? -1 : 1)).slice(cfg.top);
    if (rest.length >= cfg.minMembers) { const s = step(ps, rest); small.push({ t, T: t + DAY - 1, ...s }); ps = s.c; }
  }
  return { alt, small };
}

// Gespeicherten Index mit einem frisch gerechneten (kürzeren) fortschreiben: Die neuen Tage werden angekettet.
// Geht nur, wenn der letzte gespeicherte Tag im neuen Index vorkommt; sonst null (dann neu aufbauen).
export function extendSeries(stored, fresh) {
  if (!stored?.length) return fresh?.length ? fresh : null;
  if (!fresh?.length) return stored;
  const last = stored[stored.length - 1], k = fresh.findIndex((x) => x.t === last.t);
  if (k < 0) return fresh[fresh.length - 1].t <= last.t ? stored : null;
  const f = last.c / fresh[k].c;
  return [...stored, ...fresh.slice(k + 1).map((x) => ({ ...x, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f }))];
}
export function extendIndex(stored, fresh) {
  const alt = extendSeries(stored?.alt, fresh?.alt), small = extendSeries(stored?.small, fresh?.small);
  return alt && small ? { alt, small } : null;
}

// Trend wie bei den Coins: Tages-EMA 20 über EMA 100, mindestens 110 Tage. null = zu wenig Historie.
export function trendOf(candles, cfg = IDX) {
  const n = candles?.length || 0;
  if (n < cfg.minDays) return null;
  const c = candles.map((x) => x.c), f = ema(c, cfg.fast)[n - 1], s = ema(c, cfg.slow)[n - 1];
  return f > 0 && s > 0 ? f > s : null;
}
// Veränderung über die letzten `days` Tageskerzen in Prozent
export function perfPct(candles, days = IDX.perfDays) {
  const n = candles?.length || 0;
  if (n <= days) return null;
  const a = candles[n - 1 - days].c, b = candles[n - 1].c;
  return a > 0 && b > 0 ? (b / a - 1) * 100 : null;
}
// Stärke gegen einen Vergleich (Small gegen Alt, Coin gegen BTC): Unterschied der Veränderung in Prozentpunkten
export function relStrength(candles, base, days = IDX.perfDays) {
  const a = perfPct(candles, days), b = perfPct(base, days);
  return a == null || b == null ? null : a - b;
}

// „Platz nach oben“ für den Gesamtmarkt: nächster Sell-Block über dem Alt-Index auf Woche und Tag, Abstand in Prozent
export function marketRoom(index) {
  const n = index?.length || 0;
  if (!n) return [];
  const px = index[n - 1].c, weeks = toWeekly(index).filter((w) => w.T + 1 - w.t >= 7 * DAY);
  const one = (tf, cs) => {
    const above = sellBlocks(cs).filter((b) => b.top > px).sort((a, b) => Math.max(0, a.bottom - px) - Math.max(0, b.bottom - px))[0];
    if (!above) return { tf, state: 'frei', pct: null };
    return above.bottom <= px ? { tf, state: 'im', pct: 0 } : { tf, state: 'weg', pct: (above.bottom / px - 1) * 100 };
  };
  return [one('Woche', weeks), one('Tag', index)];
}

// Markt-Bias in drei Ebenen. btc: Tageskerzen von BTC, idx: { alt, small }.
export function marketBias(btc, idx, cfg = IDX) {
  const alt = idx?.alt || [], small = idx?.small || [];
  const breadth = relStrength(small, alt, cfg.perfDays);
  return { btcUp: trendOf(btc, cfg), altUp: trendOf(alt, cfg), breadth, room: marketRoom(alt),
    from: alt[0]?.t ?? null, to: alt[alt.length - 1]?.t ?? null, members: alt[alt.length - 1]?.n ?? 0, smallMembers: small[small.length - 1]?.n ?? 0 };
}

const pp = (x) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x).toFixed(1).replace('.', ',')}`;
const upTxt = (name, up) => (up == null ? `${name}: zu wenig Historie` : `${name} ${up ? 'aufwärts' : 'nicht aufwärts'}`);
export function breadthText(d, cfg = IDX) {
  if (d == null) return '';
  const days = cfg.perfDays;
  if (Math.abs(d) < cfg.even) return `Small Caps gleichauf mit den Alts (${days} Tage)`;
  return `Small Caps ${d > 0 ? 'stärker' : 'schwächer'} als die Alts (${pp(d)} Prozentpunkte in ${days} Tagen)`;
}
export function marketRoomText(room) {
  if (!room?.length) return '';
  if (room.every((x) => x.state === 'frei')) return 'Platz nach oben (Alts): frei, kein Sell-Block über dem Index';
  return 'Platz nach oben (Alts) · ' + room.map((x) => `${x.tf}: ${x.state === 'frei' ? 'frei' : x.state === 'im' ? 'Index im Sell-Block' : x.pct.toFixed(1).replace('.', ',') + ' %'}`).join(' · ');
}
// Zeilen der Kopfzeile: [Trend, Breite, Platz nach oben]
export function biasLines(b, cfg = IDX) {
  if (!b) return [];
  return [`Markt · ${upTxt('BTC', b.btcUp)} · ${upTxt('Alts', b.altUp)}`, breadthText(b.breadth, cfg), marketRoomText(b.room)].filter(Boolean);
}
// Coin-Bias: Tagestrend und Stärke gegen BTC
export function coinBiasText(up, vsBtc, cfg = IDX) {
  const t = up == null ? '' : up ? 'Tagestrend aufwärts' : 'Tagestrend nicht aufwärts';
  const s = vsBtc == null ? '' : Math.abs(vsBtc) < cfg.even ? `gleichauf mit BTC (${cfg.perfDays} Tage)` : `${vsBtc > 0 ? 'stärker' : 'schwächer'} als BTC (${pp(vsBtc)} Prozentpunkte in ${cfg.perfDays} Tagen)`;
  return [t, s].filter(Boolean).join(' · ');
}
// Zusatzzeile aus CoinGecko (Stand von jetzt, keine Kerzen): Marktkapitalisierung ohne BTC
export function capExBtcText(global) {
  const cap = global?.cap, dom = global?.btcDom;
  if (!(cap > 0) || !(dom > 0) || !(dom < 100)) return '';
  const x = cap * (1 - dom / 100);
  const num = x >= 1e12 ? `${(x / 1e12).toFixed(2).replace('.', ',')} Bio. $` : `${Math.round(x / 1e9)} Mrd. $`;
  return `Marktkap. ohne BTC: ${num} (CoinGecko, Stand jetzt · BTC-Dominanz ${dom.toFixed(1).replace('.', ',')} %)`;
}

// ---- Speicher: der Index als kurze Zahlenreihen (nur öffentliche Marktdaten) ----
const KEY = 'wolfdesk.hlindex', VER = 1;
const sig = (x) => Number(x.toPrecision(6));
export const packIndex = (idx, meta = {}) => ({ v: VER, full: meta.full !== false, tried: meta.tried ?? null, alt: idx.alt.map((x) => [x.t, sig(x.o), sig(x.h), sig(x.l), sig(x.c), x.n]), small: idx.small.map((x) => [x.t, sig(x.o), sig(x.h), sig(x.l), sig(x.c), x.n]) });
export function unpackIndex(p) {
  if (!p || p.v !== VER || !Array.isArray(p.alt) || !Array.isArray(p.small)) return null;
  const un = (r) => ({ t: r[0], T: r[0] + DAY - 1, o: r[1], h: r[2], l: r[3], c: r[4], n: r[5] });
  return { alt: p.alt.map(un), small: p.small.map(un), full: p.full !== false, tried: p.tried ?? null };
}
export function loadIndex(store = globalThis.localStorage) {
  try { return unpackIndex(JSON.parse(store.getItem(KEY))); } catch { return null; }
}
export function saveIndex(idx, store = globalThis.localStorage, meta = {}) {
  try { store.setItem(KEY, JSON.stringify(packIndex(idx, meta))); return true; } catch { return false; }
}
// Reicht der gespeicherte Index, um ihn mit den kurzen Reihen fortzuschreiben?
// 8n1: Ein Index nur aus den kurzen Reihen (full: false) wird sofort gespeichert, damit Startseite und Trade-Auswertung ihn haben;
// die lange Historie wird höchstens einmal je retryHours erneut versucht.
export function needsRebuild(stored, now = Date.now(), cfg = IDX) {
  const last = stored?.alt?.[stored.alt.length - 1]?.t;
  if (!(last > 0) || now - last > cfg.maxGapDays * DAY) return true;
  return stored.full === false && !(now - (stored.tried || 0) < cfg.retryHours * 36e5);
}

// 8n1: Daten für das Bild auf der Startseite. Alt- und Small-Index über die letzten `days` Tage, beide am ersten Tag auf 100 gesetzt,
// dazu EMA 20 und EMA 100 des Alt-Index (über die ganze Reihe gerechnet, dann abgeschnitten) und der nächste Tages-Sell-Block darüber.
export function indexChart(idx, days = 180, cfg = IDX) {
  const alt = idx?.alt || [], small = idx?.small || [];
  if (alt.length < 2) return null;
  const from = alt[Math.max(0, alt.length - days)].t, closes = alt.map((x) => x.c);
  const ef = ema(closes, cfg.fast), es = ema(closes, cfg.slow);
  const k0 = alt.findIndex((x) => x.t >= from), base = alt[k0].c;
  const a = alt.slice(k0).map((x, j) => ({ t: x.t, y: (x.c / base) * 100, fast: ef[k0 + j] != null ? (ef[k0 + j] / base) * 100 : null, slow: alt.length >= cfg.minDays && es[k0 + j] != null ? (es[k0 + j] / base) * 100 : null }));
  const sm = small.filter((x) => x.t >= from), sb = sm[0]?.c;
  const s = sb > 0 ? sm.map((x) => ({ t: x.t, y: (x.c / sb) * 100 })) : [];
  const px = alt[alt.length - 1].c;
  const blk = sellBlocks(alt).filter((b) => b.top > px).sort((x, y) => Math.max(0, x.bottom - px) - Math.max(0, y.bottom - px))[0];
  return { alt: a, small: s, block: blk ? { lo: (blk.bottom / base) * 100, hi: (blk.top / base) * 100 } : null,
    altPct: a[a.length - 1].y - 100, smallPct: s.length ? s[s.length - 1].y - 100 : null, from, to: alt[alt.length - 1].t, full: idx.full !== false };
}
