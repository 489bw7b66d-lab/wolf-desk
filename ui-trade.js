// Trade-Karte: fertiger Plan mit Positionsgröße und Hebel-Empfehlung, von überall mit einem Tipp erreichbar.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { positionSize, maxLeverageForStop, recommendLeverage, exitPlan, maxFit, priceVsPlan, withEntry, leverageIssues } from './core-risk.js';
import { chartSvg } from './ui-chart.js';
import { switchStyle, getCandles } from './core-scanner.js';
import { badge, ladder, esc, topReasons, styleRow, exitTable, fitHint, TFL, CHART_TFS, seal, confirmsFor, levSlider, updateLevOut } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({});
let current = null, riskPct = null, lastFocus = null, liveTimer = null, basePlan = null;
let manualLev = null, chartTf = null; // manueller Hebel (null = Empfehlung), gewählter Chart-Timeframe
const RISKS = [5, 10, 15];
const extraCandles = new Map(); // "coin|tf" -> Kerzen für Zeitebenen außerhalb des Stils (werden bei Bedarf geladen)

function calc() {
  const s = getState(), p = current.plan;
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  const size = sum ? positionSize(sum.equity, riskPct, p.entry, p.stop) : null;
  const styleMax = CONFIG.signals.modes[current.mode]?.maxLeverage ?? CONFIG.rules.maxLeverage;
  const exchangeMax = s.maxLev?.[current.coin] || null;
  const cap = Math.min(CONFIG.rules.maxLeverage, styleMax, exchangeMax || Infinity);
  const maxLev = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, cap);
  const liqMax = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, 200);
  const rec = size ? recommendLeverage(size.notional, sum.available, maxLev, CONFIG.rules.marginBudgetPct) : null;
  const lev = manualLev ?? rec?.lev ?? null;
  const margin = size && lev ? size.notional / lev : null;
  const issues = manualLev ? leverageIssues(manualLev, { liqMax, exchangeMax, styleMax, margin, available: sum?.available }) : [];
  const exits = size ? exitPlan(p.dir, p.entry, p.tps, size.size, CONFIG.exitPlan) : null;
  const levCtx = size ? { notional: size.notional, available: sum.available, liqMax, exchangeMax, styleMax, budgetPct: CONFIG.rules.marginBudgetPct } : null;
  return { sum, size, maxLev, rec, cap, exits, lev, margin, issues, exchangeMax, styleMax, levCtx };
}

function planText() {
  const r = current, p = r.plan, { size, lev, margin, exits } = calc();
  return [
    `${r.coin} ${p.dir === 'long' ? 'LONG' : 'SHORT'} (${CONFIG.signals.modes[r.mode].label})`,
    p.liveEntry ? `Einstieg: ${f.price(p.entry)} (Live-Kurs)` : `Einstieg: ${f.price(p.zone[0])} – ${f.price(p.zone[1])}`,
    ...(exits ? exits.rows.map((x) => `${x.label} (${x.pct} % = ${f.usd(x.value)}): ${x.price != null ? f.price(x.price) : 'Trailing'}`) : p.tps.map((tp, i) => `TP${i + 1}: ${f.price(tp)}`)),
    `Stop-Loss: ${f.price(p.stop)}`,
    size ? `Größe: ${f.size(size.size)} (${riskPct} % Risiko = ${f.usd(size.riskAmt)})` : '',
    lev ? `Hebel: ${lev}×${manualLev ? ' (manuell)' : ''} · Margin: ${f.usd(margin)}` : '',
    `Runner: ${CONFIG.runnerNote}`,
  ].filter(Boolean).join('\n');
}

