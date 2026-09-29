// Hebel-Vorschau für Trade-Karte und Rechner: Was macht der gewählte Hebel mit Liquidation, Puffer und Margin?
// Risiko und Positionsgröße ändern sich durch den Hebel nicht, nur wie nah die Liquidation am Stop liegt
// und wie viel Kapital gebunden ist. Reine Funktionen, Tests in test-levpreview.js.
import { approxLiqDistPct, positionSize, maxLeverageForStop, recommendLeverage } from './core-risk.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// plan: { dir, entry, stop, tps }, lev: Hebel, bufferPct: Mindestabstand Liquidation hinter dem Stop (%),
// margin/available/budgetPct: für den Anteil am freien Kapital.
// Achse wie beim Trade-Weg: Verlustseite links, Gewinnseite rechts (auch bei Shorts).
// Links reicht die Achse bis zum doppelten Stop-Abstand: Liegt die Liquidation weiter weg, steht sie am Rand (pinned).
export function levPreview({ dir, entry, stop, tps = [] }, lev, { bufferPct = 1, margin = null, available = null, budgetPct = 50 } = {}) {
  if (!(entry > 0) || !(stop > 0) || !(lev >= 1) || stop === entry) return null;
  const long = dir === 'long';
  const dist = (p) => ((long ? p - entry : entry - p) / entry) * 100; // + = Gewinnseite, − = Verlustseite
  const stopDist = -dist(stop);
  if (!(stopDist > 0)) return null;
  const targets = tps.filter((t) => dist(t) > 0).slice(0, 3);
  const lossSpan = 2 * stopDist;
  const gainSpan = targets.length ? Math.max(...targets.map(dist)) : 2 * stopDist;
  const total = lossSpan + gainSpan;
  const at = (d) => clamp01((d + lossSpan) / total);

  const liqDist = approxLiqDistPct(lev);
  const liqPrice = long ? entry * (1 - liqDist / 100) : entry * (1 + liqDist / 100);
  const pinned = liqDist >= lossSpan;
  const buffer = liqDist - stopDist; // % vom Einstieg zwischen Stop und Liquidation (negativ = Liquidation vor dem Stop)
  const status = buffer < 0 ? 'bad' : buffer < bufferPct ? 'warn' : 'ok';

  let share = null, marginStatus = null;
  if (margin > 0 && available > 0) {
    share = (margin / available) * 100;
    marginStatus = share > 100 ? 'bad' : share > budgetPct ? 'warn' : 'ok';
  }

  const ticks = [
    { key: 'liq', label: pinned ? '← Liq' : 'Liq', at: pinned ? 0 : at(-liqDist), pinned },
    { key: 'sl', label: 'SL', at: at(-stopDist) },
    { key: 'e', label: 'E', at: at(0) },
    ...targets.map((t, i) => ({ key: 'tp', label: `TP${i + 1}`, at: at(dist(t)) })),
  ];
  const liqAt = ticks[0].at, slAt = ticks[1].at;
  return {
    ticks, liqPrice, liqDist, stopDist, buffer, status, pinned,
    gap: { from: Math.min(liqAt, slAt), to: Math.max(liqAt, slAt) },
    share, marginStatus, budgetPct,
  };
}

// Empfohlener Hebel für einen Plan (Signalgeber-Chart): gleiche Regeln wie Trade-Karte und Rechner.
// Ohne Kontodaten nur der Höchsthebel, bei dem die Liquidation noch hinter dem Stop liegt.
export function recommendedFor(plan, { equity = null, available = null, riskPct, cap, bufferPct = 1, budgetPct = 50 } = {}) {
  if (!plan || !(plan.entry > 0) || !(plan.stop > 0) || plan.entry === plan.stop) return null;
  const stopDistPct = (Math.abs(plan.entry - plan.stop) / plan.entry) * 100;
  const maxLev = maxLeverageForStop(stopDistPct, bufferPct, cap);
  const size = positionSize(equity, riskPct, plan.entry, plan.stop);
  const rec = size ? recommendLeverage(size.notional, available, maxLev, budgetPct) : null;
  return { lev: rec?.lev ?? null, need: rec?.need ?? null, maxLev, riskPct, account: !!size };
}
export function levTagText(r) {
  if (!r) return '';
  if (r.lev) return `⚡ ${r.lev}× empfohlen (${String(r.riskPct).replace('.', ',')} % Risiko)`;
  if (r.account && r.need) return `⚡ Kapital reicht nicht (bräuchte ${r.need}×)`;
  return `⚡ max. ${r.maxLev}× (Liq hinter Stop)`;
}
