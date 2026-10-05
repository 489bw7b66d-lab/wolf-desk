// Gesamt-Risiko aller offenen Positionen (8a): Was passiert mit dem Konto, wenn ALLE Stops greifen?
// Jede Position wird einzeln schon geprüft; hier zählt die Summe, weil gleich gerichtete Positionen gemeinsam fallen.
import { lossAtStop } from './core-guard.js';

// positions: angereicherte Positionen (core-positions), equity: Kontowert
export function totalRisk(positions, equity) {
  const ps = (positions || []).filter((p) => Math.abs(p?.size || 0) > 0 && p.entry > 0);
  if (!ps.length) return null;
  let fromEntry = 0, fromNow = 0, noStop = 0, unknown = 0, long = 0, short = 0, notional = 0, net = 0;
  for (const p of ps) {
    const mark = p.mark ?? p.entry, n = Math.abs(p.size) * mark;
    notional += n;
    if (p.side === 'long') { long++; net += n; } else { short++; net -= n; }
    // Ohne Stop zählt der Weg bis zur Liquidation (die ganze Margin)
    let L = lossAtStop(p);
    if (!L) { noStop++; L = p.liq > 0 ? lossAtStop({ ...p, stop: p.liq }) : null; }
    if (!L) { unknown++; continue; }
    fromEntry += L.pnl;
    fromNow += Math.min(0, L.fromNow);
  }
  const eq = equity > 0 ? equity : null;
  return {
    n: ps.length, long, short, noStop, unknown, notional, fromEntry, fromNow,
    pctNow: eq ? (fromNow / eq) * 100 : null, pctEntry: eq ? (fromEntry / eq) * 100 : null,
    leverage: eq ? notional / eq : null,
    netPct: notional > 0 ? (net / notional) * 100 : 0, // +100 = alles long, −100 = alles short
  };
}

// Ampel: rot ab dem Tagesverlust-Limit, gelb ab der Hälfte davon
export function totalRiskStatus(t, limitPct = 15) {
  if (!t || t.pctNow == null) return 'ok';
  const loss = -t.pctNow;
  return loss >= limitPct ? 'bad' : loss >= limitPct / 2 ? 'warn' : 'ok';
}
