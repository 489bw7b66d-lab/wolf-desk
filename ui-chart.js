// Kerzenchart mit Live-Kerze, Einstiegszone, Stop, Zielen und Musterbruch-Linien. Reines SVG, keine Fremdbibliothek.
// Seit 4c: Ausschnitt (verschieben/zoomen), Fadenkreuz und eigene horizontale Linien; die Bedienung steckt in ui-chartview.js.
import * as f from './core-format.js';
import { TFL } from './ui-parts.js';

const W = 360, H = 230, PAD_R = 58, PAD_T = 8, PAD_B = 16, SHOW = 70, GAP = 6; // GAP: leere Kerzenplätze vor der Preisachse
export const GEO = new Map(); // zuletzt gezeichnete Geometrie je Chart (für Fadenkreuz, Linien ziehen, Verschieben)
export const CHART = { W, H, PAD_R, PAD_T, PAD_B, SHOW };
const lives = new Map(); // laufende Kerze je Markt und Zeitebene: "coin|tf" -> { t, o, h, l, c }

// Laufende Kerze aus Live-Kursen fortschreiben (beginnt am Schluss der letzten fertigen Kerze).
// Je Markt getrennt: Früher gab es nur eine gemeinsame Live-Kerze. 4H-Kerzen aller Märkte enden zur selben Zeit,
// daher konnte beim Öffnen eines anderen Marktes die Live-Kerze des vorigen übernommen werden (z. B. LINK-Kurs im PUMP-Chart).
export function liveCandle(candles, tf, price, coin = '') {
  const last = candles.at(-1);
  if (!last || !(price > 0)) return null;
  // Sicherung: Ein Live-Kurs, der mehr als 50 % von der letzten Kerze abweicht, gehört nicht zu diesem Chart
  if (last.c > 0 && Math.abs(price / last.c - 1) > 0.5) return null;
  const key = coin + '|' + tf;
  let live = lives.get(key);
  if (!live || live.t !== last.T) {
    live = { tf, t: last.T, o: last.c, h: Math.max(last.c, price), l: Math.min(last.c, price), c: price };
    lives.set(key, live);
  }
  live.h = Math.max(live.h, price); live.l = Math.min(live.l, price); live.c = price;
  return live;
}

// lines: zusätzliche Linien [{ price, col, label, dash }], z. B. Einstieg, Stop und Liquidation einer offenen Position
// Ausschnitt: count = sichtbare Kerzen, back = wie viele Kerzen vom rechten Rand zurück (0 = aktuell)
export function viewWindow(len, view) {
  const count = Math.max(15, Math.min(len, Math.round(view?.count || SHOW)));
  const back = Math.max(0, Math.min(len - count, Math.round(view?.back || 0)));
  return { count, back, from: len - back - count, to: len - back };
}

