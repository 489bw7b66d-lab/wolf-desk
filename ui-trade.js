// Trade-Karte: fertiger Plan mit Positionsgröße und Hebel-Empfehlung, von überall mit einem Tipp erreichbar.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { positionSize, maxLeverageForStop, recommendLeverage, exitPlan, maxFit } from './core-risk.js';
import { switchStyle } from './core-scanner.js';
import { badge, ladder, esc, topReasons, styleRow, exitTable, fitHint } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({});
let current = null, riskPct = null, lastFocus = null;
const RISKS = [5, 10, 15];

function calc() {
  const s = getState(), p = current.plan;
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  const size = sum ? positionSize(sum.equity, riskPct, p.entry, p.stop) : null;
  const cap = Math.min(CONFIG.rules.maxLeverage, CONFIG.signals.modes[current.mode]?.maxLeverage ?? CONFIG.rules.maxLeverage);
  const maxLev = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, cap);
  const rec = size ? recommendLeverage(size.notional, sum.available, maxLev, CONFIG.rules.marginBudgetPct) : null;
  const exits = size ? exitPlan(p.dir, p.entry, p.tps, size.size, CONFIG.exitPlan) : null;
  return { sum, size, maxLev, rec, cap, exits };
}

function planText() {
  const r = current, p = r.plan, { size, rec, exits } = calc();
  return [
    `${r.coin} ${p.dir === 'long' ? 'LONG' : 'SHORT'} (${CONFIG.signals.modes[r.mode].label})`,
    `Einstieg: ${f.price(p.zone[0])} – ${f.price(p.zone[1])}`,
    `Stop: ${f.price(p.stop)}`,
    ...(exits ? exits.rows.map((x) => `${x.label} (${x.pct} %): ${x.price != null ? f.price(x.price) : 'Trailing'} · ${f.size(x.qty)} Stk.`) : p.tps.map((tp, i) => `TP${i + 1}: ${f.price(tp)}`)),
    size ? `Größe: ${f.size(size.size)} (${riskPct} % Risiko = ${f.usd(size.riskAmt)})` : '',
    rec?.lev ? `Hebel: ${rec.lev}× · Margin: ${f.usd(rec.margin)}` : '',
    `Runner: ${CONFIG.runnerNote}`,
  ].filter(Boolean).join('\n');
}

function render() {
  const r = current, p = r.plan;
  const { sum, size, maxLev, rec, cap, exits } = calc();
  const riskState = riskPct >= CONFIG.rules.riskPerTradeMaxPct ? 'bad' : riskPct >= CONFIG.rules.riskPerTradeWarnPct ? 'warn' : 'ok';
  $('sheet-body').innerHTML = `
    <div class="sheet-head">
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${esc(r.coin)}</h2>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · Score ${r.total[p.dir]} · ${esc(p.entryMode)}</span></div>
      ${badge(p.dir)}
    </div>
    ${styleRow(r, CONFIG.signals.modes)}
    ${topReasons(r).length ? `<p class="reasons-line">${topReasons(r).map(esc).join(' · ')}</p>` : ''}
    ${ladder(p)}
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
      <div><span class="k">Empfohlener Hebel</span><span class="v">${rec?.lev ? f.lev(rec.lev) : '–'}</span></div>
      <div><span class="k">Margin (dein Einsatz)</span><span class="v" style="color:var(--gold)">${rec?.lev ? f.usd(rec.margin) : '–'}</span></div>
    </div>
    <h3 class="sub-h">Ausstiegsplan</h3>
    ${exitTable(exits, CONFIG.runnerNote)}
    <p class="empty" style="margin-top:8px">${rec?.lev ? `Empfehlung nutzt ${f.pct(rec.budgetPct, 0)} deines verfügbaren Kapitals (${f.usd(sum.available)}). ` : ''}Möglich bis ca. ${f.lev(maxLev)} (Obergrenze ${CONFIG.signals.modes[r.mode]?.label || ''}: ${cap}×).</p>
    ${rec && !rec.lev ? `<p class="warnline">Für ${riskPct} % Risiko wären mind. ${rec.need}× nötig, möglich sind nur ca. ${maxLev}×.</p>${fitHint(maxFit(p.entry, p.stop, sum.available, maxLev, CONFIG.rules.marginBudgetPct), sum.equity, CONFIG.rules.marginBudgetPct)}` : ''}`}
    ${p.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}${w.price ? ` (${f.price(w.price)})` : ''}</p>`).join('')}
    <div class="sheet-actions">
      <button type="button" id="sheet-copy">Plan kopieren</button>
      <button type="button" id="sheet-full" class="ghost">Vollanalyse</button>
      <button type="button" id="sheet-calc" class="ghost span-2">Im Rechner anpassen</button>
    </div>
    <p class="empty" style="font-size:12px;margin-top:10px">Regelbasierter Vorschlag, keine Anlageberatung.</p>`;
}

export function openTrade(result) {
  if (!result) return;
  // Kein Plan im gewählten Stil? Dann den besten Stil mit Plan nehmen
  if (!result.plan && result.best) result = switchStyle(result, result.best);
  if (!result?.plan) return;
  current = result;
  if (!RISKS.includes(riskPct)) riskPct = CONFIG.rules.riskPerTradeWarnPct;
  render();
  lastFocus = document.activeElement;
  $('sheet').hidden = false;
  document.body.classList.add('no-scroll');
  $('sheet-close').focus();
}

export function closeTrade() {
  $('sheet').hidden = true;
  document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}

export function initTrade(stateGetter, onFull, onCalc) {
  getState = stateGetter;
  $('sheet-close').addEventListener('click', closeTrade);
  $('sheet').addEventListener('click', (e) => { if (e.target.classList.contains('sheet-backdrop')) closeTrade(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeTrade(); });
  $('sheet-body').addEventListener('click', async (e) => {
    const rb = e.target.closest('button[data-risk]');
    if (rb) { riskPct = Number(rb.dataset.risk); render(); return; }
    const sb = e.target.closest('button[data-style]');
    if (sb) {
      const next = switchStyle(current, sb.dataset.style);
      if (next?.plan) { current = next; render(); }
      else if (next) { sb.classList.add('shake'); setTimeout(() => sb.classList.remove('shake'), 400); }
      return;
    }
    if (e.target.id === 'sheet-copy') {
      try { await navigator.clipboard.writeText(planText()); e.target.textContent = 'Kopiert ✓'; }
      catch { e.target.textContent = 'Kopieren nicht möglich'; }
      setTimeout(() => { const b = $('sheet-copy'); if (b) b.textContent = 'Plan kopieren'; }, 2000);
    }
    if (e.target.id === 'sheet-full') { const r = current; closeTrade(); onFull(r); }
    if (e.target.id === 'sheet-calc') { const r = current; closeTrade(); onCalc(r); }
  });
}
