// Einstellungen: „Speicher“ (6a). Zeigt, wie viel Platz die App belegt, und räumt auf Wunsch auf.
// Persönliche Daten (Einstellungen, Watchlist, handelbare Märkte, Einschätzungen, Ziele, Chart-Linien, manuelle Stops,
// Wallet-Adresse) werden hier NIE gelöscht. Backtests räumen sich ohnehin selbst auf (je Stil nur der letzte Lauf).
import { clearAll, approxSize, clearRun } from './core-btstore.js';
import { loadMeta, metaBytes } from './core-binance.js';
import { makeBackup, parseBackup, restoreBackup, backupName } from './core-backup.js';

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
    <h3 class="sub-h">Datensicherung</h3>
    <p class="set-hint">Sichert alle deine Daten der App (Einstellungen, Listen, Einschätzungen, Ziele, Chart-Linien, manuelle Stops, Testplan-Läufe und Blindproben, Index, Wallet-Adresse; das Tagebuch liegt beim Wächter und ist ohnehin gesichert) in eine Datei auf dem iPhone. Einspielen überschreibt nur, was in der Datei steht, und löscht nichts. Die Datei gehört nie ins Repository.</p>
    <div class="mk-actions">
      <button type="button" class="small-btn" id="st-backup">Datensicherung speichern</button>
      <button type="button" class="small-btn ghost" id="st-restore">Datensicherung einspielen</button>
      <input type="file" id="st-file" accept="application/json,.json" hidden>
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

// 8q: Sicherung als Datei. Auf dem iPhone über das Teilen-Menü („In Dateien sichern“), sonst als Download.
async function saveBackup() {
  const version = document.querySelector('meta[name="app-version"]')?.content || '';
  const b = makeBackup(localStorage, version), name = backupName(), text = JSON.stringify(b);
  const file = new File([text], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Wolf Desk Datensicherung' }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
    $('st-msg').textContent = `Datensicherung erstellt: ${Object.keys(b.data).length} Einträge (${name}).`;
  } catch (e) { if (e?.name !== 'AbortError') $('st-msg').textContent = `Sichern hat nicht geklappt: ${e.message}`; }
}
async function loadBackupFile(file) {
  const p = parseBackup(await file.text());
  if (!p.ok) { $('st-msg').textContent = p.error; return; }
  const when = p.at ? new Date(p.at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unbekannt';
  if (!confirm(`Datensicherung vom ${when}${p.version ? ` (App ${p.version})` : ''} mit ${p.keys.length} Einträgen einspielen? Gleichnamige Daten werden überschrieben, nichts wird gelöscht. Die App lädt danach neu.`)) return;
  const n = restoreBackup(localStorage, p);
  $('st-msg').textContent = `${n} Einträge eingespielt. Die App lädt neu …`;
  setTimeout(() => location.reload(), 800);
}

export function bindStorage(root) {
  root.addEventListener('change', (e) => { if (e.target.id === 'st-file' && e.target.files?.[0]) { loadBackupFile(e.target.files[0]); e.target.value = ''; } });
  root.addEventListener('click', async (e) => {
    if (e.target.id === 'st-bt') {
      if (!confirm('Alle gespeicherten Backtest-Ergebnisse und unterbrochene Läufe löschen?')) return;
      await clearRun(); await clearAll();
      try { localStorage.removeItem('wolfdesk.btlast'); } catch { /* egal */ }
      $('st-msg').textContent = 'Backtest-Daten gelöscht.';
      refreshSize();
    }
    if (e.target.id === 'st-backup') saveBackup();
    if (e.target.id === 'st-restore') $('st-file')?.click();
    if (e.target.id === 'st-cache') {
      CACHE_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* egal */ } });
      $('st-msg').textContent = 'Zwischenspeicher geleert. Die App lädt die Daten bei Bedarf neu.';
      refreshSize();
    }
  });
  root.addEventListener('toggle', (e) => { if (e.target.dataset?.group === 'storage' && e.target.open) refreshSize(); }, true);
}
