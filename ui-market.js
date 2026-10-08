// Marktüberblick auf der Startseite: Markt-Bias als Tacho, Fear & Greed als Bogen, Marktkapitalisierung, BTC-Dominanz.
import { market, onMarket, refreshMarket, fngLabel, fngStand, ETF_URL } from './core-market.js';
import * as f from './core-format.js';
import { loadIndex, indexChart, trendOf, marketBias, tachoFrom, breadthText } from './core-index.js';
import { getCandles } from './core-scanner.js';

const $ = (id) => document.getElementById(id);

// Punkt auf dem Halbkreis: t = 0 (links) bis 1 (rechts)
const pt = (cx, cy, r, t) => {
  const a = Math.PI * (1 - t);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
};
function arc(cx, cy, r, t0, t1, col, w) {
  const [x0, y0] = pt(cx, cy, r, t0), [x1, y1] = pt(cx, cy, r, t1);
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;
}

// Tacho mit Zeiger: −100 (Short-Markt) … +100 (Long-Markt)
function biasGauge(b) {
  const cx = 80, cy = 78, r = 60;
  const zones = [[0, 0.3, 'var(--bad)'], [0.3, 0.425, 'rgba(255,112,112,.45)'], [0.425, 0.575, 'var(--line)'], [0.575, 0.7, 'rgba(74,222,155,.45)'], [0.7, 1, 'var(--ok)']];
  const segs = zones.map(([a, z, c]) => arc(cx, cy, r, a + 0.004, z - 0.004, c, 10)).join('');
  let needle = '';
  if (b) {
    const t = (b.value + 100) / 200;
    const [nx, ny] = pt(cx, cy, r - 16, t);
    needle = `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--text)"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="var(--surface)"/>`;
  }
  return `<svg viewBox="0 0 160 88" class="gauge" role="img" aria-label="Markt-Bias ${b ? b.label + ', Wert ' + b.value : 'wird geladen'}">
    ${segs}${needle}
    <text x="14" y="86" fill="var(--bad)" font-size="9" font-weight="800">SHORT</text>
    <text x="146" y="86" fill="var(--ok)" font-size="9" font-weight="800" text-anchor="end">LONG</text>
  </svg>`;
}

// Fear & Greed: Farbbogen mit Markierung
function fngGauge(v) {
  const cx = 60, cy = 58, r = 44, n = 40;
  let segs = '';
  for (let i = 0; i < n; i++) {
    const t = i / n, hue = Math.round(t * 130); // rot → gelb → grün
    segs += arc(cx, cy, r, t, (i + 1) / n + 0.002, `hsl(${hue} 70% 55%)`, 8);
  }
  let mark = '';
  if (v != null) {
    const [mx, my] = pt(cx, cy, r, v / 100);
    mark = `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="7" fill="var(--surface)" stroke="var(--text)" stroke-width="2.5"/>`;
  }
  return `<svg viewBox="0 0 120 66" class="gauge small" role="img" aria-label="Fear and Greed Index ${v ?? 'wird geladen'}">
    ${segs}${mark}
    <text x="${cx}" y="${cy - 4}" fill="var(--text)" font-size="22" font-weight="800" text-anchor="middle">${v ?? '–'}</text>
  </svg>`;
}

const bigUsd = (v) => {
  if (!Number.isFinite(v)) return '–';
  const t = v >= 1e12 ? [v / 1e12, 'Bio.'] : [v / 1e9, 'Mrd.'];
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(t[0]) + ' ' + t[1] + ' $';
};

// Aufschlüsselung unter dem Tacho: BTC ▲ · ETH ▲ · Breite 64 % · Altcoins stärker
const arrow = (v) => (v == null ? '·' : v >= 15 ? '▲' : v <= -15 ? '▼' : '►');
const acls = (v) => (v == null ? 'muted' : v >= 15 ? 'long' : v <= -15 ? 'short' : 'muted');
function biasParts(bias, m) {
  const p = bias?.parts;
  if (!p) return '';
  const r = p.ratio == null ? '' : p.ratio >= 15 ? 'Altcoins stärker' : p.ratio <= -15 ? 'BTC stärker' : 'ETH/BTC neutral';
  const breadth = m.breadth ? `Breite ${f.pct(m.breadth.pct, 0)}`
    : m.breadthProgress ? `Breite ${m.breadthProgress.done}/${m.breadthProgress.total} …` : 'Breite …';
  return `<span class="mkt-parts">
    <b class="${acls(p.btc)}">BTC ${arrow(p.btc)}</b> · <b class="${acls(p.eth)}">ETH ${arrow(p.eth)}</b> ·
    <b class="${acls(m.breadth?.value ?? null)}">${breadth}</b>${r ? ` · <b class="${acls(p.ratio)}">${r}</b>` : ''}</span>`;
}

