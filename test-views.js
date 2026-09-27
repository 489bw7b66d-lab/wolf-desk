import { alignment, validateView, cleanView, viewEvents, viewLines, isActive, viewFor } from './core-views.js';
import { journalStats, viewEventText, signalText } from './core-alerts.js';

const L = { bias: 'long', invalid: 100, trigger: 120, targets: [140, 160], at: 1, until: null };
const S = { bias: 'short', invalid: 120, trigger: 100, targets: [80], at: 2, until: null };

export const tests = [
  ['Einschätzung: Long-Signal zu bullischer Meinung = passt', () => alignment(L, 'long') === 'mit'],
  ['Einschätzung: Short-Signal zu bullischer Meinung = dagegen', () => alignment(L, 'short') === 'gegen'],
  ['Einschätzung: keine Meinung = keine Markierung', () => alignment(null, 'long') === null],
  ['Einschätzung: abgelaufen = gilt nicht mehr', () => !isActive({ ...L, until: 5 }, 10) && viewFor({ SOL: { ...L, until: 5 } }, 'SOL', 10) === null],
  ['Einschätzung: bullisch mit ungültig über Bestätigung = Fehler', () => validateView({ ...L, invalid: 130 }).length > 0],
  ['Einschätzung: bärisch mit Ziel über „ungültig“ = Fehler', () => validateView({ ...S, targets: [130] }).length > 0],
  ['Einschätzung: sinnvolle Eingabe = gültig', () => validateView(L).length === 0 && validateView(S).length === 0],
  ['Einschätzung: deutsche Zahlen werden verstanden', () => { const v = cleanView({ bias: 'long', invalid: '84.500,5', trigger: '0,0475', target1: '1.234,0' }); return v.invalid === 84500.5 && v.trigger === 0.0475 && v.targets[0] === 1234; }],
  ['Einschätzung: Linien für Chart', () => viewLines(L).length === 4 && viewLines(null).length === 0],
  ['Marken: Kurs unter „ungültig“ wird gemeldet', () => viewEvents('SOL', L, 99, {})[0]?.type === 'invalid'],
  ['Marken: schon gemeldet = nicht nochmal', () => { const e = viewEvents('SOL', L, 99, {})[0]; return viewEvents('SOL', L, 98, { [e.key]: 1 }).length === 0; }],
  ['Marken: bullisch über Bestätigung und Ziel 1', () => { const e = viewEvents('SOL', L, 145, {}); return e.some((x) => x.type === 'trigger') && e.some((x) => x.type === 'target' && x.n === 1) && !e.some((x) => x.n === 2); }],
  ['Marken: bärisch unter Ziel', () => viewEvents('BTC', S, 79, {}).some((x) => x.type === 'target')],
  ['Marken: neue Einschätzung meldet erneut', () => { const e = viewEvents('SOL', L, 99, {})[0]; return viewEvents('SOL', { ...L, at: 99 }, 98, { [e.key]: 1 }).length === 1; }],
  ['Marken: Meldung ohne Dollarbeträge', () => !viewEventText('SOL', L, { type: 'invalid', level: 100 }, 99).includes('$')],
  ['Tagebuch: ⭐-Signale getrennt ausgewertet', () => { const s = journalStats([{ status: 'tp1', r: 1, view: 'mit' }, { status: 'stop', r: -1, view: 'gegen' }, { status: 'stop', r: -1 }]); return s.viewWith.n === 1 && s.viewWith.hit === 100 && s.viewAgainst.hit === 0 && s.viewNone.n === 1; }],
  ['Signal-Text: ⭐ nur wenn passend', () => {
    const r = { coin: 'TIA', dir: 'long', best: 'swing', total: { long: 80 }, plan: { dir: 'long', zone: [1, 2], entry: 1.5, stop: 1, tps: [2, 3] }, events: [], confirms: [], waves: [] };
    const a = { score: 80, price: 1.5, pos: { state: 'zone' } };
    return signalText(r, a, { appUrl: 'x', star: true }).includes('⭐') && !signalText(r, a, { appUrl: 'x' }).includes('⭐');
  }],
];
