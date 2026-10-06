// Einstellungen: „Speicher“ (6a). Zeigt, wie viel Platz die App belegt, und räumt auf Wunsch auf.
// Persönliche Daten (Einstellungen, Watchlist, handelbare Märkte, Einschätzungen, Ziele, Chart-Linien, manuelle Stops,
// Wallet-Adresse) werden hier NIE gelöscht. Backtests räumen sich ohnehin selbst auf (je Stil nur der letzte Lauf).
import { clearAll, approxSize, clearRun } from './core-btstore.js';
import { loadMeta, metaBytes } from './core-binance.js';

const $ = (id) => document.getElementById(id);
const CACHE_KEYS = ['wolfdesk.universe', 'wolfdesk.autoplans', 'wolfdesk.patience']; // wird bei Bedarf neu berechnet
const fmtSize = (b) => (b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');

export function storageBlock(open) {
  return `<details class="set-group" data-group="storage"${open ? ' open' : ''}>
    <summary><span>Speicher</span><b class="set-badge" id="st-size">…</b></summary>
    <p class="set-hint">Backtests räumen sich selbst auf: je Stil bleibt nur der letzte Lauf. Deine Einstellungen, Listen, Einschätzungen, Ziele und Chart-Linien werden hier nie gelöscht. Auch die lange Historie von Binance und ihr Stichtag bleiben.</p>
    <div class="mk-actions">
      <button type="button" class="small-btn ghost" id="st-bt">Backtest-Daten löschen</button>
      <button type="button" class="small-btn ghost" id="st-cache">Zwischenspeicher leeren</button>
    </div>
    <p class="set-hint" id="st-msg" role="status"></p>
  </details>`;
}

export async function refreshSize() {
  let bytes = 0;
  try { bytes += await approxSize(); } catch { /* egal */ }
  try { bytes += metaBytes(loadMeta()); } catch { /* egal */ } // 8h: lange Historie (eigene Datenbank, aus dem Protokoll gerechnet)
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch { /* egal */ }
  if ($('st-size')) $('st-size').textContent = fmtSize(bytes);
}

export function bindStorage(root) {
  root.addEventListener('click', async (e) => {
    if (e.target.id === 'st-bt') {
      if (!confirm('Alle gespeicherten Backtest-Ergebnisse und unterbrochene Läufe löschen?')) return;
      await clearRun(); await clearAll();
      try { localStorage.removeItem('wolfdesk.btlast'); } catch { /* egal */ }
      $('st-msg').textContent = 'Backtest-Daten gelöscht.';
      refreshSize();
    }
    if (e.target.id === 'st-cache') {
      CACHE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* egal */ } });
      $('st-msg').textContent = 'Zwischenspeicher geleert. Die App lädt die Daten bei Bedarf neu.';
      refreshSize();
    }
  });
  root.addEventListener('toggle', (e) => { if (e.target.dataset?.group === 'storage' && e.target.open) refreshSize(); }, true);
}
