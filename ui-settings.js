// Einstellungs-Seite (Zahnrad oben). Liest und schreibt nur über core-settings.js.
import { CONFIG, SETTINGS_KEY } from './config.js';
import { getViews } from './core-views.js';
import { getPlans } from './core-plans.js';
import { getWatchlist } from './core-watchlist.js';
import { getTradeable } from './core-tradeable.js';
import { tradeableBlock, bindTradeable } from './ui-tradeable.js';
import { shareReport } from './ui-export.js';
import { GROUPS, FIELDS, STYLE_KEYS, currentValues, recommendedValue, isChanged, toShown, fromShown, validate, localSnapshot, diffFromRecommended, settingsFile, listsForExport } from './core-settings.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(v);
let values = null;   // Arbeitskopie Pfad → Wert
let dirty = false;

const shownRec = (f) => {
  const r = recommendedValue(f.path);
  if (f.type === 'bool') return r ? 'an' : 'aus';
  if (f.type === 'styles') return r.map((k) => CONFIG.signals.modes[k].label).join(', ');
  if (f.type === 'choice') return (f.options.find((o) => o[0] === r) || [r, r])[1];
  return `${num(toShown(f, r))}${f.unit ? ' ' + f.unit : ''}`;
};

function input(f) {
  const v = values[f.path], id = 'set-' + f.path.replace(/\./g, '-');
  if (f.type === 'bool') {
    return `<label class="set-switch"><input type="checkbox" id="${id}" data-path="${f.path}" ${v ? 'checked' : ''}><span>${v ? 'an' : 'aus'}</span></label>`;
  }
  if (f.type === 'choice') {
    return `<div class="set-styles" role="group" aria-label="${esc(f.label)}">${f.options.map(([k, l]) => `<button type="button" data-choice="${k}" data-path="${f.path}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>`;
  }
  if (f.type === 'styles') {
    return `<div class="set-styles" role="group" aria-label="${esc(f.label)}">${STYLE_KEYS.map((k) => `<button type="button" data-style="${k}" data-path="${f.path}" aria-pressed="${v.includes(k)}">${CONFIG.signals.modes[k].label}</button>`).join('')}</div>`;
  }
  return `<div class="set-num"><input id="${id}" data-path="${f.path}" type="text" inputmode="decimal" value="${num(toShown(f, v)).replace(/\./g, '')}" aria-label="${esc(f.label)}">${f.unit ? `<span class="unit">${esc(f.unit)}</span>` : ''}</div>`;
}

function row(f, errs) {
  const changed = isChanged(f.path, values[f.path]);
  const err = errs.find((e) => e.path === f.path);
  return `<div class="set-row${changed ? ' changed' : ''}${err ? ' error' : ''}">
    <div class="set-label"><span>${esc(f.label)}</span>
      <small>empfohlen: ${esc(shownRec(f))}${f.hint ? ' · ' + esc(f.hint) : ''}</small></div>
    <div class="set-ctrl">${input(f)}
      ${changed ? `<button type="button" class="set-reset" data-reset="${f.path}" aria-label="${esc(f.label)} auf Empfehlung zurücksetzen">↺</button>` : '<span class="set-reset-ph"></span>'}</div>
  </div>`;
}

