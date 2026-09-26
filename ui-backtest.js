// Backtest-Bereich: Markt und Stil wählen, Signalgeber auf der Vergangenheit testen, Ergebnis verständlich anzeigen.
import { CONFIG } from './config.js';
import { getWatchlist, onWatchlist } from './core-watchlist.js';
import { BT, loadHistory, runBacktest, summarize } from './core-backtest.js';
import { esc, dn } from './ui-parts.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
const ALL = '__alle__';
const STYLES = ['swing', 'intraday', 'scalp'];
let style = 'swing', running = false, stopFlag = false, last = null;

const R = (v, d = 2) => (v == null || !Number.isFinite(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v)) + 'R');
const P = (v) => (v == null ? '–' : f.pct(v, 0));
const cls = (v) => (v > 0 ? 'long' : v < 0 ? 'short' : 'muted');
const date = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const OUT = { stop: 'Stop', einstieg: 'Stop auf Einstieg', nachgezogen: 'Nachzieh-Stop', tp4: 'Alle Ziele', zeit: 'Zeitlimit', offen: 'Noch offen' };

function renderControls() {
  const wl = getWatchlist();
  const sel = $('bt-coin'), cur = sel.value;
  sel.innerHTML = `<option value="${ALL}">Ganze Watchlist (${wl.length})</option>` + wl.map((c) => `<option value="${esc(c)}">${esc(dn(c))}</option>`).join('');
  sel.value = [ALL, ...wl].includes(cur) ? cur : (wl.includes('BTC') ? 'BTC' : ALL);
  $('bt-styles').innerHTML = STYLES.map((k) => `<button type="button" data-bts="${k}" aria-pressed="${k === style}">${CONFIG.signals.modes[k].label}<small>${BT.days[k]} Tage</small></button>`).join('');
}

