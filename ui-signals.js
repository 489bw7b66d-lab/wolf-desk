// Signalgeber-Anzeige: Modus, Marktauswahl, Detail-Analyse, Watchlist-Scan.
import { CONFIG } from './config.js';
import { analyzeMarket } from './core-scanner.js';
import { accountSummary } from './core-calc.js';
import { positionSize, maxLeverageForStop } from './core-risk.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIR = { long: ['LONG', 'long'], short: ['SHORT', 'short'], neutral: ['KEIN SIGNAL', 'muted'] };
const STACK = { bull: ['Bullisch', 'long'], bear: ['Bärisch', 'short'], mixed: ['Gemischt', 'muted'] };
const STRUCT = { up: ['Höhere Hochs', 'long'], down: ['Tiefere Tiefs', 'short'], range: ['Seitwärts', 'muted'] };
const TFL = { '5m': '5M', '15m': '15M', '1h': '1H', '4h': '4H', '1d': '1D' };

let mode = CONFIG.signals.defaultMode;
let getState = () => ({});
let onUsePlan = () => {};
let lastMarketsKey = '';
const results = new Map(); // "mode|coin" -> Ergebnis

const pctFrom = (from, to) => ((to - from) / from) * 100;
const signedPct = (v) => (v >= 0 ? '+' : '−') + f.pct(Math.abs(v), 2);

function badge(dir) {
  const [t, c] = DIR[dir];
  return `<span class="sig-badge ${c}">${t}${dir === 'long' ? ' ▲' : dir === 'short' ? ' ▼' : ''}</span>`;
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

function planBlock(r) {
  const p = r.plan;
  if (!p) {
    return `<p class="empty">Kein klares Setup: Long- oder Short-Score liegt unter ${CONFIG.signals.minScore} oder zu nah am Gegenwert (Abstand mind. ${CONFIG.signals.minGap}). Abwarten ist auch eine Position.</p>`;
  }
  const s = getState();
  const equity = s.account ? accountSummary(s.account, CONFIG.accountMode).equity : null;
  const size = positionSize(equity, CONFIG.rules.riskPerTradeWarnPct, p.entry, p.stop);
  const maxLev = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, CONFIG.rules.maxLeverage);
  const row = (label, price, cls, extra) => `<div class="lvl"><span class="dot" style="background:var(--${cls})"></span><span class="lbl">${label}</span><span class="px">${price}</span><span class="pc ${cls === 'gold' ? 'muted' : cls === 'ok' ? 'long' : 'short'}">${extra}</span></div>`;
  const levels = [
    row('Stop-Loss', f.price(p.stop), 'bad', signedPct(pctFrom(p.entry, p.stop))),
    row('Einstieg', `${f.price(p.zone[0])} – ${f.price(p.zone[1])}`, 'gold', 'Zone'),
    ...p.tps.map((tp, i) => row(`TP${i + 1}`, f.price(tp), 'ok', `${signedPct(pctFrom(p.entry, tp))} · ${i + 1}R`)),
  ];
  if (p.dir === 'long') levels.reverse();
  return `<div class="ladder">${levels.join('')}</div>
    <div class="kv" style="margin-top:14px">
      <div><span class="k">Stop-Abstand</span><span class="v">${f.pct(p.stopDistPct, 2)}</span></div>
      <div><span class="k">Hebel bis ca.</span><span class="v">${f.lev(maxLev)}</span></div>
      <div><span class="k">Größe bei ${CONFIG.rules.riskPerTradeWarnPct} % Risiko</span><span class="v">${size ? f.size(size.size) : '–'}</span></div>
      <div><span class="k">Risiko</span><span class="v">${size ? f.usd(size.riskAmt) : '–'}</span></div>
    </div>
    ${p.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}${w.price ? ` (${f.price(w.price)})` : ''}</p>`).join('')}
    <button type="button" class="wide" id="sig-use">In Rechner übernehmen</button>`;
}

function renderDetail(r) {
  const lv = r.levels;
  $('sig-detail').innerHTML = `<div class="sig-head">
      <div><div class="coin" style="font-size:22px">${esc(r.coin)}</div>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · letzte Kerze ${new Date(r.lastClose).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></div>
      ${badge(r.dir)}
    </div>
    ${scoreBars(r.total)}
    ${mtfTable(r)}
    <h3 class="sub-h">Trade-Plan (${TFL[r.tfs[1]]})</h3>
    ${planBlock(r)}
    ${r.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}</p>`).join('')}
    <h3 class="sub-h">Key Levels</h3>
    <div class="kv">
      <div><span class="k">Widerstände</span>${lv.resistance.map((p) => `<span class="v small">${f.price(p)}</span>`).join('') || '–'}</div>
      <div><span class="k">Unterstützungen</span>${lv.support.map((p) => `<span class="v small">${f.price(p)}</span>`).join('') || '–'}</div>
    </div>
    <p class="empty" style="margin-top:14px">Regelbasierte Auswertung abgeschlossener Kerzen, keine Anlageberatung. Ob die Regeln etwas taugen, zeigt erst das Backtesting.</p>`;
  const use = $('sig-use');
  if (use) use.addEventListener('click', () => onUsePlan(r.coin, r.plan.entry, r.plan.stop));
}

