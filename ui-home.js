// Startseite: das Wichtigste auf einen Blick.
import { CONFIG } from './config.js';
import { accountRisk } from './core-positions.js';
import { parsePortfolio } from './core-performance.js';
import { perfSplit, change24h } from './core-trades.js';
import { hot, onHot, startHot, stopHot } from './core-hotscan.js';
import { badge, esc, topReasons, seal } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const HOT_KEY = 'wolfdesk.hotOn';
let getState = () => ({});
let onTrade = () => {}, onDetail = () => {}, onCoin = () => {};

export function renderHome(s) {
  const r = accountRisk(s);
  if (!r) {
    $('home-top').innerHTML = `<p class="empty">Noch keine Kontodaten. Trag unter <a href="#system">System</a> deine Wallet-Adresse ein.</p>`;
    $('home-alerts').innerHTML = ''; $('home-pos').innerHTML = '';
    return;
  }
  const upnl = s.account.positions.reduce((n, p) => n + (p.upnl || 0), 0);
  const split = perfSplit(r.summary.equity, CONFIG.startCapital, upnl);
  const rt = r.realizedToday;
  const day = s.portfolio ? parsePortfolio(s.portfolio).day?.pnl : null;
  const dayPnl = day?.length ? day.at(-1)[1] - day[0][1] : null;
  const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : '');
  $('home-top').innerHTML = `<span class="k">Kontowert</span>
    <div class="home-equity">${f.usd(r.summary.equity)}</div>
    ${split ? `<div class="home-perf ${split.total >= 0 ? 'long' : 'short'}">${f.signedUsd(split.total)} · ${split.pct >= 0 ? '+' : ''}${f.pct(split.pct, 1)} gesamt</div>` : ''}
    <div class="kv" style="margin-top:14px">
      <div><span class="k">PnL 24 Std</span><span class="v ${cls(dayPnl)}">${f.signedUsd(dayPnl)}</span></div>
      <div><span class="k">Heute realisiert</span><span class="v ${cls(rt)}">${f.signedUsd(rt)}</span></div>
      <div><span class="k">Realisiert gesamt</span><span class="v ${cls(split?.realized)}">${f.signedUsd(split?.realized)}</span></div>
      <div><span class="k">Buchgewinn offen</span><span class="v ${cls(upnl)}">${f.signedUsd(upnl)}</span></div>
      <div><span class="k">Verfügbar</span><span class="v">${f.usd(r.summary.available)}</span></div>
      <div><span class="k">Auslastung</span><span class="v">${f.pct(r.summary.usagePct)}</span></div>
    </div>`;

  // Alle Regelverstöße und Warnungen an einer Stelle
  const issues = [
    ...r.checks.filter((c) => c.status !== 'ok').map((c) => ({ ...c, who: 'Konto' })),
    ...r.positions.flatMap((p) => p.evaluation.checks.filter((c) => c.status !== 'ok').map((c) => ({ ...c, who: p.coin }))),
  ].sort((a, b) => (a.status === 'bad' ? 0 : 1) - (b.status === 'bad' ? 0 : 1));
  $('home-alerts').innerHTML = issues.length
    ? `<a href="#risiko" class="alert-box ${issues.some((i) => i.status === 'bad') ? 'bad' : 'warn'}">
        <b>${issues.filter((i) => i.status === 'bad').length ? issues.filter((i) => i.status === 'bad').length + ' Regelverstoß' + (issues.filter((i) => i.status === 'bad').length > 1 ? 'e' : '') : issues.length + ' Warnung' + (issues.length > 1 ? 'en' : '')}</b>
        ${issues.slice(0, 4).map((i) => `<span>${i.status === 'bad' ? '●' : '○'} <b class="who">${esc(i.who)}</b> ${esc(i.rule)}: ${esc(i.text)}</span>`).join('')}
        ${issues.length > 4 ? `<span class="more">+ ${issues.length - 4} weitere</span>` : ''}
      </a>`
    : '<div class="alert-box ok"><b>Alle Regeln eingehalten</b></div>';

  $('home-pos').innerHTML = r.positions.length ? r.positions.map((p) => {
    const st = p.evaluation.worst;
    const ch = change24h(s.prices?.[p.coin], s.prevDay?.[p.coin]);
    return `<button type="button" class="pos-row" data-coin="${esc(p.coin)}"><span class="dot r-${st}"></span>
      <span class="sym">${esc(p.coin)} <small class="${p.side}">${p.side === 'long' ? 'L' : 'S'} ${f.lev(p.leverage)}</small>
        <span class="pos-px">${f.price(p.mark)} <b class="${ch == null ? 'muted' : ch >= 0 ? 'long' : 'short'}">${ch == null ? '' : (ch >= 0 ? '+' : '−') + f.pct(Math.abs(ch), 2)}</b></span></span>
      <span class="meta">Liq ${f.pct(p.liqDist)}</span>
      <span class="${p.upnl >= 0 ? 'long' : 'short'}" style="font-weight:800">${f.signedUsd(p.upnl)}</span></button>`;
  }).join('') : '<p class="empty">Keine offenen Positionen.</p>';
}

