// Startpunkt: verbindet Kern-Module und Anzeige.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { loadAccount } from './core-account.js';
import { startStream } from './core-stream.js';
import { getState, update, subscribe, logError } from './core-store.js';
import { render } from './ui-testpage.js';

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
  update({ account: null, accountTs: 0, accountError: null });
  refreshAccount();
});

document.getElementById('market-filter').addEventListener('input', () => render(getState(), !!address));

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

subscribe((s) => render(s, !!address));
render(getState(), !!address);

loadMarkets();
startStream();
refreshAccount();
setInterval(refreshAccount, CONFIG.refresh.accountMs);
setInterval(() => render(getState(), !!address), 1000); // Alter der Daten live mitzählen
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAccount(); });
