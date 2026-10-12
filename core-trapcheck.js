// Bullenfallen-Detektor (8u): Warnliste nach einem Ausbruch über ein Hoch. Kein Signal, kein Filter, kein Score.
// Nur Anzeige, ohne Messung. Grundsatz Körper. Wunsch von Jensen (08.10.2026, 22:53 und 22:55), Abstimmung 23:05:
//  - Zeichen 6 (Funding und Open Interest) entfällt: Die App kennt nur den Stand von jetzt, keinen Verlauf.
//  - Gezählt wird nur, was prüfbar ist („x von y“). Zeichen 1 steht getrennt in Rot.
//  - Zeichen 7 (Fib-Zone) auf Tag und Woche; Toleranz ½ ATR der jeweiligen Zeitebene.
// Reine Funktionen, Tests in test-trapcheck.js.
import { atr } from './core-indicators.js';
import { rsiInfo, fibPosition } from './core-finder.js';
import { closedWeeks } from './core-exitplan.js';

const DAY = 864e5;
export const TRAP = { days: 5, side: 5, quarter: 0.25, volDays: 20, hiDays: 20, tolAtr: 0.5, ext: [1.272, 1.618, 2.618], dropAtr: 6, retr: [0.618, 0.786] };
const top = (c) => Math.max(c.o, c.c), bot = (c) => Math.min(c.o, c.c);
const de = (x) => String(x).replace('.', ',');

// Ausbruch in den letzten `days` Tageskerzen: Tagesschluss über einem bestätigten Körper-Swing-Hoch (side Kerzen links und
// rechts, bestätigt vor dem Ausbruchstag), das bis dahin von keinem Tagesschluss überboten war. Der jüngste Ausbruch zählt,
// bei mehreren am selben Tag das höchste Hoch. Ergebnis { L, bi } (L = Körper-Oberkante, bi = Index des Ausbruchstags) oder null.
export function findBreakout(D, cfg = TRAP) {
  const n = D?.length || 0, S = cfg.side;
  for (let k = n - 1; k >= Math.max(1, n - cfg.days); k--) {
    let best = null;
    for (let p = S; p + S < k; p++) {
      let ok = true;
      for (let j = 1; j <= S && ok; j++) ok = top(D[p]) > top(D[p - j]) && top(D[p]) >= top(D[p + j]);
      if (!ok) continue;
      const L = top(D[p]);
      if (!(D[k].c > L && D[k - 1].c <= L)) continue;
      let before = false;
      for (let q = p + 1; q < k && !before; q++) before = D[q].c > L;
      if (!before && (!best || L > best.L)) best = { L, bi: k, p };
    }
    if (best) return best;
  }
  return null;
}

// Neues Hoch über 20 Tage: ein Schluss ab dem Ausbruchstag über dem höchsten Schluss der 20 Tage davor (null = zu wenig Daten)
export function newHigh(series, t0, days = TRAP.hiDays) {
  const S = series || [], i0 = S.findIndex((x) => x.t >= t0);
  if (i0 < days) return null;
  let hi = -Infinity; for (let k = i0 - days; k < i0; k++) hi = Math.max(hi, S[k].c);
  for (let k = i0; k < S.length; k++) if (S[k].c > hi) return true;
  return false;
}

// Fib-Zone einer Zeitebene. cs: abgeschlossene Kerzen bis einschließlich Ausbruchskerze (Index b), tf: 'Tag' | 'Woche'
export function fibZone(cs, b, tf, cfg = TRAP) {
  if (!cs || b < 30) return null;
  const A = atr(cs, 14), a = A[b];
  if (!(a > 0)) return null;
  const body = top(cs[b]), close = cs[b].c, prior = cs.slice(0, b);
  // a) Extension des letzten bestätigten Anstiegs vor der Ausbruchskerze
  const fp = fibPosition(prior, A.slice(0, b), prior[prior.length - 1].c);
  if (fp) for (const k of cfg.ext) { const lvl = fp.lo + k * (fp.hi - fp.lo); if (Math.abs(body - lvl) <= cfg.tolAtr * a) return { kind: 'ext', k, tf, text: `an ${de(k)}-Extension (${tf})` }; }
  // b) Rücklauf des letzten größeren Rückgangs: Körper-Swing-Hoch bis tiefster Körper danach, mindestens dropAtr ATR
  for (let p = b - 6; p >= 5; p--) {
    let ok = true; for (let j = 1; j <= 5 && ok; j++) ok = top(cs[p]) > top(cs[p - j]) && top(cs[p]) >= top(cs[p + j]);
    if (!ok) continue;
    const H = top(cs[p]); let Lo = Infinity; for (let k = p + 1; k <= b; k++) Lo = Math.min(Lo, bot(cs[k]));
    if (H - Lo < cfg.dropAtr * (A[p] || a)) continue;
    if (close >= H) continue;                                   // schon über dem Hoch des Rückgangs: kein Rücklauf mehr
    const f = (close - Lo) / (H - Lo);
    if (f >= cfg.retr[0] && f <= cfg.retr[1]) return { kind: 'retr', tf, text: `im 0,618–0,786-Rücklauf des Rückgangs (${tf})` };
    break;                                                      // nur der letzte größere Rückgang zählt
  }
  return null;
}

