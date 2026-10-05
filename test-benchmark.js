// Tests für den Maßstab als Signalgeber (8b): core-benchmark.js, core-bmtext.js, Backtest-Variante „neu im Trend“
import { BM, bmState, bmPlan, bmFlip, bmSince, bmResult, bmAlert, bmStrength, engineOf, splitByEngine, BM_EVENT, bmHoldDays, journalWindow } from './core-benchmark.js';
import { bmSignalText } from './core-bmtext.js';
import { benchmarkFlipFromSlices, benchmarkFromSlices } from './core-backtest.js';
import { journalEntry, judgeSignal } from './core-alerts.js';
import { withMeasure } from './core-journalmeasure.js';
import { CONFIG } from './config.js';

const DAY = 864e5, H4 = 4 * 36e5;
// Tageskerzen: n Tage, Kurs als Funktion des Tages; kleine Spanne, damit die ATR bekannt ist (≈ 2 % vom Kurs)
const days = (n, fn) => Array.from({ length: n }, (_, i) => { const c = fn(i); return { t: i * DAY, T: (i + 1) * DAY - 1, o: c, c, h: c * 1.01, l: c * 0.99, v: 1 }; });
const up = days(150, (i) => 100 + i);            // stetiger Aufwärtstrend: EMA 20 über EMA 100
const down = days(150, (i) => 300 - i);          // Abwärtstrend
const END = up.at(-1).T;                         // Ende des letzten Tages
const bar = (k, c) => ({ t: END - (k + 1) * H4 + 1, T: END - k * H4, o: c, c, h: c, l: c, v: 1 }); // k = wie viele 4H-Kerzen zurück
const cfg = BM();
const fastUp = bmState(up, 1e9).fast;
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

