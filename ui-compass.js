// Zyklus-Kompass auf der Startseite (8w): Rad mit den sieben Phasen, Zeiger auf die aktuelle, in der Mitte die Ampel des
// Bull Market Support Bands. Rechnung in core-compass.js. Nur Anzeige, ohne Messung.
import { market, onMarket } from './core-market.js';
import { loadIndex, trendOf, perfPct, relStrength } from './core-index.js';
import { getCandles } from './core-scanner.js';
import { PHASES, bandState, phaseOf } from './core-compass.js';
import { esc, tipInline } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let btc = null;
async function loadBtc() { try { btc = await getCandles('BTC', '1d', true); render(); } catch { /* ohne BTC keine Ampel */ } }

// Farbe je Phase (gedämpft im Rad, kräftig für die aktuelle)
const COL = [null, '#6ea8ff', 'var(--gold)', '#7fd6a8', 'var(--ok)', 'var(--muted)', 'var(--warn)', 'var(--bad)'];
const AMP = { gruen: ['var(--ok)', 'grün'], gelb: ['var(--warn)', 'gelb'], rot: ['var(--bad)', 'rot'] };

const P = (cx, cy, r, deg) => { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
function seg(cx, cy, r, a0, a1, col, w, extra = '', cap = 'round') {
  const [x0, y0] = P(cx, cy, r, a0), [x1, y1] = P(cx, cy, r, a1);
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="${cap}" ${extra}/>`;
}

export function wheelSvg(phase, band) {
  const W = 320, H = 262, cx = 160, cy = 131, R = 86, step = 360 / 7, gap = 9;
  let s = '';
  for (let n = 1; n <= 7; n++) {
    const a0 = (n - 1) * step - step / 2 + gap / 2, a1 = n * step - step / 2 - gap / 2, cur = phase?.n === n;
    if (cur) s += seg(cx, cy, R + 15, a0 + 2, a1 - 2, COL[n], 2.5, 'opacity=".9"');
    s += seg(cx, cy, R, a0, a1, COL[n], cur ? 16 : 10, `opacity="${cur ? 1 : n === 5 ? 0.35 : 0.42}"${n === 5 ? ' stroke-dasharray="2 5"' : ''}`);
    const mid = (n - 1) * step, [lx, ly] = P(cx, cy, R + 27, mid), [nx, ny] = P(cx, cy, R, mid);
    const anchor = lx < cx - 12 ? 'end' : lx > cx + 12 ? 'start' : 'middle';
    s += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="${cur ? 12 : 10.5}" font-weight="${cur ? 800 : 600}" fill="${cur ? 'var(--text)' : 'var(--muted)'}">${PHASES[n].short}</text>`;
    s += `<text x="${nx.toFixed(1)}" y="${(ny + 3.5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${cur ? 'var(--bg)' : 'var(--muted)'}">${n}</text>`;
  }
  if (phase) {
    const mid = (phase.n - 1) * step, [tx, ty] = P(cx, cy, R - 12, mid), [bx1, by1] = P(cx, cy, 45, mid - 11), [bx2, by2] = P(cx, cy, 45, mid + 11);
    s += `<path d="M${bx1.toFixed(1)} ${by1.toFixed(1)} L${tx.toFixed(1)} ${ty.toFixed(1)} L${bx2.toFixed(1)} ${by2.toFixed(1)} Z" fill="${COL[phase.n]}" opacity=".95"/>`;
  }
  const [ac, at] = band ? AMP[band.state] : ['var(--line)', '–'];
  s += `<circle cx="${cx}" cy="${cy}" r="42" fill="var(--surface)" stroke="${ac}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="36" fill="${ac}" opacity=".14"/>
    <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--muted)">BTC-Band</text>
    <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="19" font-weight="800" fill="${ac}">${at}</text>
    <text x="${cx}" y="${cy + 23}" text-anchor="middle" font-size="9" fill="var(--muted)">Woche</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="compass-svg" role="img" aria-label="Zyklus-Kompass: ${phase ? 'Phase ' + phase.n + ', ' + phase.name : 'keine Einordnung'}, Band ${at}">${s}</svg>`;
}

