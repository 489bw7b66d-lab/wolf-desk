// Startpunkt: verbindet Kern-Module und Anzeige.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { loadAccount } from './core-account.js';
import { startStream } from './core-stream.js';
import { getState, update, subscribe, logError } from './core-store.js';
import { render } from './ui-testpage.js';
import { initRisk, renderRisk } from './ui-risk.js';
import { initSignals, showDetail } from './ui-signals.js';
import { initHome, renderHome } from './ui-home.js';
import { initTrade, openTrade } from './ui-trade.js';
import { streamHealth, accountHealth } from './core-health.js';
import { initPerformance, renderPerformance } from './ui-performance.js';

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
  update({ account: null, accountTs: 0, accountError: null });
  refreshAccount();
  refreshPortfolio();
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

async function loadMarkets() {
  const res = await Promise.allSettled(CONFIG.dexes.map((d) => hl.meta(d)));
  const markets = {};
  res.forEach((r, i) => {
    const dex = CONFIG.dexes[i];
    if (r.status !== 'fulfilled') { logError(`Marktliste ${dex || 'Haupt'}`, r.reason); return; }
    markets[dex] = (r.value?.universe || [])
      .filter((u) => !u.isDelisted)
      .map((u) => (dex && !u.name.startsWith(dex + ':') ? `${dex}:${u.name}` : u.name));
  });
  update({ markets });
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

const renderAll = (s) => { render(s, !!address); renderRisk(s); renderPerformance(s); renderHome(s); renderMiniHealth(s); };
const openFull = (r) => { location.hash = 'signale'; setTimeout(() => showDetail(r), 50); };
initTrade(getState, openFull);
initSignals(getState, openTrade);
initHome(getState, openTrade, openFull);
initRisk(getState);
initPerformance(() => renderAll(getState()));
subscribe(renderAll);
renderAll(getState());
showTab(location.hash.slice(1));

loadMarkets();
startStream();
refreshAccount();
refreshPortfolio();
setInterval(refreshAccount, CONFIG.refresh.accountMs);
setInterval(refreshPortfolio, CONFIG.refresh.performanceMs);
setInterval(() => renderAll(getState()), 1000); // Alter der Daten live mitzählen
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAccount(); });
