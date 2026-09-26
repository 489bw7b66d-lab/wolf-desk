// Markt-Blatt: öffnet sich beim Tippen auf eine Position oder einen Watchlist-Markt.
// Zeigt Live-Kurs, 24h, Chart in allen Zeitebenen und bei offener Position alle Positionsdaten inkl. Teilverkäufen.
import { accountRisk } from './core-positions.js';
import { getCandles } from './core-scanner.js';
import { tradeHistory, openTradeFor, change24h } from './core-trades.js';
import { chartSvg } from './ui-chart.js';
import { esc, TFL, CHART_TFS } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({});
let onAnalyze = () => {};
let coin = null, tf = '4h', timer = null, lastFocus = null;
const cache = new Map(); // "coin|tf" -> Kerzen

const pctTxt = (v, d = 2) => (v == null ? '–' : (v >= 0 ? '+' : '−') + f.pct(Math.abs(v), d));
const time = (t) => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function position(s) {
  return accountRisk(s)?.positions.find((p) => p.coin === coin) || null;
}

// Offene Take-Profit-Orders dieses Marktes (für Chartlinien)
function tpOrders(s, p) {
  if (!p) return [];
  return (s.account?.orders || []).filter((o) => o.coin === coin && /take profit/i.test(o.orderType || '') && Number(o.triggerPx) > 0)
    .map((o) => Number(o.triggerPx)).sort((a, b) => (p.side === 'long' ? a - b : b - a));
}

function renderLive() {
  if ($('sheet').hidden || !$('coin-view') || !coin) { clearInterval(timer); return; }
  const s = getState();
  const px = s.prices?.[coin], ts = s.priceTs?.[coin];
  const ch = change24h(px, s.prevDay?.[coin]);
  const fresh = ts && Date.now() - ts < 15000;
  $('coin-live').innerHTML = px ? `<div class="live-top"><span class="k">Live-Kurs</span><span class="meta ${fresh ? '' : 'lag'}">${fresh ? '● live' : 'verzögert'}</span></div>
    <div class="coin-px"><span class="live-px">${f.price(px)}</span><span class="chg ${ch == null ? 'muted' : ch >= 0 ? 'long' : 'short'}">${pctTxt(ch)} <small>24h</small></span></div>`
    : '<p class="empty">Noch kein Live-Kurs für diesen Markt.</p>';

  const p = position(s);
  if (p) {
    const trade = openTradeFor(tradeHistory(s.fills), coin);
    const roe = p.marginUsed > 0 ? (p.upnl / p.marginUsed) * 100 : null;
    $('coin-pos').innerHTML = `<div class="kv">
      <div><span class="k">Offener PnL</span><span class="v ${p.upnl >= 0 ? 'long' : 'short'}">${f.signedUsd(p.upnl)}</span></div>
      <div><span class="k">Auf Margin</span><span class="v ${roe >= 0 ? 'long' : 'short'}">${pctTxt(roe, 1)}</span></div>
      <div><span class="k">Einstieg</span><span class="v">${f.price(p.entry)}</span></div>
      <div><span class="k">Größe</span><span class="v">${f.size(p.size)}</span></div>
      <div><span class="k">Margin</span><span class="v">${f.usd(p.marginUsed)}</span></div>
      <div><span class="k">Hebel</span><span class="v">${f.lev(p.leverage)} ${p.leverageType}</span></div>
      <div><span class="k">Stop-Loss${p.stopSource ? ' (' + p.stopSource + ')' : ''}</span><span class="v short">${f.price(p.stop)}</span></div>
      <div><span class="k">Liquidation</span><span class="v">${f.price(p.liq)} <small class="muted">${f.pct(p.liqDist)}</small></span></div>
    </div>
    ${partials(trade)}`;
  } else $('coin-pos').innerHTML = '';

  const cs = cache.get(coin + '|' + tf);
  const box = $('coin-chart');
  if (cs) {
    const lines = p ? [
      { price: p.entry, col: 'var(--gold)', label: 'E ' + f.price(p.entry), dash: '2 2' },
      ...(p.stop ? [{ price: p.stop, col: 'var(--bad)', label: 'SL ' + f.price(p.stop), dash: '4 3' }] : []),
      ...tpOrders(s, p).map((x, i) => ({ price: x, col: 'var(--ok)', label: 'TP' + (i + 1), dash: '4 3', fit: i < 2 })),
      { price: p.liq, col: 'var(--bad)', label: 'Liq', dash: '1 3', fit: false },
    ] : [];
    box.innerHTML = chartSvg({ candles: cs, tf, price: px, lines });
  }
}

