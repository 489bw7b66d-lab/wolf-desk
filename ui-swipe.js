// Links/rechts wischen wechselt den Bereich in der Reihenfolge der Menüleiste (8a).
// Greift bewusst nicht: auf Charts (dort heißt wischen „zurück in der Zeit“), in offenen Blättern und Fenstern,
// in Eingabefeldern, in Bereichen, die selbst seitlich rollen, und am Bildschirmrand (Zurück-Geste des iPhones).
import { tabSwipe, nextTab } from './core-gesture.js';

const BLOCK = '.chart-box, #perf-chart, input, select, textarea, .tabbar, [data-noswipe]';

// Rollt ein Element (oder ein Eltern-Element) selbst seitlich? Dann gehört die Geste ihm.
function scrollsSideways(el) {
  for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 4) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

export function initTabSwipe() {
  let s = null;
  document.addEventListener('touchstart', (e) => {
    s = null;
    if (e.touches.length !== 1) return;
    const sheet = document.getElementById('sheet');
    if ((sheet && !sheet.hidden) || document.querySelector('dialog[open]')) return;
    const t = e.target;
    if (t.closest?.(BLOCK) || scrollsSideways(t)) return;
    s = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (e.touches.length !== 1) s = null; }, { passive: true });
  document.addEventListener('touchcancel', () => { s = null; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!s) return;
    const p = e.changedTouches[0], st = s;
    s = null;
    const dir = tabSwipe({ dx: p.clientX - st.x, dy: p.clientY - st.y, dt: Date.now() - st.t, startX: st.x, width: window.innerWidth });
    if (!dir) return;
    const order = [...document.querySelectorAll('[data-nav]')].map((a) => a.dataset.nav);
    const cur = document.querySelector('[data-nav][aria-current="page"]')?.dataset.nav;
    const to = nextTab(order, cur, dir);
    if (to) location.hash = to;
  }, { passive: true });
}
