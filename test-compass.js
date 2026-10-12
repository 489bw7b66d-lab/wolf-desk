// Tests für den Zyklus-Kompass (8w): core-compass.js
import { KOMPASS, PHASES, bandState, phaseOf, agreeOf } from './core-compass.js';

const DAY = 864e5, T0 = Date.UTC(2025, 0, 6); // Montag
// Tageskerzen aus einer Folge von Wochenschlüssen (jede Woche 7 gleiche Tage)
const fromWeeks = (closes) => closes.flatMap((c, w) => Array.from({ length: 7 }, (_, d) => ({ t: T0 + (w * 7 + d) * DAY, T: T0 + (w * 7 + d + 1) * DAY - 1, o: c, h: c * 1.01, l: c * 0.99, c, v: 100 })));
const rise = (n, from = 100, step = 2) => Array.from({ length: n }, (_, i) => from + i * step);
const mk = (o) => ({ band: { state: 'gruen', below: 0, rising: true }, btcUp: true, altUp: true, rs30: 0, breadth: 0, fng: 50, btc30: 5, ...o });

export const tests = [
  ['Kompass: sieben Phasen, Phase 5 ausdrücklich nicht messbar', () => PHASES.length === 8 && PHASES[5].todo.includes('Nicht messbar') && PHASES.slice(1).every((p, i) => p.n === i + 1)],
  ['Kompass: zu wenig Wochen → keine Ampel', () => bandState(fromWeeks(rise(20))) === null],
  ['Kompass: grün bei Wochenschluss über dem steigenden Band', () => { const b = bandState(fromWeeks([...rise(40), 190])); return b && b.state === 'gruen' && b.rising && b.below === 0; }],
  ['Kompass: gelb beim ersten Wochenschluss unter dem Band', () => { const b = bandState(fromWeeks([...rise(40), 120])); return b && b.state === 'gelb' && b.below === 1 && /Gewinne sichern/.test(b.why); }],
  ['Kompass: rot nach zwei Schlüssen darunter, wenn das Band fällt', () => { const w = [...rise(30, 100, 3), ...Array.from({ length: 14 }, (_, i) => 190 - i * 6)]; const b = bandState(fromWeeks(w)); return b && b.state === 'rot' && b.below >= 2 && !b.rising; }],
  ['Kompass: nur abgeschlossene Wochen zählen', () => { const D = fromWeeks([...rise(40), 190]); const part = [...D, { t: D.at(-1).t + DAY, T: D.at(-1).T + DAY, o: 50, h: 50, l: 50, c: 50, v: 1 }]; return bandState(part).state === 'gruen'; }],
  ['Kompass: grünes Band, BTC läuft den Alts davon → Bitcoin-Führung', () => phaseOf(mk({ rs30: -8 })).n === 2],
  ['Kompass: Alts holen auf → frühe Rotation', () => phaseOf(mk({ rs30: 2 })).n === 3],
  ['Kompass: Alts klar vorn und Rest stärker als Top 10 → breite Alt-Season', () => phaseOf(mk({ rs30: 9, breadth: 4 })).n === 4 && phaseOf(mk({ rs30: 9, breadth: -4 })).n === 3],
  ['Kompass: Gier und großer BTC-Anstieg → Euphorie', () => phaseOf(mk({ fng: 85, btc30: 30, rs30: 9, breadth: 4 })).n === 6],
  ['Kompass: gelb nach Schwäche → Distributionsverdacht; rot → Risk-off oder Boden', () => phaseOf(mk({ band: { state: 'gelb', below: 1, rising: true } })).n === 6 && phaseOf(mk({ band: { state: 'rot', below: 3, rising: false }, btcUp: false, altUp: false })).n === 7 && phaseOf(mk({ band: { state: 'rot', below: 3, rising: false }, btcUp: true })).n === 1],
  ['Kompass: ohne Ampel keine Phase', () => phaseOf({}) === null && phaseOf(null) === null && KOMPASS.sma === 20],
  ['Kompass: x von 4 zählt nur Prüfbares', () => { const D = Array.from({ length: 25 }, (_, i) => ({ t: i, c: 1, v: i === 24 ? 200 : 100 })); const a = agreeOf({ up: true, vsBtc: 3, breadthShare: 0.7, daily: D }), b = agreeOf({ up: true, vsBtc: null, breadthShare: 0.3, daily: [] }); return a.n === 4 && a.of === 4 && b.of === 2 && b.n === 1; }],
];