function render() {
  const r = current, p = r.plan;
  const { sum, size, maxLev, rec, cap, exits, lev, margin, exchangeMax, styleMax, levCtx } = calc();
  const riskState = riskPct >= CONFIG.rules.riskPerTradeMaxPct ? 'bad' : riskPct >= CONFIG.rules.riskPerTradeWarnPct ? 'warn' : 'ok';
  $('sheet-body').innerHTML = `
    <div class="sheet-head">
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${esc(r.coin)}</h2>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · Score ${r.total[p.dir]} · ${esc(p.entryMode)}</span></div>
      ${badge(p.dir)}
    </div>
    ${seal(r)}
    <div id="sheet-live" class="live-box" aria-live="polite"></div>
    <div class="chart-tfs" role="group" aria-label="Chart-Zeitebene">${CHART_TFS.map((tf) => `<button type="button" data-ctf="${tf}" aria-pressed="${tf === chartTf}">${TFL[tf]}</button>`).join('')}</div>
    <div id="sheet-chart" class="chart-box"></div>
    ${styleRow(r, CONFIG.signals.modes)}
    ${topReasons(r).length ? `<p class="reasons-line">${topReasons(r).map(esc).join(' · ')}</p>` : ''}
    ${p.liveEntry ? `<p class="plan-mode"><span class="chip">Einstieg = Live-Kurs ${f.price(p.entry)}</span></p>` : ''}
    ${ladder(p, size ? `<div class="lvl lvl-margin"><span class="dot" style="background:var(--gold)"></span><span class="lbl">Margin</span><span class="px" id="ladder-margin">${margin ? f.usd(margin) : 'Kapital reicht nicht'}</span><span class="pc muted" id="ladder-lev">${lev ? lev + '× · ' : ''}Position ${f.usd(size.notional)}</span></div>` : '')}
    <h3 class="sub-h">Risiko pro Trade</h3>
    <div class="tabs risk-chips" role="group" aria-label="Risiko pro Trade">
      ${RISKS.map((x) => `<button type="button" data-risk="${x}" aria-pressed="${x === riskPct}">${x} %</button>`).join('')}
    </div>
    ${RISKS.includes(riskPct) ? '' : `<p class="empty" style="margin:-6px 0 12px">Gewählt: ${String(riskPct).replace('.', ',')} % Risiko (angepasst an dein Kapital)</p>`}
    ${!sum ? '<p class="empty">Kontodaten fehlen, Größe nicht berechenbar.</p>' : `
    <div class="kv">
      <div class="span2"><span class="k">Positionsgröße</span><span class="v big" style="color:var(--gold)">${size ? f.size(size.size) : '–'}</span></div>
      <div><span class="k">Risiko</span><span class="v ${riskState === 'ok' ? '' : riskState === 'warn' ? 'warn-t' : 'short'}">${size ? f.usd(size.riskAmt) : '–'}</span></div>
      <div><span class="k">Positionswert</span><span class="v">${size ? f.usd(size.notional) : '–'}</span></div>
      <div class="span2"><span class="k">Margin (dein Einsatz)</span><span class="v big" id="sheet-margin" style="color:var(--gold)">${margin ? f.usd(margin) : '–'}</span></div>
    </div>
    ${levCtx ? levSlider(lev || Math.min(maxLev || 1, levCtx.exchangeMax || 50), rec?.lev || null, levCtx) : ''}
    <h3 class="sub-h">Ausstiegsplan</h3>
    ${exitTable(exits, CONFIG.runnerNote)}
    <p class="empty" style="margin-top:8px">Der Hebel ändert nur die Margin, Positionsgröße und Risiko bleiben gleich. Grenzen: ${CONFIG.signals.modes[r.mode]?.label || ''} ${styleMax}×${exchangeMax ? `, Hyperliquid ${exchangeMax}×` : ''}, Liquidation hinter dem Stop bis ca. ${f.lev(maxLev)}.</p>
    ${rec && !rec.lev && !manualLev ? `<p class="warnline">Für ${riskPct} % Risiko wären mind. ${rec.need}× nötig, möglich sind nur ca. ${maxLev}×.</p>${fitHint(maxFit(p.entry, p.stop, sum.available, maxLev, CONFIG.rules.marginBudgetPct), sum.equity, CONFIG.rules.marginBudgetPct)}` : ''}`}
    ${p.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}${w.price ? ` (${f.price(w.price)})` : ''}</p>`).join('')}
    <div class="sheet-actions">
      <button type="button" id="sheet-copy">Plan kopieren</button>
      <button type="button" id="sheet-full" class="ghost">Vollanalyse</button>
      <button type="button" id="sheet-calc" class="ghost span-2">Im Rechner anpassen</button>
    </div>
    <p class="empty" style="font-size:12px;margin-top:10px">Regelbasierter Vorschlag, keine Anlageberatung.</p>`;
}

// Live-Kurs-Box: aktualisiert sich jede Sekunde, ohne den Rest der Karte neu zu zeichnen
const LIVE_TEXT = {
  zone: () => 'Kurs liegt in der Einstiegszone',
  chasing: (d) => `Kurs ist ${f.pct(Math.abs(d), 2)} über die Zone hinaus gelaufen, Limit-Order in der Zone oder abwarten`,
  early: (d) => `Kurs ${f.pct(Math.abs(d), 2)} jenseits der Zone Richtung Stop, Setup wackelt`,
  invalid: () => 'Kurs hinter dem Stop-Loss, Setup ungültig',
};
function renderLive() {
  const box = $('sheet-live');
  if (!box || !current) return;
  const s = getState(), p = current.plan;
  const px = s.prices?.[current.coin], ts = s.priceTs?.[current.coin];
  const ch = $('sheet-chart');
  if (ch) {
    const cs = current.candles?.[chartTf] || extraCandles.get(current.coin + '|' + chartTf);
    if (cs) ch.innerHTML = chartSvg({ candles: cs, tf: chartTf, plan: p, price: px, events: current.events, confirms: confirmsFor(current) });
    else if (!ch.dataset.loading) {
      ch.dataset.loading = '1';
      ch.innerHTML = `<p class="empty">Lade ${TFL[chartTf]}-Kerzen …</p>`;
      const coin = current.coin, tf = chartTf;
      getCandles(coin, tf).then((c) => extraCandles.set(coin + '|' + tf, c.slice(-120)))
        .catch(() => { ch.innerHTML = '<p class="empty">Kerzen konnten nicht geladen werden.</p>'; })
        .finally(() => { delete ch.dataset.loading; });
    }
  }
  const age = ts ? Date.now() - ts : null;
  const pos = priceVsPlan(basePlan || p, px);
  const cls = pos ? { zone: 'ok', chasing: 'warn', early: 'warn', invalid: 'bad' }[pos.state] : 'warn';
  box.className = 'live-box ' + cls;
  box.innerHTML = px ? `<div class="live-top"><span class="k">Live-Kurs</span><span class="meta ${age != null && age < 15000 ? '' : 'lag'}">${age != null && age < 15000 ? '● live' : 'verzögert'}</span></div>
    <div class="live-px">${f.price(px)}</div>
    <p>${pos ? LIVE_TEXT[pos.state](pos.distPct) : ''}</p>
    ${p.liveEntry ? `<button type="button" class="small-btn ghost" id="live-reset">Zurück zum Zonen-Einstieg</button>`
      : pos && pos.state !== 'invalid' ? `<button type="button" class="small-btn" id="live-take">Live-Kurs als Einstieg</button>` : ''}`
    : '<p class="empty">Noch kein Live-Kurs für diesen Markt.</p>';
}

export function openTrade(result) {
  if (!result) return;
  // Kein Plan im gewählten Stil? Dann den besten Stil mit Plan nehmen
  if (!result.plan && result.best) result = switchStyle(result, result.best);
  if (!result?.plan) return;
  current = result;
  basePlan = result.plan;
  manualLev = null;
  chartTf = result.tfs?.[1] || null;
  if (!RISKS.includes(riskPct)) riskPct = CONFIG.rules.riskPerTradeWarnPct;
  render();
  lastFocus = document.activeElement;
  $('sheet').hidden = false;
  document.body.classList.add('no-scroll');
  renderLive();
  clearInterval(liveTimer);
  liveTimer = setInterval(renderLive, 1000);
  $('sheet-close').focus();
}

// Von außen neu zeichnen (z. B. nach Umschalten des Privatmodus)
export function refreshTrade() {
  if (!current || $('sheet').hidden || !$('sheet-live')) return;
  render(); renderLive();
}

export function closeTrade() {
  clearInterval(liveTimer);
  $('sheet').hidden = true;
  document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}

export function initTrade(stateGetter, onFull, onCalc) {
  getState = stateGetter;
  // Hebel-Regler: beim Ziehen nur Margin und Ampel aktualisieren
  $('sheet-body').addEventListener('input', (e) => {
    if (!e.target.classList.contains('lev-range')) return;
    manualLev = Number(e.target.value);
    const { levCtx } = calc();
    updateLevOut($('sheet-body'), manualLev, levCtx, (m) => {
      $('sheet-margin').textContent = f.usd(m);
      if ($('ladder-margin')) $('ladder-margin').textContent = f.usd(m);
      if ($('ladder-lev')) $('ladder-lev').textContent = `${manualLev}× · Position ${f.usd(levCtx.notional)}`;
    });
  });
  $('sheet-close').addEventListener('click', closeTrade);
  $('sheet').addEventListener('click', (e) => { if (e.target.classList.contains('sheet-backdrop')) closeTrade(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeTrade(); });
  $('sheet-body').addEventListener('click', async (e) => {
    const rb = e.target.closest('button[data-risk]');
    if (rb) { riskPct = Number(rb.dataset.risk); render(); return; }
    const rb2 = e.target.closest('button[data-lev-rec]');
    if (rb2) { manualLev = null; render(); renderLive(); return; }
    const cb = e.target.closest('button[data-ctf]');
    if (cb) {
      chartTf = cb.dataset.ctf;
      if ($('sheet-chart')) delete $('sheet-chart').dataset.loading;
      $('sheet-body').querySelectorAll('button[data-ctf]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ctf === chartTf)));
      renderLive(); return;
    }
    if (e.target.id === 'live-take') {
      const np = withEntry(basePlan, getState().prices?.[current.coin]);
      if (np) { current = { ...current, plan: np }; render(); renderLive(); }
      return;
    }
    if (e.target.id === 'live-reset') { current = { ...current, plan: basePlan }; render(); renderLive(); return; }
    const sb = e.target.closest('button[data-style]');
    if (sb) {
      const next = switchStyle(current, sb.dataset.style);
      if (next?.plan) { current = next; basePlan = next.plan; chartTf = next.tfs[1]; render(); renderLive(); }
      else if (next) { sb.classList.add('shake'); setTimeout(() => sb.classList.remove('shake'), 400); }
      return;
    }
    if (e.target.id === 'sheet-copy') {
      try { await navigator.clipboard.writeText(f.raw(planText)); e.target.textContent = 'Kopiert ✓'; }
      catch { e.target.textContent = 'Kopieren nicht möglich'; }
      setTimeout(() => { const b = $('sheet-copy'); if (b) b.textContent = 'Plan kopieren'; }, 2000);
    }
    if (e.target.id === 'sheet-full') { const r = current; closeTrade(); onFull(r); }
    if (e.target.id === 'sheet-calc') { const r = current; closeTrade(); onCalc(r); }
  });
}