// Alle Zeichen für einen Ausbruch. D: Tageskerzen (abgeschlossen), L, bi aus findBreakout (oder vom Key-Level im Finder),
// btc: BTC-Tageskerzen, alt: Alt-Index [{ t, c }] oder null. Jedes Zeichen: { id, name, on: true | false | null, text }.
export function trapSigns({ D, L, bi, btc = null, alt = null, cfg = TRAP }) {
  if (!D?.length || !(L > 0) || bi == null || bi < 1 || bi >= D.length) return null;
  const B = D[bi], A = atr(D, 14), a = A[bi];
  const after = D.slice(bi + 1, bi + 1 + cfg.days), back = after.find((c) => c.c < L);
  const s = [];
  s.push({ id: 1, name: 'Zurück unter dem Level', on: !!back, text: back ? 'Ausbruch gescheitert, Tagesschluss zurück unter dem Level' : 'Kein Tagesschluss zurück unter dem Level' });
  const upper = B.h - top(B), body = Math.abs(B.c - B.o), thin = a > 0 && B.c - L < cfg.quarter * a;
  s.push({ id: 2, name: 'Docht statt Körper', on: upper > body || thin, text: upper > body ? 'Oberer Docht der Ausbruchskerze länger als der Körper' : thin ? 'Schluss weniger als ¼ Tages-ATR über dem Level' : 'Ausbruch mit Körper' });
  const vols = D.slice(Math.max(0, bi - cfg.volDays), bi).map((c) => Number(c.v)).filter((v) => v > 0);
  const avg = vols.length >= 10 ? vols.reduce((x, y) => x + y, 0) / vols.length : null;
  s.push({ id: 3, name: 'Schwaches Volumen', on: avg == null || !(Number(B.v) > 0) ? null : Number(B.v) < avg, text: avg == null ? 'Volumen nicht prüfbar' : Number(B.v) < avg ? 'Volumen der Ausbruchskerze unter dem 20-Tage-Schnitt' : 'Volumen über dem 20-Tage-Schnitt' });
  const ri = rsiInfo(D.map((c) => c.c)), bear = (ri?.divs || []).find((x) => /^bärische Divergenz/.test(x));
  s.push({ id: 4, name: 'RSI-Divergenz (Tag)', on: ri ? !!bear : null, text: bear ? `RSI: ${bear}` : 'Keine bärische Divergenz' });
  const hb = newHigh(btc, B.t, cfg.hiDays), ha = alt ? newHigh(alt, B.t, cfg.hiDays) : null;
  s.push({ id: 5, name: 'Keine Bestätigung von oben', on: hb == null || ha == null ? null : !hb && !ha,
    text: hb == null || ha == null ? 'Nicht prüfbar (BTC oder Alt-Index fehlt)' : !hb && !ha ? 'Weder BTC noch Alt-Index mit neuem 20-Tage-Hoch' : `Neues 20-Tage-Hoch: ${[hb ? 'BTC' : '', ha ? 'Alt-Index' : ''].filter(Boolean).join(' und ')}` });
  s.push({ id: 6, name: 'Überhitzung (Funding, Open Interest)', on: null, text: 'Nicht prüfbar: Die App kennt keinen Verlauf von Funding und Open Interest' });
  const W = closedWeeks(D), wb = W.findIndex((w) => B.t >= w.t && B.t <= w.T);
  const fz = fibZone(D.slice(0, bi + 1), bi, 'Tag', cfg) || (wb >= 0 ? fibZone(W.slice(0, wb + 1), wb, 'Woche', cfg) : null);
  s.push({ id: 7, name: 'Fib-Zone', on: fz ? true : false, text: fz ? fz.text : 'Nicht an einer Fib-Extension oder im Rücklauf eines Rückgangs' });
  const known = s.filter((x) => x.on !== null), count = known.filter((x) => x.on).length;
  return { L, t: B.t, bi, signs: s, snapped: !!back, backAt: back?.t ?? null, count, of: known.length };
}

// Kurztext „Fallen-Check: 3 von 6 Warnzeichen“
export const trapHead = (r) => (r ? `Fallen-Check: ${r.count} von ${r.of} Warnzeichen` : '');

// Für „Deine Trades im Detail“: Zeichen beim Einstieg, nur aus Kerzen VOR dem Einstieg (Zeichen 1 nur, soweit schon geschehen).
// Ergebnis: 'kein' (kein Ausbruch in den 5 Tagen davor) · 'ohne' (Ausbruch ohne Warnzeichen) · 'mit' (mindestens eines)
export function trapAtEntry(D, openedAt, btc = null, alt = null, cfg = TRAP) {
  const before = (D || []).filter((c) => c.t + DAY <= openedAt);
  const bo = findBreakout(before, cfg);
  if (!bo) return { group: 'kein', r: null };
  const r = trapSigns({ D: before, L: bo.L, bi: bo.bi, btc: btc && btc.filter((c) => c.t + DAY <= openedAt), alt: alt && alt.filter((c) => c.t + DAY <= openedAt), cfg });
  return { group: r && r.count > 0 ? 'mit' : 'ohne', r };
}
