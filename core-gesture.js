// Wisch-Gesten (8a): nur die Entscheidung, damit sie testbar ist. Die Anzeige liegt in ui-sheet.js und ui-swipe.js.

// Tab-Wechsel: deutlich waagrecht, nicht vom Bildschirmrand (dort gehört die Geste dem iPhone), nicht zu langsam.
// Rückgabe: +1 = nächster Tab (nach links gewischt), −1 = voriger Tab, 0 = nichts
export function tabSwipe({ dx, dy, dt, startX, width, edge = 24, min = 70, ratio = 2.2, maxMs = 700 } = {}) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (startX < edge || (width > 0 && startX > width - edge)) return 0;
  if (dt > maxMs) return 0;
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * ratio) return 0;
  return dx < 0 ? 1 : -1;
}

// Nachbar-Tab in der Reihenfolge der Menüleiste; am Rand ist Schluss (kein Kreis). Unbekannter Tab (⚙️, System): nichts.
export function nextTab(order, current, dir) {
  const i = (order || []).indexOf(current);
  if (i < 0 || !dir) return null;
  return order[i + dir] ?? null;
}

// Blatt nach unten ziehen: Beginn erst bei klarer Abwärtsbewegung, schließen ab einer Schwelle
export const pullStarts = (dx, dy, min = 12) => dy > min && dy > Math.abs(dx) * 1.5;
export const pullCloses = (dy, limit = 120) => dy >= limit;