const pp = (x) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${String(Math.abs(Math.round(x * 10) / 10)).replace('.', ',')} Pp.`);
const TIP = 'Einordnung nach festen Regeln aus deinem Rahmen (Masterplan, Zyklus-Kompass), ohne Messung. Mitte: Bull Market Support Band von BTC (20-Wochen-SMA und 21-Wochen-EMA, nur abgeschlossene Wochen): grün = Wochenschluss über dem steigenden Band; gelb = erster Schluss darunter, im Band oder Band steigt nicht mehr; rot = mindestens zwei Schlüsse darunter und das Band fällt. Phase: rot → Risk-off (oder Boden, wenn BTC oder Alts schon wieder aufwärts laufen); gelb nach Schwäche → Distributionsverdacht; grün → je nach Alt-Index gegen BTC (30 Tage): BTC vorn = Bitcoin-Führung, Alts holen auf = frühe Rotation, Alts klar vorn und der Rest stärker als die Top 10 = breite Alt-Season; Gier ab 80 und BTC 30 Tage über +20 % = Euphorie. Sektoren kann die App nicht messen. Testplan 2: Das Band reagiert spät, als Regel trennte es nicht verlässlich.';

function render() {
  const box = $('compass');
  if (!box) return;
  const band = btc ? bandState(btc) : null, idx = loadIndex(), hasIdx = !!idx?.alt?.length;
  const x = { band, btcUp: btc ? trendOf(btc) : null, altUp: hasIdx ? trendOf(idx.alt) : null, rs30: hasIdx && btc ? perfPct(idx.alt, 30) - perfPct(btc, 30) : null,
    breadth: hasIdx ? relStrength(idx.small, idx.top, 30) : null, fng: market.fng?.value ?? null, btc30: btc ? perfPct(btc, 30) : null };
  const ph = hasIdx ? phaseOf(x) : null;
  const facts = [
    band ? `<li><b style="color:${AMP[band.state][0]}">Band ${AMP[band.state][1]}</b> · ${esc(band.why)}</li>` : '<li class="muted">BTC-Kerzen werden geladen …</li>',
    hasIdx && x.rs30 != null ? `<li><b>Alts gegen BTC</b> · ${pp(x.rs30)} in 30 Tagen (${x.rs30 >= 0 ? 'Alts vorn' : 'BTC vorn'})</li>` : '',
    hasIdx && x.breadth != null ? `<li><b>Breite</b> · Rest gegen Top 10 ${pp(x.breadth)}</li>` : '',
    x.fng != null ? `<li><b>Stimmung</b> · Fear & Greed ${x.fng}${x.btc30 != null ? ` · BTC ${x.btc30 >= 0 ? '+' : '−'}${f.pct(Math.abs(x.btc30), 1)} in 30 Tagen` : ''}</li>` : '',
  ].filter(Boolean).join('');
  box.innerHTML = `${wheelSvg(ph, band)}
    ${ph ? `<div class="compass-phase"><span class="k">Phase ${ph.n} von 7</span><b style="color:${COL[ph.n]}">${esc(ph.name)}</b><p>${esc(ph.text)}</p><p class="compass-todo">→ ${esc(ph.todo)}</p></div>`
      : `<p class="empty" style="text-align:center">${hasIdx ? 'Für die Einordnung fehlen noch die BTC-Kerzen.' : 'Für die Phase fehlt der Alt-Index: einmal im Tab Signale „Märkte durchsuchen“.'}</p>`}
    <ul class="compass-facts">${facts}</ul>
    <p class="compass-foot">Feste Regeln, ohne Messung · das Band reagiert spät (Testplan 2) ${tipInline(TIP, 'compass')}</p>`;
}

export function initCompass() {
  onMarket(render);
  window.addEventListener('wolfdesk-index', render);
  loadBtc(); setInterval(loadBtc, 30 * 60e3);
  render();
}
