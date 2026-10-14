// Hintergrund (8x): goldenes Punktraster als Fläche, wie ein ruhig gewölbtes Tuch mit Glanz. Wunsch von Jensen (14.10.2026,
// Vorlage: Halbton-Fläche; gewählt Vorschlag A „ruhig gewölbt“). Jeder Punkt wird nach der Neigung des Tuchs beleuchtet:
// zum Licht hin größer und heller bis weiß-golden, in den Mulden klein und dunkel. Einmal auf ein Canvas gezeichnet und als feste
// Ebene hinter die App gelegt; neu nur, wenn sich die Größe ändert (Drehen). Keine Animation, kein Dauerverbrauch.
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const DEEP = [40, 26, 6], GOLD = [214, 160, 60], CHAMP = [255, 232, 175], WHITE = [255, 250, 232];
const col = (b) => (b < 0.5 ? mix(DEEP, GOLD, b / 0.5) : b < 0.85 ? mix(GOLD, CHAMP, (b - 0.5) / 0.35) : mix(CHAMP, WHITE, (b - 0.85) / 0.15));
export const SHEET = { step: 6.5, depth: 45, light: [-0.3, -0.8, 0.6], amb: 0.08, dif: 0.55, spec: 0.55, sp: 5,
  folds: [{ a: 1, k: 1.3, q: 0.2, ph: 0.3 }, { a: 0.3, k: 2.6, q: -0.6, ph: 1.1 }] };

export function drawWave(cv, w, h, dpr = 1, o = SHEET) {
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  if (!g) return;
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.85, h * 0.08, 0, w * 0.85, h * 0.08, w * 1.1);
  glow.addColorStop(0, 'rgba(255,215,130,.16)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, w, h);
  const n = Math.hypot(...o.light), L = o.light.map((x) => x / n);
  const hx = L[0], hy = L[1], hz = L[2] + 1, hn = Math.hypot(hx, hy, hz);
  // Höhe des Tuchs: wenige breite Falten, diagonal nach rechts oben
  const Z = (x, y) => { const u = x / w, v = y / h, p = u * 0.8 - v; let z = 0; for (const f of o.folds) z += f.a * Math.sin((p * f.k + (u + v) * f.q) * Math.PI + f.ph); return z; };
  const s = o.step, e = 2;
  for (let y = s / 2; y < h; y += s) {
    for (let x = s / 2; x < w; x += s) {
      const zx = ((Z(x + e, y) - Z(x - e, y)) / (2 * e)) * o.depth, zy = ((Z(x, y + e) - Z(x, y - e)) / (2 * e)) * o.depth;
      let nx = -zx, ny = -zy, nz = 1; const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hn), o.sp);
      const vig = 0.55 + 0.9 * Math.min(1, Math.hypot((x / w - 0.5) * 1.3, y / h - 0.42) * 1.4); // Mitte dunkler, Ränder heller
      const b = Math.min(1, (o.amb + o.dif * dif * dif + o.spec * sp) * vig);
      const c = col(b);
      g.beginPath(); g.arc(x, y, s * 0.5 * (0.32 + 0.68 * b), 0, Math.PI * 2);
      g.fillStyle = `rgba(${c.map(Math.round)},${(0.18 + 0.8 * b).toFixed(3)})`; g.fill();
    }
  }
  // Schatten hinter dem Titel, damit „Wolf Desk / Seitenname“ lesbar bleibt
  const sh = g.createLinearGradient(0, 0, w * 0.55, h * 0.34);
  sh.addColorStop(0, 'rgba(14,13,11,.82)'); sh.addColorStop(0.55, 'rgba(14,13,11,.45)'); sh.addColorStop(1, 'rgba(14,13,11,0)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
}

export function initBackground() {
  if (typeof document === 'undefined') return;
  const layer = document.createElement('div');
  layer.className = 'bg-wave'; layer.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas');
  layer.appendChild(cv); document.body.prepend(layer);
  let last = '';
  const paint = () => {
    const w = window.innerWidth, h = window.innerHeight, key = `${w}x${h}`;
    if (key === last || !w || !h) return;
    last = key;
    try { drawWave(cv, w, h, Math.min(3, window.devicePixelRatio || 1)); } catch { /* ohne Hintergrund weiter */ }
  };
  paint();
  window.addEventListener('resize', () => { clearTimeout(paint.t); paint.t = setTimeout(paint, 200); });
}