// Teilverkäufe des laufenden Trades mit Kurs und PnL
function partials(t) {
  if (!t) return '';
  const rows = t.exits.map((x, i) => `<div class="exit-row" role="row"><span><b>${i + 1}.</b></span><span>${f.price(x.px)}</span><span>${x.sharePct == null ? '–' : f.pct(x.sharePct, 0)}</span>
    <span class="${x.pnl >= 0 ? 'long' : 'short'}">${f.usdShort(x.pnl)}</span><span class="muted">${time(x.time)}</span></div>`).join('');
  return `<h3 class="sub-h">Bereits realisiert <small class="muted" style="font-weight:600">${t.partial ? 'ab Beginn der Daten' : 'seit Eröffnung ' + time(t.openedAt)}</small></h3>
    ${t.exits.length ? `<div class="exit part" role="table" aria-label="Teilverkäufe">
      <div class="exit-row head" role="row"><span>Nr.</span><span>Kurs</span><span>Anteil</span><span>PnL</span><span>Zeit</span></div>${rows}
      <div class="exit-row total" role="row"><span><b>Summe</b></span><span></span><span>${t.soldPct == null ? '' : f.pct(t.soldPct, 0)}</span><span class="${t.realized >= 0 ? 'long' : 'short'}"><b>${f.usdShort(t.realized)}</b></span><span></span></div>
    </div>` : `<p class="empty">Noch nichts verkauft. Gebühren bisher ${f.usd(t.fees)}.</p>`}`;
}

function loadChart() {
  const key = coin + '|' + tf;
  if (cache.has(key)) { renderLive(); return; }
  $('coin-chart').innerHTML = `<p class="empty">Lade ${TFL[tf]}-Kerzen …</p>`;
  const c = coin, t = tf;
  getCandles(c, t).then((cs) => { cache.set(c + '|' + t, cs.slice(-120)); if (coin === c && tf === t) renderLive(); })
    .catch(() => { if (coin === c && tf === t) $('coin-chart').innerHTML = '<p class="empty">Kerzen konnten nicht geladen werden.</p>'; });
}

export function openCoin(name) {
  if (!name) return;
  coin = name;
  const p = position(getState());
  tf = p ? '1h' : '4h';
  $('sheet-body').innerHTML = `<div id="coin-view">
    <div class="sheet-head">
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${esc(coin)}</h2>
      <span class="meta">${p ? 'Offene Position' : 'Markt'}</span></div>
      ${p ? `<span class="sig-badge ${p.side}">${p.side === 'long' ? 'LONG ▲' : 'SHORT ▼'}</span>` : ''}
    </div>
    <div id="coin-live" class="live-box" aria-live="polite"></div>
    <div class="chart-tfs" role="group" aria-label="Chart-Zeitebene">${CHART_TFS.map((t) => `<button type="button" data-ktf="${t}" aria-pressed="${t === tf}">${TFL[t]}</button>`).join('')}</div>
    <div id="coin-chart" class="chart-box"></div>
    <div id="coin-pos"></div>
    <div class="sheet-actions"><button type="button" id="coin-analyze" class="span-2">Signal analysieren</button></div>
  </div>`;
  lastFocus = document.activeElement;
  $('sheet').hidden = false;
  document.body.classList.add('no-scroll');
  $('sheet-body').closest('.sheet-panel').scrollTop = 0;
  loadChart();
  renderLive();
  clearInterval(timer);
  timer = setInterval(renderLive, 1000);
  $('sheet-close').focus();
}

export function initCoin(stateGetter, analyzeFn) {
  getState = stateGetter;
  onAnalyze = analyzeFn;
  $('sheet-body').addEventListener('click', (e) => {
    if (!$('coin-view')) return;
    const b = e.target.closest('button[data-ktf]');
    if (b) {
      tf = b.dataset.ktf;
      $('sheet-body').querySelectorAll('button[data-ktf]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ktf === tf)));
      loadChart();
      return;
    }
    if (e.target.id === 'coin-analyze') {
      const c = coin;
      clearInterval(timer);
      $('sheet').hidden = true;
      document.body.classList.remove('no-scroll');
      onAnalyze(c);
    }
  });
  $('sheet-close').addEventListener('click', () => { clearInterval(timer); lastFocus?.focus?.(); });
}
