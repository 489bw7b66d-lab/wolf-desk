// Marktüberblick auf der Startseite: Markt-Bias als Tacho, Fear & Greed als Bogen, Marktkapitalisierung, BTC-Dominanz.
import { market, onMarket, refreshMarket, fngLabel, fngStand, ETF_URL } from './core-market.js';
import * as f from './core-format.js';
import { loadIndex, indexChart, trendOf, marketBias, tachoFrom, breadthText } from './core-index.js';
import { getCandles } from './core-scanner.js';
import { esc, tipInline } from './ui-parts.js';

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

// 8n1/8y: Bild des Hyperliquid-Ledger-Perp-Index. 8y (Jensen, 04.11.: „übersichtlicher, EMA 200, zum Antippen Vollbild“):
// Linien über Chips ein- und ausblendbar (Start: Alts und Top 10), EMA 20/100/200 der Alts an einem Chip, Sell-Block als dünne Linie,
// Beschriftungen rechts weichen einander aus, Erklärung hinter ⓘ. Tippen auf das Bild öffnet es im Vollbild mit Fadenkreuz.
let idxDays = 180;
const LINES = [
  { k: 'alt', label: 'Alts', col: 'var(--gold)', w: 2, pct: 'altPct' },
  { k: 'top', label: 'Top 10', col: 'var(--text)', w: 1.3, pct: 'topPct' },
  { k: 'small', label: 'Rest', col: '#6ea8ff', w: 1.5, pct: 'smallPct' },
  { k: 'roh', label: 'Rohstoffe', short: 'Roh.', col: '#e0915a', w: 1.5, pct: 'rohPct', n: 'rohN' },
  { k: 'akt', label: 'Aktien', short: 'Akt.', col: '#b48cff', w: 1.5, pct: 'aktPct', n: 'aktN' },
];
const AVG = [{ k: 'fast', label: 'EMA 20', col: 'var(--gold)', dash: '2 2', op: 0.7 }, { k: 'slow', label: 'EMA 100', col: 'var(--muted)', dash: '4 3', op: 0.85 }, { k: 'slow2', label: 'EMA 200', col: '#e8e2d0', dash: '7 4', op: 0.55 }];
const VIS_KEY = 'wolfdesk.idxlines';
let vis = (() => { try { const v = JSON.parse(localStorage.getItem(VIS_KEY) || 'null'); if (Array.isArray(v)) return new Set(v); } catch { /* Standard */ } return new Set(['alt', 'top', 'avg']); })();
const saveVis = () => { try { localStorage.setItem(VIS_KEY, JSON.stringify([...vis])); } catch { /* egal */ } };
const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const dayY = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

// Geometrie für ein Bild der Größe W×H (klein auf der Startseite, groß im Vollbild)
function geom(c, W, H, big) {
  const P = { l: 4, r: big ? 62 : 46, t: 8, b: big ? 22 : 16 };
  const shown = LINES.filter((L) => vis.has(L.k) && c[L.k]?.length);
  const ys = shown.flatMap((L) => c[L.k].map((x) => x.y));
  if (vis.has('avg')) AVG.forEach((A) => c.alt.forEach((x) => { if (x[A.k] != null) ys.push(x[A.k]); }));
  const fin = ys.filter((y) => y != null && Number.isFinite(y));
  if (!fin.length) fin.push(...c.alt.map((x) => x.y));
  let lo = Math.min(...fin), hi = Math.max(...fin);
  if (c.block && c.block.lo < hi * 1.15) hi = Math.max(hi, Math.min(c.block.lo * 1.01, hi * 1.15));
  const log = lo > 0 && hi / lo > 3;
  if (log) { lo /= 1.08; hi *= 1.08; } else { const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad; }
  const t0 = c.alt[0].t, t1 = c.alt[c.alt.length - 1].t || t0 + 1;
  const g = (y) => (log ? Math.log(Math.max(y, 1e-9)) : y), gl = g(lo), gh = g(hi);
  const X = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r), Y = (y) => P.t + (1 - (g(y) - gl) / (gh - gl)) * (H - P.t - P.b);
  return { P, W, H, lo, hi, log, t0, t1, X, Y, shown };
}

