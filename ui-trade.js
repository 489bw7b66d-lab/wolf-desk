// Trade-Karte: fertiger Plan mit Positionsgröße und Hebel-Empfehlung, von überall mit einem Tipp erreichbar.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { positionSize, maxLeverageForStop, recommendLeverage } from './core-risk.js';
import { badge, ladder, esc, topReasons } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({});
let current = null, riskPct = null, lastFocus = null;
const RISKS = [5, 10, 15];

function calc() {
  const s = getState(), p = current.plan;
  const sum = s.account ? accountSummary(s.account, CONFIG.accountMode) : null;
  const size = sum ? positionSize(sum.equity, riskPct, p.entry, p.stop) : null;
  const maxLev = maxLeverageForStop(p.stopDistPct, CONFIG.rules.liqBufferPct, CONFIG.rules.maxLeverage);
  const rec = size ? recommendLeverage(size.notional, sum.available, maxLev, CONFIG.rules.marginBudgetPct) : null;
  return { sum, size, maxLev, rec };
}

function planText() {
  const r = current, p = r.plan, { size, rec } = calc();
  return [
    `${r.coin} ${p.dir === 'long' ? 'LONG' : 'SHORT'} (${CONFIG.signals.modes[r.mode].label})`,
    `Einstieg: ${f.price(p.zone[0])} – ${f.price(p.zone[1])}`,
    `Stop: ${f.price(p.stop)}`,
    `TP1: ${f.price(p.tps[0])} | TP2: ${f.price(p.tps[1])} | TP3: ${f.price(p.tps[2])}`,
    size ? `Größe: ${f.size(size.size)} (${riskPct} % Risiko = ${f.usd(size.riskAmt)})` : '',
    rec?.lev ? `Hebel: ${rec.lev}× (Margin ${f.usd(rec.margin)})` : '',
  ].filter(Boolean).join('\n');
}

function render() {
  const r = current, p = r.plan;
  const { sum, size, maxLev, rec } = calc();
  const riskState = riskPct >= CONFIG.rules.riskPerTradeMaxPct ? 'bad' : riskPct >= CONFIG.rules.riskPerTradeWarnPct ? 'warn' : 'ok';
  $('sheet-body').innerHTML = `
    <div class="sheet-head">
      <div><h2 id="sheet-title" class="coin" style="font-size:24px;margin:0">${esc(r.coin)}</h2>
      <span class="meta">${CONFIG.signals.modes[r.mode].label} · Score ${r.total[p.dir]} · ${esc(p.entryMode)}</span></div>
      ${badge(p.dir)}
    </div>
    ${topReasons(r).length ? `<p class="reasons-line">${topReasons(r).map(esc).join(' · ')}</p>` : ''}
    ${ladder(p)}
    <h3 class="sub-h">Risiko pro Trade</h3>
    <div class="tabs risk-chips" role="group" aria-label="Risiko pro Trade">
      ${RISKS.map((x) => `<button type="button" data-risk="${x}" aria-pressed="${x === riskPct}">${x} %</button>`).join('')}
    </div>
    ${!sum ? '<p class="empty">Kontodaten fehlen, Größe nicht berechenbar.</p>' : `
    <div class="kv">
      <div class="span2"><span class="k">Positionsgröße</span><span class="v big" style="color:var(--gold)">${size ? f.size(size.size) : '–'}</span></div>
      <div><span class="k">Risiko</span><span class="v ${riskState === 'ok' ? '' : riskState === 'warn' ? 'warn-t' : 'short'}">${size ? f.usd(size.riskAmt) : '–'}</span></div>
      <div><span class="k">Positionswert</span><span class="v">${size ? f.usd(size.notional) : '–'}</span></div>
      <div><span class="k">Empfohlener Hebel</span><span class="v">${rec?.lev ? f.lev(rec.lev) : '–'}</span></div>
      <div><span class="k">Nötige Margin</span><span class="v">${rec?.lev ? f.usd(rec.margin) : '–'}</span></div>
    </div>
    <p class="empty" style="margin-top:8px">${rec?.lev ? `Empfehlung nutzt ${f.pct(rec.budgetPct, 0)} deines verfügbaren Kapitals (${f.usd(sum.available)}). ` : ''}Möglich bis ca. ${f.lev(maxLev)}, darüber läge die Liquidation vor dem Stop.</p>
    ${rec && !rec.lev ? `<p class="warnline">Dafür wären mind. ${rec.need}× nötig, möglich sind nur ca. ${maxLev}×. Risiko senken.</p>` : ''}`}
    ${p.warnings.map((w) => `<p class="warnline" style="color:var(--warn)">${esc(w.text)}${w.price ? ` (${f.price(w.price)})` : ''}</p>`).join('')}
    <div class="sheet-actions">
      <button type="button" id="sheet-copy">Plan kopieren</button>
      <button type="button" id="sheet-full" class="ghost">Vollanalyse</button>
    </div>
    <p class="empty" style="font-size:12px;margin-top:10px">Regelbasierter Vorschlag, keine Anlageberatung.</p>`;
}

export function openTrade(result) {
  if (!result?.plan) return;
  current = result;
  riskPct = riskPct ?? CONFIG.rules.riskPerTradeWarnPct;
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

export function initTrade(stateGetter, onFull) {
  getState = stateGetter;
  $('sheet-close').addEventListener('click', closeTrade);
  $('sheet').addEventListener('click', (e) => { if (e.target.classList.contains('sheet-backdrop')) closeTrade(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeTrade(); });
  $('sheet-body').addEventListener('click', async (e) => {
    const rb = e.target.closest('button[data-risk]');
    if (rb) { riskPct = Number(rb.dataset.risk); render(); return; }
    if (e.target.id === 'sheet-copy') {
      try { await navigator.clipboard.writeText(planText()); e.target.textContent = 'Kopiert ✓'; }
      catch { e.target.textContent = 'Kopieren nicht möglich'; }
      setTimeout(() => { const b = $('sheet-copy'); if (b) b.textContent = 'Plan kopieren'; }, 2000);
    }
    if (e.target.id === 'sheet-full') { const r = current; closeTrade(); onFull(r); }
  });
}