function curve(values) {
  if (values.length < 2) return '';
  const W = 340, H = 110, P2 = 4, all = [0, ...values];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i) => P2 + (i / (all.length - 1)) * (W - 2 * P2);
  const y = (v) => P2 + (1 - (v - min) / span) * (H - 2 * P2);
  const d = all.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const col = all.at(-1) >= 0 ? 'var(--ok)' : 'var(--bad)';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Verlauf in R: Ende ${R(all.at(-1))}">
    <line x1="0" x2="${W}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>
    <div class="chart-scale"><span>${R(min, 1)}</span><span>${R(max, 1)}</span></div>`;
}

function verdict(sm) {
  if (sm.n < 10) return { cls: 'warn', text: `Nur ${sm.n} Trades. Das reicht nicht für eine Aussage, längerer Zeitraum oder mehr Märkte nötig.` };
  const risk = CONFIG.rules.riskPerTradeWarnPct;
  const base = sm.avgR > 0.15 ? { cls: 'ok', text: `Positiver Erwartungswert: im Schnitt ${R(sm.avgR)} pro Trade nach Gebühren.` }
    : sm.avgR > 0 ? { cls: 'warn', text: `Knapp positiv (${R(sm.avgR)} pro Trade). Nach Slippage kann davon wenig übrig bleiben.` }
    : { cls: 'bad', text: `Negativer Erwartungswert (${R(sm.avgR)} pro Trade). So gehandelt hätte der Signalgeber hier Geld verloren.` };
  base.text += ` Der größte Rückgang lag bei ${R(sm.maxDdR, 1).replace('+', '')}, bei deinen ${risk} % Risiko pro Trade wären das rund ${f.pct(Math.min(100, sm.maxDdR * risk), 0)} vom Konto gewesen.`;
  if (sm.n < 30) base.text += ' Unter 30 Trades ist das Ergebnis noch wackelig.';
  return base;
}

function table(head, rows) {
  return `<div class="bt-table" role="table"><div class="bt-row head" role="row">${head.map((h) => `<span>${h}</span>`).join('')}</div>${rows.join('')}</div>`;
}

function renderResult() {
  const box = $('bt-out');
  if (!last) { box.innerHTML = ''; return; }
  const { label, runs, trades, missed } = last;
  const sm = summarize(trades);
  if (!sm.n) {
    box.innerHTML = `<p class="empty">Keine Trades im Testzeitraum (${missed} Signale ohne Einstieg). Der Signalgeber war hier sehr zurückhaltend.</p>`;
    return;
  }
  const v = verdict(sm);
  const perCoin = runs.length > 1 ? runs.map((r) => ({ coin: r.coin, ...summarize(r.trades), err: r.error })) : [];
  box.innerHTML = `<h3 class="sub-h" style="margin-top:4px">${esc(label)}</h3>
    <p class="bt-verdict ${v.cls}">${esc(v.text)}</p>
    <div class="kv">
      <div><span class="k">Trades</span><span class="v">${sm.n}</span></div>
      <div><span class="k">Gewinn-Trades</span><span class="v">${P(sm.winRate)}</span></div>
      <div><span class="k">TP1 erreicht</span><span class="v">${P(sm.tp1Rate)}</span></div>
      <div><span class="k">Ø pro Trade</span><span class="v ${cls(sm.avgR)}">${R(sm.avgR)}</span></div>
      <div><span class="k">Summe</span><span class="v ${cls(sm.totalR)}">${R(sm.totalR, 1)}</span></div>
      <div><span class="k">Profit-Faktor</span><span class="v">${sm.profitFactor == null ? '–' : sm.profitFactor.toFixed(2).replace('.', ',')}</span></div>
    </div>
    <h3 class="sub-h">Verlauf in R</h3>
    ${curve(sm.curve)}
    <h3 class="sub-h">Taugt ein höherer Score mehr?</h3>
    ${table(['Score', 'Trades', 'Gewinn', 'Ø R'], sm.byScore.map((b) => `<div class="bt-row" role="row"><span><b>${b.label}</b></span><span>${b.n}</span><span>${P(b.winRate)}</span><span class="${cls(b.avgR)}">${R(b.avgR)}</span></div>`))}
    <h3 class="sub-h">Welche Ereignisse helfen?</h3>
    ${sm.byEvent.length ? table(['Ereignis', 'Trades', 'Ø R', 'Vorteil'], sm.byEvent.map((e) => `<div class="bt-row" role="row"><span>${esc(e.name)}</span><span>${e.n}</span><span class="${cls(e.avgR)}">${R(e.avgR)}</span><span class="${cls(e.edge)}">${R(e.edge)}</span></div>`))
      + '<p class="empty" style="font-size:12px;margin-top:6px">Vorteil = Ø R mit diesem Ereignis minus Ø R ohne. Erst ab 3 Trades gelistet.</p>'
      : '<p class="empty">Zu wenige Trades je Ereignis für eine Aussage.</p>'}
    <h3 class="sub-h">Retest-Siegel und Richtung</h3>
    ${table(['Gruppe', 'Trades', 'Gewinn', 'Ø R'], [
      ['🛡 mit Siegel', sm.seal.with], ['ohne Siegel', sm.seal.without], ['Long', sm.long], ['Short', sm.short],
    ].filter(([, x]) => x.n).map(([n, x]) => `<div class="bt-row" role="row"><span>${n}</span><span>${x.n}</span><span>${P(x.winRate)}</span><span class="${cls(x.avgR)}">${R(x.avgR)}</span></div>`))}
    ${perCoin.length ? `<h3 class="sub-h">Nach Markt</h3>${table(['Markt', 'Trades', 'Gewinn', 'Ø R'], perCoin.map((c) => `<div class="bt-row" role="row"><span><b>${esc(dn(c.coin))}</b></span><span>${c.err ? '–' : c.n}</span><span>${c.err ? '' : P(c.winRate)}</span><span class="${cls(c.avgR)}">${c.err ? 'Fehler' : R(c.avgR)}</span></div>`))}` : ''}
    <h3 class="sub-h">Letzte Trades</h3>
    ${table(['Datum', 'Markt', 'Ausgang', 'R'], trades.slice(-8).reverse().map((t) => `<div class="bt-row" role="row"><span>${date(t.time)}</span><span>${esc(dn(t.coin))} <small class="${t.dir}">${t.dir === 'long' ? 'L' : 'S'}</small></span><span class="muted">${OUT[t.outcome] || t.outcome}${t.hits ? ` · TP${t.hits}` : ''}</span><span class="${cls(t.r)}">${R(t.r)}</span></div>`))}
    <p class="empty" style="font-size:12px;margin-top:12px">1R = Abstand Einstieg bis Stop, also der Verlust bei vollem Stop. Regeln wie im Ausstiegsplan: Teilverkäufe an TP1–TP4, ab TP2 Stop auf Einstieg, Runner nachgezogen. Gebühren abgezogen, Slippage und Funding nicht. Berühren Stop und Ziel dieselbe Kerze, zählt der Stop. ${missed} Signale kamen nicht zum Einstieg. Vergangene Ergebnisse garantieren keine zukünftigen.</p>`;
}

async function start() {
  if (running) { stopFlag = true; return; }
  const sel = $('bt-coin').value;
  const coins = sel === ALL ? getWatchlist() : [sel];
  running = true; stopFlag = false;
  $('bt-run').textContent = 'Abbrechen';
  const runs = [];
  const status = (txt, frac) => {
    $('bt-status').innerHTML = `<p class="empty" style="font-size:13px;margin:10px 0 0">${esc(txt)}</p>${frac != null ? `<div class="bar" style="margin-top:6px"><span style="width:${(frac * 100).toFixed(0)}%;background:var(--gold)"></span></div>` : ''}`;
  };
  for (const [i, coin] of coins.entries()) {
    if (stopFlag) break;
    const pre = coins.length > 1 ? `${i + 1}/${coins.length} ${coin}: ` : `${coin}: `;
    try {
      status(pre + 'lade Kursdaten …', (i) / coins.length);
      const series = await loadHistory(coin, style);
      const res = await runBacktest(coin, style, series, {
        onProgress: (x) => status(pre + 'spiele Signale nach …', (i + x) / coins.length),
        shouldStop: () => stopFlag,
      });
      res.trades.forEach((t) => { t.coin = coin; });
      runs.push(res);
    } catch (e) {
      runs.push({ coin, trades: [], missed: [], error: e.message });
    }
  }
  const label = `${sel === ALL ? 'Watchlist' : dn(sel)} · ${CONFIG.signals.modes[style].label} · ${BT.days[style]} Tage`;
  last = { label, runs, trades: runs.flatMap((r) => r.trades).sort((a, b) => a.time - b.time), missed: runs.reduce((n, r) => n + r.missed.length, 0) };
  const errs = runs.filter((r) => r.error);
  status(stopFlag ? 'Abgebrochen, Teilergebnis:' : errs.length ? `Fertig. Nicht geladen: ${errs.map((r) => r.coin).join(', ')}` : 'Fertig.', null);
  running = false;
  $('bt-run').textContent = 'Backtest starten';
  renderResult();
}

export function initBacktest() {
  renderControls();
  onWatchlist(renderControls);
  $('bt-styles').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-bts]');
    if (!b || running) return;
    style = b.dataset.bts;
    renderControls();
  });
  $('bt-run').addEventListener('click', start);
}
