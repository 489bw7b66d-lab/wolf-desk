// Anzeige der Testseite. Liest nur aus dem Store, rechnet nichts selbst,
// außer über die Funktionen aus core/calc.js.
import { CONFIG } from './config.js';
import { getWatchlist } from './core-watchlist.js';
import { priceHealth, accountHealth, streamHealth } from './core-health.js';
import { accountSummary } from './core-calc.js';
import { enrichPositions } from './core-positions.js';
import { tradeHistory, openTradeFor, change24h } from './core-trades.js';
import { tradePath } from './core-path.js';
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
  const known = getWatchlist().filter((c) => s.priceTs[c]).length;
  const mkCount = Object.values(s.markets).reduce((n, l) => n + l.length, 0);
  $('health').innerHTML =
    row(sh, 'Live-Kurse', `${STREAM_TEXT[s.stream]}, ${f.age(freshest ? now - freshest : null)}`) +
    row(hasAddr ? ah.status : 'fehlt', 'Kontodaten', hasAddr ? f.age(ah.age) : 'Adresse fehlt') +
    row(known === getWatchlist().length ? 'ok' : known ? 'veraltet' : 'fehlt', 'Watchlist', `${known} von ${getWatchlist().length} Märkten gefunden`) +
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
  const trades = s.fills ? tradeHistory(s.fills) : null;
  const openMore = new Set([...$('positions').querySelectorAll('details[open]')].map((d) => d.dataset.more));
  $('positions').innerHTML = enrichPositions(s, now).map((p) => {
    const ev = p.evaluation;
    const ch = change24h(s.prices?.[p.coin], s.prevDay?.[p.coin]);
    const t = trades ? openTradeFor(trades, p.coin) : null;
    // Stop liegt auf der Gewinnseite des Einstiegs: kein Risiko mehr, sondern gesicherter Mindestgewinn
    const inProfit = p.stop != null && (p.side === 'long' ? p.stop >= p.entry : p.stop <= p.entry);
    const locked = inProfit ? Math.abs(p.size) * Math.abs(p.stop - p.entry) : null;
    const issues = ev.checks.filter((c) => c.status !== 'ok');
    return `<article class="pos" data-coin="${esc(p.coin)}" role="button" tabindex="0" aria-label="${esc(p.coin)}: Chart und Details öffnen">
      <div class="pos-head">
        <span><span class="coin">${esc(p.coin.replace(/^[a-z]+:/, ''))}</span><span class="side ${p.side}">${p.side === 'long' ? 'LONG' : 'SHORT'} ${f.lev(p.leverage)} ${p.leverageType}</span></span>
        <span class="${p.upnl >= 0 ? 'long' : 'short'}" style="font-weight:800">${f.signedUsd(p.upnl)}</span>
      </div>
      <div class="pos-live"><span>${f.price(p.mark)}</span><b class="${ch == null ? 'muted' : ch >= 0 ? 'long' : 'short'}">${ch == null ? '' : (ch >= 0 ? '+' : '−') + f.pct(Math.abs(ch), 2) + ' 24h'}</b>
        ${t && t.exits.length ? `<span class="pos-real">Realisiert ${f.signedUsd(t.realized)} · ${t.exits.length} Teilverk.</span>` : ''}</div>
      <div class="pos-grid">
        <div><span class="k">Einstieg</span>${f.price(p.entry)}</div>
        <div><span class="k">Stop-Loss${p.stopSource === 'manuell' ? ' (manuell)' : ''}</span>${p.stop == null ? '<b class="short">fehlt</b>' : f.price(p.stop)}</div>
        <div><span class="k">Abstand Liq.</span>${f.pct(p.liqDist)}</div>
        ${inProfit
          ? `<div><span class="k">Stop im Gewinn</span><b class="long">✓ gesichert</b></div><div><span class="k">Mind. Gewinn</span><b class="long">${f.signedUsd(locked)}</b></div>`
          : `<div><span class="k">Risiko ab Einstieg</span>${ev.fromEntry == null ? '–' : f.usd(ev.fromEntry)}</div><div><span class="k">vom Konto</span>${f.pct(ev.riskPct)}</div>`}
        <div><span class="k">Margin</span>${f.usd(p.marginUsed)}</div>
      </div>
      <details class="pos-more" data-more="${esc(p.coin)}"${openMore.has(p.coin) ? ' open' : ''}>
        <summary>Mehr Details</summary>
        <div class="pos-grid">
          <div><span class="k">Größe</span>${f.size(p.size)}</div>
          <div><span class="k">Liquidation</span>${f.price(p.liq)}</div>
          <div><span class="k">Hebel</span>${f.lev(p.leverage)} ${p.leverageType}</div>
          <div><span class="k">${ev.liqFirst ? 'Verlust bis Liq.' : inProfit ? 'Rückgabe bis Stop' : 'Verlust bis Stop'}</span>${ev.fromNow == null ? '–' : f.usd(ev.fromNow)}</div>
          <div><span class="k">davon Buchgewinn</span>${ev.giveBack == null ? '–' : f.usd(ev.giveBack)}</div>
          <div><span class="k">Stop-Quelle</span>${p.stopSource || '–'}</div>
        </div>
      </details>
      ${pathBar(tradePath(p, s.account?.orders, t?.exits, CONFIG.exitPlan))}
      ${issues.map((c) => `<p class="warnline" style="margin:0;color:${COLOR[c.status]}">${esc(c.rule)}: ${esc(c.text)}</p>`).join('')}
      <span class="pos-open">Chart & Teilverkäufe anzeigen</span>
    </article>`;
  }).join('');
}

