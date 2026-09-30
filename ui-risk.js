// Risiko-Modul: Regel-Check, manuelle Stop-Losses, Positionsgrößen-Rechner.
import { esc } from './core-format.js';
import { CONFIG } from './config.js';
import { getWatchlist } from './core-watchlist.js';
import { accountRisk } from './core-positions.js';
import { positionSize, maxLeverageForStop, recommendLeverage, exitPlan, maxFit, leverageIssues } from './core-risk.js';
import { exitTable, fitHint, levSlider, updateLevOut } from './ui-parts.js';
import { setManualStop, getManualStop } from './core-stops.js';
import { stopNoise, suggestImpact, cooldown, cooledRisk, leftText, atrFor, setupTf } from './core-guard.js';
import { tradeHistory } from './core-trades.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
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
  el.innerHTML = coins.map((c) => `<option value="${esc(c)}">${esc(c.replace(/^[a-z]+:/, ''))}</option>`).join('');
  if (coins.includes(current)) el.value = current;
  return key;
}

// Plan aus dem Signalgeber (Ziele + Stil), gilt nur, solange Einstieg und Stop unverändert sind
let calcPlan = null;
let calcLev = null; // manueller Hebel im Rechner (null = Empfehlung)
let calcCtx = null, riskTouched = false;

