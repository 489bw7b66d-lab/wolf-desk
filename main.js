// Startpunkt: verbindet Kern-Module und Anzeige.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { loadAccount } from './core-account.js';
import { startStream } from './core-stream.js';
import { getState, update, subscribe, logError } from './core-store.js';
import { render } from './ui-testpage.js';
import { initRisk, renderRisk, setCalc } from './ui-risk.js';
import { initSignals, showDetail, analyze, renderWatchLive } from './ui-signals.js';
import { initHome, renderHome } from './ui-home.js';
import { initTrade, openTrade } from './ui-trade.js';
import { streamHealth, accountHealth } from './core-health.js';
import { initPerformance, renderPerformance } from './ui-performance.js';
import { initMarket } from './ui-market.js';
import { initCoin, openCoin } from './ui-coin.js';
import { initBacktest } from './ui-backtest.js';
import { getMarketCtx } from './core-scanner.js';
import { refreshMarket } from './core-market.js';
import { refreshTrade } from './ui-trade.js';
import * as fmt from './core-format.js';

const ADDR_KEY = 'wolfdesk.address';
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
let address = '';
try { address = localStorage.getItem(ADDR_KEY) || ''; } catch { /* Speicher nicht verfügbar */ }

const input = document.getElementById('addr');
const msg = document.getElementById('addr-msg');
input.value = address;

document.getElementById('addr-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value.trim();
  if (!ADDR_RE.test(v)) {
    msg.textContent = 'Das ist keine gültige Adresse. Sie beginnt mit 0x und hat danach 40 Zeichen.';
    return;
  }
  address = v.toLowerCase();
  try { localStorage.setItem(ADDR_KEY, address); } catch { /* ignorieren */ }
  msg.textContent = 'Gespeichert. Konto wird geladen …';
  setTimeout(() => { location.hash = 'start'; }, 800);
  update({ account: null, accountTs: 0, accountError: null, fills: null });
  refreshAccount();
  refreshPortfolio();
  refreshFills();
});

document.getElementById('market-filter').addEventListener('input', () => renderAll(getState()));

async function refreshAccount() {
  if (!address) return;
  try {
    const account = await loadAccount(address, CONFIG.dexes);
    update({ account, accountTs: Date.now(), accountError: null });
    msg.textContent = '';
  } catch (e) {
    update({ accountError: e.message });
    logError('Konto', e);
  }
}

async function refreshPortfolio() {
  if (!address) return;
  try {
    update({ portfolio: await hl.portfolio(address), portfolioError: null });
  } catch (e) {
    update({ portfolioError: e.message });
    logError('Performance', e);
  }
}

// Ausführungen der letzten 90 Tage (für Teilverkäufe und abgeschlossene Trades)
async function refreshFills() {
  if (!address) return;
  try {
    const fills = await hl.fillsSince(address, Date.now() - 90 * 864e5);
    update({ fills: Array.isArray(fills) ? fills : [], fillsError: null });
  } catch (e) {
    update({ fillsError: e.message });
    logError('Trades', e);
  }
}

// Vortageskurse aller Märkte (für die 24h-Veränderung)
async function refreshPrevDay() {
  try {
    const { ctx } = await getMarketCtx();
    const prevDay = {};
    Object.entries(ctx || {}).forEach(([k, v]) => { if (v.prevDay > 0) prevDay[k] = v.prevDay; });
    update({ prevDay });
  } catch (e) { logError('24h-Daten', e); }
}

async function loadMarkets() {
  const res = await Promise.allSettled(CONFIG.dexes.map((d) => hl.meta(d)));
  const markets = {}, maxLev = {};
  res.forEach((r, i) => {
    const dex = CONFIG.dexes[i];
    if (r.status !== 'fulfilled') { logError(`Marktliste ${dex || 'Haupt'}`, r.reason); return; }
    markets[dex] = (r.value?.universe || [])
      .filter((u) => !u.isDelisted)
      .map((u) => {
        const name = dex && !u.name.startsWith(dex + ':') ? `${dex}:${u.name}` : u.name;
        if (u.maxLeverage) maxLev[name] = Number(u.maxLeverage);
        return name;
      });
  });
  update({ markets, maxLev });
}

