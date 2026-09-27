// Trade-Weg einer offenen Position: Stop-Loss → Einstieg → TP1 … TPn, dazu wo der Kurs gerade steht.
// Ziele kommen aus deinen echten Daten: bereits ausgeführte Teilverkäufe (✓) und offene Take-Profit-/Reduce-Only-Orders.
// Wie viele Ziele gezeigt werden, richtet sich nach deinem Ausstiegsplan (Stufen mit mehr als 0 %, ohne Runner).
// Reine Funktion, Tests in test-path.js.

// Anzahl der Ziele laut Ausstiegsplan: TP1–TP4 mit Anteil > 0 (der Runner zählt nicht)
export const plannedTargets = (exitPlan) => (exitPlan || []).filter((x) => /^TP\d/.test(x.label) && Number(x.pct) > 0).length;

// Offene Gewinnmitnahme-Orders dieser Position (Preis auf der Gewinnseite des Einstiegs)
export function targetOrders(p, orders) {
  const long = p.side === 'long';
  return (orders || []).filter((o) => {
    if (o.coin !== p.coin) return false;
    if (long ? o.side !== 'A' : o.side !== 'B') return false;
    const type = String(o.orderType || '');
    if (/stop/i.test(type)) return false;                       // Stops sind keine Ziele
    if (!(/take profit/i.test(type) || o.reduceOnly || o.isPositionTpsl)) return false;
    const px = Number(o.triggerPx) > 0 ? Number(o.triggerPx) : Number(o.limitPx);
    return px > 0 && (long ? px > p.entry : px < p.entry);
  }).map((o) => (Number(o.triggerPx) > 0 ? Number(o.triggerPx) : Number(o.limitPx)));
}

// p: { side, entry, stop, liq, mark }, orders: offene Orders, exits: Teilverkäufe [{ px }], exitPlan aus der Konfiguration
// targets (optional): { tps: [...], source, label } aus Plan oder Signal; ersetzt dann die Orders als Quelle
export function tradePath(p, orders, exits, exitPlan, targets = null) {
  if (!p || !(p.entry > 0)) return null;
  const long = p.side === 'long', sg = long ? 1 : -1;
  const n = plannedTargets(exitPlan);
  if (!n) return null;
  const inProfit = (x) => (x - p.entry) * sg > 0;
  const byDir = (a, b) => (a - b) * sg;
  const sold = (exits || []).map((e) => e.px).filter((x) => x > 0 && inProfit(x));
  let tps;
  if (targets?.tps?.length) {
    // Feste Ziele (Plan/Signal): erreicht, wenn du dort (bis 0,5 % davor) schon verkauft hast
    tps = [...targets.tps].filter((x) => x > 0 && inProfit(x)).sort(byDir).slice(0, n)
      .map((price, i) => ({ price, n: i + 1, reached: sold.some((x) => (x - price * (1 - 0.005 * sg)) * sg >= 0) }));
  } else {
    const filled = [...new Set(sold)].sort(byDir);
    const open = [...new Set(targetOrders(p, orders))].filter((x) => !filled.length || (x - filled.at(-1)) * sg > 0).sort(byDir);
    tps = [...filled.map((price) => ({ price, reached: true })), ...open.map((price) => ({ price, reached: false }))].slice(0, n)
      .map((t, i) => ({ ...t, n: i + 1 }));
  }
  if (!tps.length) return { empty: true, planned: n };

  // Linkes Ende: der Punkt, der am weitesten auf der Verlustseite liegt (Stop, bei Stop im Gewinn der Einstieg;
  // ohne Stop die Liquidation, sonst ein Stück vor dem Einstieg)
  const last = tps.at(-1).price;
  const orig = targets?.stop != null && (targets.stop - p.entry) * sg < 0 ? targets.stop : null;
  const base = orig ?? (p.stop != null ? p.stop : p.liq != null ? p.liq : p.entry - (last - p.entry) * 0.3);
  // Liegt der aktuelle Stop noch unter dem ursprünglichen (weiter weg), beginnt der Balken dort
  const far = p.stop != null && orig != null && (p.stop - orig) * sg < 0 ? p.stop : base;
  const left = (far - p.entry) * sg < 0 ? far : p.entry;
  const span = (last - left) * sg;
  if (!(span > 0)) return null;
  const frac = (x) => Math.max(0, Math.min(1, ((x - left) * sg) / span));
  const next = tps.find((t) => !t.reached && (p.mark == null || (t.price - p.mark) * sg > 0)) || null;
  return {
    left: { price: left, kind: orig != null ? 'plan' : p.stop != null ? 'stop' : p.liq != null ? 'liq' : 'none', at: 0 },
    origStop: orig != null ? { price: orig, at: frac(orig) } : null,
    stop: p.stop != null ? { price: p.stop, at: frac(p.stop), inProfit: (p.stop - p.entry) * sg >= 0 } : null,
    source: targets?.tps?.length ? targets : { source: 'orders', label: 'aus deinen Take-Profit-Orders' },
    entry: { price: p.entry, at: frac(p.entry) },
    tps: tps.map((t) => ({ ...t, at: frac(t.price), passed: t.reached || (p.mark != null && (p.mark - t.price) * sg >= 0) })),
    mark: p.mark != null ? { price: p.mark, at: frac(p.mark), beyond: (p.mark - last) * sg > 0, below: (p.mark - left) * sg < 0 } : null,
    next: next && p.mark ? { n: next.n, pct: ((next.price - p.mark) / p.mark) * 100 * sg } : null,
    planned: n, found: tps.length,
  };
}