function renderWatch(s, now) {
  const allNames = new Set(Object.values(s.markets).flat());
  $('watch').innerHTML = `<div class="wl">${getWatchlist().map((c) => {
    const h = priceHealth(s, c, now);
    const unknown = allNames.size && !allNames.has(c);
    return `<div class="wl-row"><span class="dot s-${h.status}"></span><span class="sym">${esc(c.replace(/^[a-z]+:/, ''))}</span>
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

// Trade-Weg als Fortschrittsbalken: gefüllt vom Stop bis zum Kurs, beschriftete Striche für SL, Einstieg und Ziele
function pathBar(path) {
  if (!path) return '';
  if (path.empty) return `<p class="path-info meta">Noch keine Take-Profit-Orders gefunden. Der Trade-Weg erscheint, sobald bei Hyperliquid Ziele gesetzt sind.</p>`;
  const pct = (x) => (x * 100).toFixed(1);
  const m = path.mark;
  const fill = m ? m.at : 0;
  const cls = m && m.at < path.entry.at ? 'loss' : 'gain';
  const ticks = [
    { at: path.left.at, label: path.left.kind === 'stop' ? 'SL' : path.left.kind === 'liq' ? 'Liq' : '', cls: path.left.kind === 'liq' ? 'liq' : 'sl' },
    { at: path.entry.at, label: 'E', cls: 'e' },
    ...path.tps.map((t) => ({ at: t.at, label: `TP${t.n}${t.reached ? '✓' : ''}`, cls: t.passed ? 'tp done' : 'tp' })),
  ];
  const info = [];
  if (path.left.kind === 'liq') info.push('kein Stop: Balken beginnt bei der Liquidation');
  path.tps.filter((t) => t.reached).forEach((t) => info.push(`TP${t.n} ✓`));
  if (path.next) info.push(`nächstes Ziel TP${path.next.n}: ${path.next.pct >= 0 ? '+' : '−'}${f.pct(Math.abs(path.next.pct), 1)}`);
  else if (m?.beyond) info.push('alle Ziele überschritten');
  if (path.found < path.planned) info.push(`${path.planned - path.found} von ${path.planned} Zielen ohne Order`);
  return `<div class="path" role="img" aria-label="Trade-Weg: ${ticks.map((x) => x.label).filter(Boolean).join(', ')}">
    <div class="path-track"><span class="path-fill ${cls}" style="width:${pct(fill)}%"></span>
      ${ticks.map((x) => `<i class="path-tick ${x.cls}" style="left:${pct(x.at)}%"></i>`).join('')}</div>
    <div class="path-labels">${ticks.map((x, i) => `<span class="${x.cls}${i === 0 ? ' first' : i === ticks.length - 1 ? ' last' : ''}" style="left:${pct(x.at)}%">${x.label}</span>`).join('')}</div>
    ${info.length ? `<p class="path-info meta">${info.join(' · ')}</p>` : ''}
  </div>`;
}
