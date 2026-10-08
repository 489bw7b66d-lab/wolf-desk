// Datensicherung (8q): alle persönlichen Daten der App als eine Datei sichern und wieder einspielen.
// Vor der Schönheits-OP gebaut (Masterplan, Reihenfolge Punkt 4: „Schönheits-OP mit Datensicherung“).
// Gesichert wird alles, was die App unter „wolfdesk.“ im Browser-Speicher ablegt: Einstellungen, Watchlist, handelbare Märkte,
// Einschätzungen, Ziele, Chart-Linien, manuelle Stops, Testplan-Läufe und Blindproben, der Index, die Wallet-Adresse.
// Nicht gesichert: Zwischenspeicher, die sich selbst neu füllen, und das Protokoll der langen Binance-Historie (die Kerzen liegen
// in einer eigenen Datenbank und werden bei Bedarf neu geladen). Die Datei bleibt auf dem iPhone und gehört NIE ins Repository
// (sie enthält die Wallet-Adresse und kann Beträge enthalten). Reine Funktionen, Tests in test-backup.js.
export const BACKUP = { prefix: 'wolfdesk.', skip: ['wolfdesk.universe', 'wolfdesk.autoplans', 'wolfdesk.patience', 'wolfdesk.bn'], v: 1 };

// Schlüssel, die gesichert werden
export function backupKeys(store, cfg = BACKUP) {
  const out = [];
  try { for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith(cfg.prefix) && !cfg.skip.includes(k)) out.push(k); } } catch { /* Speicher gesperrt */ }
  return out.sort();
}
export function makeBackup(store, version = '', now = Date.now(), cfg = BACKUP) {
  const data = {};
  for (const k of backupKeys(store, cfg)) { const v = store.getItem(k); if (v != null) data[k] = v; }
  return { app: 'wolf-desk', kind: 'backup', v: cfg.v, at: now, version, data };
}
// Prüft eine eingelesene Datei. Ergebnis: { ok, backup, keys, at, version } oder { ok: false, error }
export function parseBackup(text, cfg = BACKUP) {
  let b;
  try { b = JSON.parse(text); } catch { return { ok: false, error: 'Die Datei ist keine Datensicherung von Wolf Desk (kein lesbares Format).' }; }
  if (!b || b.app !== 'wolf-desk' || b.kind !== 'backup' || typeof b.data !== 'object' || !b.data) return { ok: false, error: 'Die Datei ist keine Datensicherung von Wolf Desk.' };
  if (b.v > cfg.v) return { ok: false, error: 'Die Datensicherung stammt aus einer neueren Fassung der App. Bitte erst die App aktualisieren.' };
  const keys = Object.keys(b.data).filter((k) => k.startsWith(cfg.prefix) && typeof b.data[k] === 'string');
  if (!keys.length) return { ok: false, error: 'Die Datensicherung ist leer.' };
  return { ok: true, backup: b, keys: keys.sort(), at: b.at ?? null, version: b.version ?? '' };
}
// Spielt die Sicherung ein. Schlüssel, die nicht in der Sicherung stehen, bleiben unberührt (nichts wird gelöscht).
export function restoreBackup(store, parsed, cfg = BACKUP) {
  if (!parsed?.ok) return 0;
  let n = 0;
  for (const k of parsed.keys) { if (cfg.skip.includes(k)) continue; try { store.setItem(k, parsed.backup.data[k]); n++; } catch { /* Speicher voll */ } }
  return n;
}
export const backupName = (now = Date.now()) => { const d = new Date(now), p = (x) => String(x).padStart(2, '0'); return `wolf-desk-sicherung-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`; };
