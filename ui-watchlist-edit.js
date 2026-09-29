// Einstellungen: Watchlist pflegen (seit 5e hier statt im Signalgeber). Suchfeld über alle Märkte, Tipp fügt hinzu,
// Tipp auf einen Eintrag entfernt ihn. Die Watchlist prüft der Wächter immer mit (zusätzlich zu den handelbaren Märkten).
import { getWatchlist, addToWatchlist, removeFromWatchlist, WATCHLIST_MAX } from './core-watchlist.js';
import { matchMarkets } from './core-tradeable.js';
import { esc, dn } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
let getNames = () => [];

const head = (n) => `<span>Watchlist</span><b class="set-badge">${n}/${WATCHLIST_MAX}</b>`;
const chips = (list) => (list.length
  ? `<div class="mk-chips" role="list">${list.map((c) => `<button type="button" role="listitem" data-wl-del="${esc(c)}" aria-label="${esc(dn(c))} entfernen">${esc(dn(c))}</button>`).join('')}</div>`
  : '<p class="empty" style="font-size:13px;margin-top:10px">Noch keine Märkte auf der Watchlist.</p>');

export function watchlistBlock(open) {
  const list = getWatchlist();
  return `<details class="set-group" data-group="watchlist"${open ? ' open' : ''}>
    <summary>${head(list.length)}</summary>
    <p class="set-hint">Diese Märkte prüft der Wächter bei jedem Lauf zusätzlich genau. Für den Wächter danach „Für den Wächter übernehmen“.</p>
    <input id="wl-q" class="mk-search" type="search" placeholder="Markt hinzufügen, z. B. SOL" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Markt zur Watchlist hinzufügen">
    <div id="wl-hits" class="mk-hits" aria-live="polite"></div>
    <p id="wl-msg" class="set-hint" role="status"></p>
    <div id="wl-chips">${chips(list)}</div>
  </details>`;
}

function renderHits() {
  const q = $('wl-q')?.value || '', box = $('wl-hits');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = ''; return; }
  const hits = matchMarkets(q, getNames(), getWatchlist());
  box.innerHTML = hits.length
    ? hits.map((c) => `<button type="button" data-wl-add="${esc(c)}">+ ${esc(dn(c))}</button>`).join('')
    : `<p class="empty" style="font-size:13px">${getNames().length ? 'Kein weiterer Markt gefunden.' : 'Marktliste lädt noch …'}</p>`;
}

function refresh(msg = '') {
  const list = getWatchlist();
  if ($('wl-chips')) $('wl-chips').innerHTML = chips(list);
  const g = document.querySelector('details[data-group="watchlist"] summary');
  if (g) g.innerHTML = head(list.length);
  if ($('wl-msg')) $('wl-msg').textContent = msg;
  renderHits();
}

export function bindWatchlist(root, namesGetter) {
  getNames = namesGetter;
  root.addEventListener('input', (e) => { if (e.target.id === 'wl-q') renderHits(); });
  root.addEventListener('click', (e) => {
    const add = e.target.closest('button[data-wl-add]');
    if (add) { const err = addToWatchlist(add.dataset.wlAdd); refresh(err || ''); $('wl-q')?.focus(); return; }
    const del = e.target.closest('button[data-wl-del]');
    if (del) { removeFromWatchlist(del.dataset.wlDel); refresh(); }
  });
}