function renderHot() {
  const toggle = $('hot-toggle');
  toggle.textContent = hot.running ? 'Pause' : 'Start';
  toggle.setAttribute('aria-label', hot.running ? 'Überwachung pausieren' : 'Überwachung starten');
  let status;
  if (hot.phase === 'Pause') status = `Aktualisiert ${new Date(hot.lastRound).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · nächster Scan in ${Math.max(0, Math.round((hot.nextRound - Date.now()) / 60000))} Min.`;
  else if (hot.running) status = `${hot.phase}: ${hot.done} von ${hot.total}`;
  else status = 'Pausiert.';
  const prog = hot.running && hot.total && hot.phase !== 'Pause' ? `<div class="bar" style="margin-top:8px"><span style="width:${(hot.done / hot.total) * 100}%;background:var(--gold)"></span></div>` : '';
  $('hot-status').innerHTML = `<p class="empty" style="font-size:13px">${esc(status)}${hot.source ? ` · ${esc(hot.source)}` : ''}</p>${prog}${hot.error ? `<p class="warnline">${esc(hot.error)}</p>` : ''}`;
  $('hot-list').innerHTML = hot.picks.length ? hot.picks.map(({ r }, i) => `<button type="button" class="hot-row" data-hot="${esc(r.coin)}">
      <span class="rank">${i + 1}</span>
      <span class="hot-main"><span class="sym">${esc(r.coin)} ${seal(r, true)}</span><span class="reasons">${topReasons(r, 2).map(esc).join(' · ') || 'Trend-Konfluenz'}</span></span>
      <span class="hot-side">${badge(r.dir)}<span class="heat">Score ${r.total[r.dir]}</span></span>
    </button>`).join('')
    : hot.lastRound ? '<p class="empty">Gerade kein Coin mit klarem Signal. Kein Trade ist auch eine Entscheidung.</p>'
    : hot.running ? '<p class="empty">Erster Durchlauf läuft, die Ergebnisse erscheinen nach und nach.</p>' : '';
}

export function initHome(stateGetter, openTrade, openDetail, openCoin) {
  getState = stateGetter;
  onTrade = openTrade; onDetail = openDetail; onCoin = openCoin;
  $('home-pos').addEventListener('click', (e) => { const b = e.target.closest('button[data-coin]'); if (b) onCoin(b.dataset.coin); });
  const markets = () => (getState().markets?.[''] || []);
  $('hot-toggle').addEventListener('click', () => {
    if (hot.running) { stopHot(); try { localStorage.setItem(HOT_KEY, '0'); } catch { /* egal */ } }
    else { startHot(markets); try { localStorage.setItem(HOT_KEY, '1'); } catch { /* egal */ } }
    renderHot();
  });
  $('hot-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-hot]');
    if (!b) return;
    const r = hot.results.get(b.dataset.hot) || hot.picks.find((p) => p.r.coin === b.dataset.hot)?.r;
    if (r?.plan) onTrade(r); else if (r) onDetail(r);
  });
  onHot(renderHot);
  setInterval(() => { if (hot.phase === 'Pause') renderHot(); }, 30000);
  renderHot();
  // Überwachung startet automatisch (außer du hast sie pausiert)
  let off = false;
  try { off = localStorage.getItem(HOT_KEY) === '0'; } catch { /* egal */ }
  if (!off) {
    const wait = setInterval(() => { if (markets().length) { clearInterval(wait); startHot(markets); } }, 1000);
  }
}