function indexSvg(c, W = 320, H = 150, big = false) {
  const G = geom(c, W, H, big), { P, X, Y, lo, hi } = G, fs = big ? 12 : 9.5;
  const path = (pts, k = 'y') => pts.filter((p) => p[k] != null && p[k] >= lo && p[k] <= hi).map((p, j) => `${j ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join('');
  const blockOn = !!(c.block && c.block.lo < hi && c.block.lo > lo);
  const sell = blockOn ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(c.block.lo).toFixed(1)}" y2="${Y(c.block.lo).toFixed(1)}" stroke="var(--bad)" stroke-width="1" stroke-dasharray="1 0" opacity=".75"/><text x="${P.l + 2}" y="${(Y(c.block.lo) - 3).toFixed(1)}" fill="var(--bad)" font-size="${fs - 1}" font-weight="700">Sell-Block Tag</text>` : '';
  const avg = vis.has('avg') ? AVG.map((A) => `<path d="${path(c.alt, A.k)}" stroke="${A.col}" stroke-width="1" fill="none" stroke-dasharray="${A.dash}" opacity="${A.op}"/>`).join('') : '';
  // Hauptlinien, Alts zuletzt (oben)
  const order = [...G.shown].sort((a, b) => (a.k === 'alt') - (b.k === 'alt'));
  const lines = order.map((L) => `<path d="${path(c[L.k])}" stroke="${L.col}" stroke-width="${big ? L.w + 0.4 : L.w}" fill="none"${L.k === 'top' ? ' opacity=".8"' : ''}/>`).join('');
  // Beschriftungen rechts: auseinanderschieben, dann in den Rahmen holen
  const gap = fs + 1.5, minY = P.t + fs * 0.4, maxY = H - P.b;
  const lab = G.shown.map((L) => { const last = c[L.k][c[L.k].length - 1]; return { y: Y(Math.min(hi, Math.max(lo, last.y))), t: big ? L.label : L.short || L.label, col: L.col }; });
  if (vis.has('avg')) { const e = c.alt[c.alt.length - 1]; AVG.forEach((A) => { if (e[A.k] != null && e[A.k] >= lo && e[A.k] <= hi && big) lab.push({ y: Y(e[A.k]), t: A.label.replace('EMA ', 'Ø'), col: 'var(--muted)' }); }); }
  lab.sort((a, b) => a.y - b.y);
  for (let k = 0; k < lab.length; k++) lab[k].y = Math.max(lab[k].y, k ? lab[k - 1].y + gap : minY);
  const over = lab.length ? lab[lab.length - 1].y - maxY : 0;
  if (over > 0) { for (let k = lab.length - 1; k >= 0; k--) lab[k].y = Math.min(lab[k].y - over, k < lab.length - 1 ? lab[k + 1].y - gap : Infinity); }
  const labels = lab.map((l) => `<text x="${W - P.r + 4}" y="${(l.y + fs * 0.35).toFixed(1)}" fill="${l.col}" font-size="${fs}" font-weight="800">${esc(l.t)}</text>`).join('');
  const grid = big ? [0.25, 0.5, 0.75].map((q) => { const y = P.t + q * (H - P.t - P.b); return `<line x1="${P.l}" x2="${W - P.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width=".6" opacity=".6"/>`; }).join('') : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="mkt-idx-svg${big ? ' big' : ''}" role="img" aria-label="Hyperliquid-Ledger-Perp-Index, ${c.alt.length} Tage">
    ${grid}${sell}${avg}${lines}${labels}
    <text x="${P.l}" y="${H - 4}" fill="var(--muted)" font-size="${fs - 0.5}">${big ? dayY(G.t0) : day(G.t0)}</text>
    <text x="${W - P.r}" y="${H - 4}" fill="var(--muted)" font-size="${fs - 0.5}" text-anchor="end">${big ? dayY(G.t1) : day(G.t1)}</text>
    <g class="idx-cross"></g>
  </svg>`;
}

const sgn = (x) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${f.pct(Math.abs(x), 1)}`);
function lineChips(c) {
  const one = (L) => { const has = c[L.k]?.length, on = vis.has(L.k) && has;
    return `<button type="button" class="idx-chip${on ? ' on' : ''}" data-idxline="${L.k}" aria-pressed="${!!on}"${has ? '' : ' disabled'}><i style="background:${L.col}"></i>${L.label} <b>${has ? sgn(c[L.pct]) : '–'}</b>${L.n && c[L.n] ? `<small>${c[L.n]}</small>` : ''}</button>`; };
  return `<div class="idx-chips">${LINES.map(one).join('')}<button type="button" class="idx-chip${vis.has('avg') ? ' on' : ''}" data-idxline="avg" aria-pressed="${vis.has('avg')}"><i class="dash"></i>Ø 20/100/200</button></div>`;
}
const periodChips = () => [[90, '90 T'], [180, '180 T'], [100000, 'Alles']].map(([d, t]) => `<button type="button" class="chip-btn${idxDays === d ? ' ghost-chip' : ''}" data-idxdays="${d}">${t}</button>`).join('');
const IDX_TIP = 'Gleich gewichtete Indizes aus den Tageskerzen der handelbaren Märkte bei Hyperliquid, jede Linie am ersten Tag des Ausschnitts = 100. Alts: alle Krypto-Märkte ohne BTC; Top 10: die zehn umsatzstärksten; Rest: ohne die Top 10. Rohstoffe (Gold, Silber, Öl …, auch PAXG) und Aktien & Indizes (xyz) sind eigene Linien und fließen nicht in Alts, Breite oder Kompass ein; die kleine Zahl am Chip = so viele Märkte rechnen gerade mit. Beginnt eine Linie später als der Ausschnitt, startet sie auf der Höhe der Alts. Gestrichelt: EMA 20, EMA 100 und EMA 200 der Alts. Rote Linie: Unterkante des nächsten Tages-Sell-Blocks über dem Index. Bei mehr als Faktor 3 im Bild logarithmische Skala. Tippen auf das Bild: Vollbild, mit dem Finger über das Bild fahren zeigt die Werte des Tages.';

function indexBlock() {
  const idx = loadIndex();
  if (!idx?.alt?.length) return `<div class="mkt-idx"><span class="k">Hyperliquid-Ledger-Perp-Index</span><p class="empty" style="font-size:12px;margin:4px 0 0">Noch nicht berechnet. Einmal im Tab Signale „Märkte durchsuchen“, dann erscheint er hier.${loadIndexOld() ? ' (8y: Der Index wird einmal neu aufgebaut, jetzt ohne Gold und xyz-Märkte im Alt-Index.)' : ''}</p></div>`;
  const c = indexChart(idx, idxDays);
  if (!c) return '';
  const up = trendOf(idx.alt), G = geom(c, 320, 150, false);
  const notes = [G.log ? 'logarithmische Skala' : '', c.full ? '' : `lange Historie folgt beim nächsten Durchlauf${idx.of ? ` (${idx.got} von ${idx.of} Märkten lang geladen)` : ''}`].filter(Boolean);
  return `<div class="mkt-idx">
    <div class="mkt-idx-head"><span class="k">Hyperliquid-Ledger-Perp-Index</span><span class="chips">${periodChips()}</span></div>
    <button type="button" class="idx-open" data-idxfull aria-label="Index im Vollbild öffnen">${indexSvg(c)}<span class="idx-zoom" aria-hidden="true">⤢</span></button>
    ${lineChips(c)}
    <span class="mkt-parts"><b class="${up == null ? 'muted' : up ? 'long' : 'short'}">Alts ${up == null ? 'zu wenig Historie' : up ? 'aufwärts' : 'nicht aufwärts'}</b> <span class="muted">(EMA 20 über EMA 100)</span>${notes.length ? ` · <span class="muted">${esc(notes.join(' · '))}</span>` : ''} ${tipInline(IDX_TIP, 'idx')}</span>
  </div>`;
}
// Gibt es noch einen Index der alten Fassung? (nur für den Hinweis beim Neuaufbau)
function loadIndexOld() { try { const p = JSON.parse(localStorage.getItem('wolfdesk.hlindex') || 'null'); return !!p && p.v !== 3; } catch { return false; } }

// ---- Vollbild ----
let full = null; // { el }
function fullSize() {
  const w = Math.max(280, window.innerWidth - 24), h = Math.max(200, window.innerHeight - 200);
  return [Math.round(w), Math.round(Math.min(h, w * 1.45))];
}
function renderFull() {
  if (!full) return;
  const idx = loadIndex(), c = idx?.alt?.length ? indexChart(idx, idxDays) : null;
  if (!c) { closeFull(); return; }
  const [W, H] = fullSize();
  full.c = c; full.G = geom(c, W, H, true);
  full.el.innerHTML = `<div class="idx-full-head"><b>Hyperliquid-Ledger-Perp-Index</b><span class="chips">${periodChips()}</span><button type="button" class="idx-close" data-idxclose aria-label="Vollbild schließen">✕</button></div>
    <div class="idx-full-chart">${indexSvg(c, W, H, true)}</div>
    <div class="idx-read" aria-live="polite">${readout(c, c.alt.length - 1)}</div>
    ${lineChips(c)}`;
  bindCross();
}
// Werte an einem Tag: Veränderung seit Beginn des Ausschnitts je sichtbarer Linie
function readout(c, k) {
  const t = c.alt[k]?.t;
  if (t == null) return '';
  const at = (arr) => { let best = null; for (const x of arr || []) { if (x.t <= t) best = x; else break; } return best; };
  const parts = LINES.filter((L) => vis.has(L.k) && c[L.k]?.length).map((L) => { const x = at(c[L.k]); return x ? `<b style="color:${L.col}">${L.label} ${sgn(x.y / c[L.k][0].y * 100 - 100)}</b>` : ''; }).filter(Boolean);
  return `<span class="muted">${dayY(t)}</span> · ${parts.join(' · ')}`;
}
function bindCross() {
  const svg = full?.el.querySelector('svg'), g = svg?.querySelector('.idx-cross');
  if (!svg || !g) return;
  const move = (e) => {
    const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * full.G.W;
    const { P, W, H, t0, t1, X, Y } = full.G, c = full.c;
    const t = t0 + ((x - P.l) / Math.max(1, W - P.l - P.r)) * (t1 - t0);
    let k = 0, d = Infinity; c.alt.forEach((p, j) => { const dd = Math.abs(p.t - t); if (dd < d) { d = dd; k = j; } });
    const px = X(c.alt[k].t);
    const dots = LINES.filter((L) => vis.has(L.k) && c[L.k]?.length).map((L) => { const p = c[L.k].find((q) => q.t === c.alt[k].t); return p && p.y >= full.G.lo && p.y <= full.G.hi ? `<circle cx="${px.toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" fill="${L.col}" stroke="var(--bg)" stroke-width="1"/>` : ''; }).join('');
    g.innerHTML = `<line x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${P.t}" y2="${H - P.b}" stroke="var(--text)" stroke-width=".8" opacity=".5"/>${dots}`;
    const rd = full.el.querySelector('.idx-read'); if (rd) rd.innerHTML = readout(c, k);
  };
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture?.(e.pointerId); move(e); });
  svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') move(e); else move(e); });
}
function openFull() {
  if (full) return;
  const el = document.createElement('div');
  el.className = 'idx-full'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Index im Vollbild');
  document.body.appendChild(el); document.body.classList.add('no-scroll');
  full = { el };
  el.addEventListener('click', onClick);
  renderFull();
}
function closeFull() { if (!full) return; full.el.remove(); full = null; document.body.classList.remove('no-scroll'); }

function onClick(e) {
  const d = e.target.closest('button[data-idxdays]');
  if (d) { idxDays = Number(d.dataset.idxdays); renderMarket(); renderFull(); return; }
  const l = e.target.closest('button[data-idxline]');
  if (l) { const k = l.dataset.idxline; if (vis.has(k)) vis.delete(k); else vis.add(k); if (![...vis].some((x) => x !== 'avg')) vis.add('alt'); saveVis(); renderMarket(); renderFull(); return; }
  if (e.target.closest('[data-idxclose]')) { closeFull(); return; }
  if (e.target.closest('[data-idxfull]')) openFull();
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
  $('market')?.addEventListener('click', onClick);
  window.addEventListener('resize', () => { clearTimeout(renderFull.t); renderFull.t = setTimeout(renderFull, 200); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFull(); });
  window.addEventListener('wolfdesk-index', () => renderFull());
  renderMarket();
  refreshMarket();
  setInterval(() => refreshMarket(), 10 * 60e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMarket(); });
}
