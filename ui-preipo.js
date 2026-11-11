// Startseite: Karte „Pre-IPO-Märkte“ (8z1, Jensen 11.11.2026: „die Pre-IPOs interessieren mich, können wir die highlighten“).
// Zeigt alle Pre-IPO-Märkte, die Hyperliquid gerade listet, mit Kurs und 24-Stunden-Änderung; Antippen öffnet das Markt-Blatt.
// Die Liste (core-classes.js) lässt sich hier anpassen, weil sie mit jedem Börsengang veraltet. Nur Anzeige, keine Messung.
import { preIpoList, isPreIpo, setPreIpo } from './core-classes.js';
import { marketNames, matchMarkets } from './core-tradeable.js';
import { change24h } from './core-trades.js';
import { esc, dn, coinIcon } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({}), onCoin = () => {}, edit = false, sig = '';

export function renderPreIpo(s = getState()) {
  const box = $('preipo');
  if (!box) return;
  const names = marketNames().length ? marketNames() : Object.values(s.markets || {}).flat();
  const list = preIpoList(names).map((c) => ({ c, px: s.prices?.[c] ?? null, ch: change24h(s.prices?.[c], s.prevDay?.[c]) }))
    .sort((a, b) => (b.ch ?? -1e9) - (a.ch ?? -1e9));
  // Nur neu zeichnen, wenn sich etwas Sichtbares ändert (die Suche darf beim Live-Takt nicht verschwinden)
  const key = JSON.stringify([edit, list.map((x) => [x.c, x.px, x.ch == null ? null : Math.round(x.ch * 100)])]);
  if (key === sig) return;
  sig = key;
  const q = $('pre-q')?.value || '';
  const rows = list.map(({ c, px, ch }) => `<div class="pre-row"><button type="button" class="pre-open" data-pre="${esc(c)}" aria-label="${esc(dn(c))}: Markt öffnen">
      <span class="sym">${coinIcon(c)}${esc(dn(c))} <small class="pre-tag">Pre-IPO</small></span>
      <span class="pre-px">${px == null ? '–' : f.price(px)}</span>
      <b class="${ch == null ? 'muted' : ch >= 0 ? 'long' : 'short'}">${ch == null ? '–' : (ch >= 0 ? '+' : '−') + f.pct(Math.abs(ch), 2)}</b></button>
      ${edit ? `<button type="button" class="pre-del" data-predel="${esc(c)}" aria-label="${esc(dn(c))} aus der Liste nehmen">×</button>` : ''}</div>`).join('');
  box.innerHTML = `${list.length ? rows : `<p class="empty">${names.length ? 'Gerade kein Pre-IPO-Markt in der Liste.' : 'Marktliste lädt noch …'}</p>`}
    ${edit ? `<input id="pre-q" class="mk-search" type="search" placeholder="Markt hinzufügen, z. B. OPENAI" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Markt als Pre-IPO hinzufügen" value="${esc(q)}"><div id="pre-hits" class="mk-hits"></div>` : ''}
    <p class="empty" style="font-size:12px;margin-top:8px">Firmen vor dem Börsengang, gehandelt über xyz · 24 Stunden · nicht gemessen, dünner Handel möglich. <button type="button" class="link-btn" id="pre-edit">${edit ? 'Fertig' : 'Liste anpassen'}</button></p>`;
  if (edit) hits();
}

function hits() {
  const box = $('pre-hits'), q = $('pre-q')?.value || '';
  if (!box) return;
  const names = marketNames().filter((c) => c.includes(':') && !isPreIpo(c));
  box.innerHTML = q.trim() ? matchMarkets(q, names).map((c) => `<button type="button" data-preadd="${esc(c)}">+ ${esc(dn(c))}</button>`).join('') || '<p class="empty" style="font-size:13px">Kein Markt gefunden.</p>' : '';
}

export function initPreIpo(stateGetter, openCoin) {
  getState = stateGetter; onCoin = openCoin;
  const box = $('preipo');
  if (!box) return;
  box.addEventListener('input', (e) => { if (e.target.id === 'pre-q') hits(); });
  box.addEventListener('click', (e) => {
    const add = e.target.closest('[data-preadd]'), del = e.target.closest('[data-predel]'), open = e.target.closest('[data-pre]');
    if (add) { setPreIpo(add.dataset.preadd, true); if ($('pre-q')) $('pre-q').value = ''; sig = ''; renderPreIpo(); return; }
    if (del) { setPreIpo(del.dataset.predel, false); sig = ''; renderPreIpo(); return; }
    if (e.target.id === 'pre-edit') { edit = !edit; sig = ''; renderPreIpo(); return; }
    if (open) onCoin(open.dataset.pre);
  });
  renderPreIpo();
}