function renderCalc() {
  const s = getState();
  // Vorschlag im Risiko-Feld, solange du es nicht selbst geändert hast (Abkühlphase: halbiert)
  const cdNow = s.fills ? cooldown(tradeHistory(s.fills)) : { active: false };
  const want = cdNow.active ? cooledRisk(CONFIG.rules.riskSteps[0], true) : CONFIG.rules.riskSteps[0];
  if (!riskTouched && parse($('calc-risk').value) !== want) $('calc-risk').value = String(want);
  const r = accountRisk(s);
  const out = $('calc-out');
  const equity = r?.summary.equity;
  const entry = parse($('calc-entry').value), stop = parse($('calc-stop').value), riskPct = parse($('calc-risk').value);
  const res = positionSize(equity, riskPct, entry, stop);
  if (!equity) { out.innerHTML = '<p class="empty">Kontodaten fehlen noch.</p>'; return; }
  if (!res) { out.innerHTML = `<p class="empty">Einstieg und Stop-Loss eintragen. Rechenbasis: Kontowert ${f.usd(equity)}.</p>`; return; }

  const dir = entry > stop ? 'long' : 'short';
  const fromPlan = calcPlan && Math.abs(calcPlan.entry - entry) / entry < 1e-4 && Math.abs(calcPlan.stop - stop) / stop < 1e-4;
  const mode = fromPlan ? CONFIG.signals.modes[calcPlan.mode] : null;
  const exchangeMax = s.maxLev?.[$('calc-coin').value] || null;
  const styleMax = mode?.maxLeverage ?? null;
  const cap = Math.min(CONFIG.rules.maxLeverage, styleMax ?? Infinity, exchangeMax ?? Infinity);
  const maxLev = maxLeverageForStop(res.stopDistPct, CONFIG.rules.liqBufferPct, cap, exchangeMax);
  const rec = recommendLeverage(res.notional, r.summary.available, maxLev, CONFIG.rules.marginBudgetPct);
  const levIn = calcLev;
  const lev = levIn || rec?.lev || null;
  const margin = lev ? res.notional / lev : null;
  const R = Math.abs(entry - stop), sg = dir === 'long' ? 1 : -1;
  const tps = fromPlan ? calcPlan.tps : [1, 2, 3, 4].map((m) => entry + sg * m * R);
  const exits = exitPlan(dir, entry, tps, res.size, CONFIG.exitPlan);
  const st = riskPct >= CONFIG.rules.riskPerTradeMaxPct ? 'bad' : riskPct >= CONFIG.rules.riskPerTradeWarnPct ? 'warn' : 'ok';
  // Stop-Check gegen ATR (Setup-Zeitebene des Plans bzw. deines Stils) und Abkühlphase
  const tf = fromPlan ? CONFIG.signals.modes[calcPlan.mode].tfs[1] : setupTf();
  const atrV = atrFor($('calc-coin').value, tf);
  if (atrV == null) setTimeout(() => { if (atrFor($('calc-coin').value, tf) != null) renderCalc(); }, 2500);
  const noise = stopNoise(entry, stop, atrV);
  const imp = noise?.suggest ? suggestImpact(equity, riskPct, entry, stop, noise.suggest.stop) : null;
  const cd = cooldown(tradeHistory(s.fills));
  calcCtx = { notional: res.notional, available: r.summary.available, liqMax: maxLeverageForStop(res.stopDistPct, CONFIG.rules.liqBufferPct, 200, exchangeMax), exchangeMax, styleMax, budgetPct: CONFIG.rules.marginBudgetPct,
    plan: { dir, entry, stop, tps }, bufferPct: CONFIG.rules.liqBufferPct,
    note: `Der Hebel ändert nur die Margin, nicht Positionsgröße und Risiko. Empfehlung: so niedrig wie möglich, Margin höchstens ${CONFIG.rules.marginBudgetPct} % vom verfügbaren Kapital (${f.usd(r.summary.available)}). Höchsthebel: Liquidation mind. ${String(CONFIG.rules.liqBufferPct).replace('.', ',')} % hinter dem Stop${mode ? `, ${mode.label} max. ${mode.maxLeverage}×` : ''}${exchangeMax ? `, Hyperliquid max. ${exchangeMax}×` : ''}. Der Balken zeigt, wo die Liquidation bei diesem Hebel ungefähr liegt.` };

  out.innerHTML = `${cd.active ? `<p class="cap-note bad" style="margin:0 0 12px">🧊 Abkühlphase: ${cd.streak} Verlust-Trades in Folge, noch ${leftText(cd.until)}, Vorschlag: höchstens ${String(cooledRisk(CONFIG.rules.riskSteps[0], true)).replace('.', ',')} % Risiko.</p>` : ''}
  ${noise ? (noise.status === 'ok' ? `<p class="stop-check ok">✓ ${noise.text} (${tf.toUpperCase()})</p>`
    : `<div class="stop-check ${noise.status}"><b>${noise.status === 'bad' ? '⚠️ ' : ''}${noise.text}</b><span>Sinnvoller: Stop bei <b>${f.price(noise.suggest.stop)}</b> (${String(noise.suggest.atrMult).replace('.', ',')}× ATR auf ${tf.toUpperCase()}, ${f.pct(noise.suggest.distPct, 1)} Abstand)${imp ? `. Bei gleichem Risiko wird die Position ${f.pct((1 - imp.factor) * 100, 0)} kleiner, also weniger Hebel nötig.` : ''}</span></div>`)
    : atrV == null ? '<p class="empty" style="font-size:12px;margin:0 0 8px">Stop-Check: Schwankung (ATR) wird geladen …</p>' : ''}
  <div class="kv">
    <div class="span2"><span class="k">Positionsgröße (${dir === 'long' ? 'Long' : 'Short'})</span><span class="v big" style="color:var(--gold)">${f.size(res.size)}</span></div>
    <div class="span2"><span class="k">Margin (dein Einsatz)</span><span class="v big" id="calc-margin" style="color:var(--gold)">${margin ? f.usd(margin) : '–'}</span></div>
    <div><span class="k">Risiko</span><span class="v">${f.usd(res.riskAmt)}</span></div>
    <div><span class="k">Positionswert</span><span class="v">${f.usd(res.notional)}</span></div>
    <div><span class="k">Stop-Abstand</span><span class="v">${f.pct(res.stopDistPct, 2)}</span></div>
    <div><span class="k">Hebel möglich bis</span><span class="v">${f.lev(maxLev)}</span></div>
  </div>
  ${levSlider(lev || Math.min(maxLev || 1, exchangeMax || 50), rec?.lev || null, calcCtx)}
  ${rec && !rec.lev && !levIn ? `<p class="warnline">Für diese Größe wären mind. ${rec.need}× nötig, möglich sind ca. ${maxLev}×.</p>${fitHint(maxFit(entry, stop, r.summary.available, maxLev, CONFIG.rules.marginBudgetPct), equity, CONFIG.rules.marginBudgetPct)}` : ''}
  ${st !== 'ok' ? `<p class="warnline" style="color:${st === 'bad' ? 'var(--bad)' : 'var(--warn)'}">${riskPct} % Risiko liegt ${st === 'bad' ? 'über deinem Maximum' : 'im Warnbereich'}.</p>` : ''}
  <h3 class="sub-h">Ausstiegsplan <small class="muted" style="font-weight:600">${fromPlan ? `aus Signal (${esc(mode.label)})` : 'Ziele als 1R bis 4R'}</small></h3>
  ${exitTable(exits, CONFIG.runnerNote)}`;
}

