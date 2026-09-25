// Anzeige der Testseite. Liest nur aus dem Store, rechnet nichts selbst,
// außer über die Funktionen aus core/calc.js.
import { CONFIG } from './config.js';
import { priceHealth, accountHealth, streamHealth } from './core-health.js';
import { accountSummary } from './core-calc.js';
import { enrichPositions } from './core-positions.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_TEXT = { ok: 'OK', veraltet: 'Veraltet', fehler: 'Fehler', fehlt: 'Keine Daten' };
const STREAM_TEXT = { verbunden: 'Live verbunden', verbinde: 'Verbinde …', getrennt: 'Getrennt', fallback: 'Ersatzbetrieb (Abfrage alle 5 s)' };

function row(status, label, meta) {
  return `<div class="hrow"><span class="dot s-${status}"></span><span class="label">${esc(label)}</span>
    <span class="meta">${esc(meta)}</span><span class="tag t-${status}">${STATUS_TEXT[status]}</span></div>`;
}

function renderHealth(s, now, hasAddr) {
  const sh = streamHealth(s);
  const freshest = Math.max(0, ...Object.values(s.priceTs));
  const ah = accountHealth(s, now);
  const known = CONFIG.watchlist.filter((c) => s.priceTs[c]).length;
  const mkCount = Object.values(s.markets).reduce((n, l) => n + l.length, 0);
  $('health').innerHTML =
    row(sh, 'Live-Kurse', `${STREAM_TEXT[s.stream]}, ${f.age(freshest ? now - freshest : null)}`) +
    row(hasAddr ? ah.status : 'fehlt', 'Kontodaten', hasAddr ? f.age(ah.age) : 'Adresse fehlt') +
    row(known === CONFIG.watchlist.length ? 'ok' : known ? 'veraltet' : 'fehlt', 'Watchlist', `${known} von ${CONFIG.watchlist.length} Märkten gefunden`) +
    row(mkCount ? 'ok' : 'fehlt', 'Marktliste', `${mkCount} Märkte geladen`);
}

function renderAccount(s) {
  const a = s.account;
  if (!a) {
    $('account').innerHTML = `<p class="empty">${s.accountError ? 'Konto konnte nicht geladen werden: ' + esc(s.accountError) : 'Noch keine Daten. Gib oben deine Adresse ein.'}</p>`;
    return;
  }
  const sum = accountSummary(a, CONFIG.accountMode);
  $('account').innerHTML = `<div class="kv">
    <div class="span2"><span class="k">Kontowert</span><span class="v big">${f.usd(sum.equity)}</span></div>
    <div><span class="k">Verfügbar</span><span class="v">${f.usd(sum.available)}</span></div>
    <div><span class="k">In Positionen</span><span class="v">${f.usd(sum.inPositions)}</span></div>
    <div><span class="k">Kapital-Auslastung</span><span class="v">${f.pct(sum.usagePct)}</span></div>
    <div><span class="k">Effektiver Hebel</span><span class="v">${f.lev(sum.leverage)}</span></div>
  </div>${a.partialErrors.length ? `<p class="empty" style="margin-top:12px">Teilweise nicht geladen: ${esc(a.partialErrors.join(', '))}</p>` : ''}`;
}

function renderPositions(s, now) {
  const a = s.account;
  if (!a) { $('positions').innerHTML = '<p class="empty">Keine Kontodaten.</p>'; return; }
  if (!a.positions.length) { $('positions').innerHTML = '<p class="empty">Aktuell keine offenen Positionen.</p>'; return; }
  const COLOR = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' };
  $('positions').innerHTML = enrichPositions(s, now).map((p) => {
    const ev = p.evaluation;
    const barW = p.liqDist == null ? 0 : Math.max(3, Math.min(100, p.liqDist * 3));
    const issues = ev.checks.filter((c) => c.status !== 'ok');
    return `<article class="pos">
      <div class="pos-head">
        <span><span class="coin">${esc(p.coin)}</span><span class="side ${p.side}">${p.side === 'long' ? 'LONG' : 'SHORT'} ${f.lev(p.leverage)} ${p.leverageType}</span></span>
        <span class="${p.upnl >= 0 ? 'long' : 'short'}" style="font-weight:800">${f.signedUsd(p.upnl)}</span>
      </div>
      <div class="pos-grid">
        <div><span class="k">Einstieg</span>${f.price(p.entry)}</div>
        <div><span class="k">${p.live ? 'Live-Kurs' : 'Mark (Snapshot)'}</span>${f.price(p.mark)}</div>
        <div><span class="k">Größe</span>${f.size(p.size)}</div>
        <div><span class="k">Stop-Loss${p.stopSource ? ' (' + p.stopSource + ')' : ''}</span>${f.price(p.stop)}</div>
        <div><span class="k">Liquidation</span>${f.price(p.liq)}</div>
        <div><span class="k">Abstand Liq.</span>${f.pct(p.liqDist)}</div>
        <div><span class="k">Verlust bis Stop</span>${ev.loss == null ? '–' : f.usd(ev.loss)}</div>
        <div><span class="k">vom Konto</span>${f.pct(ev.riskPct)}</div>
        <div><span class="k">Margin</span>${f.usd(p.marginUsed)}</div>
      </div>
      <div class="bar"><span style="width:${barW}%;background:${COLOR[ev.checks.find((c) => c.rule === 'Abstand Liquidation')?.status || 'ok']}"></span></div>
      ${issues.map((c) => `<p class="warnline" style="margin:0;color:${COLOR[c.status]}">${esc(c.rule)}: ${esc(c.text)}</p>`).join('')}
    </article>`;
  }).join('');
}

function renderWatch(s, now) {
  const allNames = new Set(Object.values(s.markets).flat());
  $('watch').innerHTML = `<div class="wl">${CONFIG.watchlist.map((c) => {
    const h = priceHealth(s, c, now);
    const unknown = allNames.size && !allNames.has(c);
    return `<div class="wl-row"><span class="dot s-${h.status}"></span><span class="sym">${esc(c)}</span>
      ${unknown ? '<span class="tag t-fehler">Name unbekannt</span>' : `<span class="px">${f.price(s.prices[c])}</span><span class="age">${f.age(h.age)}</span>`}</div>`;
  }).join('')}</div>`;
}

function renderErrors(s) {
  $('errors').innerHTML = s.errors.length
    ? s.errors.map((e) => `<div class="err"><b>${esc(e.source)}</b> ${new Date(e.time).toLocaleTimeString('de-DE')}: ${esc(e.message)}</div>`).join('')
    : '<p class="empty">Keine Fehler.</p>';
}

let lastMarketsKey = '';
function renderMarkets(s) {
  const filter = ($('market-filter').value || '').trim().toUpperCase();
  const key = filter + '|' + Object.values(s.markets).map((l) => l.length).join(',');
  if (key === lastMarketsKey) return;
  lastMarketsKey = key;
  $('markets').innerHTML = Object.entries(s.markets).map(([dex, list]) => {
    const shown = list.filter((n) => !filter || n.toUpperCase().includes(filter));
    return `<div class="mk-group"><h3>${dex ? 'Bereich „' + esc(dex) + '“' : 'Hauptbörse'} (${shown.length})</h3>
      <div class="mk-list">${shown.map((n) => `<span>${esc(n)}</span>`).join('')}</div></div>`;
  }).join('') || '<p class="empty">Noch nicht geladen.</p>';
}

export function render(s, hasAddr) {
  const now = Date.now();
  renderHealth(s, now, hasAddr);
  renderAccount(s);
  renderPositions(s, now);
  renderWatch(s, now);
  renderErrors(s);
  renderMarkets(s);
}
