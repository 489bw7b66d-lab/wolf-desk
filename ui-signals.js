import { engine2 } from './core-engine2.js';
// Signale-Bereich: Suche, Modus, Detail-Analyse, Watchlist-Scan.
import { CONFIG } from './config.js';
import { getWatchlist } from './core-watchlist.js';
import { analyzeMarket, analyzeAllModes, switchStyle } from './core-scanner.js';
import { badge, ladder, esc, dn, TFL, styleRow, seal, confirmsFor, coinIcon, tipInline } from './ui-parts.js';
import * as f from './core-format.js';
import { accountSummary } from './core-calc.js';
import { recommendedFor, levTagText } from './core-levpreview.js';
import { drawChart, chartTools } from './ui-chartview.js';
import { getViews, viewFor as viewOf, viewLines } from './core-views.js';

let sigTf = null; // gewählte Zeitebene im Signalgeber-Chart

const $ = (id) => document.getElementById(id);
const STACK = { bull: ['Bullisch', 'long'], bear: ['Bärisch', 'short'], mixed: ['Gemischt', 'muted'] };
const STRUCT = { up: ['Höhere Hochs', 'long'], down: ['Tiefere Tiefs', 'short'], range: ['Seitwärts', 'muted'] };

let mode = CONFIG.signals.defaultMode;
let getState = () => ({});
let onTrade = () => {}, onCoin = () => {};
let shown = null;
const results = new Map(); // "mode|coin" -> Ergebnis

