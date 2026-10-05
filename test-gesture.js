// Tests für core-gesture.js (8a)
import { tabSwipe, nextTab, pullStarts, pullCloses } from './core-gesture.js';
const TABS = ['start', 'konto', 'signale', 'backtest', 'risiko'];
const S = (o) => ({ dx: -120, dy: 10, dt: 250, startX: 200, width: 390, ...o });

export const tests = [
  ['Wischen: nach links = nächster Tab', () => tabSwipe(S()) === 1],
  ['Wischen: nach rechts = voriger Tab', () => tabSwipe(S({ dx: 120 })) === -1],
  ['Wischen: zu kurz = nichts', () => tabSwipe(S({ dx: -50 })) === 0],
  ['Wischen: schräg (Scrollen mit schrägem Daumen) = nichts', () => tabSwipe(S({ dx: -120, dy: 80 })) === 0],
  ['Wischen: senkrecht = nichts', () => tabSwipe(S({ dx: 5, dy: 300 })) === 0],
  ['Wischen: vom linken Rand gehört dem iPhone', () => tabSwipe(S({ startX: 10, dx: 150 })) === 0],
  ['Wischen: vom rechten Rand ebenso', () => tabSwipe(S({ startX: 380 })) === 0],
  ['Wischen: zu langsam (Finger liegt lange) = nichts', () => tabSwipe(S({ dt: 1500 })) === 0],
  ['Wischen: kaputte Werte = nichts', () => tabSwipe({}) === 0 && tabSwipe() === 0],
  ['Tabs: Reihenfolge der Menüleiste', () => nextTab(TABS, 'start', 1) === 'konto' && nextTab(TABS, 'signale', -1) === 'konto' && nextTab(TABS, 'backtest', 1) === 'risiko'],
  ['Tabs: am Rand ist Schluss (kein Kreis)', () => nextTab(TABS, 'start', -1) === null && nextTab(TABS, 'risiko', 1) === null],
  ['Tabs: Einstellungen und System wechseln nicht', () => nextTab(TABS, 'einstellungen', 1) === null && nextTab(TABS, 'system', -1) === null],
  ['Blatt: Ziehen beginnt nur bei klarer Abwärtsbewegung', () => pullStarts(2, 20) === true && pullStarts(30, 20) === false && pullStarts(0, 5) === false && pullStarts(0, -40) === false],
  ['Blatt: schließt ab 120 Punkten, darunter springt es zurück', () => pullCloses(130) === true && pullCloses(119) === false],
];
