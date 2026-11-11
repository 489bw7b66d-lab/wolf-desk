// Stop-Loss-Empfehlung für offene Positionen, auch eigene Trades ohne Signal (8z, Jensen 11.11.2026: „ich habe keine
// Stop-Loss-Empfehlung bei eigenen Trades“). Reine Funktion, Tests in test-stopadvice.js. Setzt keine Order.
// Reihenfolge der Empfehlung:
//  1. Nachgezogener Stop (ab TP1, aus dem Trade-Weg bzw. Exit-Manager), wenn er auf der sicheren Seite des Kurses liegt.
//  2. Rahmen-Stop: 2 × Tages-ATR ab Einstieg. Das ist der Stop des gemessenen Rahmens (Setup-Finder, Beobachtungen).
//  3. Struktur-Stop aus dem automatischen Plan (Kerzen zum Zeitpunkt des Einstiegs), falls der Rahmen-Stop nicht rechenbar ist.
// Liegt der Kurs schon hinter dem Rahmen-Stop, gibt es keine Empfehlung mehr, sondern den Hinweis „Rahmen gerissen“.
// Liegt dein Stop schon am Einstieg oder im Gewinn (und nicht schlechter als der nachgezogene), ist nichts zu empfehlen: „gesichert“.
// Dazu: Vergleich mit dem jetzigen Stop (fehlt / enger / weiter / passt) und die Prüfung, ob die Liquidation vor dem Stop käme.
import { atr } from './core-indicators.js';

export const SA = { atrMult: 2, atrLen: 14, near: 0.25 }; // near: bis ¼ ATR Abstand gilt der jetzige Stop als passend

// Tages-ATR aus abgeschlossenen Tageskerzen (die laufende Kerze zählt nicht)
export function dailyAtr(daily, now = Date.now(), cfg = SA) {
  const D = (daily || []).filter((c) => c && (c.T ?? c.t + 864e5 - 1) < now);
  if (D.length <= cfg.atrLen + 1) return null;
  const v = atr(D, cfg.atrLen).at(-1);
  return v > 0 ? v : null;
}

// x: { side, entry, price, stop (jetziger Stop oder null), liq, size, atrDay, planStop, trail }
export function stopAdvice(x, cfg = SA) {
  const { side, entry, price } = x || {};
  if (!(entry > 0) || !(price > 0) || (side !== 'long' && side !== 'short')) return null;
  const s = side === 'long' ? 1 : -1, a = x.atrDay > 0 ? x.atrDay : null;
  const safe = (v) => v > 0 && (price - v) * s > 0; // Stop liegt noch auf der schützenden Seite des Kurses
  const frame = a ? entry - s * cfg.atrMult * a : null;
  const cands = [
    x.trail > 0 ? { kind: 'trail', price: x.trail, label: 'nachgezogener Stop (ab TP1)' } : null,
    frame > 0 ? { kind: 'rahmen', price: frame, label: `Rahmen-Stop (${cfg.atrMult} × Tages-ATR ab Einstieg)` } : null,
    x.planStop > 0 && (entry - x.planStop) * s > 0 ? { kind: 'struktur', price: x.planStop, label: 'Struktur-Stop (Plan beim Einstieg)' } : null,
  ].filter(Boolean);
  // Der nachgezogene Stop zählt nur, wenn er besser schützt als der Rahmen
  const trail = cands.find((c) => c.kind === 'trail'), fr = cands.find((c) => c.kind === 'rahmen'), st = cands.find((c) => c.kind === 'struktur');
  let rec = null;
  if (trail && safe(trail.price) && (!fr || (trail.price - fr.price) * s > 0)) rec = trail;
  else if (fr && safe(fr.price)) rec = fr;
  else if (!fr && st && safe(st.price)) rec = st;
  const cur = x.stop > 0 ? x.stop : null;
  // Liegt dein Stop schon am Einstieg oder im Gewinn und mindestens so gut wie der nachgezogene Stop: nichts zu empfehlen
  const secured = cur != null && (cur - entry) * s >= 0 && safe(cur) && (!rec || rec.kind !== 'trail' || (cur - rec.price) * s >= 0);
  if (secured) rec = null;
  const broken = !secured && !rec && !!fr && !safe(fr.price);
  let state = 'ohne';
  if (secured) state = 'gesichert';
  else if (rec) {
    if (cur == null) state = 'fehlt';
    else if (a && Math.abs(cur - rec.price) <= cfg.near * a) state = 'passt';
    else if (!a && Math.abs(cur - rec.price) / rec.price < 0.003) state = 'passt';
    else state = (cur - rec.price) * s > 0 ? 'enger' : 'weiter';
  } else if (broken) state = 'gerissen';
  const size = Math.abs(Number(x.size) || 0);
  const out = { side, rec, state, frame, atrDay: a, current: cur, broken, alt: st && rec && rec.kind !== 'struktur' ? st : null };
  if (rec) {
    out.fromEntryPct = ((rec.price - entry) / entry) * 100;            // negativ = Verlust (Long), Vorzeichen wie Kursbewegung
    out.fromPricePct = (Math.abs(price - rec.price) / price) * 100;
    out.pnlAtStop = size ? (rec.price - entry) * s * size : null;       // negativ = Verlust, positiv = gesicherter Gewinn
    out.r = Math.abs(entry - rec.price);
    // Käme die Liquidation vor dem Stop? Dann greift der Stop nie.
    out.liqFirst = x.liq > 0 ? (x.liq - rec.price) * s >= 0 : false;
  }
  out.curLiqFirst = cur != null && x.liq > 0 ? (x.liq - cur) * s >= 0 : false;
  return out;
}

// Kurzer Satz zum Vergleich mit dem jetzigen Stop
export function stopVerdict(a) {
  if (!a) return '';
  if (a.state === 'gesichert') return 'Dein Stop liegt schon am Einstieg oder im Gewinn: nichts zu tun.';
  if (a.state === 'gerissen') return 'Der Kurs liegt schon hinter dem Rahmen-Stop. Nach dem gemessenen Rahmen ist der Trade gescheitert: Position prüfen.';
  if (a.state === 'ohne') return 'Noch keine Empfehlung möglich (Tageskerzen fehlen).';
  if (a.state === 'fehlt') return 'Du hast keinen Stop gesetzt.';
  if (a.state === 'passt') return 'Dein Stop passt zur Empfehlung.';
  if (a.state === 'enger') return 'Dein Stop liegt enger als die Empfehlung: normales Tagesrauschen kann ihn auslösen.';
  return 'Dein Stop liegt weiter weg als die Empfehlung: du riskierst mehr als der Rahmen vorsieht.';
}
