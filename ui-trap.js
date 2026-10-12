// Bullenfallen-Detektor (8u): Anzeige im Positions-Blatt, auf der Startseite und im Setup-Finder. Rechnung in core-trapcheck.js.
// Kerzen: Tag (wie überall in der App, 260 Tage), BTC-Tageskerzen und der gespeicherte Alt-Index (8m). Ergebnisse werden je Coin
// gemerkt, bis eine neue Tageskerze da ist; geladen wird im Hintergrund (Startseite und Blatt zeichnen jede Sekunde neu).
import { getCandles } from './core-scanner.js';
import { loadIndex } from './core-index.js';
import { findBreakout, trapSigns, trapHead } from './core-trapcheck.js';
import { esc, tipInline } from './ui-parts.js';
import * as f from './core-format.js';

const DAY = 864e5;
const daily = new Map(), results = new Map();
let altCache = null;
function loadDaily(coin) {
  const hit = daily.get(coin);
  if (hit && (hit.loading || Date.now() - hit.at < 30 * 60e3)) return hit.candles || null;
  daily.set(coin, { ...(hit || {}), loading: true });
  getCandles(coin, '1d', true).then((c) => daily.set(coin, { candles: c, at: Date.now() }))
    .catch(() => daily.set(coin, { candles: hit?.candles || null, at: Date.now() }));
  return hit?.candles || null;
}
const altSeries = () => { if (!altCache || Date.now() - altCache.at > 30 * 60e3) { let a = null; try { a = loadIndex()?.alt || null; } catch { a = null; } altCache = { a, at: Date.now() }; } return altCache.a; };

// Für eine offene Long-Position: Ausbruch in den letzten 5 Tagen über ein Körper-Swing-Hoch (Tag)? Sonst null.
export function trapForCoin(coin) {
  const D = loadDaily(coin), B = loadDaily('BTC');
  if (!D?.length) return null;
  const key = `${D[D.length - 1].t}|${B?.length ? B[B.length - 1].t : 0}`, hit = results.get(coin);
  if (hit && hit.key === key) return hit.r;
  const bo = findBreakout(D);
  const r = bo ? trapSigns({ D, L: bo.L, bi: bo.bi, btc: B, alt: altSeries() }) : null;
  results.set(coin, { key, r });
  return r;
}
// Für den Finder (Baustein Key-Level): Level und Ausbruchstag sind bekannt
export function trapForLevel(D, L, tBreak, btc = null) {
  if (!D?.length || !(L > 0)) return null;
  const bi = D.findIndex((c) => tBreak >= c.t && tBreak < c.t + DAY);
  return bi > 0 ? trapSigns({ D, L, bi, btc: btc || loadDaily('BTC'), alt: altSeries() }) : null;
}

const TIP = 'Warnzeichen nach einem Ausbruch über ein Hoch (Tageschart, Körper): 1 Schluss zurück unter dem Level · 2 Docht statt Körper · 3 schwaches Volumen · 4 bärische RSI-Divergenz · 5 weder BTC noch Alt-Index mit neuem 20-Tage-Hoch · 6 Funding und Open Interest (nicht prüfbar) · 7 Fib-Zone. Gezählt wird nur, was prüfbar ist. Ohne Messung: kein Signal, kein Filter.';
// Ausführlich (Positions-Blatt, Finder). position: Hinweis „Gewinn sichern oder Stop prüfen“ bei Zeichen 1
export function trapHtml(r, { position = false, id = 'trap' } = {}) {
  if (!r) return '';
  const red = r.snapped ? `<p class="trap-red">Ausbruch gescheitert, Schluss zurück unter ${f.price(r.L)}${position ? '. Gewinn sichern oder Stop prüfen.' : '.'}</p>` : '';
  const rows = r.signs.map((s) => `<li class="${s.on === true ? 'on' : s.on === null ? 'na' : ''}"><span>${s.on === true ? '⚠' : s.on === null ? '–' : '✓'}</span> <b>${s.id}</b> ${esc(s.name)}: ${esc(s.text)}</li>`).join('');
  return `<div class="trap-box">${red}
    <details><summary>${esc(trapHead(r))} <small class="muted">· Ausbruch über ${f.price(r.L)} am ${new Date(r.t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ohne Messung</small></summary>
    <ul class="trap-list">${rows}</ul>${tipInline(TIP, id)}</details></div>`;
}
// Kurz (Startseite)
export function trapMini(r) {
  if (!r) return '';
  return r.snapped ? '<span class="trap-mini red">Falle zugeschnappt</span>' : r.count ? `<span class="trap-mini">Fallen-Check ${r.count}/${r.of}</span>` : '';
}
