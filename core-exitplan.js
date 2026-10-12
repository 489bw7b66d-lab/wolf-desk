// Exit-Manager (8t): Ziele aus Chart-Marken, Ordergrößen je Ziel und Stop nachziehen auf dem Tageschart.
// Vorgaben von Jensen (12.10.2026):
//  - Ziele immer aus Chart-Marken, nicht stur nach R. Prüfung: TP2 ist die erste Chart-Zone mit mindestens 2R
//    (R = Einstieg minus ursprünglicher Stop). Findet sich keine, gibt es kein künstliches Ziel, nur einen Hinweis.
//  - Aufteilung wie in den Einstellungen (CONFIG.exitPlan, dort weiter bearbeitbar).
//  - Stop nachziehen auf dem Tageschart, nach Chart-Marken, ohne Untergrenze in ATR.
// Chart-Marken (Grundsatz Körper, mit Zeitebene): Sell-Blocks über dem Einstieg (Woche, Tag, 4H; ab ihrer Unterkante),
// ungebrochene Körper-Swing-Hochs (Tag, Woche), Fib-Extensionen 1,272 / 1,618 / 2,618 des letzten Anstiegs (Tag).
// Marken näher als ½ Tages-ATR werden zu einer Zone zusammengefasst; die Zone beginnt an ihrer untersten Marke.
// Nur Anzeige, ohne Messung. Reine Funktionen, Tests in test-exitplan.js.
import { sellBlocks } from './core-sellblock.js';
import { toWeekly } from './core-engine2.js';
import { atr } from './core-indicators.js';
import { fibPosition } from './core-finder.js';
import { floorTo } from './core-exitcalc.js';

const DAY = 864e5;
export const XP = { mergeAtr: 0.5, minR: 2, goodR: 3, side: 5, ext: [1.272, 1.618, 2.618], bufferAtr: 0.5, maxTps: 4 };
const top = (c) => Math.max(c.o, c.c), bot = (c) => Math.min(c.o, c.c);
const num = (x, d = 3) => String(x).replace('.', ',');

// Abgeschlossene Wochen aus Tageskerzen (die laufende Woche fällt weg)
export const closedWeeks = (daily) => toWeekly(daily || []).filter((w) => w.T + 1 - w.t >= 7 * DAY);

// Körper-Swing-Hochs (side Kerzen links und rechts), die seither von keinem Tagesschluss überboten wurden
export function bodySwingHighs(cs, side = XP.side) {
  const out = [], n = cs?.length || 0;
  for (let p = side; p + side < n; p++) {
    let ok = true;
    for (let j = 1; j <= side && ok; j++) ok = top(cs[p]) > top(cs[p - j]) && top(cs[p]) >= top(cs[p + j]);
    if (!ok) continue;
    let broken = false;
    for (let k = p + 1; k < n && !broken; k++) broken = cs[k].c > top(cs[p]);
    if (!broken) out.push({ p, price: top(cs[p]) });
  }
  return out;
}
// Bestätigte Körper-Swing-Tiefs (für das Nachziehen)
export function bodySwingLows(cs, side = XP.side) {
  const out = [], n = cs?.length || 0;
  for (let p = side; p + side < n; p++) {
    let ok = true;
    for (let j = 1; j <= side && ok; j++) ok = bot(cs[p]) < bot(cs[p - j]) && bot(cs[p]) <= bot(cs[p + j]);
    if (ok) out.push({ p, t: cs[p].t, price: bot(cs[p]) });
  }
  return out;
}

// Alle Chart-Marken über einem Kurs. daily/h4: abgeschlossene Kerzen { t, o, h, l, c }
export function chartMarks({ daily, h4 = null, above, cfg = XP }) {
  const D = daily || [], marks = [];
  if (!(above > 0) || D.length < 30) return marks;
  const W = closedWeeks(D);
  for (const [tf, cs] of [['Woche', W], ['Tag', D], ['4H', h4 || []]]) {
    for (const b of sellBlocks(cs)) if (b.bottom > above) marks.push({ price: b.bottom, kind: 'Sell-Block', tf });
  }
  for (const [tf, cs] of [['Woche', W], ['Tag', D]]) {
    for (const s of bodySwingHighs(cs, cfg.side)) if (s.price > above) marks.push({ price: s.price, kind: 'Swing-Hoch', tf });
  }
  const a = atr(D, 14), fib = fibPosition(D, a, above);
  if (fib) for (const k of cfg.ext) { const p = fib.lo + k * (fib.hi - fib.lo); if (p > above) marks.push({ price: p, kind: `Fib ${num(k)}`, tf: 'Tag' }); }
  return marks.sort((x, y) => x.price - y.price);
}

