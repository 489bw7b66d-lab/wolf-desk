// Einstellungen: „Handelbare Märkte“. 8y: Standard „automatisch“ = alle Märkte, die Hyperliquid gerade listet (Ledger reicht diese
// durch); einzelne lassen sich als Ausnahme abwählen. Alternativ eine eigene Liste wie bisher. Speichert sofort (core-tradeable.js).
import { getRaw, getTradeable, addTradeable, removeTradeable, clearTradeable, matchMarkets, isAuto, skipsOf, setAuto, setManual, marketNames, onTradeable, byName } from './core-tradeable.js';
import { unclassified, classOf, CLASS } from './core-classes.js';
import { esc, dn } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
let getNames = () => [];
const names = () => (marketNames().length ? marketNames() : getNames());
const tag = (c) => (c.includes(':') ? ` <small class="muted">${esc(c.split(':')[0])}</small>` : '');

const title = () => {
  const n = getTradeable().length, auto = isAuto(getRaw());
  return `<span>Handelbare Märkte (Ledger)</span>${n ? `<b class="set-badge">${auto ? 'auto · ' : ''}${n}</b>` : ''}`;
};

// Aufklappbarer Block für die Einstellungs-Seite (open: war vorher aufgeklappt)
export function tradeableBlock(open) {
  return `<details class="set-group" data-group="tradeable"${open ? ' open' : ''}>
    <summary>${title()}</summary>
    <div id="tr-body">${body()}</div>
  </details>`;
}

function counts() {
  const all = names(), main = all.filter((c) => !c.includes(':')).length, by = {};
  all.forEach((c) => { const k = classOf(c); by[k] = (by[k] || 0) + 1; });
  return { all: all.length, main, other: all.length - main, by };
}

function body() {
  const raw = getRaw(), auto = isAuto(raw);
  const mode = `<div class="mk-actions tr-mode" role="group" aria-label="Art der Liste">
      <button type="button" class="small-btn${auto ? '' : ' ghost'}" id="tr-auto" aria-pressed="${auto}">Automatisch</button>
      <button type="button" class="small-btn${auto ? ' ghost' : ''}" id="tr-manual" aria-pressed="${!auto}">Eigene Liste</button></div>`;
  const search = `<input id="tr-q" class="mk-search" type="search" placeholder="${auto ? 'Markt abwählen, z. B. GOLD' : 'Markt suchen, z. B. SOL oder GOLD'}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Markt suchen">
    <div id="tr-hits" class="mk-hits" aria-live="polite"></div>`;
  if (auto) {
    const c = counts(), skips = skipsOf(raw).sort(byName), un = unclassified(names());
    const byTxt = ['krypto', 'rohstoff', 'aktie', 'fx', 'sonst'].filter((k) => c.by[k]).map((k) => `${CLASS[k]} ${c.by[k]}`).join(' · ');
    return `${mode}
      <p class="set-hint">${c.all ? `Hyperliquid listet gerade <b>${c.all}</b> Märkte (Hauptbörse ${c.main} · xyz ${c.other}). ` : 'Marktliste lädt noch … '}Ledger zeigt die Zahl unter „Trade perps → Explore perps“ in Klammern. Ist sie gleich oder fast gleich, passt alles.${c.all ? `<br><span class="muted">${esc(byTxt)}</span>` : ''}</p>
      <p class="set-hint">Gescannt wird bei jedem Laden und jedem Wächter-Lauf die aktuelle Liste, tote Märkte fallen über den Mindestumsatz raus. Für den Wächter danach „Für den Wächter übernehmen“.</p>
      ${search}
      ${skips.length ? `<p class="set-hint" style="margin-top:10px">Ausnahmen (werden nicht gescannt, Tippen nimmt sie wieder auf):</p><div class="mk-chips mk-back" role="list">${skips.map((x) => `<button type="button" role="listitem" data-tr-back="${esc(x)}" aria-label="${esc(dn(x))} wieder aufnehmen">${esc(dn(x))}${tag(x)} ↺</button>`).join('')}</div>` : ''}
      ${un.length ? `<p class="set-hint" style="margin-top:10px">Noch keiner Klasse zugeordnet (zählen in keinem Index, sag mir Bescheid): ${esc(un.map(dn).join(', '))}</p>` : ''}`;
  }
  const list = getTradeable();
  return `${mode}
    <p class="set-hint">Nur diese Märkte scannen Heiße Coins und Wächter. Leer = wie bisher die Top-Coins. Für den Wächter danach „Für den Wächter übernehmen“.</p>
    ${search}
    ${list.length ? `<div class="mk-chips" role="list">${list.map((c) => `<button type="button" role="listitem" data-tr-del="${esc(c)}" aria-label="${esc(dn(c))} entfernen">${esc(dn(c))}${tag(c)}</button>`).join('')}</div>
      <div class="mk-actions"><button type="button" class="small-btn ghost" id="tr-clear">Liste leeren</button></div>`
      : '<p class="empty" style="font-size:13px;margin-top:10px">Noch keine Märkte eingetragen.</p>'}`;
}

function renderHits() {
  const q = $('tr-q')?.value || '';
  const box = $('tr-hits');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = ''; return; }
  const auto = isAuto(getRaw());
  const hits = auto ? matchMarkets(q, getTradeable()) : matchMarkets(q, names(), getTradeable());
  box.innerHTML = hits.length
    ? hits.map((c) => auto ? `<button type="button" data-tr-del="${esc(c)}">− ${esc(dn(c))}${tag(c)}</button>` : `<button type="button" data-tr-add="${esc(c)}">+ ${esc(dn(c))}${tag(c)}</button>`).join('')
    : `<p class="empty" style="font-size:13px">${names().length ? 'Kein weiterer Markt gefunden.' : 'Marktliste lädt noch …'}</p>`;
}

function refresh() {
  const q = $('tr-q')?.value || '';
  if ($('tr-body')) $('tr-body').innerHTML = body();
  if ($('tr-q') && q) $('tr-q').value = q;
  const g = document.querySelector('details[data-group="tradeable"] summary');
  if (g) g.innerHTML = title();
  renderHits();
}

// Einmal an den Einstellungs-Container hängen (Ereignisse bleiben auch nach Neuaufbau erhalten)
export function bindTradeable(root, namesGetter) {
  getNames = namesGetter;
  onTradeable(() => { if ($('tr-body')) refresh(); });
  root.addEventListener('input', (e) => { if (e.target.id === 'tr-q') renderHits(); });
  root.addEventListener('click', (e) => {
    const add = e.target.closest('button[data-tr-add]');
    if (add) { addTradeable(add.dataset.trAdd); refresh(); $('tr-q')?.focus(); return; }
    const back = e.target.closest('button[data-tr-back]');
    if (back) { addTradeable(back.dataset.trBack); refresh(); return; }
    const del = e.target.closest('button[data-tr-del]');
    if (del) { removeTradeable(del.dataset.trDel); refresh(); return; }
    if (e.target.id === 'tr-auto' && !isAuto(getRaw())) { setAuto(); refresh(); return; }
    if (e.target.id === 'tr-manual' && isAuto(getRaw()) && confirm('Auf eine eigene Liste umstellen? Sie startet mit allen Märkten, die gerade automatisch drin sind; neue Listings kommen dann nicht mehr von selbst dazu.')) { setManual(); refresh(); return; }
    if (e.target.id === 'tr-clear' && confirm('Alle handelbaren Märkte entfernen? Dann scannen Heiße Coins und Wächter wieder die Top-Coins.')) { clearTradeable(); refresh(); }
  });
}
