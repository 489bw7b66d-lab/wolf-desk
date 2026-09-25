// Signale-Bereich: Suche, Modus, Detail-Analyse, Watchlist-Scan.
import { CONFIG } from './config.js';
import { analyzeMarket, analyzeAllModes, switchStyle } from './core-scanner.js';
import { badge, ladder, esc, TFL, styleRow } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const STACK = { bull: ['Bullisch', 'long'], bear: ['Bärisch', 'short'], mixed: ['Gemischt', 'muted'] };
const STRUCT = { up: ['Höhere Hochs', 'long'], down: ['Tiefere Tiefs', 'short'], range: ['Seitwärts', 'muted'] };

let mode = CONFIG.signals.defaultMode;
let getState = () => ({});
let onTrade = () => {};
let shown = null;
const results = new Map(); // "mode|coin" -> Ergebnis

function allMarkets() {
  const m = getState().markets || {};
  return [...new Set([...CONFIG.watchlist, ...Object.values(m).flat()])];
}

function scoreBars(total) {
  return `<div class="scores">
    <div><span class="k">Long-Score</span><div class="bar"><span style="width:${total.long}%;background:var(--ok)"></span></div><b class="long">${total.long}</b></div>
    <div><span class="k">Short-Score</span><div class="bar"><span style="width:${total.short}%;background:var(--bad)"></span></div><b class="short">${total.short}</b></div>
  </div>`;
}

function mtfTable(r) {
  const role = ['Trend', 'Setup', 'Trigger'];
  return `<div class="mtf" role="table" aria-label="Multi-Timeframe-Struktur">
    <div class="mtf-row head" role="row"><span>TF</span><span>EMA-Stack</span><span>Struktur</span><span>RSI</span><span>MACD</span></div>
    ${r.analyses.map((a, i) => {
      const [st, sc] = STACK[a.stack], [su, uc] = STRUCT[a.structure];
      const m = a.macdHist == null ? ['–', 'muted'] : a.macdHist > 0 ? ['↑', 'long'] : ['↓', 'short'];
      return `<div class="mtf-row" role="row"><span><b>${TFL[r.tfs[i]]}</b><small>${role[i]}</small></span>
        <span class="${sc}">${st}</span><span class="${uc}">${su}</span><span>${a.rsi == null ? '–' : Math.round(a.rsi)}</span><span class="${m[1]}">${m[0]}</span></div>`;
    }).join('')}
  </div>`;
}

function eventsBlock(r) {
  if (!r.events.length) return '';
  const sorted = [...r.events].sort((a, b) => (b.strong - a.strong) || (a.barsAgo - b.barsAgo));
  return `<h3 class="sub-h">Ereignisse</h3><div class="chips">${sorted.map((e) =>
    `<span class="chip ${e.dir === 'long' ? 'long' : 'short'}${e.strong ? ' strong' : ''}">${e.strong ? '★ ' : ''}${esc(e.name)} <small>${TFL[e.tf] || ''}${e.barsAgo ? ', vor ' + e.barsAgo + ' K.' : ', frisch'}</small></span>`).join('')}</div>`;
}

function wavesBlock(r) {
  if (!r.waves.length) return `<h3 class="sub-h">Elliott (ab 4H)</h3><p class="empty">Keine regelkonforme Zählung erkennbar. Lieber keine Zählung als eine erzwungene.</p>`;
  return `<h3 class="sub-h">Elliott (ab 4H)</h3>${r.waves.map((w) => `<div class="wave">
    <div><b>${TFL[w.tf]}: ${esc(w.label)}</b> <span class="${w.bias === 'long' ? 'long' : 'short'}">${w.bias === 'long' ? '▲' : '▼'}</span></div>
    <span class="meta">Ziel ca. ${f.price(w.target)} · ungültig bei ${f.price(w.invalidation)} · ${esc(w.note)}</span></div>`).join('')}
    <p class="empty" style="margin-top:6px">Mögliche Zählung nach den harten Elliott-Regeln, keine Gewissheit.</p>`;
}

export function showDetail(r) {
  shown = r;
  const lv = r.levels, p = r.plan;
  $('sig-detail').innerHTML = `<div class="sig-head">
      <div><div class="coin" style="font-size:22px">${esc(r.coin)}</div>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · letzte Kerze ${new Date(r.lastClose).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></div>
      ${badge(r.dir)}
    </div>
    ${styleRow(r, CONFIG.signals.modes)}
    ${p ? `<button type="button" class="wide" id="sig-trade" style="margin:6px 0 16px">Trade-Karte öffnen</button>` : ''}
    ${scoreBars(r.total)}
    ${mtfTable(r)}
    ${eventsBlock(r)}
    ${wavesBlock(r)}
    <h3 class="sub-h">Trade-Plan (${TFL[r.tfs[1]]})</h3>
    ${p ? `<p class="plan-mode"><span class="chip">${p.method === 'fib' ? 'Fibonacci' : 'ATR'}</span> ${esc(p.entryMode)}</p>${ladder(p)}
      ${p.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}${w.price ? ` (${f.price(w.price)})` : ''}</p>`).join('')}`
    : `<p class="empty">Kein klares Setup: Score unter ${CONFIG.signals.minScore} oder zu nah an der Gegenrichtung (Abstand mind. ${CONFIG.signals.minGap}). Abwarten ist auch eine Position.</p>`}
    ${r.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}</p>`).join('')}
    <h3 class="sub-h">Key Levels</h3>
    <div class="kv">
      <div><span class="k">Widerstände</span>${lv.resistance.map((x) => `<span class="v small">${f.price(x)}</span>`).join('') || '–'}</div>
      <div><span class="k">Unterstützungen</span>${lv.support.map((x) => `<span class="v small">${f.price(x)}</span>`).join('') || '–'}</div>
    </div>
    <p class="empty" style="margin-top:14px">Regelbasierte Auswertung abgeschlossener Kerzen, keine Anlageberatung.</p>`;
  $('sig-trade')?.addEventListener('click', () => onTrade(r));
  $('sig-detail').querySelectorAll('button[data-style]').forEach((b) => b.addEventListener('click', () => {
    const next = switchStyle(r, b.dataset.style);
    if (next) showDetail(next);
  }));
  // Bei Einzel-Stil-Ergebnissen die Modus-Auswahl anpassen (Auto bleibt Auto)
  if (!r.styles) {
    mode = r.mode;
    $('sig-modes').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.m === mode)));
  }
  $('sig-search').value = r.coin;
}

