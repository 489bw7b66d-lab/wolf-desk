// Anzeige der Testseite. Liest nur aus dem Store, rechnet nichts selbst,
// außer über die Funktionen aus core/calc.js.
import { CONFIG } from './config.js';
import { getWatchlist } from './core-watchlist.js';
import { priceHealth, accountHealth, streamHealth } from './core-health.js';
import { accountSummary } from './core-calc.js';
import { enrichPositions } from './core-positions.js';
import { tradeHistory, openTradeFor, change24h } from './core-trades.js';
import { tradePath } from './core-path.js';
import { getPlans, planFor, signalFor, targetsFor } from './core-plans.js';
import { getAutoPlan } from './core-autoplan.js';
import { stopNoise, atrFor, setupTf } from './core-guard.js';
import { getFeedSignals } from './ui-feed.js';
import { trailForPosition, hitsFromPath, trailText } from './core-trail.js';
import { dayPnlOf } from './core-performance.js';
import { getCandles } from './core-scanner.js';
import { tipInline, coinIcon } from './ui-parts.js';
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

// Auf einen Blick unter dem Kontowert: offenes PnL und PnL der letzten 24 Std. (realisiert + offen)
function pnlLine(s) {
  const open = (s.account?.positions || []).reduce((n, p) => n + (p.upnl || 0), 0);
  const day = dayPnlOf(s.portfolio);
  const c = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
  return `<div class="acc-pnl"><span class="${c(open)}">${f.signedUsd(open)} offen</span>${day == null ? '' : ` <span class="muted">·</span> <span class="${c(day)}">${f.signedUsd(day)} heute</span>`}</div>`;
}

