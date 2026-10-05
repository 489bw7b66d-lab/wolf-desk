// Tests für core-journalmeasure.js (8a)
import { measureSignal, measureDue, withMeasure, measureStats } from './core-journalmeasure.js';
const H = 36e5;
const E0 = { coin: 'X', dir: 'long', px: 100, stop: 90, zone: [96, 99], tps: [110, 120], at: 0, status: 'offen' };
const c = (i, l, h) => ({ T: i * H, l, h });

export const tests = [
  ['Messwerte: Lauf ins Plus in R (Hoch 115 bei 10 Abstand = 1,5R)', () => measureSignal(E0, [c(1, 99.5, 105), c(2, 101, 115)], 3 * H).mfe === 1.5],
  ['Messwerte: Lauf ins Minus in R (Tief 94 = 0,6R)', () => measureSignal(E0, [c(1, 94, 101), c(2, 99, 104)], 3 * H).mae === 0.6],
  ['Messwerte: Zone erreicht nach 2 Std.', () => measureSignal(E0, [c(1, 99.5, 103), c(2, 98, 101)], 3 * H).zoneH === 2],
  ['Messwerte: Kurs bei Meldung schon in der Zone = 0 Std.', () => measureSignal({ ...E0, px: 98 }, [c(1, 97, 99)], 2 * H).zoneH === 0],
  ['Messwerte: Zone nie erreicht = null', () => measureSignal(E0, [c(1, 100, 105), c(2, 103, 108)], 3 * H).zoneH === null],
  ['Messwerte: ohne Zone (alte Einträge) = null, Rest wird gemessen', () => { const m = measureSignal({ ...E0, zone: null }, [c(1, 99, 105)], 2 * H); return m.zoneH === null && m.mfe === 0.5; }],
  ['Messwerte: Stop-Kerze beendet die Messung, Minus = 1R', () => { const m = measureSignal(E0, [c(1, 99, 104), c(2, 89, 130), c(3, 100, 150)], 4 * H); return m.mae === 1 && m.mfe === 0.4 && m.final === true; }],
  ['Messwerte: Kerzen vor der Meldung zählen nicht', () => measureSignal({ ...E0, at: 2 * H }, [c(1, 50, 200), c(3, 99, 105)], 4 * H).mfe === 0.5],
  ['Messwerte: Plus läuft nach dem Abschluss weiter (TP2 erreicht, Kurs steigt bis 3R)', () => measureSignal({ ...E0, status: 'tp2', doneAt: 2 * H }, [c(1, 99, 112), c(2, 105, 120), c(3, 115, 130)], 4 * H).mfe === 3],
  ['Messwerte: Minus zählt nur bis zum Abschluss', () => measureSignal({ ...E0, status: 'tp1', doneAt: 2 * H }, [c(1, 98, 111), c(2, 99.9, 105), c(3, 93, 100)], 4 * H).mae === 0.2],
  ['Messwerte: Short spiegelbildlich', () => { const m = measureSignal({ ...E0, dir: 'short', px: 100, stop: 110, zone: [101, 104] }, [c(1, 92, 102)], 2 * H); return m.mfe === 0.8 && m.mae === 0.2 && m.zoneH === 1; }],
  ['Messwerte: Fenster begrenzt (Kerzen nach 7 Tagen zählen nicht, dann fertig)', () => { const m = measureSignal(E0, [c(1, 99, 105), c(24 * 8, 99, 190)], 24 * 9 * H, 7); return m.mfe === 0.5 && m.final === true; }],
  ['Messwerte: innerhalb des Fensters noch nicht fertig', () => measureSignal(E0, [c(1, 99, 105)], 2 * H, 7).final === false],
  ['Messwerte: ohne Stop-Abstand kein Absturz', () => measureSignal({ ...E0, stop: 100 }, [c(1, 99, 105)], 2 * H) === null],
  ['Messwerte: ohne Kerzen = 0 / 0', () => { const m = measureSignal(E0, [], H); return m.mfe === 0 && m.mae === 0; }],
  ['Fällig: offene immer, ungültige nie', () => measureDue({ status: 'offen', m: { final: false, t: 0 } }, 1) === true && measureDue({ status: 'ungültig' }, 1) === false],
  ['Fällig: abgeschlossene ohne Messwert einmal nachholen', () => measureDue({ status: 'stop' }, 1) === true],
  ['Fällig: abgeschlossene alle 6 Std., fertige nie wieder', () => measureDue({ status: 'tp1', m: { final: false, t: 0 } }, 5 * H) === false && measureDue({ status: 'tp1', m: { final: false, t: 0 } }, 6 * H) === true && measureDue({ status: 'tp1', m: { final: true, t: 0 } }, 99 * H) === false],
  ['Archiv: Messwerte werden angehängt, ohne Zeitstempel', () => { const a = withMeasure([{ key: 'X|long|0', coin: 'X', dir: 'long', at: 0, r: -1 }], [{ ...E0, m: { zoneH: 2, mfe: 0.4, mae: 1, final: true, t: 5 } }])[0]; return a.zoneH === 2 && a.mfe === 0.4 && a.mae === 1 && a.t === undefined && a.r === -1; }],
  ['Archiv: Einträge ohne Messwert bleiben unverändert', () => { const x = { key: 'Y|long|0', coin: 'Y', dir: 'long', at: 0 }; return withMeasure([x], [E0])[0] === x; }],
  ['Auswertung: Anteile „lief mindestens 1R / 2R“', () => { const s = measureStats([{ mfe: 0.4, mae: 1 }, { mfe: 1.5, mae: 0.2 }, { mfe: 2.5, mae: 0.6 }, { mfe: 3, mae: 0.1 }]); return s.n === 4 && s.reach1 === 75 && s.reach2 === 50 && s.reach3 === 25; }],
  ['Auswertung: Gewinner, die vorher tief im Minus waren', () => measureStats([{ mfe: 2, mae: 0.7, status: 'tp1' }, { mfe: 2, mae: 0.1, status: 'tp2' }, { mfe: 0.2, mae: 1, status: 'stop' }]).deepWinners === 50],
  ['Auswertung: ohne Messwerte = null', () => measureStats([{ r: 1 }]) === null && measureStats([]) === null],
];