// Marken zu Zonen zusammenfassen: jede Marke näher als gap an der vorigen gehört zur selben Zone
export function mergeZones(marks, gap) {
  const zones = [];
  for (const m of marks || []) {
    const z = zones[zones.length - 1];
    if (z && gap > 0 && m.price - z.last <= gap) { z.last = m.price; z.top = m.price; z.marks.push(m); }
    else zones.push({ price: m.price, top: m.price, last: m.price, marks: [m] });
  }
  const rank = { Woche: 0, Tag: 1, '4H': 2 };
  return zones.map(({ last, ...z }) => {
    const all = [...new Set([...z.marks].sort((x, y) => rank[x.tf] - rank[y.tf]).map((m) => `${m.kind} (${m.tf})`))];
    return { ...z, label: all.length > 2 ? `${all.slice(0, 2).join(' + ')} + ${all.length - 2} weitere` : all.join(' + ') };
  });
}

// Ziele wählen. zones: aufsteigend, alle über dem Einstieg. R: Einstieg minus ursprünglicher Stop (null = ohne Stop)
// TP2 = erste Zone mit mindestens minR. TP1 = Zone darunter (die erste ab 1R, sonst die höchste darunter);
// liegt keine Zone darunter, wird die 2R-Zone TP1 und die nächste TP2. Danach TP3, TP4.
export function pickTargets(zones, entry, R, cfg = XP) {
  const Z = (zones || []).map((z) => ({ ...z, r: R > 0 ? (z.price - entry) / R : null }));
  if (!Z.length) return { tps: [], ok2: false, reason: 'keine Chart-Marke über dem Einstieg' };
  if (!(R > 0)) return { tps: Z.slice(0, cfg.maxTps), ok2: null, reason: 'ohne Stop kein R: TP2 nicht prüfbar' };
  const i2 = Z.findIndex((z) => z.r >= cfg.minR);
  if (i2 < 0) return { tps: Z.slice(0, cfg.maxTps), ok2: false, reason: `kein Chartziel mit mindestens 1:${cfg.minR}` };
  const below = Z.slice(0, i2);
  let tps;
  if (below.length) {
    const tp1 = below.find((z) => z.r >= 1) || below[below.length - 1];
    tps = [tp1, ...Z.slice(i2, i2 + cfg.maxTps - 1)];
  } else tps = Z.slice(i2, i2 + cfg.maxTps);
  const t2 = tps[1];
  return { tps, ok2: !!t2 && t2.r >= cfg.minR, good2: !!t2 && t2.r >= cfg.goodR, reason: !t2 ? 'nur ein Chartziel über 2R' : '' };
}

// Ordergrößen und Gewinn je Ziel. split: CONFIG.exitPlan ({ label, pct }), size: Ausgangsgröße (Stück)
export function sizeTargets(tps, { entry, size = null, split = [], szDecimals = null, feePct = 0 }) {
  const tpSplit = split.filter((x) => /^TP\d/.test(x.label));
  let cum = 0;
  const rows = tps.map((z, i) => {
    const pct = Number(tpSplit[i]?.pct) || 0;
    const qty = size > 0 ? floorTo((size * pct) / 100, szDecimals ?? 4) : null;
    const move = (z.price / entry - 1) * 100;
    const usd = qty != null ? qty * (z.price - entry) - qty * (z.price + entry) * (feePct / 100) : null;
    if (usd != null) cum += usd;
    return { ...z, n: i + 1, pct, qty, move, usd, cum: usd != null ? cum : null };
  });
  const used = rows.reduce((s, x) => s + x.pct, 0), runner = Math.max(0, 100 - used);
  return { rows, runnerPct: runner, unusedPct: tpSplit.slice(tps.length).reduce((s, x) => s + (Number(x.pct) || 0), 0) };
}

// Stop nachziehen (Tag): frühestens nach TP1. Kandidaten, jeweils ½ Tages-ATR darunter:
//  - die höchste Chart-Marke, über der schon ein Tagesschluss lag (gebrochener Widerstand wird Unterstützung)
//  - das jüngste bestätigte Körper-Swing-Tief nach dem Einstieg
//  - ab TP2: Einstieg plus Gebühren
// Vorschlag nur, wenn er den jetzigen Stop verbessert und unter dem Kurs liegt.
export function trailDaily({ daily, entry, stop = null, price, openedAt = 0, hits = 0, marks = [], feePct = 0.045, cfg = XP }) {
  const D = daily || [];
  if (hits < 1 || !(price > 0) || D.length < 20) return null;
  const a = atr(D, 14).at(-1);
  if (!(a > 0)) return null;
  const buf = cfg.bufferAtr * a, after = D.filter((c) => c.t >= openedAt - DAY);
  const maxClose = Math.max(...after.map((c) => c.c));
  const cands = [];
  const broken = (marks || []).filter((m) => m.price > entry && maxClose > m.price).sort((x, y) => y.price - x.price)[0];
  if (broken) cands.push({ price: broken.price - buf, why: `unter ${broken.kind} (${broken.tf}), Tagesschluss darüber` });
  const lows = bodySwingLows(D).filter((s) => s.t >= openedAt && s.price > entry * 0.5);
  const low = lows[lows.length - 1];
  if (low) cands.push({ price: low.price - buf, why: 'unter dem letzten Körper-Swing-Tief (Tag)' });
  if (hits >= 2) cands.push({ price: entry * (1 + (2 * feePct) / 100), why: 'Einstieg plus Gebühren (ab TP2)' });
  const best = cands.filter((c) => c.price < price && c.price > 0).sort((x, y) => y.price - x.price)[0];
  if (!best || (stop != null && best.price <= stop * 1.001)) return null;
  return best;
}

