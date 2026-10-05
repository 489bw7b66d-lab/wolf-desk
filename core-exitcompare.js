// Ausstiegs-Vergleich (8c, nur Messung): dieselben Einstiege, drei Ausstiege.
//   plan = heutiger Plan (Teilverkäufe an den Zielen, ab TP2 Stop auf Einstieg)
//   be   = wie Plan, aber schon nach TP1 Stop auf Einstieg
//   r1   = TP1 bei 1R (statt am Plan-Ziel), danach Stop auf Einstieg
// simulateTrade bleibt unverändert: „Stop auf Einstieg“ läuft über trailFn (greift ab dem ersten Ziel),
// „TP1 bei 1R“ über einen angepassten Plan. Reine Funktionen, Tests in test-exitcompare.js.

export const EXIT_ROWS = [['plan', 'Heutiger Plan'], ['be', 'Nach TP1 Stop auf Einstieg'], ['r1', 'TP1 bei 1R, dann Einstieg']];

// Nach dem ersten Ziel den Stop auf den Einstieg ziehen
export const breakevenTrail = () => (c, hits, stop, entryPx) => (hits >= 1 ? entryPx : null);

// Plan mit TP1 bei 1R. base = Einstiegskurs (bei sofortigem Einstieg der Kurs, sonst die Limit-Marke).
export function planWithTp1AtR(plan, base) {
  const sg = plan.dir === 'long' ? 1 : -1, R = Math.abs(base - plan.stop);
  if (!(R > 0) || !plan.tps?.length) return null;
  return { ...plan, tps: [base + sg * R, ...plan.tps.slice(1)] };
}

// Die zwei Varianten für einen Einstieg rechnen. sim = simulateTrade (wird hereingereicht, damit diese Datei den Kern nicht einbindet).
// Rückgabe { b, c }: Ergebnis in R nach Gebühren, null = in dieser Variante kein Einstieg.
export function exitVariants(sim, plan, path, opts) {
  const base = opts.fillNow ? opts.nowPx : plan.entry;
  const run = (p) => { if (!p) return null; const x = sim(p, path, { ...opts, trailFn: breakevenTrail() }); return x.filled ? x.r : null; };
  return { b: run(plan), c: run(planWithTp1AtR(plan, base)) };
}

// Tabelle: Trefferquote und Ø R je Ausstieg, nur über Trades, die in allen drei Varianten gelaufen sind.
export function compareExits(trades, from, to) {
  const both = (trades || []).filter((t) => t.ex && Number.isFinite(t.ex.b) && Number.isFinite(t.ex.c));
  if (!both.length) return null;
  const cut = to > from ? from + (to - from) * 2 / 3 : null;
  const part = (l, get) => ({ n: l.length, avgR: l.length ? l.reduce((s, t) => s + get(t), 0) / l.length : null, sum: l.reduce((s, t) => s + get(t), 0), winRate: l.length ? (l.filter((t) => get(t) > 0).length / l.length) * 100 : null });
  const row = (key, get) => ({ key, ...part(both, get), dev: cut == null ? null : part(both.filter((t) => t.time < cut), get), conf: cut == null ? null : part(both.filter((t) => t.time >= cut), get) });
  return { n: both.length, skipped: (trades || []).length - both.length, rows: [row('plan', (t) => t.r), row('be', (t) => t.ex.b), row('r1', (t) => t.ex.c)] };
}
