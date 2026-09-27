// Deine Markteinschätzung pro Markt (z. B. nach einer Analyse, die du gelesen hast).
// Reine Funktionen haben Tests in test-views.js. Eingabe in ui-views.js.
//
// Eine Einschätzung: { bias: 'long'|'neutral'|'short', invalid, trigger, targets: [z1, z2], note, until, at }
//   long:  ungültig UNTER invalid, bestätigt ÜBER trigger, Ziele darüber
//   short: ungültig ÜBER invalid, bestätigt UNTER trigger, Ziele darunter
import { CONFIG } from './config.js';

export const VIEWS_KEY = 'wolfdesk.views';
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

// Alle Einschätzungen: aus my-settings.js (für den Wächter) plus die auf diesem iPhone (haben Vorrang, null = gelöscht)
export function getViews() {
  let local = {};
  try { local = JSON.parse(globalThis.localStorage?.getItem(VIEWS_KEY) || '{}'); } catch { /* egal */ }
  const all = { ...(CONFIG.views || {}), ...local };
  Object.keys(all).forEach((k) => { if (all[k] == null) delete all[k]; });
  return all;
}
export function saveView(coin, view) {
  let local = {};
  try { local = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}'); } catch { /* egal */ }
  local[coin] = view; // null löscht
  localStorage.setItem(VIEWS_KEY, JSON.stringify(local));
}

export const isActive = (v, now = Date.now()) => !!v && (!v.until || v.until > now);
export function viewFor(views, coin, now = Date.now()) {
  const v = views?.[coin];
  return isActive(v, now) ? v : null;
}

// Passt ein Signal zur Einschätzung? 'mit' | 'gegen' | 'neutral' | null (keine Einschätzung)
export function alignment(view, dir) {
  if (!view || !dir || dir === 'neutral') return null;
  if (view.bias === 'neutral') return 'neutral';
  return view.bias === dir ? 'mit' : 'gegen';
}

// Prüfung vor dem Speichern: Liste von Fehlertexten
export function validateView(v) {
  const err = [];
  if (!['long', 'neutral', 'short'].includes(v.bias)) err.push('Bitte eine Richtung wählen');
  const inv = num(v.invalid), trg = num(v.trigger), t = (v.targets || []).map(num).filter((x) => x != null);
  [inv, trg, ...t].forEach((x) => { if (x != null && x <= 0) err.push('Preise müssen größer als 0 sein'); });
  if (v.bias === 'long') {
    if (inv != null && trg != null && !(inv < trg)) err.push('Bullisch: „ungültig unter“ muss unter „bestätigt über“ liegen');
    if (inv != null && t.some((x) => x <= inv)) err.push('Bullisch: Ziele müssen über „ungültig unter“ liegen');
  }
  if (v.bias === 'short') {
    if (inv != null && trg != null && !(inv > trg)) err.push('Bärisch: „ungültig über“ muss über „bestätigt unter“ liegen');
    if (inv != null && t.some((x) => x >= inv)) err.push('Bärisch: Ziele müssen unter „ungültig über“ liegen');
  }
  if (v.until && v.until < Date.now() - 60e3) err.push('Das Ablaufdatum liegt in der Vergangenheit');
  return [...new Set(err)];
}

// Eingabe (Texte mit Komma) → gespeicherte Einschätzung
export function cleanView(v, now = Date.now()) {
  const p = (x) => num(String(x ?? '').trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return {
    bias: v.bias, invalid: p(v.invalid), trigger: p(v.trigger),
    targets: [p(v.target1), p(v.target2)].filter((x) => x != null),
    note: String(v.note || '').slice(0, 80), until: v.until || null, at: now,
  };
}

// Linien für den Chart
export function viewLines(view) {
  if (!view) return [];
  const long = view.bias !== 'short';
  const out = [];
  if (view.invalid != null) out.push({ price: view.invalid, col: 'var(--bad)', label: long ? '✗ unter' : '✗ über', dash: '1 3' });
  if (view.trigger != null) out.push({ price: view.trigger, col: 'var(--gold)', label: '★ ' + (long ? 'über' : 'unter'), dash: '6 3' });
  (view.targets || []).forEach((t, i) => out.push({ price: t, col: 'var(--ok)', label: `★ Z${i + 1}`, dash: '6 3', fit: false }));
  return out;
}

// Welche Marken hat der Kurs neu erreicht? hit = bereits gemeldete Schlüssel (für den Wächter)
export function viewEvents(coin, view, price, hit = {}) {
  if (!view || !(price > 0) || view.bias === 'neutral') return [];
  const long = view.bias === 'long', ev = [];
  const key = (k) => `${coin}|${view.at}|${k}`;
  if (view.invalid != null && (long ? price < view.invalid : price > view.invalid) && !hit[key('invalid')]) ev.push({ key: key('invalid'), type: 'invalid', level: view.invalid });
  if (view.trigger != null && (long ? price > view.trigger : price < view.trigger) && !hit[key('trigger')]) ev.push({ key: key('trigger'), type: 'trigger', level: view.trigger });
  (view.targets || []).forEach((t, i) => {
    if ((long ? price >= t : price <= t) && !hit[key('t' + i)]) ev.push({ key: key('t' + i), type: 'target', n: i + 1, level: t });
  });
  return ev;
}

export const BIAS_TXT = { long: 'bullisch', neutral: 'neutral', short: 'bärisch' };