async function analyze(coin) {
  if (!coin) return;
  const key = mode + '|' + coin;
  $('sig-detail').innerHTML = `<p class="empty">Analysiere ${esc(coin)} auf ${CONFIG.signals.modes[mode].tfs.map((t) => TFL[t]).join(', ')} …</p>`;
  try {
    const r = await analyzeMarket(coin, mode);
    results.set(key, r);
    renderDetail(r);
    renderList();
  } catch (e) {
    $('sig-detail').innerHTML = `<p class="empty" style="color:var(--bad)">Analyse fehlgeschlagen: ${esc(e.message)}</p>`;
  }
}

function renderList() {
  $('sig-list').innerHTML = CONFIG.watchlist.map((c) => {
    const r = results.get(mode + '|' + c);
    return `<button type="button" class="sig-row" data-coin="${esc(c)}">
      <span class="sym">${esc(c)}</span>
      ${r ? `<span class="meta">L ${r.total.long} · S ${r.total.short}</span>${badge(r.dir)}` : '<span class="meta">noch nicht gescannt</span>'}
    </button>`;
  }).join('');
}

async function scanWatchlist() {
  const btn = $('sig-scan');
  btn.disabled = true;
  for (const [i, c] of CONFIG.watchlist.entries()) {
    btn.textContent = `Scanne ${i + 1} von ${CONFIG.watchlist.length} …`;
    try { results.set(mode + '|' + c, await analyzeMarket(c, mode)); } catch { /* einzelner Markt fehlgeschlagen */ }
    renderList();
  }
  btn.disabled = false;
  btn.textContent = 'Watchlist scannen';
}

export function initSignals(stateGetter, usePlan) {
  getState = stateGetter;
  onUsePlan = usePlan;
  const modes = CONFIG.signals.modes;
  $('sig-modes').innerHTML = Object.entries(modes).map(([k, m]) => `<button type="button" data-m="${k}" aria-pressed="${k === mode}">${m.label}<small>${m.tfs.map((t) => TFL[t]).join(' · ')}</small></button>`).join('');
  $('sig-modes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (!b) return;
    mode = b.dataset.m;
    $('sig-modes').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.m === mode)));
    renderList();
    const coin = $('sig-market').value;
    const r = results.get(mode + '|' + coin);
    if (r) renderDetail(r); else $('sig-detail').innerHTML = '<p class="empty">Markt wählen und „Analysieren“ tippen.</p>';
  });
  $('sig-go').addEventListener('click', () => analyze($('sig-market').value));
  $('sig-scan').addEventListener('click', scanWatchlist);
  $('sig-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-coin]');
    if (!b) return;
    const coin = b.dataset.coin;
    if ([...$('sig-market').options].some((o) => o.value === coin)) $('sig-market').value = coin;
    const r = results.get(mode + '|' + coin);
    if (r) renderDetail(r); else analyze(coin);
    $('sig-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  renderList();
}

// Marktauswahl füllen, sobald die Marktliste da ist (Watchlist zuerst, dann alle Märkte).
export function renderSignalMarkets(s) {
  const key = Object.values(s.markets).map((l) => l.length).join(',');
  if (key === lastMarketsKey || !key) return;
  lastMarketsKey = key;
  const sel = $('sig-market');
  const cur = sel.value;
  const group = (label, list) => `<optgroup label="${esc(label)}">${list.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</optgroup>`;
  sel.innerHTML = group('Watchlist', CONFIG.watchlist) + Object.entries(s.markets)
    .map(([dex, list]) => group(dex ? `Bereich ${dex}` : 'Krypto (Hauptbörse)', [...list].sort())).join('');
  sel.value = cur || CONFIG.watchlist[0];
}
