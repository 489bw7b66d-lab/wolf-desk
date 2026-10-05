// Tests für die Anzeige-Bausteine aus 8a: Positions-Übersicht, Mini-Balken, Gesamt-Risiko-Zeile, Eingaben, Einzel-Trades im Export
import { miniPath, riskSum, posOverview, parseNum, exitBoxHtml, stopBoxHtml } from './ui-position.js';
import { tradeList } from './ui-export.js';
import { tradePath } from './core-path.js';
import { tradeHistory } from './core-trades.js';
import { CONFIG } from './config.js';
import * as f from './core-format.js';

const PLAN = [{ label: 'TP1', pct: 30 }, { label: 'TP2', pct: 30 }, { label: 'TP3', pct: 20 }, { label: 'Runner', pct: 20 }];
const P = { coin: 'SUI', side: 'long', size: 1000, entry: 1, mark: 1.1, stop: 0.9, liq: 0.8, liqDist: 27.3, marginUsed: 100, upnl: 100, leverage: 10, leverageType: 'isoliert', stopSource: 'Order',
  evaluation: { worst: 'ok', checks: [], fromEntry: 100, riskPct: 5, fromNow: 200, giveBack: 100 } };
const path = (p = P) => tradePath(p, [], [], PLAN, { tps: [1.2, 1.4, 1.6], source: 'signal', label: 'aus dem Signal', stop: 0.9 });
const PP = () => ({ path: path(), trail: null, state: { state: 'ok', reasons: [] } });
const pub = (fn) => { const was = f.isPrivate(); f.setPrivate(false); try { return fn(); } finally { f.setPrivate(was); } };
const fills = [
  { coin: 'NIL', side: 'B', sz: '100', px: '1', startPosition: '0', time: 1000, fee: '0.1', closedPnl: '0' },
  { coin: 'NIL', side: 'A', sz: '50', px: '1.2', startPosition: '100', time: 36e5 + 1000, fee: '0.1', closedPnl: '10' },
  { coin: 'NIL', side: 'A', sz: '50', px: '1.4', startPosition: '50', time: 72e5 + 1000, fee: '0.1', closedPnl: '20' },
  { coin: 'ZEC', side: 'B', sz: '2', px: '100', startPosition: '0', time: 5000, fee: '0.2', closedPnl: '0' },
];

