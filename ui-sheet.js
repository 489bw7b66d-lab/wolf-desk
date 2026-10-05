// Gemeinsame Bedienung aller Blätter (8a): nach unten wegwischen, Zurück-Pfeil, „Zurück“-Knopf nach einem Sprung in einen Tab.
// Die Blätter selbst (Trade-Karte, Positions-Blatt, Analyse) bleiben in ihren Dateien; geschlossen wird wie bisher über das ✕.
import { pullStarts, pullCloses } from './core-gesture.js';

const $ = (id) => document.getElementById(id);
let back = null;

function showBack() {
  const b = $('sheet-back');
  if (!b) return;
  b.hidden = !back;
  b.closest('.sheet-panel')?.classList.toggle('has-back', !!back);
}

// Zurück-Pfeil oben links im Blatt: fn öffnet das vorige Blatt wieder. Gilt, bis das Blatt geschlossen wird.
export function setBack(fn) { back = typeof fn === 'function' ? fn : null; showBack(); }
export function clearBack() { back = null; showBack(); }

// Blatt schließen wie ein Tipp auf das ✕ (alle Blätter hängen dort ihre Aufräumarbeit an)
export function closeSheet() {
  $('sheet-close')?.click();
  const sheet = $('sheet');
  if (sheet && !sheet.hidden) { sheet.hidden = true; document.body.classList.remove('no-scroll'); }
}

// Nach einem Sprung aus einem Blatt in einen Tab (z. B. „Im Rechner anpassen“): kleiner Knopf über der Menüleiste
let returnFn = null;
export function showReturn(label, fn, tab) {
  let pill = $('return-pill');
  if (!pill) {
    pill = document.createElement('button');
    pill.type = 'button'; pill.id = 'return-pill'; pill.className = 'return-pill';
    document.body.appendChild(pill);
    pill.addEventListener('click', () => { const f = returnFn; hideReturn(); f?.(); });
    window.addEventListener('hashchange', () => { if (pill.dataset.tab && location.hash.slice(1) !== pill.dataset.tab) hideReturn(); });
  }
  returnFn = fn;
  pill.dataset.tab = tab || '';
  pill.textContent = '‹ ' + label;
  pill.hidden = false;
}
export function hideReturn() { returnFn = null; const p = $('return-pill'); if (p) p.hidden = true; }

export function initSheet() {
  const sheet = $('sheet'), panel = sheet?.querySelector('.sheet-panel');
  if (!sheet || !panel) return;
  if (!$('sheet-back')) {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'sheet-back'; b.className = 'sheet-back'; b.hidden = true;
    b.setAttribute('aria-label', 'Zurück');
    b.textContent = '‹';
    panel.insertBefore(b, panel.firstChild);
    b.addEventListener('click', () => { const fn = back; clearBack(); fn?.(); });
  }
  // Wird das Blatt geschlossen, verfällt der Zurück-Pfeil; beim Öffnen steht das Blatt wieder an seinem Platz
  new MutationObserver(() => {
    if (sheet.hidden) clearBack(); else hideReturn();
    panel.classList.remove('dragging'); panel.style.transform = '';
  }).observe(sheet, { attributes: true, attributeFilter: ['hidden'] });

  // Nach unten wegwischen: nur wenn das Blatt ganz oben steht und der Finger nicht auf Chart, Regler oder Eingabe liegt
  let y0 = null, x0 = 0, drag = false, dy = 0;
  panel.addEventListener('touchstart', (e) => {
    y0 = null; drag = false; dy = 0;
    if (e.touches.length !== 1 || panel.scrollTop > 0) return;
    if (e.target.closest?.('.chart-box, input, select, textarea, [data-noswipe]')) return;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const t = e.touches[0];
    dy = t.clientY - y0;
    if (!drag) {
      if (panel.scrollTop > 0 || dy < -6) { y0 = null; return; }
      if (!pullStarts(t.clientX - x0, dy)) return;
      drag = true; panel.classList.add('dragging');
    }
    if (e.cancelable) e.preventDefault();
    panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const end = () => {
    if (!drag) { y0 = null; return; }
    drag = false; y0 = null;
    panel.classList.remove('dragging');
    if (pullCloses(dy)) {
      panel.style.transform = 'translateY(100%)';
      setTimeout(() => { closeSheet(); panel.style.transform = ''; }, 170);
    } else panel.style.transform = '';
  };
  panel.addEventListener('touchend', end, { passive: true });
  panel.addEventListener('touchcancel', () => { drag = false; y0 = null; panel.classList.remove('dragging'); panel.style.transform = ''; }, { passive: true });
}
