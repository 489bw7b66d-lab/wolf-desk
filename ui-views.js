// Karte "Meine Einschätzung" im Signale-Tab: Liste der Einschätzungen und Formular zum Anlegen/Bearbeiten.
import { esc } from './core-format.js';
import { getViews, saveView, isActive, validateView, cleanView, BIAS_TXT } from './core-views.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const dn = (c) => String(c ?? '').replace(/^[a-z]+:/, '');
const dt = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const priceTxt = (v) => (v == null ? '' : f.price(v));
const DAYS = [[3, '3 Tage'], [7, '1 Woche'], [14, '2 Wochen'], [30, '1 Monat'], [90, '3 Monate']];

let getState = () => ({}), editing = null, onChange = () => {};

function allMarkets() {
  const m = getState().markets || {};
  return [...new Set(Object.values(m).flat())];
}
// Eingabe "qnt" oder "QNT" → interner Name, z. B. "xyz:QNT"
function resolve(name) {
  const q = String(name || '').trim().toUpperCase();
  if (!q) return null;
  return allMarkets().find((n) => n.toUpperCase() === q) || allMarkets().find((n) => dn(n).toUpperCase() === q) || null;
}

function list() {
  const views = getViews(), now = Date.now();
  const coins = Object.keys(views).sort((a, b) => (isActive(views[b], now) - isActive(views[a], now)) || a.localeCompare(b));
  if (!coins.length) return '<p class="empty">Noch keine Einschätzung. Trag hier ein, was du aus einer Analyse mitnimmst, z. B. „SOL bullisch, ungültig unter 115“.</p>';
  return coins.map((c) => {
    const v = views[c], active = isActive(v, now), long = v.bias !== 'short';
    const parts = [
      v.invalid != null ? `ungültig ${long ? 'unter' : 'über'} ${priceTxt(v.invalid)}` : '',
      v.trigger != null ? `bestätigt ${long ? 'über' : 'unter'} ${priceTxt(v.trigger)}` : '',
      v.targets?.length ? `Ziele ${v.targets.map(priceTxt).join(' / ')}` : '',
    ].filter(Boolean).join(' · ');
    return `<button type="button" class="view-row${active ? '' : ' expired'}" data-edit="${esc(c)}">
      <div class="view-top"><span class="sym">${esc(dn(c))}</span>
        <span class="view-bias ${v.bias}">${BIAS_TXT[v.bias]}</span>
        <span class="meta">${active ? (v.until ? 'bis ' + dt(v.until) : 'ohne Ablauf') : 'abgelaufen'}</span></div>
      ${parts ? `<div class="meta view-lv">${esc(parts)}</div>` : ''}
      ${v.note ? `<div class="view-note">${esc(v.note)}</div>` : ''}
    </button>`;
  }).join('');
}

