// Bedienung der Charts mit dem Finger (seit 4c):
// waagrecht wischen = in der Zeit verschieben · zwei Finger = zoomen · tippen = Fadenkreuz an/aus (dann ziehen bewegt es)
// doppelt tippen = Ansicht zurücksetzen · eigene Linie am Griff oder an der Linie ziehen = verschieben.
// Eigene Linien werden je Markt auf diesem Gerät gespeichert. Die Zeichnung selbst macht ui-chart.js (chartSvg).
import { GEO, CHART, viewWindow, chartSvg } from './ui-chart.js';
import { tipInline } from './ui-parts.js';

const LINES_KEY = 'wolfdesk.hlines';
const views = new Map();   // "coin|tf" -> { count, back }
const crosses = new Map(); // Box-ID -> { x, y } oder fehlt
const redraws = new Map(); // Box-ID -> Neuzeichnen
const coins = new Map();   // Box-ID -> Markt
const prices = new Map();  // Box-ID -> aktueller Kurs (für „+ Linie“)

// ---- Reine Hilfen (getestet in test-chart.js) ----
export function loadLines(store = globalThis.localStorage) {
  try { const v = JSON.parse(store?.getItem(LINES_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
export function saveLines(all, store = globalThis.localStorage) { try { store?.setItem(LINES_KEY, JSON.stringify(all)); } catch { /* egal */ } }
export const getLines = (coin, store) => (loadLines(store)[coin] || []).filter((p) => p > 0);
export function setLines(coin, list, store) {
  const all = loadLines(store);
  if (list.length) all[coin] = list.slice(0, 8); else delete all[coin];
  saveLines(all, store);
}
// Umrechnung Finger (SVG-Einheiten) -> Preis
export const priceAt = (geo, y) => geo.lo + (1 - (y - CHART.PAD_T) / (CHART.H - CHART.PAD_T - CHART.PAD_B)) * (geo.hi - geo.lo);
export const yAt = (geo, p) => CHART.PAD_T + (1 - (p - geo.lo) / (geo.hi - geo.lo)) * (CHART.H - CHART.PAD_T - CHART.PAD_B);
// Verschieben: dx (SVG-Einheiten, nach rechts = ältere Kerzen) in neuen Ausschnitt
export function panView(geo, start, dx) {
  return viewWindow(geo.len, { count: start.count, back: start.back + dx / geo.cw });
}
// Zoomen: Fingerabstand vorher/nachher; mehr Abstand = weniger Kerzen (näher dran)
export function zoomView(geo, start, d0, d1) {
  if (!(d0 > 0) || !(d1 > 0)) return start;
  const w = viewWindow(geo.len, { count: start.count * (d0 / d1), back: start.back });
  return w;
}

// ---- Zustand für die Zeichnung ----
export const viewFor = (coin, tf) => views.get(coin + '|' + tf) || null;
export const crossFor = (boxId) => crosses.get(boxId) || null;

// Knopfleiste unter dem Chart
export function chartTools(boxId, coin) {
  const n = getLines(coin).length;
  return `<div class="cv-tools" data-cv-box="${boxId}">
    <button type="button" data-cv="add">＋ Linie</button>
    ${n ? `<button type="button" data-cv="clear" class="ghost">Linien löschen (${n})</button>` : ''}
    <button type="button" data-cv="reset" class="ghost" aria-label="Ansicht zurücksetzen">⟲</button>
    ${tipInline('Waagrecht wischen = zurück in der Zeit, zwei Finger = zoomen, tippen = Fadenkreuz mit Preis und Uhrzeit (ziehen bewegt es, nochmal tippen blendet es aus), doppelt tippen = zurück zur aktuellen Ansicht. Blaue Linien kannst du am Griff oder an der Linie selbst verschieben, sie bleiben je Markt gespeichert.', 'cv-help')}
  </div>`;
}

// Chart-Box einmalig bedienbar machen. opts: { coin, tf, price, redraw } – bei jedem Neuzeichnen aufrufen (billig).
export function interactive(box, { coin, tf, price, redraw }) {
  if (!box) return;
  const id = box.id;
  redraws.set(id, redraw); coins.set(id, coin); prices.set(id, price);
  box.dataset.cvTf = tf;
  if (box.dataset.cv) return;
  box.dataset.cv = '1';
  box.classList.add('cv-on');

  const pts = new Map();
  let st = null, lastTap = 0, raf = 0;
  const key = () => coins.get(id) + '|' + box.dataset.cvTf;
  const geo = () => GEO.get(id);
  const toSvg = (e) => {
    const svg = box.querySelector('svg');
    if (!svg) return null;
    const r = svg.getBoundingClientRect(), k = CHART.W / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k };
  };
  const draw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; redraws.get(id)?.(); }); };
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  box.addEventListener('pointerdown', (e) => {
    const g = geo(), p = toSvg(e);
    if (!g || !p) return;
    pts.set(e.pointerId, p);
    try { box.setPointerCapture(e.pointerId); } catch { /* egal */ }
    if (pts.size === 2) {
      const v = viewFor(coins.get(id), box.dataset.cvTf) || { count: g.count, back: g.back };
      st = { mode: 'pinch', d0: dist(), view: { count: g.count, back: g.back, ...v } };
      return;
    }
    // Eigene Linie getroffen? (Griff links oder bis 12 Einheiten neben der Linie)
    const lines = getLines(coins.get(id));
    const hit = lines.findIndex((lp) => Math.abs(yAt(g, lp) - p.y) < 12);
    st = { mode: hit >= 0 ? 'line' : null, idx: hit, x0: p.x, y0: p.y, t0: Date.now(), moved: false, view: { count: g.count, back: g.back } };
  });

  box.addEventListener('pointermove', (e) => {
    if (!st || !pts.has(e.pointerId)) return;
    const p = toSvg(e), g = geo();
    if (!p || !g) return;
    pts.set(e.pointerId, p);
    const dx = p.x - (st.x0 ?? p.x), dy = p.y - (st.y0 ?? p.y);
    if (st.mode === 'pinch' && pts.size === 2) {
      views.set(key(), zoomView(g, st.view, st.d0, dist()));
      e.preventDefault(); draw(); return;
    }
    if (!st.moved && Math.hypot(dx, dy) < 5) return;
    st.moved = true;
    if (!st.mode) st.mode = crosses.get(id) ? 'cross' : Math.abs(dx) >= Math.abs(dy) ? 'pan' : 'scroll';
    if (st.mode === 'scroll') return; // senkrecht: Seite scrollt (touch-action: pan-y)
    e.preventDefault();
    if (st.mode === 'pan') views.set(key(), panView(g, st.view, dx));
    else if (st.mode === 'cross') crosses.set(id, { x: p.x, y: p.y });
    else if (st.mode === 'line') {
      const lines = getLines(coins.get(id));
      lines[st.idx] = +priceAt(g, p.y).toPrecision(6);
      setLines(coins.get(id), lines);
    }
    draw();
  });

  const end = (e) => {
    const p = pts.get(e.pointerId);
    pts.delete(e.pointerId);
    if (!st) return;
    if (st.mode === 'pinch') { if (!pts.size) st = null; return; }
    if (!st.moved && p && e.type === 'pointerup' && Date.now() - st.t0 < 450) {
      const now = Date.now();
      if (now - lastTap < 320) { views.delete(key()); crosses.delete(id); lastTap = 0; } // doppelt tippen = zurücksetzen
      else { lastTap = now; if (crosses.get(id)) crosses.delete(id); else crosses.set(id, { x: p.x, y: p.y }); }
      draw();
    }
    // Fadenkreuz an = Chart hält den Finger fest (kein Scrollen), aus = Seite scrollt wieder normal
    box.classList.toggle('cv-lock', !!crosses.get(id));
    st = null;
  };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
}

