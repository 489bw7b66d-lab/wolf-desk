// Performance-Anzeige: Startkapital vs. Kontowert, Verlauf, Drawdown.
import { CONFIG } from './config.js';
import { accountSummary } from './core-calc.js';
import { parsePortfolio, equityCurve, maxDrawdown, honestSplit, lifePnlOf } from './core-performance.js';
import { perfSplit, tradeHistory, closedTrades, tradeStats } from './core-trades.js';
import { costSummary, fundingForTrade } from './core-fees.js';
import { evaluatePatience, patienceStats, PATIENCE_KEY, windowDays } from './core-patience.js';
import { getPlans, planFor, signalFor, targetsFor } from './core-plans.js';
import { getFeedSignals } from './ui-feed.js';
import * as f from './core-format.js';
import { dn, tipHead, tipInline } from './ui-parts.js';

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
  renderStats(s);
  renderCosts(s);
  if (!a) { $('perf').innerHTML = '<p class="empty">Noch keine Kontodaten.</p>'; $('perf-chart').innerHTML = ''; return; }
  const equity = accountSummary(a, CONFIG.accountMode).equity;
  const upnl = a.positions.reduce((n, p) => n + (p.upnl || 0), 0);
  const sp = honestSplit(equity, lifePnlOf(s.portfolio), upnl, CONFIG.startCapital);
  const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : '');
  // Anteil realisiert / Buchgewinn als Balken (nur wenn beide positiv, sonst nur Zahlen)
  const bar = sp && sp.realized > 0 && sp.book > 0
    ? `<div class="split-bar" aria-hidden="true"><span style="width:${(sp.realized / (sp.realized + sp.book)) * 100}%"></span></div>` : '';
  $('perf').innerHTML = sp ? `<div class="kv">
    <div><span class="k">Gesamtperformance</span><span class="v big ${cls(sp.total)}">${sp.pct == null ? '–' : (sp.pct >= 0 ? '+' : '') + f.pct(sp.pct, 2)}</span></div>
    <div><span class="k">Gewinn gesamt ${tipInline(sp.source === 'hl'
      ? `Aus Hyperliquids PnL-Verlauf: Ein- und Auszahlungen sind herausgerechnet. Prozent bezogen auf deine Einzahlungen (netto ${f.usd(sp.invested)}).`
      : 'Hyperliquids Verlauf ist noch nicht geladen, vorläufig Kontowert minus Startkapital. Einzahlungen zählen hier noch als Gewinn.', 'perf-total')}</span><span class="v ${cls(sp.total)}" style="margin-top:6px">${f.signedUsd(sp.total)}</span></div>
    <div><span class="k">Realisiert</span><span class="v ${cls(sp.realized)}">${f.signedUsd(sp.realized)}</span></div>
    <div><span class="k">Buchgewinn (offen)</span><span class="v ${cls(sp.book)}">${f.signedUsd(sp.book)}</span></div>
  </div>${bar}` : '<p class="empty">Startkapital fehlt in der Konfiguration.</p>';

  const all = s.portfolio ? parsePortfolio(s.portfolio) : null;
  const data = all ? all[period] : null;
  if (!data) { $('perf-chart').innerHTML = `<p class="empty">${s.portfolioError ? 'Verlauf konnte nicht geladen werden.' : 'Verlauf wird geladen …'}</p>`; return; }
  const curve = equityCurve(data.pnl, equity);
  const periodPnl = data.pnl.length ? data.pnl.at(-1)[1] - data.pnl[0][1] : null;
  const dd = maxDrawdown(curve.map((c) => c[1]));
  const ddCls = dd >= 35 ? 'short' : dd >= 20 ? 'warn-t' : '';
  // Für „Gesamt“ kein eigenes Ergebnis: das steht schon oben (Gewinn gesamt)
  $('perf-chart').innerHTML = chart(curve) + `<div class="kv" style="margin-top:12px">
    ${period === 'allTime' ? '' : `<div><span class="k">Ergebnis ${PERIODS[period]}</span><span class="v ${periodPnl >= 0 ? 'long' : 'short'}">${f.signedUsd(periodPnl)}</span></div>`}
    <div><span class="k">Max. Drawdown</span><span class="v ${ddCls}">${f.pct(dd)}</span></div>
  </div>
  ${dd >= 20 ? `<p class="empty" style="font-size:12px;margin-top:8px">Größter Rückgang vom bisherigen Höchststand in diesem Zeitraum. ${dd >= 35 ? 'Das ist viel: Bei so einem Einbruch braucht es danach ' + f.pct((1 / (1 - dd / 100) - 1) * 100, 0) + ' Gewinn, nur um wieder aufzuholen.' : ''}</p>` : ''}`;
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
      <summary><span class="sym">${dn(t.coin)} <small class="${t.side}">${t.side === 'long' ? 'L' : 'S'}</small></span>
        <span class="meta">${dt(t.openedAt)} – ${dt(t.closedAt)} · ${t.exits.length} Verk.</span>
        <b class="${t.realized >= 0 ? 'long' : 'short'}">${f.signedUsd(t.realized)}</b></summary>
      <div class="exit part" role="table" aria-label="Verkäufe ${dn(t.coin)}">
        <div class="exit-row head" role="row"><span>Nr.</span><span>Kurs</span><span>Anteil</span><span>PnL</span><span>Datum</span></div>
        ${t.exits.map((x, i) => `<div class="exit-row" role="row"><span><b>${i + 1}.</b></span><span>${f.price(x.px)}</span><span>${x.sharePct == null ? '–' : f.pct(x.sharePct, 0)}</span><span class="${x.pnl >= 0 ? 'long' : 'short'}">${f.usdShort(x.pnl)}</span><span class="muted">${dt(x.time)}</span></div>`).join('')}
      </div>
      <p class="empty" style="font-size:12px;margin:6px 0 0">Einstieg Ø ${t.entryAvg ? f.price(t.entryAvg) : 'vor dem Zeitraum'} · Gebühren ${f.usd(t.fees)}${s.funding ? ` · Funding ${f.signedUsd(fundingForTrade(t, s.funding))} · netto ${f.signedUsd(t.realized + fundingForTrade(t, s.funding))}` : ''}</p>
    </details>`;
  }).join('');
}

// Deine Statistik: Auswertung der eigenen abgeschlossenen Trades (90 Tage)
const cl = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
const pc = (v) => (v == null ? '–' : f.pct(v, 0));
function renderStats(s) {
  const box = $('stats');
  if (!box) return;
  if (!s.fills) { box.innerHTML = `<p class="empty">${s.fillsError ? 'Trades konnten nicht geladen werden.' : 'Wird geladen …'}</p>`; return; }
  const st = tradeStats(tradeHistory(s.fills));
  if (!st.n) { box.innerHTML = '<p class="empty">Noch keine abgeschlossenen Trades in den letzten 90 Tagen.</p>'; return; }
  // Kernaussage: Ausstiegsplan (in Teilen verkauft) gegen alles auf einmal
  let insight = '';
  if (st.split.n >= 2 && st.single.n >= 2) {
    const better = st.split.avg > st.single.avg;
    insight = `<p class="bt-verdict ${better ? 'ok' : 'warn'}">${better
      ? `In Teilen verkauft: im Schnitt ${f.signedUsd(st.split.avg)} pro Trade, Treffer ${pc(st.split.winRate)}. Alles auf einmal: ${f.signedUsd(st.single.avg)}, Treffer ${pc(st.single.winRate)}. Dein Ausstiegsplan zahlt sich aus.`
      : `Alles auf einmal verkauft schneidet bei dir gerade besser ab (${f.signedUsd(st.single.avg)} gegen ${f.signedUsd(st.split.avg)} pro Trade). Beobachten, ob das so bleibt.`}${st.n < 30 ? ' Bei ' + st.n + ' Trades noch ein vorläufiges Bild.' : ''}</p>`;
  }
  const row = (name, x) => x.n ? `<div class="bt-row" role="row"><span>${name}</span><span>${x.n}</span><span>${pc(x.winRate)}</span><span class="${cl(x.avg)}">${f.usdShort(x.avg)}</span></div>` : '';
  box.innerHTML = `${insight}
    <div class="kv">
      <div><span class="k">Trades (90 Tage)</span><span class="v">${st.n}</span></div>
      <div><span class="k">Trefferquote</span><span class="v">${pc(st.winRate)}</span></div>
      <div><span class="k">Ø Gewinn</span><span class="v long">${f.signedUsd(st.avgWin)}</span></div>
      <div><span class="k">Ø Verlust</span><span class="v short">${f.signedUsd(st.avgLoss)}</span></div>
      <div><span class="k">Gewinn : Verlust</span><span class="v">${st.payoff == null ? '–' : st.payoff.toFixed(2).replace('.', ',') + ' : 1'}</span></div>
      <div><span class="k">Summe</span><span class="v ${cl(st.total)}">${f.signedUsd(st.total)}</span></div>
    </div>
    ${tipHead('Wie du verkaufst', `Bester Trade: ${dn(st.best.coin)} ${f.signedUsd(st.best.realized)}, schlechtester: ${dn(st.worst.coin)} ${f.signedUsd(st.worst.realized)}. Alle Beträge nach Gebühren, ohne Funding.`)}
    <div class="bt-table" role="table"><div class="bt-row head" role="row"><span>Gruppe</span><span>Trades</span><span>Treffer</span><span>Ø PnL</span></div>
      ${row('In Teilen verkauft', st.split)}${row('Alles auf einmal', st.single)}${row('Long', st.long)}${row('Short', st.short)}
    </div>
    ${patienceBlock(s)}`;
}

// ===== Geduld: vorzeitig geschlossene Trades nachträglich auswerten =====
let pat = { data: null, loading: false, at: 0 };
function loadPatience(s) {
  if (pat.loading || !s.fills || Date.now() - pat.at < 30 * 60e3) return;
  pat.loading = true;
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(PATIENCE_KEY) || '{}'); } catch { /* egal */ }
  const getTargets = (t) => targetsFor({ plan: planFor(getPlans(), t.coin, t.side, t.openedAt), signal: signalFor(getFeedSignals(), t.coin, t.side, t.openedAt) });
  evaluatePatience(tradeHistory(s.fills), { getTargets, cache }).then((list) => {
    pat.data = list;
    try { localStorage.setItem(PATIENCE_KEY, JSON.stringify(cache)); } catch { /* egal */ }
  }).catch(() => {}).finally(() => { pat.loading = false; pat.at = Date.now(); });
}
function patienceBlock(s) {
  loadPatience(s);
  const head = tipHead('Geduld', `Vorzeitig = zwischen Stop und TP1 geschlossen. Maßstab ist der Plan des Trades (eigene Ziele, Telegram-Signal oder automatischer Plan), beobachtet ${windowDays()} Tage nach dem Ausstieg. Beträge bezogen auf die verkaufte Menge.`);
  if (!pat.data) return `${head}<p class="empty">Vorzeitige Ausstiege werden ausgewertet …</p>`;
  const g = patienceStats(pat.data);
  if (!g.n) return `${head}<p class="empty">Keine vorzeitig geschlossenen Trades in den letzten 60 Tagen. Stark!</p>`;
  const cls = g.net >= 0 ? 'ok' : g.net > -Math.abs(g.missed) * 0.3 ? 'warn' : 'bad';
  const verdict = !g.done ? 'Die Trades laufen noch in der Beobachtung.'
    : g.net < 0 ? `Frühes Aussteigen hat dich unterm Strich <b>${f.signedUsd(g.net)}</b> gekostet. In ${g.later} von ${g.done} Fällen kam das Ziel später doch noch.`
    : `Frühes Aussteigen hat dir unterm Strich <b>${f.signedUsd(g.net)}</b> gespart. In ${g.stopFirst} von ${g.done} Fällen wäre zuerst der Stop gekommen.`;
  return `${head}<p class="bt-verdict ${cls}">${verdict}</p>
    <div class="bt-table" role="table"><div class="bt-row head" role="row"><span>Vorzeitig geschlossen</span><span>Trades</span><span></span><span>Betrag</span></div>
      <div class="bt-row" role="row"><span>später TP1 oder TP2 erreicht</span><span>${g.later}</span><span class="muted">${g.later2 ? g.later2 + '× TP2' : ''}</span><span class="short">${f.signedUsd(-g.missed)}</span></div>
      <div class="bt-row" role="row"><span>Stop wäre zuerst gekommen</span><span>${g.stopFirst}</span><span></span><span class="long">${f.signedUsd(g.saved)}</span></div>
      <div class="bt-row" role="row"><span>weder noch</span><span>${g.none}</span><span></span><span class="muted">±0</span></div>
      ${g.pending ? `<div class="bt-row" role="row"><span>noch in Beobachtung</span><span>${g.pending}</span><span></span><span class="muted">…</span></div>` : ''}
    </div>`;
}

// Kosten: Gebühren und Funding in 7/30/90 Tagen, Anteil am Bruttogewinn, deine Gebührensätze
function renderCosts(s) {
  const box = $('costs');
  if (!box) return;
  if (!s.fills) { box.innerHTML = '<p class="empty">Wird geladen …</p>'; return; }
  const now = Date.now();
  const rows = [[7, '7 Tage'], [30, '30 Tage'], [90, '90 Tage']].map(([d, label]) => ({ label, ...costSummary(s.fills, s.funding || [], now - d * 864e5, now + 1) }));
  const m = rows[1];
  const pc = (v) => (v == null ? '–' : f.pct(v, 0));
  const cl = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
  const note = m.share == null ? '' : m.share >= 30 ? 'short' : m.share >= 15 ? 'warn-t' : 'long';
  const r = s.rates;
  box.innerHTML = `${m.share != null ? `<p class="bt-verdict ${note === 'short' ? 'bad' : note === 'warn-t' ? 'warn' : 'ok'}">Die Kosten der letzten 30 Tage entsprechen <b>${pc(m.share)}</b> deines Bruttogewinns aus Verkäufen.${m.share >= 15 ? ' Weniger Hin und Her, Limit-Orders beim Einstieg und kürzere Haltedauer bei hohem Funding senken das.' : ''}</p>` : ''}
    <div class="bt-table" role="table"><div class="bt-row head" role="row"><span>Zeitraum</span><span>Gebühren</span><span>Funding</span><span>Anteil</span></div>
      ${rows.map((x) => `<div class="bt-row" role="row"><span><b>${x.label}</b></span><span class="short">${f.signedUsd(-x.fees)}</span><span class="${cl(x.funding)}">${s.funding ? f.signedUsd(x.funding) : '…'}</span><span>${pc(x.share)}</span></div>`).join('')}
    </div>
    <div class="empty" style="font-size:12.5px;margin-top:8px">30 Tage: brutto ${f.signedUsd(m.gross)} · netto ${f.signedUsd(m.net)}${s.costsError ? ' · Funding gerade nicht abrufbar' : ''}
      ${tipInline(`Netto = nach Gebühren und Funding. ${r ? `Dein Gebührensatz: Taker ${f.pct(r.taker * 100, 3)}, Maker ${f.pct(r.maker * 100, 3)}${r.known ? '' : ' (Standard, eigener Satz nicht abrufbar)'}. ` : ''}Funding negativ = von dir gezahlt, positiv = erhalten.`)}</div>`;
}