function renderAccount(s) {
  const a = s.account;
  if (!a) {
    $('account').innerHTML = `<p class="empty">${s.accountError ? 'Konto konnte nicht geladen werden: ' + esc(s.accountError) : 'Noch keine Daten. Gib oben deine Adresse ein.'}</p>`;
    return;
  }
  const sum = accountSummary(a, CONFIG.accountMode);
  $('account').innerHTML = `<div class="kv">
    <div class="span2"><span class="k">Kontowert</span><span class="v big">${f.usd(sum.equity)}</span>${pnlLine(s)}</div>
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
    const pp = positionPlan(s, p, t);
    return `<article class="pos" data-coin="${esc(p.coin)}" role="button" tabindex="0" aria-label="${esc(p.coin)}: Chart und Details öffnen">
      <div class="pos-head">
        <span><span class="coin">${coinIcon(p.coin, 24)}${esc(p.coin.replace(/^[a-z]+:/, ''))}</span><span class="side ${p.side}">${p.side === 'long' ? 'LONG' : 'SHORT'} ${f.lev(p.leverage)} ${p.leverageType}</span></span>
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
      ${pathBar(pp.path)}
      ${pp.trail ? `<p class="trail-hint">↗ ${esc(trailText(pp.trail, pp.trail.tf, f.price))}</p>` : ''}
      ${issues.map((c) => `<p class="warnline" style="margin:0;color:${COLOR[c.status]}">${esc(c.rule)}: ${esc(c.text)}</p>`).join('')}
      ${posNoise(p)}
      <span class="pos-open">Chart & Teilverkäufe anzeigen</span>
    </article>`;
  }).join('');
}

// Trade-Weg und Nachzieh-Vorschlag einer Position (auch fürs Markt-Blatt)
export function positionPlan(s, p, t) {
  const signal = signalFor(getFeedSignals(), p.coin, p.side, t?.openedAt);
  const targets = targetsFor({ plan: planFor(getPlans(), p.coin, p.side, t?.openedAt), signal, auto: t?.partial ? null : getAutoPlan(p.coin, p.side, p.entry, t?.openedAt) });
  const path = tradePath(p, s.account?.orders, t?.exits, CONFIG.exitPlan, targets);
  const style = signal?.style || CONFIG.positions?.autoStyle || 'swing';
  const trail = trailForPosition(p, hitsFromPath(path), t?.openedAt, style, getCandles);
  return { path, trail };
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

// Trade-Weg als Fortschrittsbalken: gefüllt bis zum Kurs, beschriftete Striche für SL, Einstieg und Ziele, 🏁 am Ende
export function pathBar(path) {
  if (!path) return '';
  if (path.empty) return `<p class="path-info meta">Noch keine Ziele für diesen Trade. Im Markt-Blatt (Tipp auf die Position) kannst du sie festlegen.</p>`;
  const pct = (x) => (x * 100).toFixed(1);
  const m = path.mark;
  // Rot vom linken Ende bis zum Einstieg (bzw. bis zum Kurs, wenn er darunter liegt), grün vom Einstieg bis zum Kurs
  const e = path.entry.at, at = m ? m.at : 0;
  const red = Math.min(at, e), green = Math.max(0, at - e);
  const last = path.tps.length - 1;
  const moved = path.origStop && path.stop && Math.abs(path.stop.at - path.origStop.at) > 0.005;
  let ticks = [
    path.left.kind === 'liq' ? { at: 0, label: 'Liq', cls: 'liq' } : null,
    path.origStop && (moved || !path.stop) ? { at: path.origStop.at, label: 'SL₀', cls: 'sl0' } : null,
    path.stop ? { at: path.stop.at, label: path.stop.inProfit ? 'SL✓' : 'SL', cls: path.stop.inProfit ? 'sl-gain' : 'sl' } : null,
    { at: path.entry.at, label: 'E', cls: 'e' },
    ...path.tps.map((t, i) => ({ at: t.at, label: i === last ? `🏁 TP${t.n}${t.reached ? '✓' : ''}` : `TP${t.n}${t.reached ? '✓' : ''}`, cls: t.passed ? 'tp done' : 'tp' })),
  ].filter(Boolean).sort((a, b) => a.at - b.at);
  // Beschriftungen, die zu nah beieinander liegen, rutschen in eine zweite Zeile
  let lastTop = -1, lastBottom = -1;
  ticks = ticks.map((x) => {
    const room = 0.11;
    if (x.at - lastTop >= room || lastTop < 0) { lastTop = x.at; return { ...x, row: 0 }; }
    if (x.at - lastBottom >= room || lastBottom < 0) { lastBottom = x.at; return { ...x, row: 1 }; }
    lastTop = x.at; return { ...x, row: 0 };
  });
  const twoRows = ticks.some((x) => x.row === 1);
  const info = [];
  if (path.left.kind === 'liq') info.push('kein Stop: Balken beginnt bei der Liquidation');
  // Nachgezogener Stop: „abgesichert“ erst, wenn er auf der Gewinnseite liegt, vorher nur „Risiko verringert“
  const secured = moved && path.stop.at > path.origStop.at;
  if (secured) info.push(path.stop.inProfit ? 'Stop nachgezogen, schraffiert = Gewinn abgesichert' : 'Stop nachgezogen, schraffiert = Risiko verringert');
  if (path.next) info.push(`nächstes Ziel TP${path.next.n}: ${path.next.pct >= 0 ? '+' : '−'}${f.pct(Math.abs(path.next.pct), 1)}`);
  else if (m?.beyond) info.push('🏁 Ziel erreicht');
  if (path.found < path.planned) info.push(`${path.planned - path.found} von ${path.planned} Zielen fehlen`);
  const edge = (x) => (x.at < 0.06 ? ' first' : x.at > 0.94 ? ' last' : '');
  return `<div class="path" role="img" aria-label="Trade-Weg: ${ticks.map((x) => x.label).join(', ')}">
    <div class="path-track"><span class="path-fill loss" style="left:0;width:${pct(red)}%"></span><span class="path-fill gain" style="left:${pct(e)}%;width:${pct(green)}%"></span>${moved && path.stop.at > path.origStop.at ? `<span class="path-secured" style="left:${pct(path.origStop.at)}%;width:${pct(path.stop.at - path.origStop.at)}%" title="${path.stop.inProfit ? 'durch nachgezogenen Stop abgesichert' : 'Risiko durch nachgezogenen Stop verringert'}"></span>` : ''}
      ${ticks.map((x) => `<i class="path-tick ${x.cls}" style="left:${pct(x.at)}%"></i>`).join('')}</div>
    <div class="path-labels${twoRows ? ' two' : ''}">${ticks.map((x) => `<span class="${x.cls}${edge(x)} r${x.row}" style="left:${pct(x.at)}%">${x.label}</span>`).join('')}</div>
    <div class="path-info meta">${info.join(' · ')} ${tipInline('Ziele ' + path.source.label, 'path|' + path.entry.price + '|' + path.source.label)}</div>
  </div>`;
}

// Stop-Check einer offenen Position gegen die normale Schwankung (nur wenn der Stop noch auf der Verlustseite liegt)
function posNoise(p) {
  if (p.stop == null || (p.side === 'long' ? p.stop >= p.entry : p.stop <= p.entry)) return '';
  const tf = setupTf(), n = stopNoise(p.mark || p.entry, p.stop, atrFor(p.coin, tf));
  if (!n || n.status === 'ok') return '';
  return `<p class="warnline" style="margin:0;color:${n.status === 'bad' ? 'var(--bad)' : 'var(--warn)'}">Stop-Check (${tf.toUpperCase()}): ${n.text}. Sinnvoller: ${f.price(n.suggest.stop)}</p>`;
}
