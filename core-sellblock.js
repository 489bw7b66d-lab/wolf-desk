// Sell-Block (bärischer Order Block) und die Zeile „Platz nach oben“ (8l). Nur Information, kein Filter, kein Signal.
// Spiegelbild von Regel 6 (core-ltrules.js), von Jensen am 07.10.2026 so beschrieben und bestätigt:
//  - Auslöser: Eine Kerze schließt unter dem jüngsten bestätigten Swing-Tief, unter dem noch keine Kerze geschlossen hat.
//  - Block: die letzte steigende Kerze vor diesem Bruch, von ihrer Eröffnung bis zu ihrem Hoch
//    (Körper = Eröffnung bis Schluss, Docht = Schluss bis Hoch).
//  - Gültig, bis eine Kerze über dem Hoch des Blocks SCHLIESST (Grundsatz Körper: ein Docht allein bricht ihn nicht).
// Eigene Umsetzung. Sieht den Streifen bekannter Smart-Money-Skripte ähnlich, ist aber nicht deckungsgleich.
export const SB = { side: 5 };

// candles: abgeschlossene Kerzen { o, h, l, c } einer Zeitebene. Ergebnis: die am Ende noch gültigen Blöcke, älteste zuerst.
// Jede Kerze nutzt nur Kerzen bis zu sich selbst (ein Swing-Tief zählt erst 5 Kerzen später).
export function sellBlocks(candles, side = SB.side) {
  const cs = candles || [], lows = [], used = new Set();
  let blocks = [];
  const isLow = (p, n) => { if (p < side || p + side >= n) return false; for (let j = 1; j <= side; j++) if (!(cs[p].l < cs[p - j].l) || !(cs[p].l < cs[p + j].l)) return false; return true; };
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    blocks = blocks.filter((b) => !(c.c > b.top));                       // Schluss über dem Block: durchbrochen
    const low = lows[lows.length - 1];
    if (low && c.c < low.price) {                                        // Bruch des jüngsten ungebrochenen Swing-Tiefs
      let b = i - 1; while (b >= 0 && !(cs[b].c > cs[b].o)) b--;
      if (b >= 0 && !used.has(b)) { used.add(b); blocks.push({ b, t: cs[b].t ?? null, bottom: cs[b].o, body: cs[b].c, top: cs[b].h, at: i }); }
    }
    for (let k = lows.length - 1; k >= 0; k--) if (c.c < lows[k].price) lows.splice(k, 1);
    const p = i - side;
    if (isLow(p, i + 1)) lows.push({ p, price: cs[p].l });
  }
  return blocks;
}

// „Platz nach oben“: der nächste gültige Sell-Block über dem Kurs, über mehrere Zeitebenen.
// sets: [{ tf: '4H' | 'Tag' | 'Woche', blocks }] · R: ein R in Kurs-Einheiten (im Rahmen 2 x Tages-ATR)
// Ergebnis: { state: 'frei' } · { state: 'im', tf, bottom, top } · { state: 'weg', r, tf, bottom, top }
export function roomAbove(price, sets, R) {
  let best = null;
  for (const s of sets || []) {
    for (const b of s.blocks || []) {
      if (!(b.top > price)) continue;                                   // Block liegt ganz unter dem Kurs
      const dist = Math.max(0, b.bottom - price);
      if (!best || dist < best.dist || (dist === best.dist && b.top > best.top)) best = { dist, tf: s.tf, bottom: b.bottom, top: b.top, t: b.t ?? null };
    }
  }
  if (!best) return { state: 'frei' };
  if (best.dist === 0) return { state: 'im', tf: best.tf, bottom: best.bottom, top: best.top, t: best.t };
  return { state: 'weg', r: R > 0 ? best.dist / R : null, tf: best.tf, bottom: best.bottom, top: best.top, t: best.t };
}
export function roomText(room) {
  if (!room) return '';
  if (room.state === 'frei') return 'Platz nach oben: frei (kein Sell-Block über dem Kurs)';
  if (room.state === 'im') return `Kurs im Sell-Block (${room.tf})`;
  const r = room.r == null ? '–' : (Math.round(room.r * 10) / 10).toFixed(1).replace('.', ',');
  return `Platz nach oben: ${r} R bis Sell-Block (${room.tf})`;
}

// 8l1: je Zeitebene getrennt, die höhere zuerst (Jensen: höhere Zeitebenen wirken stärker; ein Wochen-Block darf die
// genaueren 4H-Blöcke nicht verdecken). Ergebnis: [{ tf, state, r, bottom, top, t }] in der Reihenfolge Woche, Tag, 4H.
export const TF_ORDER = ['Woche', 'Tag', '4H'];
export function roomByTf(price, sets, R) {
  return TF_ORDER.map((tf) => ({ tf, ...roomAbove(price, (sets || []).filter((s) => s.tf === tf), R) }));
}
const rTxt = (r) => (r == null ? '–' : (Math.round(r * 10) / 10).toFixed(1).replace('.', ',') + ' R');
export function roomsText(rooms) {
  if (!rooms?.length) return '';
  if (rooms.every((x) => x.state === 'frei')) return 'Platz nach oben: frei (kein Sell-Block über dem Kurs)';
  return 'Platz nach oben · ' + rooms.map((x) => `${x.tf}: ${x.state === 'frei' ? 'frei' : x.state === 'im' ? 'Kurs im Block' : rTxt(x.r)}`).join(' · ');
}
// Die nächsten Sell-Blöcke einer Zeitebene über dem Kurs (für die Zeichnung), nächster zuerst
export function blocksAbove(price, blocks, max = 2) {
  return (blocks || []).filter((b) => b.top > price).sort((a, b) => Math.max(0, a.bottom - price) - Math.max(0, b.bottom - price)).slice(0, max);
}
