// Tests für den Exit-Manager (8t): core-exitplan.js und den Preisbereich des Charts (fitRange in ui-chart.js)
import { XP, bodySwingHighs, bodySwingLows, mergeZones, pickTargets, sizeTargets, trailDaily, chartMarks, exitPlanFor, tp2Note, closedWeeks } from './core-exitplan.js';
import { fitRange } from './ui-chart.js';

const DAY = 864e5, T0 = Date.UTC(2026, 0, 5);
const K = (i, o, c, h = Math.max(o, c) * 1.01, l = Math.min(o, c) * 0.99) => ({ t: T0 + i * DAY, T: T0 + (i + 1) * DAY - 1, o, h, l, c, v: 100 });
// Wellen: Anstieg auf 120, Rücksetzer auf 100, Anstieg auf 140, Rücksetzer auf 110 (Kurs jetzt 110)
function waves() {
  const D = []; let p = 100, i = 0;
  const leg = (to, n) => { const st = (to - p) / n; for (let k = 0; k < n; k++) { const o = p; p += st; D.push(K(i++, o, p)); } };
  leg(100, 10); leg(120, 15); leg(100, 12); leg(140, 20); leg(110, 15); leg(112, 8);
  return D;
}
const near = (a, b, e = 1e-6) => a != null && b != null && Math.abs(a - b) < e;
const z = (price, kind = 'Swing-Hoch', tf = 'Tag') => ({ price, kind, tf });

