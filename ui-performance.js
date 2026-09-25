// Performance-Anzeige: Startkapital vs. Kontowert, Verlauf, Drawdown.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { parsePortfolio, performance, equityCurve, maxDrawdown } from './core-performance.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const PERIODS = { day: '24 Std', week: 'Woche', month: 'Monat', allTime: 'Gesamt' };
let period = 'month';

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
  if (!a) { $('perf').innerHTML = '<p class="empty">Noch keine Kontodaten.</p>'; $('perf-chart').innerHTML = ''; return; }
  const equity = accountSummary(a, CONFIG.accountMode).equity;
  const perf = performance(equity, CONFIG.startCapital);
  const cls = perf.pnl >= 0 ? 'long' : 'short';
  $('perf').innerHTML = `<div class="kv">
    <div><span class="k">Startkapital</span><span class="v">${f.usd(CONFIG.startCapital)}</span></div>
    <div><span class="k">Kontowert</span><span class="v">${f.usd(equity)}</span></div>
    <div><span class="k">Gewinn</span><span class="v ${cls}">${f.signedUsd(perf.pnl)}</span></div>
    <div><span class="k">Performance</span><span class="v big ${cls}">${perf.pct >= 0 ? '+' : ''}${f.pct(perf.pct, 2)}</span></div>
  </div>`;

  const data = s.portfolio ? parsePortfolio(s.portfolio)[period] : null;
  if (!data) { $('perf-chart').innerHTML = `<p class="empty">${s.portfolioError ? 'Verlauf konnte nicht geladen werden.' : 'Verlauf wird geladen …'}</p>`; return; }
  const curve = equityCurve(data.pnl, equity);
  const periodPnl = data.pnl.length ? data.pnl.at(-1)[1] - data.pnl[0][1] : null;
  $('perf-chart').innerHTML = chart(curve) + `<div class="kv" style="margin-top:12px">
    <div><span class="k">Ergebnis ${PERIODS[period]}</span><span class="v ${periodPnl >= 0 ? 'long' : 'short'}">${f.signedUsd(periodPnl)}</span></div>
    <div><span class="k">Max. Drawdown</span><span class="v">${f.pct(maxDrawdown(curve.map((c) => c[1])))}</span></div>
  </div>`;
}
