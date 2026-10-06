// Risiko-Budget (8e): Wie viel Risiko ist über alle offenen Positionen schon gebunden, und wie viel bleibt für einen neuen Trade?
// Grundlage ist die Zeile „Greifen alle Stops“ (core-totalrisk.js): Verlust vom aktuellen Kurs bis zu den Stops in Prozent vom Konto.
// Reine Funktionen, Tests in test-riskbudget.js.

// Ampel für das Gesamt-Risiko mit eigenen Grenzen (statt wie bis 8d am Tagesverlust-Limit zu hängen)
export function totalRiskLevel(t, warnPct = 4, maxPct = 6) {
  if (!t || t.pctNow == null) return 'ok';
  const loss = -t.pctNow;
  return loss >= maxPct ? 'bad' : loss >= warnPct ? 'warn' : 'ok';
}

// t: Ergebnis von totalRisk() oder null (keine Positionen). Rückgabe in Prozent vom Konto.
export function riskBudget(t, maxPct = 6) {
  const usedPct = t && t.pctNow != null ? Math.max(0, -t.pctNow) : 0;
  return { usedPct, limitPct: maxPct, leftPct: Math.max(0, maxPct - usedPct), known: !t || t.pctNow != null, noStop: t?.noStop || 0, unknown: t?.unknown || 0 };
}

// Passt ein neuer Trade mit riskPct ins Budget? fitPct = größtes Risiko, das noch passt (abgerundet auf Viertelprozent).
export function budgetCheck(b, riskPct) {
  if (!b || !(riskPct > 0)) return { state: 'ok', fitPct: null };
  if (riskPct <= b.leftPct + 1e-9) return { state: 'ok', fitPct: riskPct };
  const fit = Math.floor(b.leftPct * 4 + 1e-9) / 4;
  return fit > 0 ? { state: 'warn', fitPct: fit } : { state: 'bad', fitPct: 0 };
}

// Prozent ohne überflüssige Nullen: 5,6 % · 0,25 % · 6 %
const pc = (v) => String(Math.round(v * 100) / 100).replace('.', ',') + ' %';
const pc1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',') + ' %';
// Text für die Trade-Karte. Schlägt nie Nachschießen oder eine zweite Position vor (Ledger kann beides nicht).
export function budgetText(b, riskPct) {
  const c = budgetCheck(b, riskPct);
  const head = `Risiko-Budget: ${pc1(b.usedPct)} von ${pc(b.limitPct)} sind durch offene Positionen gebunden.`;
  const tail = b.noStop ? ` ${b.noStop} Position${b.noStop > 1 ? 'en' : ''} ohne Stop: gerechnet bis zur Liquidation.` : '';
  if (c.state === 'ok') return { state: 'ok', text: `${head} Für neue Trades bleiben ${pc1(b.leftPct)}.${tail}` };
  if (c.state === 'warn') return { state: 'warn', text: `${head} Dieser Trade mit ${pc(riskPct)} passt nicht mehr ganz hinein: höchstens ${pc(c.fitPct)} wählen oder erst Risiko abbauen.${tail}` };
  return { state: 'bad', text: `${head} Das Budget ist voll. Erst Risiko abbauen: Stop nachziehen, einen Teil verkaufen oder eine Position schließen.${tail}` };
}
