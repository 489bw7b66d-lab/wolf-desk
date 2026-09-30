// Trade-Karte: fertiger Plan mit Positionsgröße und Hebel-Empfehlung, von überall mit einem Tipp erreichbar.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { positionSize, maxLeverageForStop, recommendLeverage, exitPlan, maxFit, priceVsPlan, withEntry, leverageIssues } from './core-risk.js';
import { drawChart, chartTools } from './ui-chartview.js';
import { switchStyle, getCandles } from './core-scanner.js';
import { getViews, viewFor, alignment, viewLines, BIAS_TXT } from './core-views.js';
import { estimateFees, DEFAULT_RATES } from './core-fees.js';
import { stopNoise, suggestImpact, cooldown, cooledRisk, leftText, planWithStop, planOrigStop } from './core-guard.js';
import { tradeHistory } from './core-trades.js';
import { badge, ladder, esc, dn, viewMark, topReasons, styleRow, exitTable, fitHint, TFL, CHART_TFS, seal, confirmsFor, levSlider, updateLevOut, tipInline, coinIcon } from './ui-parts.js';
import { ago } from './ui-feed.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({});
let current = null, riskPct = null, lastFocus = null, liveTimer = null, basePlan = null;
let signalBase = null;
let adoptStop = null; // übernommener Stop-Vorschlag (5f) // Trade-Karte aus einem gemeldeten Signal: zum Zurückschalten auf dessen Stil
let manualLev = null, chartTf = null; // manueller Hebel (null = Empfehlung), gewählter Chart-Timeframe
const RISKS = () => CONFIG.rules.riskSteps; // Risiko-Stufen aus den Einstellungen
const extraCandles = new Map(); // "coin|tf" -> Kerzen für Zeitebenen außerhalb des Stils (werden bei Bedarf geladen)

function calc() {
  const s = getState(), p = current.plan;
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  const size = sum ? positionSize(sum.equity, riskPct, p.entry, p.stop) : null;
  const styleMax = CONFIG.signals.modes[current.mode]?.maxLeverage ?? CONFIG.rules.maxLeverage;
  const exchangeMax = s.maxLev?.[current.coin] || null;
  const cap = Math.min(CONFIG.rules.maxLeverage, styleMax, exchangeMax || Infinity);
  const maxLev = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, cap, exchangeMax);
  const liqMax = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, 200, exchangeMax);
  const rec = size ? recommendLeverage(size.notional, sum.available, maxLev, CONFIG.rules.marginBudgetPct) : null;
  const lev = manualLev ?? rec?.lev ?? null;
  const margin = size && lev ? size.notional / lev : null;
  const issues = manualLev ? leverageIssues(manualLev, { liqMax, exchangeMax, styleMax, margin, available: sum?.available }) : [];
  const exits = size ? exitPlan(p.dir, p.entry, p.tps, size.size, CONFIG.exitPlan) : null;
  const note = `Der Hebel ändert nur die Margin, Positionsgröße und Risiko bleiben gleich. Grenzen: ${CONFIG.signals.modes[current.mode]?.label || ''} ${styleMax}×${exchangeMax ? `, Hyperliquid ${exchangeMax}×` : ''}, Liquidation hinter dem Stop bis ca. ${f.lev(maxLev)}. Der Balken zeigt, wo die Liquidation bei diesem Hebel ungefähr liegt.`;
  const levCtx = size ? { notional: size.notional, available: sum.available, liqMax, exchangeMax, styleMax, budgetPct: CONFIG.rules.marginBudgetPct,
    plan: { dir: p.dir, entry: p.entry, stop: p.stop, tps: p.tps }, bufferPct: CONFIG.rules.liqBufferPct, note } : null;
  return { sum, size, maxLev, rec, cap, exits, lev, margin, issues, exchangeMax, styleMax, levCtx };
}

