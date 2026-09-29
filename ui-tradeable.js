// Einstellungen: „Handelbare Märkte“ pflegen. Suchfeld über alle Hyperliquid-Märkte (auch xyz), Tipp fügt hinzu,
// Tipp auf einen Eintrag entfernt ihn. Speichert sofort auf diesem Gerät (core-tradeable.js).
import { getTradeable, addTradeable, removeTradeable, clearTradeable, matchMarkets, loadLedger, isLedgerList, LEDGER_COUNT } from './core-tradeable.js';
import { esc, dn } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
let getNames = () => [];

// Aufklappbarer Block für die Einstellungs-Seite (open: war vorher aufgeklappt)
export function tradeableBlock(open) {
  const list = getTradeable();
  return `<details class="set-group" data-group="tradeable"${open ? ' open' : ''}>
    <summary><span>Handelbare Märkte (Ledger)</span>${list.length ? `<b class="set-badge">${list.length}</b>` : ''}</summary>
    <p class="set-hint">Nur diese Märkte scannen Heiße Coins und Wächter. Leer = wie bisher die Top-Coins. Für den Wächter danach „Für den Wächter übernehmen“.</p>
    <input id="tr-q" class="mk-search" type="search" placeholder="Markt suchen, z. B. SOL oder GOLD" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Markt suchen">
    <div id="tr-hits" class="mk-hits" aria-live="polite"></div>
    <div id="tr-chips">${chips(list)}</div>
  </details>`;
}

function chips(list) {
  if (!list.length) return `<p class="empty" style="font-size:13px;margin-top:10px">Noch keine Märkte eingetragen.</p><div class="mk-actions">${ledgerBtn(list)}</div>`;
  return `<div class="mk-chips" role="list">${list.map((c) => `<button type="button" role="listitem" data-tr-del="${esc(c)}" aria-label="${esc(dn(c))} entfernen">${esc(dn(c))}${c.includes(':') ? ` <small class="muted">${esc(c.split(':')[0])}</small>` : ''}</button>`).join('')}</div>
    <div class="mk-actions">${ledgerBtn(list)}<button type="button" class="small-btn ghost" id="tr-clear">Liste leeren</button></div>`;
}

const ledgerBtn = (list) => (isLedgerList(list) ? '' : `<button type="button" class="small-btn" id="tr-ledger">Ledger-Liste laden (${LEDGER_COUNT})</button>`);

function renderHits() {
  const q = $('tr-q')?.value || '';
  const hits = matchMarkets(q, getNames(), getTradeable());
  const box = $('tr-hits');
  if (!box) return;
  if (!q.trim()) { box.innerHTML = ''; return; }
  box.innerHTML = hits.length
    ? hits.map((c) => `<button type="button" data-tr-add="${esc(c)}">+ ${esc(dn(c))}${c.includes(':') ? ` <small class="muted">${esc(c.split(':')[0])}</small>` : ''}</button>`).join('')
    : `<p class="empty" style="font-size:13px">${getNames().length ? 'Kein weiterer Markt gefunden.' : 'Marktliste lädt noch …'}</p>`;
}

function refresh() {
  if ($('tr-chips')) $('tr-chips').innerHTML = chips(getTradeable());
  const g = document.querySelector('details[data-group="tradeable"] summary');
  const n = getTradeable().length;
  if (g) g.innerHTML = `<span>Handelbare Märkte (Ledger)</span>${n ? `<b class="set-badge">${n}</b>` : ''}`;
  renderHits();
}

// Einmal an den Einstellungs-Container hängen (Ereignisse bleiben auch nach Neuaufbau erhalten)
export function bindTradeable(root, namesGetter) {
  getNames = namesGetter;
  root.addEventListener('input', (e) => { if (e.target.id === 'tr-q') renderHits(); });
  root.addEventListener('click', (e) => {
    const add = e.target.closest('button[data-tr-add]');
    if (add) { addTradeable(add.dataset.trAdd); refresh(); $('tr-q')?.focus(); return; }
    const del = e.target.closest('button[data-tr-del]');
    if (del) { removeTradeable(del.dataset.trDel); refresh(); return; }
    if (e.target.id === 'tr-ledger' && confirm(`Deine Ledger-Liste mit ${LEDGER_COUNT} Märkten laden? Die jetzige Liste wird ersetzt.`)) { loadLedger(); refresh(); return; }
    if (e.target.id === 'tr-clear' && confirm('Alle handelbaren Märkte entfernen? Dann scannen Heiße Coins und Wächter wieder die Top-Coins.')) { clearTradeable(); refresh(); }
  });
}