export async function analyze(coin) {
  if (!coin) return;
  $('sig-suggest').innerHTML = '';
  $('sig-search').value = coin;
  $('sig-detail').innerHTML = `<p class="empty">Analysiere ${esc(coin)} ${mode === 'auto' ? 'in allen drei Stilen' : '(' + CONFIG.signals.modes[mode].tfs.map((t) => TFL[t]).join(', ') + ')'} …</p>`;
  try {
    const r = await run(coin);
    results.set(mode + '|' + coin, r);
    showDetail(r);
    renderList();
  } catch (e) {
    $('sig-detail').innerHTML = `<p class="empty" style="color:var(--bad)">Analyse fehlgeschlagen: ${esc(e.message)}</p>`;
  }
}

const run = (coin) => (mode === 'auto' ? analyzeAllModes(coin) : analyzeMarket(coin, mode));

function renderSuggest() {
  const q = $('sig-search').value.trim().toUpperCase();
  if (!q) { $('sig-suggest').innerHTML = ''; return; }
  const hits = allMarkets().filter((n) => n.toUpperCase().includes(q))
    .sort((a, b) => (a.toUpperCase().replace(/^XYZ:/, '').startsWith(q) ? 0 : 1) - (b.toUpperCase().replace(/^XYZ:/, '').startsWith(q) ? 0 : 1)).slice(0, 8);
  $('sig-suggest').innerHTML = hits.length
    ? hits.map((n) => `<button type="button" class="suggest" data-coin="${esc(n)}">${esc(n)}</button>`).join('')
    : '<p class="empty">Kein Markt gefunden.</p>';
}

function renderList() {
  $('sig-list').innerHTML = CONFIG.watchlist.map((c) => {
    const r = results.get(mode + '|' + c);
    return `<button type="button" class="sig-row" data-coin="${esc(c)}">
      <span class="sym">${esc(c)}</span>
      ${r ? `<span class="meta">${r.styles ? (r.best ? CONFIG.signals.modes[r.best].label + ' · ' + r.total[r.dir] : 'kein Stil passt') : `L ${r.total.long} · S ${r.total.short}`}</span>${badge(r.dir)}` : '<span class="meta">noch nicht gescannt</span>'}
    </button>`;
  }).join('');
}

async function scanWatchlist() {
  const btn = $('sig-scan');
  btn.disabled = true;
  for (const [i, c] of CONFIG.watchlist.entries()) {
    btn.textContent = `Scanne ${i + 1} von ${CONFIG.watchlist.length} …`;
    try { results.set(mode + '|' + c, await run(c)); } catch { /* weiter */ }
    renderList();
  }
  btn.disabled = false;
  btn.textContent = 'Watchlist scannen';
}

export function initSignals(stateGetter, openTrade) {
  getState = stateGetter;
  onTrade = openTrade;
  const modes = CONFIG.signals.modes;
  $('sig-modes').innerHTML = `<button type="button" data-m="auto" aria-pressed="${mode === 'auto'}">Auto<small>bester Stil</small></button>`
    + Object.entries(modes).map(([k, m]) => `<button type="button" data-m="${k}" aria-pressed="${k === mode}">${m.label}<small>${m.tfs.map((t) => TFL[t]).join(' · ')}</small></button>`).join('');
  $('sig-modes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (!b) return;
    mode = b.dataset.m;
    $('sig-modes').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.m === mode)));
    renderList();
    const coin = shown?.coin;
    if (coin) { const r = results.get(mode + '|' + coin); if (r) showDetail(r); else analyze(coin); }
  });
  $('sig-search').addEventListener('input', renderSuggest);
  $('sig-search').addEventListener('focus', () => { $('sig-search').select(); });
  $('sig-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const first = $('sig-suggest').querySelector('button[data-coin]'); if (first) analyze(first.dataset.coin); }
  });
  $('sig-suggest').addEventListener('click', (e) => { const b = e.target.closest('button[data-coin]'); if (b) analyze(b.dataset.coin); });
  $('sig-quick').innerHTML = CONFIG.watchlist.map((c) => `<button type="button" class="chip-btn" data-coin="${esc(c)}">${esc(c.replace(/^xyz:/, ''))}</button>`).join('');
  $('sig-quick').addEventListener('click', (e) => { const b = e.target.closest('button[data-coin]'); if (b) analyze(b.dataset.coin); });
  $('sig-scan').addEventListener('click', scanWatchlist);
  $('sig-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-coin]');
    if (!b) return;
    const r = results.get(mode + '|' + b.dataset.coin);
    if (r) showDetail(r); else analyze(b.dataset.coin);
    $('sig-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  renderList();
}
