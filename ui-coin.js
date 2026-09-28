// Markt-Blatt: öffnet sich beim Tippen auf eine Position oder einen Watchlist-Markt.
// Zeigt Live-Kurs, 24h, Chart in allen Zeitebenen und bei offener Position alle Positionsdaten inkl. Teilverkäufen.
import { accountRisk } from './core-positions.js';
import { getCandles } from './core-scanner.js';
import { tradeHistory, openTradeFor, change24h } from './core-trades.js';
import { fundingForTrade } from './core-fees.js';
import { getPlans, savePlan, planFor, signalFor, targetsFor, cleanTargets } from './core-plans.js';
import { getAutoPlan } from './core-autoplan.js';
import { getFeedSignals } from './ui-feed.js';
import { analyzeAllModes } from './core-scanner.js';
import { CONFIG } from './config.js';
import { chartSvg } from './ui-chart.js';
import { esc, dn, TFL, CHART_TFS } from './ui-parts.js';
import { getViews, viewFor, viewLines, BIAS_TXT } from './core-views.js';
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
    ${partials(trade)}${costLine(trade, s)}`;
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
    box.innerHTML = chartSvg({ coin, candles: cs, tf, price: px, lines: [...lines, ...viewLines(viewFor(getViews(), coin))] });
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
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${esc(dn(coin))}</h2>
      <span class="meta">${p ? 'Offene Position' : 'Markt'}</span></div>
      ${p ? `<span class="sig-badge ${p.side}">${p.side === 'long' ? 'LONG ▲' : 'SHORT ▼'}</span>` : ''}
    </div>
    ${viewSummary(coin)}
    <div id="coin-live" class="live-box" aria-live="polite"></div>
    <div class="chart-tfs" role="group" aria-label="Chart-Zeitebene">${CHART_TFS.map((t) => `<button type="button" data-ktf="${t}" aria-pressed="${t === tf}">${TFL[t]}</button>`).join('')}</div>
    <div id="coin-chart" class="chart-box"></div>
    <div id="coin-pos"></div>
    <div id="coin-plan"></div>
    <div class="sheet-actions"><button type="button" id="coin-analyze" class="span-2">Signal analysieren</button></div>
  </div>`;
  lastFocus = document.activeElement;
  $('sheet').hidden = false;
  document.body.classList.add('no-scroll');
  $('sheet-body').closest('.sheet-panel').scrollTop = 0;
  loadChart();
  renderLive();
  renderPlan();
  // Der automatische Plan wird im Hintergrund berechnet: kurz danach neu zeichnen
  [3000, 8000, 15000].forEach((ms) => setTimeout(() => { if (!planEdit && $('coin-plan') && coin === name) renderPlan(); }, ms));
  clearInterval(timer);
  timer = setInterval(renderLive, 1000);
  $('sheet-close').focus();
}

