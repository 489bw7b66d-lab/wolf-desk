// Marktüberblick auf der Startseite: Markt-Bias als Tacho, Fear & Greed als Bogen, Marktkapitalisierung, BTC-Dominanz.
import { market, onMarket, refreshMarket, fngLabel, ETF_URL } from './core-market.js';
import * as f from './core-format.js';

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

export function renderMarket() {
  const box = $('market');
  if (!box) return;
  const { fng, global: g, bias, errors } = market;
  const fl = fng ? fngLabel(fng.value) : null;
  const fngDiff = fng && Number.isFinite(fng.prev) ? fng.value - fng.prev : null;
  box.innerHTML = `<div class="mkt-gauges">
      <div class="mkt-bias">
        ${biasGauge(bias)}
        <b class="mkt-label ${bias?.cls || 'muted'}">${bias ? bias.label : errors.bias ? 'Nicht verfügbar' : 'Lädt …'}</b>
        <span class="k">Markt-Bias aus BTC 4H + 1D</span>
      </div>
      <div class="mkt-fng">
        ${fngGauge(fng?.value ?? null)}
        <b class="mkt-label ${fl?.cls === 'bad' ? 'short' : fl?.cls === 'ok' ? 'long' : fl?.cls === 'warn' ? 'warn-t' : 'muted'}">${fl ? fl.text : errors.fng ? 'Nicht verfügbar' : 'Lädt …'}</b>
        <span class="k">Fear & Greed${fngDiff != null ? ` · gestern ${fng.prev}` : ''}</span>
      </div>
    </div>
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
  renderMarket();
  refreshMarket();
  setInterval(() => refreshMarket(), 10 * 60e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMarket(); });
}
