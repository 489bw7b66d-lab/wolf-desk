import { planState, structureBroken, viewInvalid, stopFirstProb, touchProb } from './core-planstate.js';
import { archiveEntries, mergeArchive } from './core-alerts.js';

const H = 36e5;
const mk = (v, t0 = 0) => v.map((c, i) => ({ t: t0 + i * H, T: t0 + i * H + H - 1, o: c, h: c + 0.5, l: c - 0.5, c }));

export const tests = [
  ['Plan-Ampel: gesund = laufen lassen', () => planState({ hasStop: true, noise: { status: 'ok' } }).state === 'ok'],
  ['Plan-Ampel: knapp mit Vorschlag', () => { const s = planState({ hasStop: true, noise: { status: 'warn', suggest: { stop: 9 } } }); return s.state === 'tight' && s.suggest === 9; }],
  ['Plan-Ampel: Stop im Rauschen, aber sinnvoller Stop möglich = nur knapp', () => planState({ hasStop: true, noise: { status: 'bad', suggest: { stop: 9, beyondLiq: false } } }).state === 'tight'],
  ['Plan-Ampel: kaputt mit Gründen (ALGO-Fall, kein Stop, Liquidation, Struktur, Einschätzung, Signal)', () => {
    const a = planState({ hasStop: true, noise: { status: 'bad', suggest: { stop: 9, beyondLiq: true } } });
    const b = planState({ hasStop: false }), c = planState({ hasStop: true, liqFirst: true }), d = planState({ hasStop: true, struct: { broken: true } });
    const e = planState({ hasStop: true, viewBad: true }), f = planState({ hasStop: true, signalBad: true });
    return [a, b, c, d, e, f].every((x) => x.state === 'broken') && a.reasons[0].includes('kein sinnvoller Stop');
  }],
  ['Struktur: Long gebrochen, wenn die letzte Kerze unter dem letzten Swing-Tief vor dem Einstieg schließt', () => {
    const cs = mk([10, 9, 8, 9, 10, 11, 12, 11, 10, 9, 7.2]); // Swing-Tief 7,5 (Kerze 2), Einstieg nach Kerze 6
    const r = structureBroken(cs, 'long', 6 * H);
    const ok = structureBroken(mk([10, 9, 8, 9, 10, 11, 12, 11, 10, 9, 8.5]), 'long', 6 * H);
    return r.broken === true && Math.abs(r.level - 7.5) < 1e-9 && ok.broken === false;
  }],
  ['Einschätzung ungültig: Long unter „ungültig unter“', () => viewInvalid({ bias: 'long', invalid: '10' }, 'long', 9.5) && !viewInvalid({ bias: 'long', invalid: '10' }, 'long', 11) && !viewInvalid({ bias: 'short', invalid: '10' }, 'long', 9)],
  ['Orientierung: Stop zuerst (ALGO: Stop 1,5 % weg, Ziel 21 %)', () => Math.abs(stopFirstProb(1.5, 21) - 21 / 22.5) < 1e-9 && stopFirstProb(0, 5) === null],
  ['Orientierung: Berührung in n Kerzen steigt mit der Zeit und sinkt mit dem Abstand', () => {
    const a = touchProb(1, 2, 1), b = touchProb(1, 2, 6), c = touchProb(5, 2, 6);
    return a < b && c < b && b <= 1 && a > 0;
  }],
  ['Tagebuch-Archiv: nur abgeschlossene Signale, ohne Trade-Verknüpfung, doppelte zusammengeführt', () => {
    const j = [{ coin: 'A', dir: 'long', at: 1, style: 'swing', score: 80, status: 'tp1', r: 0.8, trade: { pnl: 99 } }, { coin: 'B', dir: 'short', at: 2, status: 'offen' }];
    const a = archiveEntries(j);
    const m = mergeArchive([{ key: 'A|long|1', coin: 'A', dir: 'long', at: 1, status: 'offen' }, { key: 'C|long|0', coin: 'C', dir: 'long', at: 0, status: 'stop' }], a);
    return a.length === 1 && !('trade' in a[0]) && m.length === 2 && m[1].status === 'tp1' && m[0].coin === 'C';
  }],
  ['Plan-Ampel: bei „knapp“ nie einen Stop hinter der Liquidation vorschlagen', () => planState({ hasStop: true, noise: { status: 'warn', suggest: { stop: 0.119, beyondLiq: true } } }).suggest === null],
];