// 8o: BTC-Tageskerzen für den Tacho (aus dem Zwischenspeicher der App)
let btcDaily = null;
async function loadBtc() { try { btcDaily = await getCandles('BTC', '1d', true); renderMarket(); } catch { /* Tacho bleibt beim alten Bias */ } }

// 8n1: Bild des Hyperliquid-Ledger-Perp-Index (Alts gold, Rest ohne Top 10 blau, Top 10 weiß (8o), beide am ersten Tag des Ausschnitts = 100),
// dazu EMA 20 und EMA 100 der Alts gestrichelt und der nächste Tages-Sell-Block über dem Index als roter Streifen.
let idxDays = 180;
function indexSvg(c) {
  const W = 320, H = 130, P = { l: 4, r: 40, t: 8, b: 16 };
  const ys = [...c.alt.map((x) => x.y), ...c.small.map((x) => x.y), ...(c.top || []).map((x) => x.y)].filter((y) => y != null && Number.isFinite(y));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (c.block && c.block.lo < hi * 1.15) hi = Math.max(hi, Math.min(c.block.hi, hi * 1.15));
  if (lo > 0 && hi / lo > 3) { lo /= 1.08; hi *= 1.08; } else { const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad; }
  const t0 = c.alt[0].t, t1 = c.alt[c.alt.length - 1].t || t0 + 1;
  // Bei großen Bewegungen (mehr als Faktor 3 im Bild) logarithmisch, damit der Anfang nicht flach aussieht
  const log = lo > 0 && hi / lo > 3, g = (y) => (log ? Math.log(Math.max(y, 1e-9)) : y), gl = g(lo), gh = g(hi);
  const X = (t) => (P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r)).toFixed(1), Y = (y) => (P.t + (1 - (g(y) - gl) / (gh - gl)) * (H - P.t - P.b)).toFixed(1);
  const path = (pts, k = 'y') => pts.filter((p) => p[k] != null && p[k] >= lo && p[k] <= hi).map((p, j) => `${j ? 'L' : 'M'}${X(p.t)} ${Y(p[k])}`).join('');
  c.blockShown = !!(c.block && c.block.lo < hi);
  const band = c.blockShown ? `<rect x="${P.l}" y="${Y(Math.min(c.block.hi, hi))}" width="${W - P.l - P.r}" height="${Math.max(1, Y(c.block.lo) - Y(Math.min(c.block.hi, hi)))}" fill="var(--bad)" opacity=".18"/><text x="${W - P.r + 3}" y="${Number(Y(c.block.lo)) + 3}" fill="var(--bad)" font-size="9" font-weight="700">Sell</text>` : '';
  const last = c.alt[c.alt.length - 1], ls = c.small[c.small.length - 1];
  const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `<svg viewBox="0 0 ${W} ${H}" class="mkt-idx-svg" role="img" aria-label="Alt-Index und Small-Index der letzten ${c.alt.length} Tage">
    ${band}
    <path d="${path(c.alt, 'slow')}" stroke="var(--muted)" stroke-width="1" fill="none" stroke-dasharray="4 3" opacity=".8"/>
    <path d="${path(c.alt, 'fast')}" stroke="var(--gold)" stroke-width="1" fill="none" stroke-dasharray="2 2" opacity=".7"/>
    ${c.top?.length ? `<path d="${path(c.top)}" stroke="var(--text)" stroke-width="1.2" fill="none" opacity=".75"/>` : ''}
    ${c.small.length ? `<path d="${path(c.small)}" stroke="#6ea8ff" stroke-width="1.6" fill="none"/>` : ''}
    <path d="${path(c.alt)}" stroke="var(--gold)" stroke-width="2" fill="none"/>
    ${labels(c, Y, W - P.r + 3, last, ls)}
    <text x="${P.l}" y="${H - 3}" fill="var(--muted)" font-size="9">${day(t0)}</text>
    <text x="${W - P.r}" y="${H - 3}" fill="var(--muted)" font-size="9" text-anchor="end">${day(t1)}</text>
  </svg>`;
}
// Beschriftungen rechts, auseinandergeschoben, wenn sie übereinander lägen
function labels(c, Y, x, last, ls) {
  const lt = c.top?.[c.top.length - 1];
  const L = [[Number(Y(last.y)), 'Alts', 'var(--gold)'], ls ? [Number(Y(ls.y)), 'Rest', '#6ea8ff'] : null, lt ? [Number(Y(lt.y)), 'Top 10', 'var(--text)'] : null].filter(Boolean).sort((a, b) => a[0] - b[0]);
  for (let k = 1; k < L.length; k++) if (L[k][0] - L[k - 1][0] < 10) L[k][0] = L[k - 1][0] + 10;
  return L.filter((l) => l[1] !== 'Alts').map(([y, t, col]) => `<text x="${x}" y="${(y + 3).toFixed(1)}" fill="${col}" font-size="9" font-weight="800">${t}</text>`).join('') + L.filter((l) => l[1] === 'Alts').map(([y, t, col]) => `<text x="${x}" y="${(y + 3).toFixed(1)}" fill="${col}" font-size="9" font-weight="800">${t}</text>`).join('');
}
const sgn = (x) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${f.pct(Math.abs(x), 1)}`);
function indexBlock() {
  const idx = loadIndex();
  if (!idx?.alt?.length) return `<div class="mkt-idx"><span class="k">Hyperliquid-Ledger-Perp-Index</span><p class="empty" style="font-size:12px;margin:4px 0 0">Noch nicht berechnet. Einmal im Tab Signale „Märkte durchsuchen“, dann erscheint er hier.</p></div>`;
  const c = indexChart(idx, idxDays);
  if (!c) return '';
  const up = trendOf(idx.alt);
  const chips = [[90, '90 T'], [180, '180 T'], [100000, 'Alles']].map(([d, t]) => `<button type="button" class="chip-btn${idxDays === d ? ' ghost-chip' : ''}" data-idxdays="${d}">${t}</button>`).join('');
  return `<div class="mkt-idx">
    <div class="mkt-idx-head"><span class="k">Hyperliquid-Ledger-Perp-Index</span><span class="chips">${chips}</span></div>
    ${indexSvg(c)}
    <span class="mkt-parts"><b style="color:var(--gold)">Alts ${sgn(c.altPct)}</b> · ${c.topPct != null ? `<b style="color:var(--text)">Top 10 ${sgn(c.topPct)}</b> · ` : ''}<b style="color:#6ea8ff">Rest ${sgn(c.smallPct)}</b> im Ausschnitt · <b class="${up == null ? 'muted' : up ? 'long' : 'short'}">Alts ${up == null ? 'zu wenig Historie' : up ? 'aufwärts' : 'nicht aufwärts'}</b>
    <br>gestrichelt: EMA 20 und EMA 100 der Alts${c.alt.length && (() => { const v = [...c.alt.map((x) => x.y), ...c.small.map((x) => x.y)]; return Math.max(...v) / Math.min(...v) > 3; })() ? ' · logarithmische Skala' : ''}${c.block && c.blockShown ? ' · rot: nächster Tages-Sell-Block' : ''}${c.full ? '' : ` · lange Historie folgt beim nächsten Durchlauf${idx.of ? ` (letzter Versuch: ${idx.got} von ${idx.of} Märkten lang geladen${idx.tried ? ', ' + new Date(idx.tried).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''})` : idx.tried ? ' (noch kein vollständiger Versuch)' : ''}`}</span>
  </div>`;
}

// 8o: Zeile unter dem Tacho, wenn er aus dem Index kommt: BTC ▲ · Alts ▲ · Breite (Rest gegen Top 10) · Marktbreite (Top 50 über EMA 50)
function newParts(tb, nb, m) {
  const ar = (x) => (x == null ? '·' : x ? '▲' : '▼'), cl = (x) => (x == null ? 'muted' : x ? 'long' : 'short');
  const br = tb.parts.breadth, brT = br > 0 ? 'Rest stärker' : br < 0 ? 'Top 10 stärker' : 'Rest = Top 10';
  const pull = (x, up) => (x ? (up ? ' (Rücksetzer)' : ' (Erholung)') : '');
  return `<span class="mkt-parts"><b class="${cl(tb.parts.btc)}">BTC ${ar(tb.parts.btc)}${pull(tb.parts.btcPull, tb.parts.btc)}</b> · <b class="${cl(tb.parts.alt)}">Alts ${ar(tb.parts.alt)}${pull(tb.parts.altPull, tb.parts.alt)}</b> · <b class="${br > 0 ? 'long' : br < 0 ? 'short' : 'muted'}" title="${breadthText(nb.breadth)}">${brT}</b>${m.breadth ? ` · <b class="muted">Breite ${f.pct(m.breadth.pct, 0)}</b>` : ''}</span>`;
}

export function renderMarket() {
  const box = $('market');
  if (!box) return;
  const { fng, global: g, bias, errors } = market;
  const fl = fng ? fngLabel(fng.value) : null;
  const fngDiff = fng && Number.isFinite(fng.prev) ? fng.value - fng.prev : null;
  const stand = fng ? fngStand(fng.ts) : null;
  // 8o: Tacho aus dem eigenen Index (BTC-Trend, Alt-Trend, Breite), sobald er gespeichert ist; vorher der alte Bias
  const idx = loadIndex(), nb = idx?.alt?.length && btcDaily?.length ? marketBias(btcDaily, idx) : null, tb = tachoFrom(nb);
  const shown = tb || bias;
  box.innerHTML = `<div class="mkt-gauges">
      <div class="mkt-bias">
        ${biasGauge(shown)}
        <b class="mkt-label ${shown?.cls || 'muted'}">${shown ? shown.label : errors.bias ? 'Nicht verfügbar' : 'Lädt …'}</b>
        <span class="k">Markt-Bias</span>
        ${tb ? newParts(tb, nb, market) : biasParts(bias, market)}
      </div>
      <div class="mkt-fng">
        ${fngGauge(fng?.value ?? null)}
        <b class="mkt-label ${fl?.cls === 'bad' ? 'short' : fl?.cls === 'ok' ? 'long' : fl?.cls === 'warn' ? 'warn-t' : 'muted'}">${fl ? fl.text : errors.fng ? 'Nicht verfügbar' : 'Lädt …'}</b>
        <span class="k">Fear & Greed${fng ? ` ${fng.value}` : ''}${fngDiff != null ? ` · gestern ${fng.prev}` : ''}</span>
        ${stand ? `<span class="k${stand.stale ? ' fng-stale' : ''}">${stand.text}${stand.stale ? ', Quelle hängt' : ''}</span>` : ''}
      </div>
    </div>
    ${indexBlock()}
    <div class="mkt-stats">
      <div><span class="k">Krypto-Marktkap.</span><b>${g ? bigUsd(g.cap) : '–'}</b>
        ${g && Number.isFinite(g.change24h) ? `<small class="${g.change24h >= 0 ? 'long' : 'short'}">${g.change24h >= 0 ? '+' : '−'}${f.pct(Math.abs(g.change24h), 2)} 24h</small>` : ''}</div>
      <div><span class="k">BTC-Dominanz</span><b>${g && Number.isFinite(g.btcDom) ? f.pct(g.btcDom, 1) : '–'}</b>
        ${g && Number.isFinite(g.ethDom) ? `<small class="muted">ETH ${f.pct(g.ethDom, 1)}</small>` : ''}</div>
    </div>
    <a class="mkt-etf" href="${ETF_URL}" target="_blank" rel="noopener">BTC-ETF-Zuflüsse bei Farside ansehen</a>
    ${errors.global ? `<p class="empty" style="font-size:12px;margin:8px 0 0">Marktkapitalisierung gerade nicht abrufbar (${errors.global}).</p>` : ''}`;
}

export function initMarket() {
  onMarket(renderMarket);
  window.addEventListener('wolfdesk-index', renderMarket);
  loadBtc(); setInterval(loadBtc, 30 * 60e3);
  $('market')?.addEventListener('click', (e) => { const b = e.target.closest('button[data-idxdays]'); if (b) { idxDays = Number(b.dataset.idxdays); renderMarket(); } });
  renderMarket();
  refreshMarket();
  setInterval(() => refreshMarket(), 10 * 60e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMarket(); });
}
