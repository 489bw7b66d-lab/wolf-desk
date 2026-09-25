// Kerzenchart mit Live-Kerze, Einstiegszone, Stop, Zielen und Musterbruch-Linien. Reines SVG, keine Fremdbibliothek.
import * as f from './core-format.js';
import { TFL } from './ui-parts.js';

const W = 360, H = 230, PAD_R = 58, PAD_T = 8, PAD_B = 16, SHOW = 80;
let live = null; // laufende Kerze { tf, t, o, h, l, c }

// Laufende Kerze aus Live-Kursen fortschreiben (beginnt am Schluss der letzten fertigen Kerze)
export function liveCandle(candles, tf, price) {
  const last = candles.at(-1);
  if (!last || !(price > 0)) return null;
  if (!live || live.tf !== tf || live.t !== last.T) live = { tf, t: last.T, o: last.c, h: Math.max(last.c, price), l: Math.min(last.c, price), c: price };
  live.h = Math.max(live.h, price); live.l = Math.min(live.l, price); live.c = price;
  return live;
}

export function chartSvg({ candles, tf, plan, price, events = [] }) {
  if (!candles?.length) return '<p class="empty">Keine Kursdaten für den Chart.</p>';
  const cs = candles.slice(-SHOW);
  const lc = liveCandle(candles, tf, price);
  const all = lc ? [...cs, { ...lc, live: true }] : cs;
  const plotW = W - PAD_R, n = all.length, cw = plotW / n;

  // Preisbereich: Kerzen plus Stop und TP2 (weitere Ziele werden am Rand angezeigt)
  let lo = Math.min(...all.map((c) => c.l)), hi = Math.max(...all.map((c) => c.h));
  if (plan) { lo = Math.min(lo, plan.stop, plan.zone[0], plan.tps[1]); hi = Math.max(hi, plan.stop, plan.zone[1], plan.tps[1]); }
  const span = hi - lo || 1; lo -= span * 0.04; hi += span * 0.04;
  const y = (p) => PAD_T + (1 - (p - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
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
  events.filter((e) => e.level && e.tf === tf).forEach((e) => { marks += line(e.level, 'var(--muted)', 'Bruch', '1 3'); });
  if (price && inRange(price)) {
    const yy = y(price);
    marks += `<line x1="0" x2="${plotW}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--text)" stroke-width=".6" opacity=".5"/>
      <rect x="${plotW + 1}" y="${(yy - 7).toFixed(1)}" width="${PAD_R - 2}" height="14" rx="3" fill="var(--text)"/>
      <text x="${plotW + 4}" y="${(yy + 3.5).toFixed(1)}" fill="var(--bg)" font-size="9" font-weight="800">${f.price(price)}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Kerzenchart ${TFL[tf] || tf} mit Einstieg, Stop und Zielen">${marks}${bodies}</svg>`;
}
