// Performance-Anzeige: Startkapital vs. Kontowert, Verlauf, Drawdown.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { parsePortfolio, equityCurve, maxDrawdown } from './core-performance.js';
import { perfSplit, tradeHistory, closedTrades } from './core-trades.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const PERIODS = { day: '24 Std', week: 'Woche', month: 'Monat', allTime: 'Gesamt' };
let period = 'allTime';

function chart(curve) {
  if (curve.length < 2) return '<p class="empty">Noch kein Verlauf für diesen Zeitraum.</p>';
  const W = 340, H = 120, P = 4;
  const vs = curve.map((c) => c[1]), ts = curve.map((c) => c[0]);
  const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1;
  const x = (t) => P + ((t - ts[0]) / (ts.at(-1) - ts[0] || 1)) * (W - 2 * P);
  const y = (v) => P + (1 - (v - min) / span) * (H - 2 * P);
  const line = curve.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const up = vs.at(-1) >= vs[0];
  const col = up ? 'var(--ok)' : 'var(--bad)';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Kontowert-Verlauf: von ${f.usd(vs[0])} auf ${f.usd(vs.at(-1))}">
    <path d="${line} L${x(ts.at(-1)).toFixed(1)} ${H} L${x(ts[0]).toFixed(1)} ${H} Z" fill="${col}" opacity="0.10"></path>
    <path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
  </svg>
  <div class="chart-scale"><span>${f.usd(min)}</span><span>${f.usd(max)}</span></div>`;
}

export function initPerformance(onChange) {
  $('perf-tabs').innerHTML = Object.entries(PERIODS).map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${k === period}">${l}</button>`).join('');
  $('perf-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-p]');
    if (!b) return;
    period = b.dataset.p;
    $('perf-tabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.p === period)));
    onChange();
  });
}

export function renderPerformance(s) {
  const a = s.account;
  renderTrades(s);
  if (!a) { $('perf').innerHTML = '<p class="empty">Noch keine Kontodaten.</p>'; $('perf-chart').innerHTML = ''; return; }
  const equity = accountSummary(a, CONFIG.accountMode).equity;
  const upnl = a.positions.reduce((n, p) => n + (p.upnl || 0), 0);
  const sp = perfSplit(equity, CONFIG.startCapital, upnl);
  const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : '');
  // Anteil realisiert / Buchgewinn als Balken (nur wenn beide positiv, sonst nur Zahlen)
  const bar = sp && sp.realized > 0 && sp.book > 0
    ? `<div class="split-bar" aria-hidden="true"><span style="width:${(sp.realized / (sp.realized + sp.book)) * 100}%"></span></div>` : '';
  $('perf').innerHTML = sp ? `<div class="kv">
    <div><span class="k">Gesamtperformance</span><span class="v big ${cls(sp.total)}">${sp.pct >= 0 ? '+' : ''}${f.pct(sp.pct, 2)}</span></div>
    <div><span class="k">Gewinn gesamt</span><span class="v ${cls(sp.total)}" style="margin-top:6px">${f.signedUsd(sp.total)}</span></div>
    <div><span class="k">Realisiert</span><span class="v ${cls(sp.realized)}">${f.signedUsd(sp.realized)}</span></div>
    <div><span class="k">Buchgewinn (offen)</span><span class="v ${cls(sp.book)}">${f.signedUsd(sp.book)}</span></div>
  </div>${bar}` : '<p class="empty">Startkapital fehlt in der Konfiguration.</p>';

  const all = s.portfolio ? parsePortfolio(s.portfolio) : null;
  const life = all?.allTime?.pnl;
  if (life?.length && sp) {
    const diff = sp.total - life.at(-1)[1];
    if (Math.abs(diff) > Math.max(25, Math.abs(life.at(-1)[1]) * 0.05)) {
      $('perf').innerHTML += `<p class="empty" style="margin-top:10px">Hyperliquid meldet ${f.signedUsd(diff)} Abweichung zur eigenen Rechnung. Das kann an weiteren Ein- oder Auszahlungen liegen.</p>`;
    }
  }
  const data = all ? all[period] : null;
  if (!data) { $('perf-chart').innerHTML = `<p class="empty">${s.portfolioError ? 'Verlauf konnte nicht geladen werden.' : 'Verlauf wird geladen …'}</p>`; return; }
  const curve = equityCurve(data.pnl, equity);
  const periodPnl = data.pnl.length ? data.pnl.at(-1)[1] - data.pnl[0][1] : null;
  $('perf-chart').innerHTML = chart(curve) + `<div class="kv" style="margin-top:12px">
    <div><span class="k">Ergebnis ${PERIODS[period]}</span><span class="v ${periodPnl >= 0 ? 'long' : 'short'}">${f.signedUsd(periodPnl)}</span></div>
    <div><span class="k">Max. Drawdown</span><span class="v">${f.pct(maxDrawdown(curve.map((c) => c[1])))}</span></div>
  </div>`;
}

// Abgeschlossene Trades der letzten 90 Tage mit Teilverkäufen
const dt = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
function renderTrades(s) {
  const box = $('trades');
  if (!box) return;
  if (!s.fills) { box.innerHTML = `<p class="empty">${s.fillsError ? 'Trades konnten nicht geladen werden.' : 'Trades werden geladen …'}</p>`; return; }
  const list = closedTrades(tradeHistory(s.fills), 15);
  if (!list.length) { box.innerHTML = '<p class="empty">Keine abgeschlossenen Trades in den letzten 90 Tagen.</p>'; return; }
  const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.key));
  box.innerHTML = list.map((t) => {
    const key = t.coin + t.closedAt;
    return `<details class="trade" data-key="${key}"${open.has(key) ? ' open' : ''}>
      <summary><span class="sym">${t.coin} <small class="${t.side}">${t.side === 'long' ? 'L' : 'S'}</small></span>
        <span class="meta">${dt(t.openedAt)} – ${dt(t.closedAt)} · ${t.exits.length} Verk.</span>
        <b class="${t.realized >= 0 ? 'long' : 'short'}">${f.signedUsd(t.realized)}</b></summary>
      <div class="exit part" role="table" aria-label="Verkäufe ${t.coin}">
        <div class="exit-row head" role="row"><span>Nr.</span><span>Kurs</span><span>Anteil</span><span>PnL</span><span>Datum</span></div>
        ${t.exits.map((x, i) => `<div class="exit-row" role="row"><span><b>${i + 1}.</b></span><span>${f.price(x.px)}</span><span>${x.sharePct == null ? '–' : f.pct(x.sharePct, 0)}</span><span class="${x.pnl >= 0 ? 'long' : 'short'}">${f.usdShort(x.pnl)}</span><span class="muted">${dt(x.time)}</span></div>`).join('')}
      </div>
      <p class="empty" style="font-size:12px;margin:6px 0 0">Einstieg Ø ${t.entryAvg ? f.price(t.entryAvg) : 'vor dem Zeitraum'} · Gebühren ${f.usd(t.fees)}</p>
    </details>`;
  }).join('');
}