// Knöpfe unter den Charts (einmal für die ganze Seite)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('button[data-cv]');
    if (!b) return;
    const id = b.closest('[data-cv-box]')?.dataset.cvBox, box = document.getElementById(id);
    if (!box) return;
    const coin = coins.get(id), g = GEO.get(id), lines = getLines(coin);
    if (b.dataset.cv === 'add') {
      const c = crosses.get(id);
      const px = c && g ? priceAt(g, c.y) : prices.get(id) || (g ? (g.lo + g.hi) / 2 : null);
      if (px > 0) setLines(coin, [...lines, +px.toPrecision(6)]);
    } else if (b.dataset.cv === 'clear') setLines(coin, []);
    else if (b.dataset.cv === 'reset') { views.delete(coin + '|' + box.dataset.cvTf); crosses.delete(id); box.classList.remove('cv-lock'); }
    const tools = b.closest('.cv-tools');
    if (tools) tools.outerHTML = chartTools(id, coin);
    redraws.get(id)?.();
  });
}

// Chart zeichnen und bedienbar machen (Ersatz für box.innerHTML = chartSvg(...)).
// Merkt sich die letzten Zeichen-Angaben je Box, damit Fingerbewegungen sofort neu zeichnen können.
const lastOpts = new Map();
export function drawChart(box, opts) {
  if (!box) return;
  lastOpts.set(box.id, opts);
  box.innerHTML = chartSvg({ ...opts, view: viewFor(opts.coin, opts.tf), cross: crossFor(box.id), hlines: getLines(opts.coin), key: box.id });
  interactive(box, { coin: opts.coin, tf: opts.tf, price: opts.price, redraw: () => drawChart(box, lastOpts.get(box.id)) });
}
