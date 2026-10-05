// Tests für core-regime.js (8c: Marktphasen-Schalter, nur Messung)
import { regimeIndex, regimeAt, compareRegime, regimeHolds } from './core-regime.js';
import { bmState } from './core-benchmark.js';
import { compactTrade } from './core-btstore.js';
import { btDigest } from './ui-export.js';

const DAY = 864e5;
const mk = (closes) => closes.map((c, i) => ({ t: i * DAY, T: (i + 1) * DAY - 1, o: c, h: c * 1.01, l: c * 0.99, c }));
const up = mk([...Array(150)].map((_, i) => 100 + i));           // stetig steigend
const down = mk([...Array(150)].map((_, i) => 300 - i));          // stetig fallend
const dip = mk([...Array(150)].map((_, i) => (i < 147 ? 100 + i : 215))); // Aufwärtstrend, zuletzt unter EMA 20, über EMA 100
const T = (rows) => rows.map(([time, r, t, a]) => ({ time, r, btc: t == null ? null : { t, a } }));

export const tests = [
  ['Marktphase: zu wenige Tageskerzen = kein Index', () => regimeIndex(mk([...Array(60)].map(() => 100))) === null],
  ['Marktphase: steigender BTC = im Trend und über EMA 100', () => { const m = regimeAt(regimeIndex(up), up.at(-1).T); return m.t === 1 && m.a === 1; }],
  ['Marktphase: fallender BTC = kein Trend, unter EMA 100', () => { const m = regimeAt(regimeIndex(down), down.at(-1).T); return m.t === 0 && m.a === 0; }],
  ['Marktphase: Rücksetzer unter EMA 20 = kein Trend, aber über EMA 100', () => { const m = regimeAt(regimeIndex(dip), dip.at(-1).T); return m.t === 0 && m.a === 1; }],
  ['Marktphase: vor der ersten Kerze bzw. vor EMA 100 = unbekannt', () => regimeAt(regimeIndex(up), -5) === null && regimeAt(regimeIndex(up), up[50].T) === null],
  ['Marktphase: kein Blick in die Zukunft (laufende Tageskerze zählt nicht)', () => {
    // Am letzten Tag bricht der Kurs ein; ein Einstieg mitten an diesem Tag sieht noch die Kerze davor
    const crash = mk([...Array(149)].map((_, i) => 100 + i).concat([50]));
    const idx = regimeIndex(crash);
    return regimeAt(idx, crash.at(-1).t + 1000).t === 1 && regimeAt(idx, crash.at(-1).T).t === 0;
  }],
  ['Marktphase: stimmt mit dem Maßstab-Zustand überein (abgeschnittene Reihe)', () => {
    const idx = regimeIndex(dip);
    return [120, 140, 147, 149].every((k) => { const st = bmState(dip.slice(0, k + 1), dip[k].c); return regimeAt(idx, dip[k].T).t === (st.ok ? 1 : 0); });
  }],
  ['Schalter-Tabelle: alle / im Trend / über EMA 100', () => {
    const g = compareRegime(T([[1, 1, 1, 1], [2, -1, 0, 1], [3, 2, 1, 1], [4, -1, 0, 0]]), 0, 6);
    return g.rows[0].n === 4 && g.rows[1].n === 2 && g.rows[1].avgR === 1.5 && g.rows[2].n === 3 && g.out.trend.n === 2 && g.out.trend.avgR === -1;
  }],
  ['Schalter-Tabelle: beide Zeiträume je Zeile (Schnitt bei zwei Dritteln)', () => {
    const g = compareRegime(T([[1, 1, 1, 1], [2, 3, 1, 1], [5, -2, 1, 1]]), 0, 6);
    return g.rows[1].dev.n === 2 && g.rows[1].dev.avgR === 2 && g.rows[1].conf.n === 1 && g.rows[1].conf.avgR === -2;
  }],
  ['Schalter-Tabelle: Trades ohne Merker zählen nicht mit, ohne jeden Merker gibt es keine Tabelle', () => {
    const g = compareRegime(T([[1, 1, 1, 1], [2, 5, null, null]]), 0, 6);
    return g.n === 1 && g.unknown === 1 && compareRegime(T([[1, 1, null, null]]), 0, 6) === null && compareRegime([], 0, 6) === null;
  }],
  ['Messlatte: Schnitt und beide Zeiträume im Plus, genug Trades', () => {
    const ok = { n: 300, avgR: 0.1, dev: { avgR: 0.05 }, conf: { avgR: 0.2 } };
    return regimeHolds(ok) && !regimeHolds({ ...ok, n: 299 }) && !regimeHolds({ ...ok, dev: { avgR: -0.01 } }) && !regimeHolds({ ...ok, conf: { avgR: null } }) && !regimeHolds(null);
  }],
  ['Speicher: Marktphasen-Merker und Ausstiegs-Varianten bleiben beim kompakten Speichern erhalten', () => { const t = compactTrade({ time: 1, r: 1, btc: { t: 1, a: 1 }, ex: { b: 0.5, c: 0.2 }, unnoetig: 9 }); return t.btc.t === 1 && t.ex.c === 0.2 && t.unnoetig === undefined; }],
  ['Export: Marktphasen-Schalter und Ausstiegs-Vergleich stehen in der Zusammenfassung', () => {
    const tr = [{ time: 1, r: 1, coin: 'A', dir: 'long', btc: { t: 1, a: 1 }, ex: { b: 0.5, c: 0.2 } }, { time: 5, r: -1, coin: 'A', dir: 'long', btc: { t: 0, a: 1 }, ex: { b: -1, c: -1 } }];
    const d = btDigest({ trades: tr, from: 0, to: 6, label: 'Test' }, 'swing:bf');
    return d.regime.rows.length === 3 && d.regime.rows[1].n === 1 && d.exits.n === 2 && d.exits.rows[2].key === 'r1';
  }],
  ['Export: alte Läufe ohne Merker bleiben ohne die neuen Zeilen', () => { const d = btDigest({ trades: [{ time: 1, r: 1, coin: 'A', dir: 'long' }], from: 0, to: 6 }, 'swing'); return d.regime === null && d.exits === null; }],
];