export function initRisk(stateGetter) {
  getState = stateGetter;
  $('calc-risk').value = String(cooldown(tradeHistory(getState().fills)).active ? cooledRisk(CONFIG.rules.riskSteps[0], true) : CONFIG.rules.riskSteps[0]);
  $('calc-risk').addEventListener('input', () => { riskTouched = true; });
  ['calc-risk', 'calc-entry', 'calc-stop'].forEach((id) => $(id).addEventListener('input', renderCalc));
  $('calc-out').addEventListener('input', (e) => {
    if (!e.target.classList.contains('lev-range')) return;
    calcLev = Number(e.target.value);
    updateLevOut($('calc-out'), calcLev, calcCtx, (m) => { $('calc-margin').textContent = f.usd(m); });
  });
  $('calc-out').addEventListener('click', (e) => {
    if (e.target.closest('button[data-lev-rec]')) { calcLev = null; renderCalc(); return; }
    const b = e.target.closest('button[data-risk]');
    if (b) { $('calc-risk').value = b.dataset.risk.replace('.', ','); renderCalc(); }
  });
  $('calc-coin').addEventListener('change', () => {
    calcPlan = null;
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

// Vom Signalgeber: Markt, Einstieg und Stop in den Rechner übernehmen.
export function setCalc(coin, entry, stop, tps = null, mode = null) {
  calcPlan = tps ? { entry, stop, tps, mode } : null;
  calcLev = null;
  const sel = $('calc-coin');
  if (![...sel.options].some((o) => o.value === coin)) sel.insertAdjacentHTML('beforeend', `<option value="${esc(coin)}">${esc(coin)}</option>`);
  sel.value = coin;
  const dec = entry >= 1000 ? 1 : entry >= 10 ? 2 : 4;
  $('calc-entry').value = entry.toFixed(dec).replace('.', ',');
  $('calc-stop').value = stop.toFixed(dec).replace('.', ',');
  if (calcPlan) { calcPlan.entry = parse($('calc-entry').value); calcPlan.stop = parse($('calc-stop').value); }
  renderCalc();
}

export function renderRisk(s) {
  const r = accountRisk(s);
  if (!r) { $('risk').innerHTML = '<p class="empty">Noch keine Kontodaten.</p>'; }
  else {
    const rt = r.realizedToday;
    $('risk').innerHTML = `<div class="kv" style="margin-bottom:14px">
      <div><span class="k">Realisiert heute</span><span class="v ${rt > 0 ? 'long' : rt < 0 ? 'short' : ''}">${f.signedUsd(rt)}</span></div>
      <div><span class="k">Risiko bis Stops</span><span class="v ${r.openRiskTotal == null ? 'short' : ''}">${r.openRiskTotal == null ? 'Stop fehlt' : f.usd(r.openRiskTotal)}</span></div>
    </div><div class="health">${r.checks.map(checkRow).join('')}</div>
    <p class="empty" style="margin-top:12px">Tagesergebnis ab 0:00 Uhr, abzüglich Gebühren, ohne Funding.</p>`;
  }
  // Auswahllisten nur neu füllen, wenn sich die Auswahl ändert (sonst springt die Eingabe)
  const posCoins = r ? r.positions.map((p) => p.coin) : [];
  const noOrderStop = r ? r.positions.filter((p) => p.stopSource !== 'Order').map((p) => p.coin) : [];
  lastStopKey = fillSelect($('stop-coin'), noOrderStop, noOrderStop.join(','), lastStopKey);
  $('stop-box').hidden = noOrderStop.length === 0;
  const calcCoins = [...new Set([...getWatchlist(), ...posCoins, $('calc-coin').value].filter(Boolean))];
  lastCalcKey = fillSelect($('calc-coin'), calcCoins, calcCoins.join(','), lastCalcKey);
  if (!$('calc-entry').value && s.prices[$('calc-coin').value]) $('calc-entry').value = String(s.prices[$('calc-coin').value]).replace('.', ',');
  if (document.activeElement?.closest?.('#calc') == null) renderCalc();
}
