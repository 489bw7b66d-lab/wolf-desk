// "Letzte Signale": liest die vom Wächter veröffentlichte Liste (signals.json) und zeigt die neuesten Signale.
// Live-Kurs und Abstand zum Einstieg laufen mit. Tipp auf ein laufendes Signal öffnet die Trade-Karte mit dem Plan
// aus dem Signal (frische Analyse nur für Chart, ATR und Stile), bei abgeschlossenen Signalen die aktuelle Analyse.
import { CONFIG } from './config.js';
import { analyzeAllModes, switchStyle } from './core-scanner.js';
import { signalResult } from './core-feedplan.js';
import { change24h, entryDistance } from './core-trades.js';
import { badge, esc, dn, viewMark, coinIcon } from './ui-parts.js';
import { getViews, viewFor, alignment } from './core-views.js';
import * as f from './core-format.js';

const $ = (id) => document.getElementById(id);
let getState = () => ({}), onTrade = () => {}, onCoin = () => {};
let feed = null, error = null, loadedAt = 0, busy = null, archive = [];

const STATUS = {
  offen: ['⏳', 'läuft', 'muted'], tp1: ['☑️', 'TP1', 'long'], tp2: ['✅', 'TP2', 'long'],
  stop: ['❌', 'Stop', 'short'], abgelaufen: ['⌛', 'abgelaufen', 'muted'], 'ungültig': ['·', 'ungültig', 'muted'],
};

export function ago(t, now = Date.now()) {
  const m = Math.max(0, Math.round((now - t) / 60e3));
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 48) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

async function load() {
  try {
    const res = await fetch(CONFIG.feed.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (res.status === 404) { feed = []; error = null; }
    else if (!res.ok) throw new Error('Status ' + res.status);
    else { const j = await res.json(); feed = j.signals || []; archive = j.archive || []; error = null; }
  } catch (e) { error = e.message; }
  loadedAt = Date.now();
  render();
}

export function renderFeed() { render(); }
export const getFeedSignals = () => feed || [];
export const getArchive = () => archive || [];

function render() {
  const box = $('feed');
  if (!box) return;
  $('feed-meta').textContent = loadedAt ? `aktualisiert ${new Date(loadedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : '';
  if (feed == null) { box.innerHTML = `<p class="empty">${error ? 'Signale konnten nicht geladen werden (' + esc(error) + ').' : 'Lade Signale …'}</p>`; return; }
  if (!feed.length) { box.innerHTML = '<p class="empty">Noch keine Signale veröffentlicht. Der Wächter legt sie nach seinem nächsten Lauf ab.</p>'; return; }
  const views = getViews();
  box.innerHTML = feed.slice(0, CONFIG.feed.count).map((x, i) => {
    const [icon, label, cls] = STATUS[x.status] || STATUS.offen;
    const zone = x.zone ? `${f.price(x.zone[0])} – ${f.price(x.zone[1])}` : f.price(x.px);
    return `<button type="button" class="feed-row" data-i="${i}">
      <div class="feed-top">
        <span class="sym">${coinIcon(x.coin)}${esc(dn(x.coin))}${x.seal ? ' <span class="seal-mini" aria-label="Retest bestätigt">🛡</span>' : ''} ${viewMark(alignment(viewFor(views, x.coin), x.dir))}</span>
        ${badge(x.dir)}
        <span class="feed-status ${cls}">${icon} ${label}${x.r != null && x.status !== 'offen' ? ` ${x.r >= 0 ? '+' : '−'}${Math.abs(x.r).toFixed(1).replace('.', ',')}R` : ''}</span>
      </div>
      <div class="feed-mid">
        <span class="meta">${x.eng === 'bm' || x.score == null ? 'Trendfolge · Maßstab' : `${esc(CONFIG.signals.modes[x.style]?.label || x.style)} · Score ${x.score}`} · ${ago(x.at)}</span>
        <span class="feed-live" data-live="${i}"></span>
      </div>
      <div class="feed-plan meta">Einstieg ${zone} · Stop ${f.price(x.stop)} · TP1 ${f.price(x.tps?.[0])}</div>
      ${busy === i ? '<div class="meta" style="color:var(--gold)">Analysiere …</div>' : ''}
    </button>`;
  }).join('');
  renderFeedLive(getState());
}

// Live-Kurs, 24h und Abstand zur Einstiegszone des Signals (nur Texte, damit Tippen nicht gestört wird)
export function renderFeedLive(s) {
  if (!feed?.length || !$('feed')) return;
  $('feed').querySelectorAll('[data-live]').forEach((el) => {
    const x = feed[Number(el.dataset.live)];
    const px = s.prices?.[x.coin];
    if (!px) { el.textContent = ''; return; }
    const ch = change24h(px, s.prevDay?.[x.coin]);
    const d = entryDistance({ zone: x.zone || [x.px, x.px] }, px);
    el.innerHTML = `${f.price(px)} <b class="${ch == null ? 'muted' : ch >= 0 ? 'long' : 'short'}">${ch == null ? '' : (ch >= 0 ? '+' : '−') + f.pct(Math.abs(ch), 1)}</b>`
      + (x.status === 'offen' && d != null ? ` · <span class="${d === 0 ? 'long' : 'muted'}">${d === 0 ? 'in der Zone' : `Entry ${d > 0 ? '+' : '−'}${f.pct(Math.abs(d), 1)}`}</span>` : '');
  });
}

async function open(i) {
  const x = feed?.[i];
  if (!x || busy != null) return;
  busy = i; render();
  let fresh = null;
  try { fresh = await analyzeAllModes(x.coin); } catch { /* Plan aus dem Signal reicht */ }
  busy = null; render();
  const fromSignal = x.status === 'offen' ? signalResult(x, fresh, switchStyle) : null;
  if (fromSignal) onTrade(fromSignal);
  else if (fresh?.plan || fresh?.best) onTrade(fresh);
  else onCoin(x.coin);
}

export function initFeed(stateGetter, openTrade, openCoin) {
  getState = stateGetter; onTrade = openTrade; onCoin = openCoin;
  $('feed')?.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) open(Number(b.dataset.i)); });
  render();
  load();
  setInterval(load, 5 * 60e3);
  setInterval(render, 60e3); // "vor x Min." aktuell halten
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - loadedAt > 60e3) load(); });
}
