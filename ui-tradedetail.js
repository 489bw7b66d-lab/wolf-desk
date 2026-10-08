// Karte „Deine Trades im Detail“ (8n) im Tab Konto. Läuft nur auf dem iPhone, nichts davon geht ins Repository.
// Zeigt keine Beträge in Dollar, nur ATR, R und Prozent. Logik und Tests: core-tradedetail.js.
import { CONFIG } from './config.js';
import { hl, info } from './core-api.js';
import { getCandles } from './core-scanner.js';
import { closedCandles } from './core-signals.js';
import { tradeHistory } from './core-trades.js';
import { loadIndex } from './core-index.js';
import { detailRow, splitStats, compareText, atrTxt, holdTxt, TD } from './core-tradedetail.js';
import { esc, dn, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let getState = () => ({}), getAddress = () => '', busy = false, stop = false, note = '', rows = null, stats = null, hasStop = 0, at = 0, showAll = false;

async function run() {
  if (busy) return;
  const s = getState(), user = getAddress();
  if (!s.fills) { note = 'Die Trades sind noch nicht geladen. Bitte gleich noch einmal versuchen.'; paint(); return; }
  busy = true; stop = false; rows = null; stats = null; note = 'Lade …'; paint();
  try {
    const trades = tradeHistory(s.fills).filter((t) => t.entryAvg > 0 && !t.partial);
    const gap = () => sleep(CONFIG.signals.hot.requestGapMs);
    // Stop-Orders aus der Order-Historie (wenn Hyperliquid sie liefert; sonst bleibt die Spalte leer)
    let orders = [];
    if (user) { try { const o = await info({ type: 'historicalOrders', user }); if (Array.isArray(o)) orders = o; } catch { /* ohne Stops weiter */ } }
    const daily = {}, hourly = {};
    let btc = []; try { btc = await getCandles('BTC', '1d', true); } catch { /* ohne BTC-Bias */ }
    const coins = [...new Set(trades.map((t) => t.coin))];
    for (let k = 0; k < coins.length && !stop; k++) {
      note = `Tageskerzen: ${k + 1} von ${coins.length} Coins …`; status();
      try { daily[coins[k]] = await getCandles(coins[k], '1d', true); } catch { /* Coin ohne Kerzen */ }
    }
    for (let k = 0; k < trades.length && !stop; k++) {
      const t = trades[k], now = Date.now();
      note = `Verlauf der Trades: ${k + 1} von ${trades.length} …`; status();
      try { await gap(); hourly[t.coin + '|' + t.openedAt] = closedCandles(await hl.candles(t.coin, '1h', t.openedAt - 36e5, t.closedAt ?? now), now); }
      catch (err) { if (/Rate-Limit/.test(err.message)) { note = 'Hyperliquid bremst, kurze Pause …'; status(); await sleep(60e3); k--; } }
    }
    const ctx = { fills: s.fills, orders, daily, hourly, btc, alt: loadIndex()?.alt || [] };
    rows = trades.map((t) => detailRow(t, ctx));
    stats = splitStats(rows); hasStop = rows.filter((r) => r.stopAtr != null).length; at = Date.now();
    note = stop ? 'Angehalten, ausgewertet ist nur ein Teil.' : '';
    if (!ctx.alt.length) note += ' Ohne Alt-Index (erst „Märkte durchsuchen“ im Tab Signale): Der Bias beim Einstieg zählt nur BTC.';
  } catch (e) { note = `Abgebrochen: ${e.message}`; }
  busy = false; paint();
}

const status = () => { const el = $('td-status'); if (el) el.textContent = note; };
const pct = (x) => (x == null ? '–' : `${Math.round(x)} %`);
const rTxt = (x) => (x == null ? '' : ` · ${x.toFixed(1).replace('.', ',').replace('-', '−')} R`);
const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const BIAS = { 'aufwärts': 'Markt aufwärts', 'abwärts': 'Markt abwärts', 'gemischt': 'Markt gemischt' };

function table(groups) {
  const head = '<div class="bt-row td-row head" role="row"><span>Gruppe</span><span>Trades</span><span>Ø Ergebnis</span><span>Ø bester Stand</span><span>liegen gelassen</span></div>';
  return `<div class="bt-table" role="table">${head}${groups.map(([name, g]) => `<div class="bt-row td-row" role="row"><span>${esc(name)}${g.n ? `<br><small class="muted">${pct(g.winPct)} im Plus</small>` : ''}</span><span>${g.n}</span><span>${atrTxt(g.resAtr)}</span><span>${atrTxt(g.bestAtr)}</span><span>${atrTxt(g.leftAtr)}</span></div>`).join('')}</div>`;
}

function rowHtml(r) {
  const res = r.closed ? `${atrTxt(r.resAtr)}${rTxt(r.resR)}` : 'läuft';
  return `<div class="td-trade"><div><b>${esc(dn(r.coin))}</b> <span class="${r.side === 'long' ? 'long' : 'short'}">${r.side === 'long' ? 'Long' : 'Short'}</span> <span class="muted">${day(r.openedAt)} · ${holdTxt(r.holdH)}${r.kind ? ' · ' + (r.kind === 'Kurs' ? 'zum Kurs' : r.kind === 'Limit' ? 'per Limit' : 'gemischt') : ''}</span></div>
    <div class="muted">Ergebnis ${res} · bester Stand ${atrTxt(r.bestAtr)}${rTxt(r.bestR)}${r.stopAtr != null ? ` · Stop ${atrTxt(r.stopAtr)}` : ''}</div>
    <div class="muted">${r.bias ? `${BIAS[r.bias]}${r.fit ? ` (${r.fit === 'mit' ? 'mit dem Bias' : r.fit === 'gegen' ? 'gegen den Bias' : 'gemischt'})` : ''}` : 'Bias unbekannt'}${r.coinUp != null ? ` · Coin ${r.coinUp ? 'im Tagestrend aufwärts' : 'nicht im Tagestrend aufwärts'}` : ''}</div></div>`;
}

function paint() {
  const el = $('tdetail');
  if (!el) return;
  let h = `<div class="mk-actions"><button type="button" class="small-btn" id="td-go"${busy ? ' disabled' : ''}>Trades auswerten</button>${busy ? '<button type="button" class="small-btn ghost" id="td-stop">Anhalten</button>' : ''}</div>
    <p class="set-hint" id="td-status" role="status">${esc(note)}</p>`;
  if (rows && stats) {
    const closed = rows.filter((r) => r.closed);
    h += `<p class="set-hint">${closed.length} abgeschlossene Trades der letzten 90 Tage${rows.length > closed.length ? `, ${rows.length - closed.length} laufend` : ''}. Stop gefunden bei ${hasStop} von ${rows.length}. Stand ${new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.</p>`;
    if (closed.length) {
      h += '<h3 class="sub-h">Mit oder gegen den Markt-Bias</h3>' + table([['Alle', stats.all], ['Mit dem Bias', stats.bias.mit], ['Gegen den Bias', stats.bias.gegen], ['Markt gemischt', stats.bias.gemischt]]);
      h += `<p class="set-hint">${esc(compareText(stats.bias.mit, stats.bias.gegen, 'Mit dem Bias', 'gegen den Bias'))}</p>`;
      h += '<h3 class="sub-h">Einstieg und Coin-Trend</h3>' + table([['Zum Kurs', stats.kind.Kurs], ['Per Limit', stats.kind.Limit], ['Coin im Trend', stats.coin.im], ['Coin gegen Trend', stats.coin.gegen]]);
      h += `<p class="set-hint">„Bester Stand“ = so weit lief der Kurs höchstens in deine Richtung. „Liegen gelassen“ = bester Stand minus Ergebnis. Alles in Tages-ATR beim Einstieg, in R nur, wo der Stop bekannt ist.</p>`;
    }
    const list = showAll ? rows : rows.slice(0, 15);
    h += `<h3 class="sub-h">Je Trade</h3>${list.map(rowHtml).join('')}${rows.length > 15 ? `<button type="button" class="small-btn ghost" id="td-more">${showAll ? 'Weniger zeigen' : `Alle ${rows.length} zeigen`}</button>` : ''}`;
  }
  el.innerHTML = h;
}

export function initTradeDetail(stateGetter, addressGetter) {
  const el = $('tdetail');
  if (!el) return;
  getState = stateGetter; getAddress = addressGetter || (() => '');
  const tip = $('tdetail-tip');
  if (tip) tip.innerHTML = tipInline(`Wertet deine Trades der letzten 90 Tage aus den Ausführungen aus: Haltedauer, Einstieg zum Kurs oder per Limit, bester Stand gegen Ergebnis, und wie der Markt beim Einstieg stand (BTC und Alt-Index, Tages-EMA 20 über EMA 100, nur Tage vor dem Einstieg). Gemessen wird in Tages-ATR des Coins beim Einstieg, damit Coins vergleichbar sind; in R nur, wenn dein Stop in der Order-Historie steht. Bewusst ohne Dollar-Beträge, damit du Screenshots teilen kannst. Den Hebel von damals liefert Hyperliquid nicht. Bei weniger als ${TD.minN} Trades je Gruppe ist jeder Unterschied noch Zufall. Die Auswertung bleibt auf deinem iPhone.`, 'tdetail');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'td-go') run();
    else if (b.id === 'td-stop') { stop = true; note = 'Halte an …'; status(); }
    else if (b.id === 'td-more') { showAll = !showAll; paint(); }
  });
  paint();
}
