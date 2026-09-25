// Startseite: das Wichtigste auf einen Blick.
import { CONFIG } from './config.js';
import { accountRisk } from './core-positions.js';
import { performance } from './core-performance.js';
import { hot, onHot, startHot, stopHot } from './core-hotscan.js';
import { badge, esc, topReasons, seal } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const HOT_KEY = 'wolfdesk.hotOn';
let getState = () => ({});
let onTrade = () => {}, onDetail = () => {};

export function renderHome(s) {
  const r = accountRisk(s);
  if (!r) {
    $('home-top').innerHTML = `<p class="empty">Noch keine Kontodaten. Trag unter <a href="#system">System</a> deine Wallet-Adresse ein.</p>`;
    $('home-alerts').innerHTML = ''; $('home-pos').innerHTML = '';
    return;
  }
  const perf = performance(r.summary.equity, CONFIG.startCapital);
  const upnl = s.account.positions.reduce((n, p) => n + (p.upnl || 0), 0);
  const rt = r.realizedToday;
  $('home-top').innerHTML = `<span class="k">Kontowert</span>
    <div class="home-equity">${f.usd(r.summary.equity)}</div>
    <div class="home-perf ${perf.pnl >= 0 ? 'long' : 'short'}">${f.signedUsd(perf.pnl)} · ${perf.pct >= 0 ? '+' : ''}${f.pct(perf.pct, 1)} seit Start</div>
    <div class="kv" style="margin-top:14px">
      <div><span class="k">Offener PnL</span><span class="v ${upnl >= 0 ? 'long' : 'short'}">${f.signedUsd(upnl)}</span></div>
      <div><span class="k">Heute realisiert</span><span class="v ${rt > 0 ? 'long' : rt < 0 ? 'short' : ''}">${f.signedUsd(rt)}</span></div>
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
    return `<a href="#konto" class="pos-row"><span class="dot r-${st}"></span>
      <span class="sym">${esc(p.coin)} <small class="${p.side}">${p.side === 'long' ? 'L' : 'S'} ${f.lev(p.leverage)}</small></span>
      <span class="meta">Liq ${f.pct(p.liqDist)}</span>
      <span class="${p.upnl >= 0 ? 'long' : 'short'}" style="font-weight:800">${f.signedUsd(p.upnl)}</span></a>`;
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

export function initHome(stateGetter, openTrade, openDetail) {
  getState = stateGetter;
  onTrade = openTrade; onDetail = openDetail;
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
