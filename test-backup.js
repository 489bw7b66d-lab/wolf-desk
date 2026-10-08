// Tests für die Datensicherung (8q): core-backup.js
import { BACKUP, backupKeys, makeBackup, parseBackup, restoreBackup, backupName } from './core-backup.js';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { get length() { return m.size; }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), dump: () => Object.fromEntries(m) }; };
const SRC = { 'wolfdesk.settings': '{"a":1}', 'wolfdesk.watchlist': '["SOL"]', 'wolfdesk.address': '0xabc', 'wolfdesk.universe': '[1,2]', 'wolfdesk.bn': '{}', 'andere.app': 'x', 'wolfdesk.hlindex': '{"v":2}' };

export const tests = [
  ['Sicherung: alle Daten unter „wolfdesk.“, ohne Zwischenspeicher, ohne fremde Apps, sortiert', () => backupKeys(mem(SRC)).join() === 'wolfdesk.address,wolfdesk.hlindex,wolfdesk.settings,wolfdesk.watchlist' && BACKUP.skip.includes('wolfdesk.universe')],
  ['Sicherung: Kopf mit Kennung, Fassung, Zeitpunkt und App-Version; Inhalte unverändert als Text', () => { const b = makeBackup(mem(SRC), '8q', 123); return b.app === 'wolf-desk' && b.kind === 'backup' && b.v === 1 && b.at === 123 && b.version === '8q' && b.data['wolfdesk.settings'] === '{"a":1}' && !('andere.app' in b.data) && !('wolfdesk.universe' in b.data); }],
  ['Einlesen: eine echte Sicherung wird erkannt', () => { const p = parseBackup(JSON.stringify(makeBackup(mem(SRC), '8q', 5))); return p.ok && p.keys.length === 4 && p.at === 5 && p.version === '8q'; }],
  ['Einlesen: kaputte, fremde, leere oder zu neue Dateien werden abgelehnt, mit Grund', () => !parseBackup('{kaputt').ok && /keine Datensicherung/.test(parseBackup('{"app":"x"}').error) && /leer/.test(parseBackup(JSON.stringify({ app: 'wolf-desk', kind: 'backup', v: 1, data: {} })).error) && /neueren Fassung/.test(parseBackup(JSON.stringify({ app: 'wolf-desk', kind: 'backup', v: 9, data: { 'wolfdesk.a': '1' } })).error)],
  ['Einlesen: nur Einträge unter „wolfdesk.“ und nur Text werden übernommen', () => { const p = parseBackup(JSON.stringify({ app: 'wolf-desk', kind: 'backup', v: 1, data: { 'wolfdesk.a': '1', 'fremd.b': '2', 'wolfdesk.c': 3 } })); return p.ok && p.keys.join() === 'wolfdesk.a'; }],
  ['Einspielen: überschreibt Gleichnamiges, löscht nichts, lässt Zwischenspeicher aus', () => { const dst = mem({ 'wolfdesk.settings': 'alt', 'wolfdesk.plans': 'bleibt' }); const b = makeBackup(mem(SRC)); b.data['wolfdesk.universe'] = 'x'; const n = restoreBackup(dst, { ok: true, backup: b, keys: Object.keys(b.data) }); const d = dst.dump(); return n === 4 && d['wolfdesk.settings'] === '{"a":1}' && d['wolfdesk.plans'] === 'bleibt' && d['wolfdesk.address'] === '0xabc' && !('wolfdesk.universe' in d); }],
  ['Einspielen: Hin und zurück ergibt dieselben Daten', () => { const src = mem(SRC), dst = mem(); restoreBackup(dst, parseBackup(JSON.stringify(makeBackup(src)))); return backupKeys(dst).every((k) => dst.getItem(k) === src.getItem(k)) && backupKeys(dst).length === 4; }],
  ['Einspielen: ohne gültige Sicherung passiert nichts', () => restoreBackup(mem(), { ok: false }) === 0 && restoreBackup(mem(), null) === 0],
  ['Dateiname mit Datum und Uhrzeit', () => /^wolf-desk-sicherung-\d{4}-\d{2}-\d{2}-\d{4}\.json$/.test(backupName(Date.UTC(2026, 9, 8, 10, 30)))],
];