export const tests = [
  ['Exit: Körper-Swing-Hoch nur, solange kein Tagesschluss darüber lag', () => { const D = waves(), hs = bodySwingHighs(D); return hs.length >= 1 && hs.every((h) => h.price > 112) && near(Math.max(...hs.map((h) => h.price)), 140, 0.5); }],
  ['Exit: Körper-Swing-Tiefs werden erkannt', () => bodySwingLows(waves()).some((s) => near(s.price, 100, 0.5))],
  ['Exit: Marken näher als der Abstand werden eine Zone, sie beginnt an der untersten Marke', () => { const Z = mergeZones([z(100), z(100.4, 'Sell-Block'), z(103)], 0.5); return Z.length === 2 && Z[0].price === 100 && Z[0].top === 100.4 && Z[0].label === 'Swing-Hoch (Tag) + Sell-Block (Tag)' && mergeZones([z(1, 'A', '4H'), z(1.1, 'B', 'Woche'), z(1.2), z(1.3, 'C')], 1)[0].label === 'B (Woche) + Swing-Hoch (Tag) + 2 weitere'; }],
  ['Exit: TP2 = erste Chart-Zone mit mindestens 2R, TP1 die erste darunter ab 1R', () => { const x = pickTargets(mergeZones([z(105), z(112), z(118), z(125), z(131), z(140)], 0), 100, 10); return x.ok2 && x.tps.map((t) => t.price).join() === '112,125,131,140' && near(x.tps[1].r, 2.5) && !x.good2; }],
  ['Exit: ohne Zone unter 2R wird die 2R-Zone TP1 und die nächste TP2', () => { const x = pickTargets(mergeZones([z(130), z(150)], 0), 100, 10); return x.ok2 && x.good2 && x.tps[0].price === 130 && x.tps[1].price === 150; }],
  ['Exit: keine Zone mit 2R → kein künstliches Ziel, Hinweis', () => { const x = pickTargets(mergeZones([z(105), z(115)], 0), 100, 10); return x.ok2 === false && x.tps.length === 2 && /1:2/.test(tp2Note(x)) && /passt so nicht/.test(tp2Note(x)); }],
  ['Exit: ohne Stop nicht prüfbar', () => { const x = pickTargets(mergeZones([z(130)], 0), 100, null); return x.ok2 === null && /nicht prüfen/.test(tp2Note(x)); }],
  ['Exit: Ordergrößen nach Aufteilung, Gewinn je Teil und kumuliert, Rest läuft mit dem Runner', () => {
    const split = [{ label: 'TP1', pct: 20 }, { label: 'TP2', pct: 25 }, { label: 'TP3', pct: 25 }, { label: 'TP4', pct: 15 }, { label: 'Runner', pct: 15 }];
    const s = sizeTargets([{ price: 110 }, { price: 120 }, { price: 130 }], { entry: 100, size: 10, split, szDecimals: 2 });
    return s.rows[0].qty === 2 && s.rows[1].qty === 2.5 && near(s.rows[1].usd, 50) && near(s.rows[2].cum, 20 + 50 + 75) && near(s.rows[2].move, 30) && s.unusedPct === 15 && s.runnerPct === 30; }],
  ['Exit: Mengen werden abgerundet (nie mehr verkaufen als gewollt)', () => sizeTargets([{ price: 110 }], { entry: 100, size: 3.337, split: [{ label: 'TP1', pct: 20 }], szDecimals: 2 }).rows[0].qty === 0.66],
  ['Exit: Nachziehen erst ab TP1, dann unter die gebrochene Marke mit ½ ATR Puffer', () => {
    const D = Array.from({ length: 40 }, (_, i) => K(i, 100 + i, 101 + i)), entry = 110, open = D[9].t;
    const none = trailDaily({ daily: D, entry, stop: 100, price: 140, openedAt: open, hits: 0, marks: [z(130)] });
    const t = trailDaily({ daily: D, entry, stop: 100, price: 140, openedAt: open, hits: 1, marks: [z(130), z(150)] });
    return none === null && t && t.price < 130 && t.price > 125 && /Swing-Hoch \(Tag\)/.test(t.why); }],
  ['Exit: Nachziehen nur, wenn es den Stop verbessert', () => { const D = Array.from({ length: 40 }, (_, i) => K(i, 100 + i, 101 + i)); return trailDaily({ daily: D, entry: 110, stop: 135, price: 140, openedAt: D[9].t, hits: 1, marks: [z(130)] }) === null; }],
  ['Exit: ab TP2 mindestens Einstieg plus Gebühren', () => { const D = Array.from({ length: 40 }, (_, i) => K(i, 100, 100.5, 101, 99)); const t = trailDaily({ daily: D, entry: 100, stop: 90, price: 103, openedAt: D[30].t, hits: 2, marks: [] }); return t && near(t.price, 100.09, 1e-9) && /Gebühren/.test(t.why); }],
  ['Exit: Chart-Marken liegen alle über dem Einstieg, mit Zeitebene', () => { const m = chartMarks({ daily: waves(), above: 112 }); return m.length > 0 && m.every((x) => x.price > 112 && ['Woche', 'Tag', '4H'].includes(x.tf)); }],
  ['Exit: Gesamtplan rechnet R aus dem ursprünglichen Stop, Ziele über dem Einstieg', () => { const x = exitPlanFor({ daily: waves(), entry: 112, stop: 104, size: 10, split: [{ label: 'TP1', pct: 50 }, { label: 'TP2', pct: 50 }] }); return x && near(x.R, 8) && x.rows.every((r) => r.price > 112) && x.rows.length <= XP.maxTps; }],
  ['Exit: Zonen dichter als ½ Tages-ATR über dem Einstieg sind kein Ziel', () => { const x = exitPlanFor({ daily: waves(), entry: 112, stop: 104 }); return x && x.rows.every((r) => r.price >= 112 + XP.mergeAtr * x.atr); }],
  ['Exit: nur abgeschlossene Wochen', () => { const D = Array.from({ length: 10 }, (_, i) => K(i, 100, 101)); return closedWeeks(D).length === 1; }],
  ['Chart: Bereich umfasst nahe Linien, ferne Linien stauchen die Kerzen nicht', () => { const a = fitRange(2500, 2570, [2540, 2212]); const b = fitRange(2500, 2570, [2470]); return a.lo === 2500 && a.hi === 2570 && b.lo === 2470 && fitRange(100, 110, [95, 80]).lo === 95; }],
];