// Navigation zwischen den Bereichen
const TITLES = { start: 'Start', signale: 'Signale', konto: 'Konto', risiko: 'Risiko', system: 'System' };
function showTab(name) {
  if (!TITLES[name]) name = address ? 'start' : 'system';
  document.querySelectorAll('[data-tab]').forEach((el) => el.classList.toggle('tab-off', el.dataset.tab !== name));
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent = TITLES[name];
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
document.getElementById('mini-health').addEventListener('click', () => { location.hash = 'system'; });

function renderMiniHealth(s) {
  const a = address ? accountHealth(s).status : 'fehlt';
  const st = streamHealth(s);
  const worst = [st, a].includes('fehler') ? 'fehler' : [st, a].includes('veraltet') || [st, a].includes('fehlt') ? 'veraltet' : 'ok';
  document.getElementById('mini-health').innerHTML = `<span class="dot s-${worst}"></span>${worst === 'ok' ? 'Live' : worst === 'fehler' ? 'Störung' : 'Prüfen'}`;
}

// Während der Finger auf dem Bildschirm liegt, nicht neu zeichnen (sonst gehen Tipps auf sich bewegende Zeilen verloren)
let touching = false, touchTimer = null;
document.addEventListener('touchstart', () => { touching = true; clearTimeout(touchTimer); }, { passive: true });
['touchend', 'touchcancel'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => { touching = false; }, 350); }, { passive: true }));
const renderAll = (s) => {
  if (touching) return; 
  render(s, !!address); renderRisk(s); renderPerformance(s); renderHome(s); renderWatchLive(s); renderMiniHealth(s);
};
const openFull = (r) => { location.hash = 'signale'; setTimeout(() => showDetail(r), 50); };
const openCalc = (r) => {
  setCalc(r.coin, r.plan.entry, r.plan.stop, r.plan.tps, r.mode);
  location.hash = 'risiko';
  setTimeout(() => document.getElementById('calc').scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
};
const openAnalyze = (coin) => { location.hash = 'signale'; setTimeout(() => analyze(coin), 50); };
initTrade(getState, openFull, openCalc);
initCoin(getState, openAnalyze);
initSignals(getState, openTrade, openCoin);
initHome(getState, openTrade, openFull, openCoin);
initMarket();
initBacktest();

// Privatmodus: Auge im Kopfbereich blendet alle Geldbeträge und Stückzahlen aus, Prozente bleiben
const PRIV_KEY = 'wolfdesk.private';
const EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function setPrivacy(on) {
  fmt.setPrivate(on);
  try { localStorage.setItem(PRIV_KEY, on ? '1' : '0'); } catch { /* egal */ }
  const eye = document.getElementById('eye');
  eye.innerHTML = on ? EYE_OFF : EYE_OPEN;
  eye.setAttribute('aria-pressed', String(on));
  eye.setAttribute('aria-label', on ? 'Beträge anzeigen' : 'Beträge verbergen');
  document.body.classList.toggle('private', on);
  touching = false;
  renderAll(getState());
  refreshTrade();
}
// Falls eine ältere index.html im Zwischenspeicher liegt: Auge-Knopf selbst anlegen
if (!document.getElementById('eye')) {
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'eye'; b.className = 'eye-btn';
  const mh = document.getElementById('mini-health');
  mh.parentNode.insertBefore(b, mh);
  mh.parentNode.style.display = 'flex'; mh.parentNode.style.gap = '8px'; mh.parentNode.style.alignItems = 'center';
}
let privOn = false;
try { privOn = localStorage.getItem(PRIV_KEY) === '1'; } catch { /* egal */ }
document.getElementById('eye').addEventListener('click', () => setPrivacy(!fmt.isPrivate()));

// Ziehen zum Aktualisieren (nur in der installierten App, im Browser macht das der Browser selbst)
const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
if (standalone) {
  if (!document.getElementById('ptr')) document.body.insertAdjacentHTML('afterbegin', '<div id="ptr" class="ptr" aria-hidden="true"><span class="ptr-spin"></span><span id="ptr-text">Zum Aktualisieren ziehen</span></div>');
  const ptr = document.getElementById('ptr'), ptrText = document.getElementById('ptr-text');
  const LIMIT = 70;
  let startY = null, pull = 0, busy = false;
  const sheetOpen = () => !document.getElementById('sheet').hidden;
  document.addEventListener('touchstart', (e) => {
    startY = !busy && !sheetOpen() && window.scrollY <= 0 ? e.touches[0].clientY : null;
    pull = 0;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    pull = Math.max(0, e.touches[0].clientY - startY);
    if (pull < 8) { ptr.classList.remove('show'); return; }
    ptr.classList.add('show');
    ptr.style.setProperty('--pull', Math.min(pull, LIMIT * 1.4) + 'px');
    ptrText.textContent = pull >= LIMIT ? 'Loslassen zum Aktualisieren' : 'Zum Aktualisieren ziehen';
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (startY == null) return;
    startY = null;
    if (pull < LIMIT) { ptr.classList.remove('show'); return; }
    busy = true;
    ptr.classList.add('busy');
    ptrText.textContent = 'Aktualisiere …';
    await Promise.allSettled([refreshAccount(), refreshPortfolio(), refreshFills(), refreshPrevDay(), refreshMarket(true)]);
    ptrText.textContent = 'Aktualisiert';
    setTimeout(() => { ptr.classList.remove('show', 'busy'); busy = false; }, 600);
  }, { passive: true });
}
// Positionen im Konto: Tipp öffnet das Markt-Blatt mit Chart und Teilverkäufen
const posBox = document.getElementById('positions');
posBox.addEventListener('click', (e) => { const a = e.target.closest('[data-coin]'); if (a) openCoin(a.dataset.coin); });
posBox.addEventListener('keydown', (e) => { const a = e.target.closest('[data-coin]'); if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCoin(a.dataset.coin); } });
initRisk(getState);
initPerformance(() => renderAll(getState()));
setPrivacy(privOn);
subscribe(renderAll);
renderAll(getState());
showTab(location.hash.slice(1));

loadMarkets();
startStream();
refreshAccount();
refreshPortfolio();
refreshFills();
refreshPrevDay();
setInterval(refreshAccount, CONFIG.refresh.accountMs);
setInterval(refreshPortfolio, CONFIG.refresh.performanceMs);
setInterval(refreshFills, CONFIG.refresh.performanceMs);
setInterval(refreshPrevDay, 5 * 60e3);
setInterval(() => renderAll(getState()), 1000); // Alter der Daten live mitzählen
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAccount(); });