function form(coin) {
  const v = coin ? getViews()[coin] : null;
  const bias = v?.bias || 'long', long = bias !== 'short';
  const keepDays = v?.until ? Math.max(1, Math.round((v.until - Date.now()) / 864e5)) : 7;
  const nearest = DAYS.reduce((a, b) => (Math.abs(b[0] - keepDays) < Math.abs(a[0] - keepDays) ? b : a))[0];
  const fld = (id, label, val, ph) => `<label class="vf"><span>${label}</span><input id="${id}" type="text" inputmode="decimal" value="${val == null ? '' : String(val).replace('.', ',')}" placeholder="${ph}"></label>`;
  return `<div class="view-form" id="view-form">
    <label class="vf"><span>Markt</span><input id="vf-coin" type="text" autocapitalize="characters" value="${esc(coin ? dn(coin) : '')}" placeholder="z. B. SOL" ${coin ? 'readonly' : ''}></label>
    <div class="vf"><span>Richtung</span><div class="set-styles" role="group" aria-label="Richtung">
      ${['long', 'neutral', 'short'].map((b) => `<button type="button" data-bias="${b}" aria-pressed="${b === bias}">${BIAS_TXT[b]}</button>`).join('')}</div></div>
    ${fld('vf-invalid', long ? 'Ungültig unter' : 'Ungültig über', v?.invalid, 'optional')}
    ${fld('vf-trigger', long ? 'Bestätigt über' : 'Bestätigt unter', v?.trigger, 'optional')}
    ${fld('vf-t1', 'Ziel 1', v?.targets?.[0], 'optional')}
    ${fld('vf-t2', 'Ziel 2', v?.targets?.[1], 'optional')}
    <label class="vf"><span>Notiz</span><input id="vf-note" type="text" maxlength="80" value="${esc(v?.note || '')}" placeholder="z. B. BlockchainBacker 27.09."></label>
    <label class="vf"><span>Gilt für</span><select id="vf-days">${DAYS.map(([d, l]) => `<option value="${d}" ${d === nearest ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div id="vf-err" class="set-errors" role="alert" hidden></div>
    <div class="set-actions">
      <button type="button" id="vf-save">Speichern</button>
      ${coin ? '<button type="button" id="vf-delete" class="ghost">Einschätzung löschen</button>' : ''}
      <button type="button" id="vf-cancel" class="ghost">Abbrechen</button>
    </div>
    <p class="empty" style="font-size:12px;margin-top:8px">Gilt sofort in der App. Für den Telegram-Wächter unter ⚙️ „Für den Wächter übernehmen“ nutzen und my-settings.js hochladen.</p>
  </div>`;
}

export function renderViews() {
  const box = $('views');
  if (!box) return;
  box.innerHTML = editing !== null ? form(editing || null)
    : `${list()}<button type="button" id="view-add" class="wide ghost" style="margin-top:10px">＋ Einschätzung hinzufügen</button>`;
}

function currentBias() { return $('view-form')?.querySelector('button[data-bias][aria-pressed="true"]')?.dataset.bias || 'long'; }

function save() {
  const coin = editing || resolve($('vf-coin').value);
  const err = [];
  if (!coin) err.push('Markt nicht gefunden. Bitte den Namen so eingeben, wie er bei Hyperliquid heißt, z. B. SOL.');
  const raw = { bias: currentBias(), invalid: $('vf-invalid').value, trigger: $('vf-trigger').value, target1: $('vf-t1').value, target2: $('vf-t2').value, note: $('vf-note').value, until: Date.now() + Number($('vf-days').value) * 864e5 };
  const v = cleanView(raw);
  err.push(...validateView(v));
  if (err.length) { const e = $('vf-err'); e.hidden = false; e.innerHTML = err.map((x) => `<p>${esc(x)}</p>`).join(''); return; }
  saveView(coin, v);
  editing = null;
  renderViews();
  onChange();
}

export function initViews(stateGetter, changed = () => {}) {
  getState = stateGetter; onChange = changed;
  const box = $('views');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const t = e.target;
    const row = t.closest('button[data-edit]');
    if (row) { editing = row.dataset.edit; renderViews(); return; }
    if (t.id === 'view-add') { editing = ''; renderViews(); $('vf-coin')?.focus(); return; }
    const b = t.closest('button[data-bias]');
    if (b) {
      box.querySelectorAll('button[data-bias]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const long = b.dataset.bias !== 'short';
      $('vf-invalid').previousElementSibling.textContent = long ? 'Ungültig unter' : 'Ungültig über';
      $('vf-trigger').previousElementSibling.textContent = long ? 'Bestätigt über' : 'Bestätigt unter';
      return;
    }
    if (t.id === 'vf-save') save();
    if (t.id === 'vf-cancel') { editing = null; renderViews(); }
    if (t.id === 'vf-delete' && confirm('Diese Einschätzung löschen?')) { saveView(editing, null); editing = null; renderViews(); onChange(); }
  });
  renderViews();
}