function planText() {
  const r = current, p = r.plan, { size, lev, margin, exits } = calc();
  return [
    `${dn(r.coin)} ${p.dir === 'long' ? 'LONG' : 'SHORT'} (${CONFIG.signals.modes[r.mode].label})`,
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
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${coinIcon(r.coin, 28)}${esc(dn(r.coin))}</h2>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · Score ${r.total[p.dir]} · ${r.fromSignal ? `Signal ${ago(r.fromSignal.at)}` : esc(p.entryMode)}</span></div>
      ${badge(p.dir)}
    </div>
    ${sum && sum.equity > 0 && (sum.available / sum.equity) * 100 < (CONFIG.rules.freeCapitalMinPct ?? 2)
      ? `<p class="cap-note bad">Kein Kapital frei (${f.pct(Math.max(0, (sum.available / sum.equity) * 100), 1)}). Dieser Plan ist nur zur Beobachtung, erst eine Position schließen oder verkleinern.</p>` : ''}
    ${coolBox()}
    ${r.fromSignal && ['gedreht', 'weg'].includes(r.fromSignal.check.state) ? `<p class="sig-note">${esc(r.fromSignal.check.text)}</p>` : ''}
    ${seal(r)}
    ${viewBox(r)}
    <div id="sheet-live" class="live-box" aria-live="polite"></div>
    <div class="chart-tfs" role="group" aria-label="Chart-Zeitebene">${CHART_TFS.map((tf) => `<button type="button" data-ctf="${tf}" aria-pressed="${tf === chartTf}">${TFL[tf]}</button>`).join('')}</div>
    <div id="sheet-chart" class="chart-box"></div>
    ${chartTools('sheet-chart', r.coin)}
    ${styleRow(r, CONFIG.signals.modes, !!r.fromSignal)}
    ${topReasons(r).length ? `<p class="reasons-line">${topReasons(r).map(esc).join(' · ')}</p>` : ''}
    ${p.liveEntry ? `<p class="plan-mode"><span class="chip">Einstieg = Live-Kurs ${f.price(p.entry)}</span></p>` : ''}
    ${ladder(p, size ? `<div class="lvl lvl-margin"><span class="dot" style="background:var(--gold)"></span><span class="lbl">Margin</span><span class="px" id="ladder-margin">${margin ? f.usd(margin) : 'Kapital reicht nicht'}</span><span class="pc muted" id="ladder-lev">${lev ? lev + '× · ' : ''}Position ${f.usd(size.notional)}</span></div>` : '')}
    ${stopBox(r, p, sum, size)}
    <h3 class="sub-h">Risiko pro Trade</h3>
    <div class="tabs risk-chips" role="group" aria-label="Risiko pro Trade">
      ${RISKS().map((x) => `<button type="button" data-risk="${x}" aria-pressed="${x === riskPct}">${x} %</button>`).join('')}
    </div>
    ${RISKS().includes(riskPct) ? '' : `<p class="empty" style="margin:-6px 0 12px">Gewählt: ${String(riskPct).replace('.', ',')} % Risiko (angepasst an dein Kapital)</p>`}
    ${!sum ? '<p class="empty">Kontodaten fehlen, Größe nicht berechenbar.</p>' : `
    <div class="kv">
      <div class="span2"><span class="k">Positionsgröße</span><span class="v big" style="color:var(--gold)">${size ? f.size(size.size) : '–'}</span></div>
      <div><span class="k">Risiko</span><span class="v ${riskState === 'ok' ? '' : riskState === 'warn' ? 'warn-t' : 'short'}">${size ? f.usd(size.riskAmt) : '–'}</span></div>
      <div><span class="k">Positionswert</span><span class="v">${size ? f.usd(size.notional) : '–'}</span></div>
      <div class="span2"><span class="k">Margin (dein Einsatz)</span><span class="v big" id="sheet-margin" style="color:var(--gold)">${margin ? f.usd(margin) : '–'}</span></div>
      ${feeRow(size)}
    </div>
    ${levCtx ? levSlider(lev || Math.min(maxLev || 1, levCtx.exchangeMax || 50), rec?.lev || null, levCtx) : ''}
    <h3 class="sub-h">Ausstiegsplan</h3>
    ${exitTable(exits, CONFIG.runnerNote)}
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
    if (cs) drawChart(ch, { coin: current.coin, candles: cs, tf: chartTf, plan: p, price: px, events: current.events, confirms: confirmsFor(current), lines: viewLines(viewFor(getViews(), current.coin)) });
    else if (!ch.dataset.loading) {
      ch.dataset.loading = '1';
      ch.innerHTML = `<p class="empty">Lade ${TFL[chartTf]}-Kerzen …</p>`;
      const coin = current.coin, tf = chartTf;
      getCandles(coin, tf).then((c) => extraCandles.set(coin + '|' + tf, c.slice(-300)))
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
  adoptStop = null;
  signalBase = result.fromSignal ? result : null;
  manualLev = null;
  chartTf = result.tfs?.[1] || null;
  const cd = cooldown(tradeHistory(getState().fills));
  if (cd.active) riskPct = cooledRisk(RISKS()[0], true);
  else if (!RISKS().includes(riskPct)) riskPct = RISKS()[0];
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
    if ($('sig-view')) return; // Signalgeber-Blatt hat eigene Knöpfe (u. a. Stil-Zeile)
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
    // Stop wählen: Plan-Stop oder Vorschlag (ATR); gilt auch nach „Live-Kurs als Einstieg“
    const sp = e.target.closest('button[data-stop]');
    if (sp) {
      const p = current.plan;
      if (sp.dataset.stop === 'sug' && !p.stopAdjusted) {
        const n = stopNoise(p.entry, p.stop, current.analyses?.[1]?.atr);
        if (n?.suggest) { adoptStop = n.suggest.stop; current = { ...current, plan: planWithStop(p, adoptStop) }; }
      } else if (sp.dataset.stop === 'orig' && p.stopAdjusted) {
        adoptStop = null; current = { ...current, plan: planOrigStop(p) };
      }
      render(); renderLive(); return;
    }
    if (e.target.id === 'live-take') {
      let np = withEntry(adoptStop ? planWithStop(basePlan, adoptStop) : basePlan, getState().prices?.[current.coin]);
      if (np && adoptStop) np = { ...np, stopAdjusted: true };
      if (np) { current = { ...current, plan: np }; render(); renderLive(); }
      return;
    }
    if (e.target.id === 'live-reset') { current = { ...current, plan: adoptStop ? planWithStop(basePlan, adoptStop) : basePlan }; render(); renderLive(); return; }
    const sb = e.target.closest('button[data-style]');
    if (sb) {
      // Zurück auf den Stil des gemeldeten Signals = wieder dessen Plan
      const next = signalBase && sb.dataset.style === signalBase.mode ? signalBase : switchStyle(current, sb.dataset.style);
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

// Deine Einschätzung zu diesem Markt, direkt unter dem Kopf der Trade-Karte
export function viewBox(r) {
  const v = viewFor(getViews(), r.coin);
  if (!v) return '';
  const al = alignment(v, r.plan?.dir || r.dir);
  const long = v.bias !== 'short';
  const lv = [v.invalid != null ? `ungültig ${long ? 'unter' : 'über'} ${f.price(v.invalid)}` : '', v.trigger != null ? `bestätigt ${long ? 'über' : 'unter'} ${f.price(v.trigger)}` : ''].filter(Boolean).join(' · ');
  return `<div class="view-box ${al || ''}">${viewMark(al, true) || '<b>Deine Einschätzung</b>'}
    <div class="meta">${BIAS_TXT[v.bias]}${lv ? ' · ' + esc(lv) : ''}${v.note ? ' · ' + esc(v.note) : ''}</div></div>`;
}

// Geschätzte Handelsgebühren für Ein- und Ausstieg mit deinem echten Satz (Market/Stop = Taker)
function feeRow(size) {
  const rates = getState().rates || { ...DEFAULT_RATES, known: false };
  const est = size && estimateFees(size.notional, rates);
  if (!est) return '';
  const pct = (r) => f.pct(r * 100, 3);
  return `<div class="span2"><span class="k">Gebühren Ein- und Ausstieg (geschätzt)</span>
    <span class="v">${f.usd(est.taker)} <small class="muted" style="font-size:12px;font-weight:600">· mit Limit-Orders ${f.usd(est.maker)}</small> ${tipInline(`Market-Order und Stop zahlen den Taker-Satz, Limit-Orders den Maker-Satz. ${rates.known ? 'Dein Satz' : 'Standardsatz'}: Taker ${pct(rates.taker)}, Maker ${pct(rates.maker)}.`)}</span></div>`;
}

// Abkühlphase nach Verlustserie: Hinweis ganz oben
export function coolBox() {
  const cd = cooldown(tradeHistory(getState().fills));
  if (!cd.active) return '';
  return `<p class="cap-note bad">🧊 Abkühlphase: ${cd.streak} Verlust-Trades in Folge. Noch ${leftText(cd.until)}. Risiko-Vorschlag halbiert, lieber abwarten als nachlegen.</p>`;
}

// Stop-Check gegen die normale Schwankung (ATR der Setup-Zeitebene)
export function stopBox(r, p, sum, size) {
  const a = r.analyses?.[1]?.atr;
  // Prüfung immer gegen den ursprünglichen Stop, damit die Wahl zwischen beiden sichtbar bleibt (5f)
  const orig = p.stopAdjusted ? p.origStop : p.stop;
  const n = stopNoise(p.entry, orig, a);
  if (!n) return '';
  if (n.status === 'ok' && !p.stopAdjusted) return `<p class="stop-check ok">✓ ${esc(n.text)}</p>`;
  const sug = n.suggest?.stop ?? p.stop;
  const imp = n.suggest && sum ? suggestImpact(sum.equity, riskPct, p.entry, orig, sug) : null;
  const pick = `<div class="stop-pick" role="group" aria-label="Stop wählen">
      <button type="button" data-stop="orig" aria-pressed="${!p.stopAdjusted}">${!p.stopAdjusted ? '✓ ' : ''}Plan-Stop<b>${f.price(orig)}</b></button>
      <button type="button" data-stop="sug" aria-pressed="${!!p.stopAdjusted}">${p.stopAdjusted ? '✓ ' : ''}Vorschlag<b>${f.price(sug)}</b></button>
    </div>`;
  return `<div class="stop-check ${p.stopAdjusted ? 'ok' : n.status}"><b>${p.stopAdjusted ? '✓ Vorgeschlagener Stop übernommen' : (n.status === 'bad' ? '⚠️ ' : '') + esc(n.text)}</b>
    ${n.suggest ? `<span>Vorschlag: ${String(n.suggest.atrMult).replace('.', ',')}× ATR, ${f.pct(n.suggest.distPct, 1)} Abstand${imp ? `. Bei gleichem Risiko wird die Position ${f.pct((1 - imp.factor) * 100, 0)} kleiner, du brauchst also weniger Hebel.` : ''}</span>` : ''}
    ${n.suggest ? pick : ''}</div>`;
}