export function initCoin(stateGetter, analyzeFn) {
  getState = stateGetter;
  planClicks();
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

// Deine Einschätzung zu diesem Markt (falls vorhanden)
function viewSummary(c) {
  const v = viewFor(getViews(), c);
  if (!v) return '';
  const long = v.bias !== 'short';
  const lv = [v.invalid != null ? `ungültig ${long ? 'unter' : 'über'} ${f.price(v.invalid)}` : '', v.trigger != null ? `bestätigt ${long ? 'über' : 'unter'} ${f.price(v.trigger)}` : '', v.targets?.length ? `Ziele ${v.targets.map((t) => f.price(t)).join(' / ')}` : ''].filter(Boolean).join(' · ');
  return `<div class="view-box"><b>Deine Einschätzung: ${BIAS_TXT[v.bias]}</b><div class="meta">${esc(lv)}${v.note ? ' · ' + esc(v.note) : ''}</div></div>`;
}

// Kosten dieses Trades bisher: Gebühren und Funding
function costLine(t, s) {
  if (!t) return '';
  const fund = s.funding ? fundingForTrade(t, s.funding) : null;
  return `<p class="empty" style="font-size:12.5px;margin:8px 0 0">Kosten bisher: Gebühren ${f.usd(t.fees)}${fund == null ? '' : ` · Funding ${f.signedUsd(fund)}`}</p>`;
}

// ===== Ziele für diesen Trade (für manuelles Schließen an den TPs) =====
let planEdit = false, planMsg = '';
function planCtx() {
  const s = getState(), p = position(s);
  if (!p) return null;
  const t = openTradeFor(tradeHistory(s.fills), coin);
  const plan = planFor(getPlans(), coin, p.side, t?.openedAt);
  const signal = signalFor(getFeedSignals(), coin, p.side, t?.openedAt);
  const auto = t?.partial ? null : getAutoPlan(coin, p.side, p.entry, t?.openedAt);
  return { p, t, plan, signal, auto, targets: targetsFor({ plan, signal, auto }) };
}

function renderPlan() {
  const box = $('coin-plan');
  if (!box) return;
  const c = planCtx();
  if (!c) { box.innerHTML = ''; return; }
  const { p, plan, signal, targets } = c;
  const long = p.side === 'long';
  const n = CONFIG.exitPlan.filter((x) => /^TP\d/.test(x.label) && x.pct > 0).length;
  const rel = (x) => `${((x - p.entry) / p.entry * 100 * (long ? 1 : -1)) >= 0 ? '+' : '−'}${f.pct(Math.abs((x - p.entry) / p.entry * 100), 1)}`;
  if (planEdit) {
    const cur = targets?.tps || [];
    box.innerHTML = `<h3 class="sub-h">Ziele selbst eintragen</h3>
      <div class="view-form">${[0, 1, 2, 3].map((i) => `<label class="vf"><span>TP${i + 1}${i >= n ? ' (0 % im Plan)' : ''}</span><input id="pl-tp${i}" type="text" inputmode="decimal" value="${cur[i] != null ? String(cur[i]).replace('.', ',') : ''}" placeholder="${long ? 'über' : 'unter'} ${f.price(p.entry)}"></label>`).join('')}
      <div class="set-actions"><button type="button" id="pl-save">Speichern</button><button type="button" id="pl-cancel" class="ghost">Abbrechen</button></div></div>`;
    return;
  }
  box.innerHTML = `<h3 class="sub-h">Ziele für diesen Trade</h3>
    ${targets ? `<div class="plan-list">${targets.tps.slice(0, n).map((x, i) => `<div><span>${i === Math.min(n, targets.tps.length) - 1 ? '🏁 ' : ''}TP${i + 1}</span><b>${f.price(x)}</b><small class="long">${rel(x)}</small></div>`).join('')}</div>
      <p class="meta" style="font-size:12px;margin:6px 0 0">Ziele ${esc(targets.label)}${targets.stop != null ? ` · Plan-SL ${f.price(targets.stop)}` : ''}.</p>`
      : '<p class="empty" style="margin:0">Der automatische Plan wird gerade berechnet … Ohne ihn nutzt der Trade-Weg deine Take-Profit-Orders bei Hyperliquid.</p>'}
    ${planMsg ? `<p class="meta" style="color:var(--gold);font-size:12.5px">${esc(planMsg)}</p>` : ''}
    <div class="set-actions">
      ${signal && targets?.source !== 'signal' ? '<button type="button" id="pl-signal" class="ghost">Aus Telegram-Signal übernehmen</button>' : ''}
      <button type="button" id="pl-analyse" class="ghost">Aus aktueller Analyse übernehmen</button>
      <button type="button" id="pl-edit" class="ghost">Selbst eintragen</button>
      ${plan ? '<button type="button" id="pl-clear" class="ghost">Eigene Ziele entfernen</button>' : ''}
    </div>
    <p class="empty" style="font-size:12px;margin-top:6px">Damit der Wächter dich beim Erreichen eines Ziels erinnert: ⚙️ → „Für den Wächter übernehmen“ und my-settings.js hochladen. Ziele aus Telegram-Signalen kennt er von selbst.</p>`;
}

function storePlan(tps, source) {
  const c = planCtx();
  if (!c) return;
  savePlan(coin, { side: c.p.side, openedAt: c.t?.openedAt || null, entry: c.p.entry, tps, source, at: Date.now() });
  planEdit = false; planMsg = 'Gespeichert.';
  renderPlan(); renderLive();
}

function planClicks() {
$('sheet-body').addEventListener('click', async (e) => {
  if (!$('coin-plan') || !e.target.closest('#coin-plan')) return;
  const id = e.target.id, c = planCtx();
  if (!c) return;
  planMsg = '';
  if (id === 'pl-signal' && c.signal) storePlan(c.signal.tps, 'signal');
  if (id === 'pl-edit') { planEdit = true; renderPlan(); }
  if (id === 'pl-cancel') { planEdit = false; renderPlan(); }
  if (id === 'pl-clear') { savePlan(coin, null); renderPlan(); renderLive(); }
  if (id === 'pl-save') {
    const tps = cleanTargets([0, 1, 2, 3].map((i) => $('pl-tp' + i).value), c.p.side, c.p.entry);
    if (!tps.length) { planMsg = `Bitte mindestens ein Ziel ${c.p.side === 'long' ? 'über' : 'unter'} dem Einstieg eintragen.`; planEdit = false; renderPlan(); return; }
    storePlan(tps, 'manuell');
  }
  if (id === 'pl-analyse') {
    e.target.textContent = 'Analysiere …'; e.target.disabled = true;
    try {
      const r = await analyzeAllModes(coin);
      const cand = [r.all?.[r.best], ...Object.values(r.all || {})].find((x) => x?.plan?.dir === c.p.side);
      if (cand) storePlan(cand.plan.tps, 'analyse');
      else { planMsg = 'Die aktuelle Analyse sieht gerade kein Setup in deiner Richtung. Trag die Ziele selbst ein.'; renderPlan(); }
    } catch { planMsg = 'Analyse gerade nicht möglich.'; renderPlan(); }
  }
});
}