function allMarkets() {
  const m = getState().markets || {};
  return [...new Set([...getWatchlist(), ...Object.values(m).flat()])];
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

// Analyse als Blatt von unten (5e), wie Trade-Karte und Markt-Blatt
function openSheet(html) {
  const body = $('sheet-body');
  body.innerHTML = `<div id="sig-view">${html}</div>`;
  $('sheet').hidden = false;
  body.closest('.sheet-panel').scrollTop = 0;
  return $('sig-view');
}

// Engine 2 (7a): läuft zum Vergleich mit, meldet noch nichts nach Telegram
function e2Line(r) {
  let e;
  try { e = engine2(r.candles || {}, r.mode); } catch { return ''; }
  if (!e) return '';
  const crv = (x) => '1 : ' + x.toFixed(1).replace('.', ',');
  const txt = e.ok
    ? `<b class="${e.dir}">${e.dir === 'long' ? 'LONG' : 'SHORT'}</b> · Score ${e.score} · Auslöser ${esc(e.trigger)} · Chance/Risiko ${crv(e.crv)}`
    : `${esc(e.reason || 'kein Setup')}${e.watch ? ` · Zone ${f.price(e.watch.from)}–${f.price(e.watch.to)}` : ''}`;
  return `<p class="e2-line">🧭 Engine 2 (Test): ${txt} ${tipInline('Die neue Engine nach deinem Bauplan: Struktur, Fib-Zone, Umkehrpunkt-Regel und Chance/Risiko mind. 1 : 2 sind Pflicht. Sie läuft nur zum Vergleich mit. Telegram meldet weiter die alte Engine, bis Engine 2 im Backtest besser ist.', 'e2')}</p>`;
}

export function showDetail(r) {
  const hasPos = (getState?.()?.account?.positions || []).some((x) => x.coin === r.coin);
  shown = r;
  const lv = r.levels, p = r.plan;
  const lev = p ? levHint(r) : '';
  const view = openSheet(`<div class="sheet-head">
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${coinIcon(r.coin, 28)}${esc(dn(r.coin))}</h2>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · letzte Kerze ${new Date(r.lastClose).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></div>
      ${badge(r.dir)}
    </div>
    ${p ? `<p class="sig-quick">Score <b>${r.total[r.dir]}</b>${lev ? ` · <b class="gold">${esc(lev)}</b>` : ''}</p>` : ''}
    ${seal(r)}
    ${r.candles ? `<div class="chart-tfs" role="group" aria-label="Chart-Zeitebene">${r.tfs.filter((t) => r.candles[t]).map((t) => `<button type="button" data-stf="${t}" aria-pressed="${t === sigTfFor(r)}">${TFL[t]}</button>`).join('')}</div>
    <div id="sig-chart" class="chart-box"></div>
    ${chartTools('sig-chart', r.coin)}` : ''}
    ${styleRow(r, CONFIG.signals.modes)}
    ${e2Line(r)}
    ${hasPos ? `<p class="sig-note">Position in ${esc(dn(r.coin))} ist schon offen. Kein neues Signal (Ledger: eine Position pro Coin).</p>`
      : p ? `<button type="button" class="wide" id="sig-trade" style="margin:6px 0 16px">Trade-Karte öffnen</button>` : ''}
    <details class="sig-more"><summary>Details <span aria-hidden="true">▾</span></summary>
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
    <p class="empty" style="margin-top:14px">Regelbasierte Auswertung abgeschlossener Kerzen, keine Anlageberatung.</p>
    </details>`);
  drawSigChart(r);
  view.querySelectorAll('button[data-stf]').forEach((b) => b.addEventListener('click', () => {
    sigTf = b.dataset.stf;
    view.querySelectorAll('button[data-stf]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.stf === sigTf)));
    drawSigChart(r);
  }));
  $('sig-trade')?.addEventListener('click', () => onTrade(r));
  view.querySelectorAll('button[data-style]').forEach((b) => b.addEventListener('click', () => {
    const next = switchStyle(r, b.dataset.style);
    if (next) showDetail(next);
  }));
  $('sig-search').value = r.coin;
}

// Chart im Signalgeber: Setup-Zeitebene des Stils, Plan eingezeichnet, empfohlener Hebel unten links
const sigTfFor = (r) => (sigTf && r.candles?.[sigTf] ? sigTf : r.tfs[1]);
function levHint(r) {
  if (!r.plan) return '';
  const s = getState?.() || {};
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  const styleMax = CONFIG.signals.modes[r.mode]?.maxLeverage ?? CONFIG.rules.maxLeverage;
  const cap = Math.min(CONFIG.rules.maxLeverage, styleMax, s.maxLev?.[r.coin] || Infinity);
  return levTagText(recommendedFor(r.plan, { equity: sum?.equity, available: sum?.available, riskPct: CONFIG.rules.riskSteps?.[0] ?? 2, cap, bufferPct: CONFIG.rules.liqBufferPct, budgetPct: CONFIG.rules.marginBudgetPct, exchangeMax: s.maxLev?.[r.coin] || null }));
}
function drawSigChart(r) {
  const box = $('sig-chart'), tf = sigTfFor(r);
  if (!box || !r.candles?.[tf]) return;
  const px = getState?.()?.prices?.[r.coin];
  drawChart(box, { coin: r.coin, candles: r.candles[tf], tf, plan: r.plan, price: px, events: r.events, confirms: confirmsFor(r), lines: viewLines(viewOf(getViews(), r.coin)), levTag: levHint(r) });
}

export async function analyze(coin) {
  if (!coin) return;
  $('sig-suggest').innerHTML = '';
  $('sig-search').value = coin;
  $('sig-search').blur(); // Tastatur zu
  openSheet(`<div class="sheet-head"><div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${coinIcon(coin, 28)}${esc(dn(coin))}</h2><span class="meta">Analysiere alle drei Stile …</span></div></div><p class="empty">Einen Moment, die Kerzen werden geladen.</p>`);
  try {
    const r = await run(coin);
    results.set(mode + '|' + coin, r);
    if ($('sig-view')) showDetail(r); // Blatt inzwischen geschlossen? Dann nicht wieder öffnen
  } catch (e) {
    if ($('sig-view')) $('sig-view').innerHTML += `<p class="empty" style="color:var(--bad)">Analyse fehlgeschlagen: ${esc(e.message)}</p>`;
  }
}

const run = (coin, background = false) => (mode === 'auto' ? analyzeAllModes(coin, background) : analyzeMarket(coin, mode, background));

function renderSuggest() {
  const q = $('sig-search').value.trim().toUpperCase();
  if (!q) { $('sig-suggest').innerHTML = ''; return; }
  const hits = allMarkets().filter((n) => n.toUpperCase().includes(q))
    .sort((a, b) => (a.toUpperCase().replace(/^XYZ:/, '').startsWith(q) ? 0 : 1) - (b.toUpperCase().replace(/^XYZ:/, '').startsWith(q) ? 0 : 1)).slice(0, 8);
  $('sig-suggest').innerHTML = hits.length
    ? hits.map((n) => `<div class="suggest-row"><button type="button" class="suggest" data-coin="${esc(n)}">${coinIcon(n)}${esc(dn(n))}${n.includes(':') ? ` <small class="muted">${esc(n.split(':')[0])}</small>` : ''}</button></div>`).join('')
    : '<p class="empty">Kein Markt gefunden.</p>';
}

// Seit 6a entfernt: alte Schnellwahl und Watchlist-Liste im Signale-Tab (seit 5e unsichtbar).
// Die Exporte bleiben als leere Hüllen, damit main.js unverändert weiterläuft.
export function renderWatchLive() {}
export function autoScan() {}

export function initSignals(stateGetter, openTrade, openCoin) {
  getState = stateGetter;
  onTrade = openTrade; onCoin = openCoin;
  // 5e: immer „Auto“ (bester Stil); umschalten geht in der Analyse über die Stil-Zeile
  $('sig-search').addEventListener('input', renderSuggest);
  $('sig-search').addEventListener('focus', () => { $('sig-search').select(); });
  $('sig-search').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // Enter: genauer Treffer zuerst, sonst der erste Vorschlag
    const q = $('sig-search').value.trim().toUpperCase();
    const exact = allMarkets().find((n) => n.toUpperCase() === q || n.toUpperCase().replace(/^[A-Z]+:/, '') === q || n.toUpperCase().replace(/^K(?=[A-Z])/, '') === q);
    const first = $('sig-suggest').querySelector('button[data-coin]');
    if (exact) analyze(exact); else if (first) analyze(first.dataset.coin);
  });
  $('sig-suggest').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-coin]');
    if (b) analyze(b.dataset.coin);
  });

}
