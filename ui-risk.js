// Risiko-Modul: Regel-Check, manuelle Stop-Losses, Positionsgrößen-Rechner.
import { CONFIG } from './config.js';
import { accountRisk } from './core-positions.js';
import { positionSize } from './core-risk.js';
import { setManualStop, getManualStop } from './core-stops.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LABEL = { ok: 'OK', warn: 'Achtung', bad: 'Verstoß' };
// Versteht 2.534,1 (deutsch) und 2534.1 (englisch)
const parse = (v) => {
  let s = String(v || '').trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function checkRow(c) {
  return `<div class="hrow"><span class="dot r-${c.status}"></span><span class="label"><b>${esc(c.rule)}</b><br><span class="meta">${esc(c.text)}</span></span><span class="tag rt-${c.status}">${LABEL[c.status]}</span></div>`;
}

let getState = () => ({});
let lastStopKey = '', lastCalcKey = '';

function fillSelect(el, coins, key, keyRef) {
  if (key === keyRef) return keyRef;
  const current = el.value;
  el.innerHTML = coins.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (coins.includes(current)) el.value = current;
  return key;
}

function renderCalc() {
  const s = getState();
  const r = accountRisk(s);
  const out = $('calc-out');
  const equity = r?.summary.equity;
  const res = positionSize(equity, parse($('calc-risk').value), parse($('calc-entry').value), parse($('calc-stop').value));
  if (!equity) { out.innerHTML = '<p class="empty">Kontodaten fehlen noch.</p>'; return; }
  if (!res) { out.innerHTML = `<p class="empty">Einstieg und Stop-Loss eintragen. Rechenbasis: Kontowert ${f.usd(equity)}.</p>`; return; }
  const minLev = r.summary.available > 0 ? res.notional / r.summary.available : null;
  const riskPct = parse($('calc-risk').value);
  const st = riskPct >= CONFIG.rules.riskPerTradeMaxPct ? 'bad' : riskPct >= CONFIG.rules.riskPerTradeWarnPct ? 'warn' : 'ok';
  out.innerHTML = `<div class="kv">
    <div class="span2"><span class="k">Positionsgröße</span><span class="v big" style="color:var(--gold)">${f.size(res.size)}</span></div>
    <div><span class="k">Risiko</span><span class="v">${f.usd(res.riskAmt)}</span></div>
    <div><span class="k">Positionswert</span><span class="v">${f.usd(res.notional)}</span></div>
    <div><span class="k">Stop-Abstand</span><span class="v">${f.pct(res.stopDistPct, 2)}</span></div>
    <div><span class="k">Mindesthebel</span><span class="v">${f.lev(minLev)}</span></div>
  </div>
  ${minLev > CONFIG.rules.maxLeverage ? `<p class="warnline">Dafür wären mehr als ${CONFIG.rules.maxLeverage}× nötig, das verfügbare Kapital reicht nicht.</p>` : ''}
  ${st !== 'ok' ? `<p class="warnline" style="color:${st === 'bad' ? 'var(--bad)' : 'var(--warn)'}">${riskPct} % Risiko liegt ${st === 'bad' ? 'über deinem Maximum' : 'im Warnbereich'}.</p>` : ''}
  <p class="empty" style="margin-top:10px">Mindesthebel = Positionswert geteilt durch verfügbares Kapital (${f.usd(r.summary.available)}).</p>`;
}

export function initRisk(stateGetter) {
  getState = stateGetter;
  $('calc-risk').value = String(CONFIG.rules.riskPerTradeWarnPct);
  ['calc-risk', 'calc-entry', 'calc-stop'].forEach((id) => $(id).addEventListener('input', renderCalc));
  $('calc-coin').addEventListener('change', () => {
    const px = getState().prices[$('calc-coin').value];
    if (px) $('calc-entry').value = String(px).replace('.', ',');
    renderCalc();
  });
  $('stop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const coin = $('stop-coin').value;
    const v = parse($('stop-price').value);
    if (!coin) return;
    setManualStop(coin, v);
    $('stop-msg').textContent = v ? `Stop-Loss für ${coin} gespeichert.` : `Manueller Stop für ${coin} gelöscht.`;
    $('stop-price').value = '';
  });
  $('stop-coin').addEventListener('change', () => {
    const v = getManualStop($('stop-coin').value);
    $('stop-price').value = v ? String(v).replace('.', ',') : '';
  });
}

export function renderRisk(s) {
  const r = accountRisk(s);
  if (!r) { $('risk').innerHTML = '<p class="empty">Noch keine Kontodaten.</p>'; }
  else {
    const rt = r.realizedToday;
    $('risk').innerHTML = `<div class="kv" style="margin-bottom:14px">
      <div><span class="k">Realisiert heute</span><span class="v ${rt > 0 ? 'long' : rt < 0 ? 'short' : ''}">${f.signedUsd(rt)}</span></div>
      <div><span class="k">Risiko bis Stops</span><span class="v">${r.openRiskTotal == null ? '–' : f.usd(r.openRiskTotal)}</span></div>
    </div><div class="health">${r.checks.map(checkRow).join('')}</div>
    <p class="empty" style="margin-top:12px">Tagesergebnis ab 0:00 Uhr, abzüglich Gebühren, ohne Funding.</p>`;
  }
  // Auswahllisten nur neu füllen, wenn sich die Auswahl ändert (sonst springt die Eingabe)
  const posCoins = r ? r.positions.map((p) => p.coin) : [];
  const noOrderStop = r ? r.positions.filter((p) => p.stopSource !== 'Order').map((p) => p.coin) : [];
  lastStopKey = fillSelect($('stop-coin'), noOrderStop, noOrderStop.join(','), lastStopKey);
  $('stop-box').hidden = noOrderStop.length === 0;
  const calcCoins = [...new Set([...CONFIG.watchlist, ...posCoins])];
  lastCalcKey = fillSelect($('calc-coin'), calcCoins, calcCoins.join(','), lastCalcKey);
  if (!$('calc-entry').value && s.prices[$('calc-coin').value]) $('calc-entry').value = String(s.prices[$('calc-coin').value]).replace('.', ',');
  if (document.activeElement?.closest?.('#calc') == null) renderCalc();
}