// view: Ausschnitt, cross: Fadenkreuz {x, y} in SVG-Einheiten, hlines: eigene Linien (Preise), levTag: z. B. „6× empfohlen“,
// key: Schlüssel für die Geometrie (GEO), damit die Bedienung Finger-Positionen in Preis und Kerze umrechnen kann
export function chartSvg({ coin = '', candles, tf, plan, price, events = [], confirms = [], lines = [], view = null, cross = null, hlines = [], levTag = '', key = '' }) {
  if (!candles?.length) return '<p class="empty">Keine Kursdaten für den Chart.</p>';
  const win = viewWindow(candles.length, view);
  const cs = candles.slice(win.from, win.to);
  const lc = win.back === 0 ? liveCandle(candles, tf, price, coin) : null;
  const all = lc ? [...cs, { ...lc, live: true }] : cs;
  const plotW = W - PAD_R, n = all.length, cw = plotW / (n + GAP);

  // Preisbereich: Kerzen plus Stop und TP2 (weitere Ziele werden am Rand angezeigt)
  let lo = Math.min(...all.map((c) => c.l)), hi = Math.max(...all.map((c) => c.h));
  if (plan) { lo = Math.min(lo, plan.stop, plan.zone[0], plan.tps[1]); hi = Math.max(hi, plan.stop, plan.zone[1], plan.tps[1]); }
  lines.filter((l) => l.fit !== false && l.price > 0).forEach((l) => { lo = Math.min(lo, l.price); hi = Math.max(hi, l.price); });
  const span = hi - lo || 1; lo -= span * 0.04; hi += span * 0.04;
  const y = (p) => PAD_T + (1 - (p - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  if (key) GEO.set(key, { lo, hi, cw, n, plotW, len: candles.length, count: win.count, back: win.back, times: all.map((c) => c.t) });
  const inRange = (p) => p >= lo && p <= hi;

  const bodies = all.map((c, i) => {
    const x = i * cw + cw / 2, up = c.c >= c.o, col = up ? 'var(--ok)' : 'var(--bad)';
    const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
    return `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y(c.h).toFixed(1)}" y2="${y(c.l).toFixed(1)}" stroke="${col}" stroke-width="1"${c.live ? ' opacity=".7"' : ''}/>
      <rect x="${(x - cw * 0.35).toFixed(1)}" y="${top.toFixed(1)}" width="${(cw * 0.7).toFixed(1)}" height="${Math.max(0.8, bot - top).toFixed(1)}" fill="${col}"${c.live ? ' opacity=".7"' : ''}/>`;
  }).join('');

  const line = (p, col, label, dash = '') => {
    if (!inRange(p)) return '';
    const yy = y(p).toFixed(1);
    return `<line x1="0" x2="${plotW}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="1" ${dash ? `stroke-dasharray="${dash}"` : ''}/>
      <text x="${plotW + 4}" y="${(+yy + 3.5).toFixed(1)}" fill="${col}" font-size="9" font-weight="700">${label}</text>`;
  };
  let marks = '';
  if (plan) {
    marks += `<rect x="0" width="${plotW}" y="${y(plan.zone[1]).toFixed(1)}" height="${Math.max(1, y(plan.zone[0]) - y(plan.zone[1])).toFixed(1)}" fill="var(--gold)" opacity=".13"/>`;
    marks += line(plan.stop, 'var(--bad)', 'SL ' + f.price(plan.stop), '4 3');
    marks += line(plan.entry, 'var(--gold)', 'E ' + f.price(plan.entry), '2 2');
    plan.tps.forEach((tp, i) => { marks += line(tp, 'var(--ok)', `TP${i + 1}`, '4 3'); });
    const off = plan.tps.map((tp, i) => (!inRange(tp) ? `TP${i + 1}` : null)).filter(Boolean);
    if (off.length) marks += `<text x="6" y="${plan.dir === 'long' ? 14 : H - PAD_B - 4}" text-anchor="start" fill="var(--ok)" font-size="9" font-weight="700">${off.join(' ')} ${plan.dir === 'long' ? '↑' : '↓'}</text>`;
  }
  lines.forEach((l) => { if (l.price > 0) marks += line(l.price, l.col, l.label, l.dash || ''); });
  events.filter((e) => e.level && e.tf === tf).forEach((e) => { marks += line(e.level, 'var(--muted)', 'Bruch', '1 3'); });
  confirms.filter((c) => c.tf === tf).forEach((c) => { marks += line(c.level, 'var(--gold)', '🛡 Retest', '1 2'); });
  // Eigene Linien: hell gepunktet mit Preis, links ein Griff zum Ziehen
  hlines.forEach((hp) => {
    if (!inRange(hp)) return;
    const yy = y(hp).toFixed(1);
    marks += `<line x1="0" x2="${plotW}" y1="${yy}" y2="${yy}" stroke="#7CC4FF" stroke-width="1.2" stroke-dasharray="6 3"/>
      <circle cx="10" cy="${yy}" r="5" fill="#7CC4FF"/>
      <rect x="${plotW + 1}" y="${(+yy - 7).toFixed(1)}" width="${PAD_R - 2}" height="14" rx="3" fill="#7CC4FF"/>
      <text x="${plotW + 4}" y="${(+yy + 3.5).toFixed(1)}" fill="var(--bg)" font-size="9" font-weight="800">${f.price(hp)}</text>`;
  });
  // Freie Ecke unten links (bei Short oben): Hebel-Hinweis, beim Fadenkreuz stattdessen die Kerzenwerte
  const cornerY = plan?.dir === 'short' ? 14 : H - PAD_B - 4;
  if (levTag && !cross) marks += `<rect x="3" y="${cornerY - 10}" width="${(levTag.length * 5.4 + 8).toFixed(0)}" height="14" rx="3" fill="var(--bg)" opacity=".9"/>
    <text x="6" y="${cornerY}" fill="var(--gold)" font-size="10" font-weight="800">${levTag}</text>`;
  if (price && inRange(price)) {
    const yy = y(price);
    const xLast = n * cw + cw * 0.6;
    marks += `<line x1="${xLast.toFixed(1)}" x2="${plotW}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--text)" stroke-width=".8" stroke-dasharray="2 2" opacity=".8"/>
      <polygon points="${plotW - 4},${yy.toFixed(1)} ${plotW + 1},${(yy - 7).toFixed(1)} ${plotW + 1},${(yy + 7).toFixed(1)}" fill="var(--text)"/>
      <rect x="${plotW + 1}" y="${(yy - 7).toFixed(1)}" width="${PAD_R - 2}" height="14" rx="3" fill="var(--text)"/>
      <text x="${plotW + 4}" y="${(yy + 3.5).toFixed(1)}" fill="var(--bg)" font-size="9" font-weight="800">${f.price(price)}</text>`;
  }
  // Fadenkreuz: senkrecht an der Kerze, waagrecht am Finger, Preis rechts und Zeit unten
  let crossSvg = '';
  if (cross && n) {
    const i = Math.max(0, Math.min(n - 1, Math.floor(cross.x / cw)));
    const cx = i * cw + cw / 2, cy = Math.max(PAD_T, Math.min(H - PAD_B, cross.y));
    const cp = lo + (1 - (cy - PAD_T) / (H - PAD_T - PAD_B)) * (hi - lo);
    const c = all[i];
    const when = new Date(c.t).toLocaleString('de-DE', ['1d'].includes(tf) ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const tx = Math.max(34, Math.min(plotW - 34, cx));
    const ohlc = `O ${f.price(c.o)} H ${f.price(c.h)} T ${f.price(c.l)} S ${f.price(c.c)}`;
    crossSvg = `<g class="cv-cross"><line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${PAD_T}" y2="${H - PAD_B}" stroke="var(--text)" stroke-width=".7" stroke-dasharray="3 3" opacity=".75"/>
      <line x1="0" x2="${plotW}" y1="${cy.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="var(--text)" stroke-width=".7" stroke-dasharray="3 3" opacity=".75"/>
      <rect x="${plotW + 1}" y="${(cy - 7).toFixed(1)}" width="${PAD_R - 2}" height="14" rx="3" fill="var(--gold)"/>
      <text x="${plotW + 4}" y="${(cy + 3.5).toFixed(1)}" fill="var(--bg)" font-size="9" font-weight="800">${f.price(cp)}</text>
      <rect x="${(tx - 34).toFixed(1)}" y="${H - PAD_B + 1}" width="68" height="${PAD_B - 2}" rx="3" fill="var(--gold)"/>
      <text x="${tx.toFixed(1)}" y="${H - 4.5}" text-anchor="middle" fill="var(--bg)" font-size="8.5" font-weight="800">${when}</text>
      <rect x="3" y="${cornerY - 9}" width="${(ohlc.length * 4.7 + 6).toFixed(0)}" height="12" rx="3" fill="var(--bg)" opacity=".9"/>
      <text x="6" y="${cornerY}" fill="var(--text)" font-size="8.5" font-weight="700">${ohlc}</text></g>`;
  }
  const older = win.back > 0 ? `<text x="${(plotW - 4).toFixed(1)}" y="${PAD_T + 9}" text-anchor="end" fill="var(--gold)" font-size="9" font-weight="800">◀ ${win.back} zurück</text>` : '';
  // Greifflächen für eigene Linien (HTML, damit das iPhone beim Ziehen nicht die Seite scrollt)
  const hits = hlines.filter(inRange).map((hp) => `<div class="cv-hit" style="top:${((y(hp) / H) * 100).toFixed(2)}%;width:${((plotW / W) * 100).toFixed(1)}%"></div>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Kerzenchart ${TFL[tf] || tf} mit Einstieg, Stop und Zielen">${marks}${bodies}${crossSvg}${older}</svg>${hits}`;
}
