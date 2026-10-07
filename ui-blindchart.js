// Blindprobe (8k): zeichnet einen Einstieg einer Testplan-Regel als kleines Kerzenbild.
// Bewusst OHNE Coin, Datum, Kurse und ohne jede Kerze nach der Signalkerze: Jensen soll beurteilen, ob die Regel seine
// Handschrift trifft, bevor irgendein Ergebnis bekannt ist. Reine Text-Erzeugung (SVG), kein Zugriff auf die Seite.
const W = 340, H = 150, PL = 4, PR = 46, PT = 14, PB = 14;
const f1 = (v) => (Math.round(v * 10) / 10).toString();
export const LABEL_GAP = 9.5;

// get(k) liefert die Kerze k als { o, h, l, c }. Gezeichnet wird von `from` bis einschließlich `to`.
export function panelSvg(get, from, to, spec = {}, { signal = false, max = 300 } = {}) {
  from = Math.max(0, Math.round(from)); if (to - from + 1 > max) from = to - max + 1;
  const n = to - from + 1;
  if (n < 2) return '';
  const cs = []; for (let k = from; k <= to; k++) cs.push(get(k));
  let lo = Math.min(...cs.map((c) => c.l)), hi = Math.max(...cs.map((c) => c.h));
  for (const b of spec.bands || []) { lo = Math.min(lo, b[0]); hi = Math.max(hi, b[1]); }
  for (const L of spec.lines || []) { lo = Math.min(lo, L.y); hi = Math.max(hi, L.y); }
  const span = hi - lo || 1, step = (W - PL - PR) / n, bw = Math.max(0.5, Math.min(7, step * 0.7)), sw = Math.round(Math.min(1, Math.max(0.4, step * 0.8)) * 10) / 10;
  const x = (k) => PL + (k - from + 0.5) * step, y = (v) => PT + (1 - (v - lo) / span) * (H - PT - PB);
  let s = `<svg class="lt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kerzenbild ohne Coin und Datum">`;
  const labels = []; // 8l1: Beschriftungen am rechten Rand sammeln und auseinanderschieben, damit sie sich nicht überdecken
  for (const b of spec.bands || []) {
    const col = b[3] === 'bad' ? 'var(--bad)' : 'var(--gold)'; // 8l: Sell-Block in Rot
    const x0 = b[4] != null && b[4] > from ? Math.min(W - PR - 2, x(b[4]) - step / 2) : 0; // Band erst ab seiner Entstehungskerze
    s += `<rect x="${f1(x0)}" y="${f1(y(b[1]))}" width="${f1(W - PR - x0)}" height="${f1(Math.max(1, y(b[0]) - y(b[1])))}" style="fill:${col};opacity:.18"/>`;
    if (b[2]) labels.push({ y: (y(b[0]) + y(b[1])) / 2 + 3, t: b[2], col });
  }
  for (const L of spec.lines || []) {
    s += `<line x1="0" x2="${W - PR}" y1="${f1(y(L.y))}" y2="${f1(y(L.y))}" style="stroke:${L.hot ? 'var(--gold)' : 'var(--muted)'};stroke-width:${L.hot ? 1.4 : 0.8};${L.hot ? '' : 'stroke-dasharray:3 3'}"/>`;
    if (L.l) labels.push({ y: y(L.y) + 3, t: L.l, col: L.hot ? 'var(--gold)' : 'var(--muted)' });
  }
  if (signal) s += `<rect x="${f1(x(to) - step / 2)}" y="${PT - 6}" width="${f1(step)}" height="${H - PT - PB + 12}" style="fill:var(--text);opacity:.10"/>`;
  cs.forEach((c, j) => {
    const k = from + j, col = c.c >= c.o ? 'var(--ok)' : 'var(--bad)', top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
    s += `<line x1="${f1(x(k))}" x2="${f1(x(k))}" y1="${f1(y(c.h))}" y2="${f1(y(c.l))}" style="stroke:${col};stroke-width:${sw}"/>`;
    s += `<rect x="${f1(x(k) - bw / 2)}" y="${f1(top)}" width="${f1(bw)}" height="${f1(Math.max(1, bot - top))}" style="fill:${col}"/>`;
  });
  for (const m of spec.marks || []) {
    if (m.k < from || m.k > to) continue;
    s += `<text x="${f1(x(m.k))}" y="${f1(Math.max(9, y(get(m.k).h) - 3))}" text-anchor="middle" style="fill:var(--text);font-size:10px;font-weight:700">${m.l}</text>`;
  }
  labels.sort((a, b) => a.y - b.y);
  for (let k = 1; k < labels.length; k++) if (labels[k].y - labels[k - 1].y < LABEL_GAP) labels[k].y = labels[k - 1].y + LABEL_GAP;
  const over = labels.length ? Math.max(0, labels[labels.length - 1].y - (H - 2)) : 0;
  for (const L of labels) s += `<text x="${W - PR + 3}" y="${f1(Math.max(8, L.y - over))}" style="fill:${L.col};font-size:9px">${L.t}</text>`;
  if (signal) s += `<text x="${f1(x(to))}" y="${H - 2}" text-anchor="middle" style="fill:var(--gold);font-size:11px">▲</text>`;
  return s + '</svg>';
}

// item: ein Eintrag aus blindSample (core-longtest): { M, i, viz }
export function blindHtml(item) {
  const { M, i, viz } = item, g = M.g, d = M.dOf[i];
  let h = '';
  if (viz.w) h += `<p class="lt-cap">4H-Chart über die Berührungen${viz.w.older ? ` · ${viz.w.older} ältere links außerhalb des Bildes` : ''}</p>` + panelSvg((k) => ({ o: g.o[k], h: g.h[k], l: g.l[k], c: g.c[k] }), viz.w.from, i, viz.w, { signal: true, max: 440 });
  if (viz.d) h += `<p class="lt-cap">Tageschart bis zum letzten abgeschlossenen Tag</p>` + panelSvg((k) => M.daily[k], viz.d.from, d, viz.d, { max: 260 });
  if (viz.h) h += `<p class="lt-cap">${viz.w ? '4H-Chart, die letzten Tage vergrößert' : '4H-Chart'} · die letzte Kerze ist die Signalkerze</p>` + panelSvg((k) => ({ o: g.o[k], h: g.h[k], l: g.l[k], c: g.c[k] }), viz.h.from, i, viz.h, { signal: true, max: 320 });
  return h;
}