// Alles zusammen für eine Long-Position oder eine geplante Long-Trade-Karte
export function exitPlanFor({ daily, h4 = null, entry, stop, price = null, size = null, split = [], szDecimals = null, feePct = 0.045, openedAt = 0, curStop = null, cfg = XP }) {
  if (!(entry > 0) || !(daily?.length >= 30)) return null;
  const a = atr(daily, 14).at(-1);
  const R = stop > 0 && stop < entry ? entry - stop : null;
  const marks = chartMarks({ daily, h4, above: entry, cfg });
  // Zonen dichter als ½ Tages-ATR über dem Einstieg sind kein Ziel (Rauschen)
  const zones = mergeZones(marks, a > 0 ? cfg.mergeAtr * a : 0).filter((z) => !(a > 0) || z.price >= entry + cfg.mergeAtr * a);
  const nTp = split.filter((x) => /^TP\d/.test(x.label) && Number(x.pct) > 0).length;
  const pick = pickTargets(zones, entry, R, { ...cfg, maxTps: Math.max(2, Math.min(cfg.maxTps, nTp || cfg.maxTps)) });
  const sized = sizeTargets(pick.tps, { entry, size, split, szDecimals, feePct });
  const hi = price > 0 ? Math.max(price, ...daily.filter((c) => c.t >= openedAt - DAY).map((c) => c.h)) : 0;
  sized.rows.forEach((x) => { x.reached = openedAt > 0 && hi >= x.price; });
  const hits = sized.rows.filter((x) => x.reached).length;
  const trail = openedAt > 0 ? trailDaily({ daily, entry, stop: curStop ?? stop, price, openedAt, hits, marks, feePct, cfg }) : null;
  if (trail && size > 0) {
    const sold = sized.rows.filter((x) => x.reached).reduce((s, x) => s + (x.qty || 0), 0), rest = Math.max(0, size - sold);
    trail.restQty = rest; trail.lockUsd = rest * (trail.price - entry); trail.lockPct = (trail.price / entry - 1) * 100;
  }
  return { R, atr: a, marks, zones, ...pick, ...sized, hits, trail };
}

// Kurztexte
export const rText = (r) => (r == null ? '' : `1:${(Math.round(r * 10) / 10).toFixed(1).replace('.', ',')}`);
export function tp2Note(x, cfg = XP) {
  if (!x) return '';
  if (x.ok2 === null) return 'Ohne Stop lässt sich das Chancen-Risiko-Verhältnis nicht prüfen.';
  if (!x.ok2) return `Kein Chartziel mit mindestens 1:${cfg.minR} für TP2. Der Trade passt so nicht in deinen Plan.`;
  if (!x.good2) return `TP2 bei ${rText(x.tps[1].r)} (mindestens 1:${cfg.minR} erfüllt, 1:${cfg.goodR} nicht erreicht).`;
  return `TP2 bei ${rText(x.tps[1].r)}.`;
}

// Gepackte 4H-Kerzen (Spalten t, o, h, l, c wie im Finder) als Liste
export function unpackCols(g) {
  if (Array.isArray(g)) return g;
  const out = [], n = g?.n ?? g?.t?.length ?? 0;
  for (let i = 0; i < n; i++) out.push({ t: g.t[i], o: g.o[i], h: g.h[i], l: g.l[i], c: g.c[i] });
  return out;
}
// Trade-Karte aus dem Setup-Finder: Ziele aus Chart-Marken statt der Rahmen-Vielfachen (die bleiben als frameTps sichtbar).
// Ohne Chart-Marke über dem Kurs bleiben die Rahmen-Ziele stehen, mit Hinweis.
export function withChartTargets(r, daily, h4 = null, cfg = XP) {
  if (!r?.plan || r.plan.dir !== 'long') return r;
  const p = r.plan, x = exitPlanFor({ daily, h4: h4 ? unpackCols(h4) : null, entry: p.entry, stop: p.stop, cfg });
  if (!x) return r;
  const plan = { ...p, frameTps: p.tps, frameLabels: p.tpLabels, chartNote: tp2Note(x, cfg), chartOk: x.ok2 };
  if (x.rows.length) { plan.tps = x.rows.map((z) => z.price); plan.tpLabels = x.rows.map((z) => z.label); plan.tpR = x.rows.map((z) => z.r); plan.chart = true; }
  else plan.chartNote = 'Keine Chart-Marke über dem Kurs: Es gelten die Rahmen-Ziele.';
  return { ...r, plan };
}