export function renderSettings() {
  if (!values) values = currentValues();
  const errs = validate(values);
  const changedCount = FIELDS.filter((f) => isChanged(f.path, values[f.path])).length;
  const open = new Set([...document.querySelectorAll('#settings details[open]')].map((d) => d.dataset.group));
  $('settings').innerHTML = `
    <p class="set-summary">${changedCount ? `<b>${changedCount}</b> ${changedCount === 1 ? 'Wert weicht' : 'Werte weichen'} von der Empfehlung ab, gold markiert.` : 'Alle Werte stehen auf der Empfehlung.'}</p>
    ${GROUPS.map((g) => {
      const fields = FIELDS.filter((f) => f.group === g.key);
      const n = fields.filter((f) => isChanged(f.path, values[f.path])).length;
      const sum = g.key === 'exit' ? [0, 1, 2, 3, 4].reduce((s, i) => s + (Number(values[`exitPlan.${i}.pct`]) || 0), 0)
        : g.key === 'markt' ? ['btc', 'eth', 'breadth', 'ratio'].reduce((s, k) => s + (Number(values[`market.biasWeights.${k}`]) || 0), 0) : null;
      return `<details class="set-group${g.expert ? ' expert' : ''}" data-group="${g.key}"${open.has(g.key) ? ' open' : ''}>
        <summary><span>${esc(g.title)}</span>${n ? `<b class="set-badge">${n} geändert</b>` : ''}</summary>
        ${g.hint ? `<p class="set-hint${g.expert ? ' warn' : ''}">${esc(g.hint)}</p>` : ''}
        ${fields.map((f) => row(f, errs)).join('')}
        ${sum != null ? `<p class="set-sum ${sum === 100 ? 'long' : 'short'}">Summe: ${sum} %</p>` : ''}
      </details>`;
    }).join('')}
    ${tradeableBlock(open.has('tradeable'))}
    ${errs.length ? `<div class="set-errors" role="alert">${errs.map((e) => `<p>${esc(e.text)}</p>`).join('')}</div>` : ''}
    <div class="set-actions">
      <button type="button" id="set-save" ${errs.length || !dirty ? 'disabled' : ''}>Speichern und anwenden</button>
      <button type="button" id="set-export" class="ghost">Für den Wächter übernehmen</button>
      <button type="button" id="set-all-reset" class="ghost">Alles auf Empfehlung</button>
      <button type="button" id="set-claude" class="ghost">📤 Daten für Claude exportieren</button>
    </div>
    <p class="empty" style="font-size:12px;margin-top:10px">„Speichern“ gilt sofort für die App auf diesem iPhone. „Für den Wächter übernehmen“ erzeugt die Datei <b>my-settings.js</b>. Die lädst du wie gewohnt bei GitHub hoch, dann rechnet auch der Telegram-Wächter mit deinen Werten.</p>`;
}

function parse(str) {
  const t = String(str).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
}

function setValue(path, v) {
  values[path] = v;
  dirty = true;
}

async function exportFile() {
  const diff = diffFromRecommended(values);
  const views = getViews();
  if (Object.keys(views).length) diff.views = views;
  const plans = getPlans();
  if (Object.keys(plans).length) diff.plans = plans;
  Object.assign(diff, listsForExport(getWatchlist(), getTradeable()));
  const text = settingsFile(diff);
  const file = new File([text], 'my-settings.js', { type: 'text/javascript' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = 'my-settings.js';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function initSettings(getState = () => ({})) {
  const box = $('settings');
  bindTradeable(box, () => Object.values(getState().markets || {}).flat());
  box.addEventListener('click', (e) => { if (e.target.id === 'set-claude') shareReport(getState); });
  // Zahl eingegeben: erst beim Verlassen des Feldes übernehmen (sonst springt der Cursor)
  box.addEventListener('change', (e) => {
    const el = e.target, path = el.dataset.path;
    if (!path) return;
    const f = FIELDS.find((x) => x.path === path);
    if (f.type === 'bool') setValue(path, el.checked);
    else setValue(path, fromShown(f, parse(el.value)));
    renderSettings();
  });
  box.addEventListener('click', (e) => {
    const ch = e.target.closest('button[data-choice]');
    if (ch) { setValue(ch.dataset.path, ch.dataset.choice); renderSettings(); return; }
    const st = e.target.closest('button[data-style]');
    if (st) {
      const cur = new Set(values[st.dataset.path]);
      if (cur.has(st.dataset.style)) cur.delete(st.dataset.style); else cur.add(st.dataset.style);
      setValue(st.dataset.path, STYLE_KEYS.filter((k) => cur.has(k)));
      renderSettings();
      return;
    }
    const rs = e.target.closest('button[data-reset]');
    if (rs) { setValue(rs.dataset.reset, JSON.parse(JSON.stringify(recommendedValue(rs.dataset.reset)))); renderSettings(); return; }
    if (e.target.id === 'set-all-reset') {
      if (!confirm('Alle Werte auf die Empfehlung zurücksetzen?')) return;
      FIELDS.forEach((f) => { values[f.path] = JSON.parse(JSON.stringify(recommendedValue(f.path))); });
      dirty = true; renderSettings(); return;
    }
    if (e.target.id === 'set-save') {
      if (validate(values).length) return;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(localSnapshot(values))); } catch { alert('Speichern nicht möglich'); return; }
      location.reload();
      return;
    }
    if (e.target.id === 'set-export') {
      if (validate(values).length) { alert('Bitte zuerst die rot markierten Werte korrigieren.'); return; }
      exportFile();
    }
  });
  renderSettings();
}