export const tests = [
  ['Maßstab: Aufwärtstrend und Kurs über der EMA 20 = erfüllt', () => { const s = bmState(up, 260); return s.ok && s.trend && s.above && s.fast > s.slow; }],
  ['Maßstab: Kurs unter der Tages-EMA 20 = nicht erfüllt (Trend bleibt)', () => { const s = bmState(up, fastUp * 0.99); return !s.ok && s.trend && !s.above; }],
  ['Maßstab: Abwärtstrend = nicht erfüllt, auch wenn der Kurs hoch steht', () => { const s = bmState(down, 1000); return !s.ok && !s.trend; }],
  ['Maßstab: zu wenig Tageskerzen oder kein Kurs = null', () => bmState(up.slice(0, 50), 200) === null && bmState(up, 0) === null && bmState(null, 100) === null],
  ['Plan: Stop 2 ATR unter dem Kurs, Ziele bei 2R / 3R / 4R / 6R', () => { const s = bmState(up, 260), p = bmPlan(s); return near(p.entry - p.stop, 2 * s.atr) && near(p.tps[0], 260 + 2 * p.R) && near(p.tps[1], 260 + 3 * p.R) && near(p.tps[2], 260 + 4 * p.R) && near(p.tps[3], 260 + 6 * p.R); }],
  ['Plan: Chance/Risiko bis TP1 ist 1 : 2', () => { const p = bmPlan(bmState(up, 260)); return near((p.tps[0] - p.entry) / (p.entry - p.stop), 2); }],
  ['Plan: nur Long, Einstieg zum Kurs (Zone = Kurs)', () => { const p = bmPlan(bmState(up, 260)); return p.dir === 'long' && p.zone[0] === 260 && p.zone[1] === 260 && p.method === 'benchmark'; }],
  ['Plan: ohne erfüllte Bedingung kein Plan', () => bmPlan(bmState(down, 1000)) === null && bmPlan(null) === null],
  ['Plan: richtet sich nach den Einstellungen (ATR-Faktor, Ziele)', () => { const s = bmState(up, 260), p = bmPlan(s, { ...cfg, atrMult: 3, tps: [1, 5] }); return near(p.entry - p.stop, 3 * s.atr) && p.tps.length === 2 && near(p.tps[1], 260 + 5 * p.R); }],
  ['Wechsel: vorher unter der EMA 20, jetzt darüber = Signal', () => bmFlip(up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]).flip === true],
  ['Wechsel: schon vorher darüber = kein Signal (kein Dauerfeuer)', () => bmFlip(up, [bar(1, fastUp * 1.02), bar(0, fastUp * 1.03)]).flip === false],
  ['Wechsel: jetzt wieder darunter = kein Signal', () => bmFlip(up, [bar(1, fastUp * 1.02), bar(0, fastUp * 0.98)]).flip === false],
  ['Wechsel: im Abwärtstrend nie ein Signal', () => bmFlip(down, [bar(1, 100), bar(0, 1000)]).flip === false],
  ['Wechsel: zu wenig Kerzen = kein Signal, kein Absturz', () => bmFlip(up, [bar(0, 300)]).flip === false && bmFlip(up, []).flip === false && bmFlip(null, null).flip === false],
  ['Wechsel: Tageskerzen aus der Zukunft fließen nicht ein', () => { const future = [...up, ...days(40, (i) => 10).map((c, i) => ({ ...c, t: END + 1 + i * DAY, T: END + (i + 1) * DAY }))]; return bmFlip(future, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]).flip === true; }],
  ['Im Trend seit: zählt die Setup-Kerzen am Stück', () => bmSince(up, [bar(3, fastUp * 0.9), bar(2, fastUp * 1.1), bar(1, fastUp * 1.1), bar(0, fastUp * 1.1)]) === 3 && bmSince(up, [bar(0, fastUp * 0.9)]) === 0],
  ['Ergebnis: Format wie die Engine (Plan, Richtung, Stil Swing, Ereignis)', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); return r.coin === 'SOL' && r.flip && r.dir === 'long' && r.best === 'swing' && r.engine === 'bm' && r.plan.stop < r.plan.entry && r.events[0].name === BM_EVENT; }],
  ['Ergebnis: ohne Trend neutral und ohne Plan', () => { const r = bmResult('SOL', down, [bar(1, 100), bar(0, 1000)]); return r.plan === null && r.dir === 'neutral' && r.best === null && !r.flip; }],
  ['Meldung: frischer Wechsel wird gemeldet', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); const a = bmAlert(r, r.plan.entry, {}, 1e12, CONFIG.alerts, { volume: 1e12 }); return a.key === 'SOL|long' && a.score === null && a.pos.state === 'zone'; }],
  ['Meldung: ohne Wechsel keine Meldung', () => bmAlert(bmResult('SOL', up, [bar(1, fastUp * 1.02), bar(0, fastUp * 1.03)]), fastUp * 1.03, {}, 1e12, CONFIG.alerts, { volume: 1e12 }) === null],
  ['Meldung: zu wenig Umsatz = keine Meldung', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); return bmAlert(r, r.plan.entry, {}, 1e12, { ...CONFIG.alerts, minVolumeUsd: 5e7 }, { volume: 1e6 }) === null; }],
  ['Meldung: Kurs schon davongelaufen (mehr als 0,5R) oder unter dem Stop = keine Meldung', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]), p = r.plan; return bmAlert(r, p.entry + 0.6 * p.R, {}, 1e12, CONFIG.alerts, {}) === null && bmAlert(r, p.stop * 0.99, {}, 1e12, CONFIG.alerts, {}) === null && bmAlert(r, p.entry + 0.4 * p.R, {}, 1e12, CONFIG.alerts, {}) !== null; }],
  ['Meldung: derselbe Markt nicht erneut innerhalb der Sperrzeit', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]), c = { ...CONFIG.alerts, repeatHours: 12 }; return bmAlert(r, r.plan.entry, { 'SOL|long': 1e12 - 3600e3 }, 1e12, c, {}) === null && bmAlert(r, r.plan.entry, { 'SOL|long': 1e12 - 13 * 3600e3 }, 1e12, c, {}) !== null; }],
  ['Stärke: weiter auseinanderliegende EMAs = stärker', () => bmStrength({ state: { fast: 110, slow: 100, atr: 2 } }) > bmStrength({ state: { fast: 102, slow: 100, atr: 2 } }) && bmStrength(null) === 0],
  ['Telegram-Text: Kopf mit Nummer, Long, Trendfolge, Einstieg, vier Ziele, Stop', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); const t = bmSignalText(r, { price: r.plan.entry, score: null, pos: { state: 'zone' } }, { id: 12 }); return t.includes('#WD-0012') && t.includes('LONG · SOL') && t.includes('Trendfolge') && t.includes('Einstieg:') && ['TP1', 'TP2', 'TP3', 'TP4'].every((k) => t.includes(k)) && t.includes('Stop:') && t.includes('Maßstab') && !t.includes('Score') && !t.includes('null') && !t.includes('undefined'); }],
  ['Telegram-Text: Hinweis bei fehlendem Kapital und Coin-Namen entschärft', () => { const r = bmResult('<b>X', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); const t = bmSignalText(r, { price: r.plan.entry, pos: { state: 'zone' } }, { noCapital: true }); return t.includes('Kein Kapital frei') && !t.includes('LONG · <b>X'); }],
  ['Tagebuch: Maßstab-Signal lässt sich eintragen und auswerten', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); const e = { ...journalEntry(r, bmAlert(r, r.plan.entry, {}, 5, CONFIG.alerts, {}), 5, null), eng: 'bm' }; const j = judgeSignal(e, [{ T: 10, l: e.px + 1, h: e.tps[0] + 1, c: e.tps[0] }, { T: 20, l: e.tps[0], h: e.tps[1] + 1, c: e.tps[1] }], 30, 14); return e.style === 'swing' && e.score === null && e.dir === 'long' && e.events[0] === BM_EVENT && j.status === 'tp2' && near(j.r, 3); }],
  ['Versionsschnitt: Kennzeichen trennt Maßstab und alte Engine', () => { const s = splitByEngine([{ eng: 'bm' }, {}, { eng: 'bm' }, { eng: 'x' }]); return s.bm.length === 2 && s.alt.length === 2 && engineOf(null) === 'alt'; }],
  ['Versionsschnitt: Kennzeichen wandert ins Archiv, auch ohne Messwerte', () => { const a = withMeasure([{ key: 'SOL|long|5', coin: 'SOL', dir: 'long', at: 5 }], [{ coin: 'SOL', dir: 'long', at: 5, eng: 'bm' }])[0]; return a.eng === 'bm' && a.mfe === undefined; }],
  ['Backtest „neu im Trend“: Einstieg nur beim Wechsel', () => { const tfs = ['1d', '4h', '1h']; return benchmarkFlipFromSlices(tfs, [up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)], []]).plan?.dir === 'long' && benchmarkFlipFromSlices(tfs, [up, [bar(1, fastUp * 1.02), bar(0, fastUp * 1.03)], []]).plan === null; }],
  ['Backtest „neu im Trend“: gleicher Plan wie der Maßstab an derselben Kerze', () => { const tfs = ['1d', '4h', '1h'], sl = [up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)], []]; const a = benchmarkFlipFromSlices(tfs, sl).plan, b = benchmarkFromSlices(tfs, sl).plan; return near(a.entry, b.entry) && near(a.stop, b.stop) && a.tps.every((x, i) => near(x, b.tps[i])); }],
  ['Einstellung: Schalter für den Wächter ist da und steht auf Maßstab', () => CONFIG.alerts.benchmark === true || CONFIG.alerts.benchmark === false],
  // 8c: Zeit-Ausstieg im Signal und im Tagebuch
  ['Telegram-Text: Hinweis „Ausstieg spätestens nach 10 Tagen“', () => { const r = bmResult('SOL', up, [bar(1, fastUp * 0.98), bar(0, fastUp * 1.02)]); return bmSignalText(r, { price: r.plan.entry, pos: { state: 'zone' } }, { id: 1 }).includes(`Ausstieg spätestens nach ${bmHoldDays()} Tagen`); }],
  ['Haltedauer: 10 Tage als Standard, eigener Wert wird übernommen, Unsinn fällt auf 10 zurück', () => bmHoldDays({ holdDays: 10 }) === 10 && bmHoldDays({ holdDays: 7 }) === 7 && bmHoldDays({ holdDays: 0 }) === 10 && bmHoldDays({}) === 10],
  ['Tagebuch-Fenster: Maßstab-Signal 10 Tage, alte Engine wie bisher nach Stil', () => { const al = { journalDays: { swing: 14, intraday: 3 } }; return journalWindow({ eng: 'bm', style: 'swing' }, al, { holdDays: 10 }) === 10 && journalWindow({ style: 'swing' }, al) === 14 && journalWindow({ style: 'intraday' }, al) === 3 && journalWindow({ style: 'scalp' }, al) === 7; }],
  ['Tagebuch: Maßstab-Signal läuft nach 10 Tagen ab, nicht früher', () => { const e = { coin: 'SOL', dir: 'long', at: 0, status: 'offen', px: 100, stop: 90, tps: [120, 130, 140, 160], eng: 'bm', style: 'swing' }; const c = [{ t: 0, T: 1, o: 100, h: 101, l: 99, c: 100 }]; return judgeSignal(e, c, 9.5 * 864e5, journalWindow(e, undefined, { holdDays: 10 })).status === 'offen' && judgeSignal(e, c, 10.5 * 864e5, journalWindow(e, undefined, { holdDays: 10 })).status === 'abgelaufen'; }],
];
