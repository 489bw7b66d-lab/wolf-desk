// Elliott-Wellen: prüft nur, ob die letzten Swings die harten Regeln eines Impulses erfüllen.
// Ergebnis ist eine mögliche Zählung, keine Gewissheit. Nur für 4H und höher gedacht.
// Tests in test-signals.js.

// Pivots zu abwechselnder Folge Hoch/Tief zusammenführen (bei zwei gleichen den extremeren behalten).
export function zigzag(pv) {
  const pts = [...pv.highs.map((p) => ({ ...p, t: 'H' })), ...pv.lows.map((p) => ({ ...p, t: 'L' }))].sort((a, b) => a.i - b.i);
  const out = [];
  for (const p of pts) {
    const prev = out.at(-1);
    if (prev && prev.t === p.t) {
      if ((p.t === 'H' && p.price > prev.price) || (p.t === 'L' && p.price < prev.price)) out[out.length - 1] = p;
    } else out.push(p);
  }
  return out;
}

// Prüfung für Aufwärts-Impuls; Abwärts wird über gespiegelte Preise geprüft.
function scan(pts, close, up) {
  const v = (p) => (up ? p.price : -p.price);
  const c = up ? close : -close;
  const startType = up ? 'L' : 'H';
  const at = (k) => pts.slice(-k);
  const dirWord = up ? 'long' : 'short';
  const back = (x) => (up ? x : -x);

  // Welle 5 läuft: 0-1-2-3-4 abgeschlossen, Kurs über Welle 4
  let p = at(5);
  if (p.length === 5 && p[0].t === startType) {
    const [p0, p1, p2, p3, p4] = p.map(v);
    const w1 = p1 - p0, w3 = p3 - p2;
    if (p2 > p0 && p3 > p1 && p4 > p1 && w3 >= w1 * 0.618 && c > p4 && c < p3 + w1 * 1.5) {
      return { bias: dirWord, wave: 5, label: 'Welle 5 läuft', target: back(p4 + w1), invalidation: back(p4),
        note: 'Späte Phase: Ziel ist begrenzt, danach Korrektur wahrscheinlich' };
    }
  }
  // Impuls abgeschlossen: 0-1-2-3-4-5, Kurs unter Welle 5
  p = at(6);
  if (p.length === 6 && p[0].t === startType) {
    const [p0, p1, p2, p3, p4, p5] = p.map(v);
    const w1 = p1 - p0, w3 = p3 - p2, w5 = p5 - p4;
    if (p2 > p0 && p3 > p1 && p4 > p1 && p5 > p3 && !(w3 < w1 && w3 < w5) && c < p5) {
      return { bias: up ? 'short' : 'long', wave: 'ABC', label: 'Impuls abgeschlossen, Korrektur (ABC) erwartet', target: back(p4), invalidation: back(p5),
        note: 'Gegenbewegung bis etwa Welle 4 möglich' };
    }
  }
  // Welle 3 startet/läuft: 0-1-2 abgeschlossen, Welle 2 hat 38,2–88,6 % zurückgelaufen, Kurs über Welle 2
  p = at(3);
  if (p.length === 3 && p[0].t === startType) {
    const [p0, p1, p2] = p.map(v);
    const w1 = p1 - p0, r = (p1 - p2) / w1;
    if (w1 > 0 && p2 > p0 && r >= 0.382 && r <= 0.886 && c > p2) {
      return { bias: dirWord, wave: 3, label: 'Welle 3 läuft oder startet', target: back(p2 + 1.618 * w1), invalidation: back(p0),
        note: 'Stärkste Welle, Ziel 1,618 × Welle 1' };
    }
  }
  return null;
}

export function elliott(pv, close) {
  const pts = zigzag(pv);
  if (pts.length < 3) return null;
  const upR = scan(pts, close, true);
  const dnR = scan(pts, close, false);
  // Beide gültig: die Zählung mit der höheren Welle bzw. dem jüngeren Muster ist nicht eindeutig → keine Aussage
  if (upR && dnR) return null;
  return upR || dnR;
}