export const tests = [
  ['Mini-Balken: zeigt Stop, Einstieg und alle Ziele als Striche', () => { const h = miniPath(path()); return (h.match(/path-tick/g) || []).length === 5 && h.includes('path-tick sl') && h.includes('path-tick e'); }],
  ['Mini-Balken: grün ab Einstieg, wenn der Kurs im Gewinn liegt', () => /path-fill gain" style="left:[\d.]+%;width:(?!0\.0%)[\d.]+%/.test(miniPath(path()))],
  ['Mini-Balken: im Minus kein Grün', () => /path-fill gain" style="left:[\d.]+%;width:0\.0%/.test(miniPath(path({ ...P, mark: 0.95 })))],
  ['Mini-Balken: Stop im Gewinn wird grün markiert', () => miniPath(path({ ...P, stop: 1.05 })).includes('sl-gain')],
  ['Mini-Balken: ohne Ziele oder ohne Weg leer (kein Absturz)', () => miniPath(null) === '' && miniPath({ empty: true }) === ''],
  ['Gesamt-Risiko-Zeile: Betrag, Prozent und Richtung', () => pub(() => { const h = riskSum([P], 1000); return h.includes('Greifen alle Stops') && h.includes('−200,00 $') && h.includes('1 long') && !h.includes('short'); })],
  ['Gesamt-Risiko-Zeile: rot ab deinem Tagesverlust-Limit, gelb ab der Hälfte, sonst neutral', () => { const lim = CONFIG.rules.dailyLossLimitPct, eq = (x) => 200 / ((lim * x) / 100); return riskSum([P], eq(1.1)).includes('risk-sum bad') && riskSum([P], eq(0.7)).includes('risk-sum warn') && riskSum([P], eq(0.3)).includes('risk-sum ok'); }],
  ['Gesamt-Risiko-Zeile: Position ohne Stop wird genannt', () => riskSum([{ ...P, stop: null }], 5000).includes('1 ohne Stop')],
  ['Gesamt-Risiko-Zeile: ohne Positionen nichts', () => riskSum([], 1000) === ''],
  ['Gesamt-Risiko-Zeile: Privatmodus verbirgt den Betrag, Prozent bleibt', () => { const was = f.isPrivate(); f.setPrivate(true); try { const h = riskSum([P], 1000); return !h.includes('200,00') && h.includes('20,0 %'); } finally { f.setPrivate(was); } }],
  ['Übersicht: enthält Trade-Weg, Plan-Ampel und alle Werte der alten Konto-Karte', () => pub(() => { const h = posOverview(P, null, PP(), 1000); return h.includes('class="path"') && h.includes('Plan intakt') && ['Offener PnL', 'Auf Margin', 'Einstieg', 'Stop-Loss', 'Risiko ab Einstieg', 'vom Konto', 'Margin', 'Liquidation', 'Mehr Details', 'Größe', 'Hebel', 'Verlust bis Stop', 'davon Buchgewinn', 'Stop-Quelle'].every((k) => h.includes(k)); })],
  ['Übersicht: Stop im Gewinn zeigt gesicherten Mindestgewinn statt Risiko', () => pub(() => { const p = { ...P, stop: 1.05 }; const h = posOverview(p, null, { ...PP(), path: path(p) }, 1000); return h.includes('✓ gesichert') && h.includes('+50,00 $') && !h.includes('Risiko ab Einstieg') && h.includes('Rückgabe bis Stop'); })],
  ['Übersicht: fehlender Stop steht als „fehlt“ da', () => { const p = { ...P, stop: null, stopSource: null }; return posOverview(p, null, { ...PP(), path: path(p) }, 1000).includes('>fehlt<'); }],
  ['Übersicht: „Mehr Details“ bleibt auf Wunsch offen', () => posOverview(P, null, PP(), 1000, '', true).includes('data-more="SUI" open') && !posOverview(P, null, PP(), 1000).includes(' open>')],
  ['Übersicht: Regel-Box wird eingesetzt, Coin-Namen werden entschärft', () => posOverview({ ...P, coin: '<b>' }, null, PP(), 1000, '<div class="rule-box ok"></div>').includes('rule-box ok') && !posOverview({ ...P, coin: '<b>' }, null, PP(), 1000).includes('data-more="<b>"')],
  ['Eingabe: Komma, Punkt, Tausender und Prozentzeichen', () => parseNum('30') === 30 && parseNum('12,5') === 12.5 && parseNum('0.512') === 0.512 && parseNum('1.234,5') === 1234.5 && parseNum('30 %') === 30],
  ['Eingabe: leer oder Unsinn = null', () => parseNum('') === null && parseNum('abc') === null && parseNum(null) === null],
  ['Ausstiegsrechner: Gerüst mit Eingabe, Kopier-Knopf und Plan-Knopf', () => { const h = exitBoxHtml(); return h.includes('id="ex-pct"') && h.includes('id="ex-copy"') && h.includes('id="ex-plan"') && h.includes('inputmode="decimal"'); }],
  ['Stop von Hand: nur ohne Stop-Order bei Hyperliquid', () => stopBoxHtml(P) === '' && stopBoxHtml({ ...P, stopSource: null }).includes('id="ms-price"') && stopBoxHtml({ ...P, stopSource: 'manuell' }).includes('id="ms-save"') && stopBoxHtml(null) === ''],
  ['Export Einzel-Trades: Kopfzeile und eine Zeile je Trade', () => { const t = tradeList(tradeHistory(fills)); return t.startsWith('## Einzel-Trades') && t.includes('Auf;Zu;Std;Coin') && t.split('\n').filter((l) => /;(NIL|ZEC);/.test(l)).length === 2; }],
  ['Export Einzel-Trades: Dauer, Teilverkäufe, Schnitt-Ausstieg und Ergebnis', () => { const l = tradeList(tradeHistory(fills)).split('\n').find((x) => x.includes(';NIL;')).split(';'); return l[2] === '2.0' && l[5] === '1' && l[6] === '1.3' && l[7] === '2' && l[8] === '100' && l[9] === '29.70'; }],
  ['Export Einzel-Trades: laufender Trade steht als „offen“ da', () => tradeList(tradeHistory(fills)).split('\n').find((x) => x.includes(';ZEC;')).split(';')[1] === 'offen'],
  ['Export Einzel-Trades: ohne Trades kein Abschnitt, keine Wallet-Adresse', () => tradeList([]) === '' && tradeList(null) === '' && !/0x[0-9a-f]{20,}/i.test(tradeList(tradeHistory(fills)))],
];
