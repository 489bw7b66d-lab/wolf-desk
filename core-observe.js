// „Umstellen“ (8r): Der Wächter meldet „Beobachtungen“ aus dem Setup-Finder statt der Maßstab-Signale, erinnert an den
// Zeit-Ausstieg und meldet, wenn der Markt-Bias bei offener Position dreht. Richtungsentscheidung von Jensen (07.10.2026,
// 16:11) und Ergänzung 20:33. Reine Funktionen (Texte und Entscheidungen), Tests in test-observe.js.
// Wie im Finder: Eine Beobachtung behauptet keinen Vorteil, es gibt keinen Score.
import { CONFIG } from './config.js';
import { BLOCK_NAME, tradeResult } from './core-finder.js';
import { roomsText } from './core-sellblock.js';
import { biasLines } from './core-index.js';
import * as f from './core-format.js';

export const OBS = { minBlocks: 2, holdDays: 10 };
const dn = (c) => String(c || '').replace(/^[a-z]+:/, '');

// Telegram nur, wenn ein Baustein auf der LETZTEN abgeschlossenen 4H-Kerze ausgelöst hat und insgesamt mindestens
// minBlocks Bausteine gültig sind (Jensen: „ab 2 Bausteinen“). So kommt jede Beobachtung genau einmal.
export const obsFresh = (e, minBlocks = OBS.minBlocks) => !!e && e.n >= minBlocks && e.finds.some((x) => x.ago === 0);
export const obsKey = (coin, t) => `obs|${coin}|${t}`;

// Ergebnis im Format der Engine für Tagebuch und Trade-Karte: Rahmen-Plan aus dem Finder, Bausteine als Ereignisse
export function obsResult(e, price = null) {
  const r = tradeResult(e, price);
  if (!r) return null;
  return { ...r, events: e.finds.map((x) => ({ name: BLOCK_NAME[x.rule], dir: 'long', strong: true })) };
}

// Text für Telegram
export function obsText(e, r, { bias = null, id = null, appUrl = CONFIG.alerts?.appUrl, holdDays = OBS.holdDays } = {}) {
  const p = r.plan, line = '━━━━━━━━━━━━';
  const blocks = e.finds.map((x) => BLOCK_NAME[x.rule]);
  const L = [
    `👁 <b>WOLF DESK${id ? ` #WD-${String(id).padStart(4, '0')}` : ''} · Beobachtung</b>`,
    `<b>${f.esc(dn(e.coin))}</b> · ${blocks.length} Bausteine: ${f.esc(blocks.join(', '))}`,
    ...(bias ? biasLines(bias).slice(0, 2).map((t) => f.esc(t)) : []),
    line,
    `Kurs ${f.price(p.entry)} · Rahmen-Stop ${f.price(p.stop)} (2× Tages-ATR, −${f.pct(p.stopDistPct, 1)})`,
    `Ziele im Rahmen: ${p.tps.slice(0, 4).map((t, i) => `TP${i + 1} ${f.price(t)}`).join(' · ')}`,
    e.rooms?.length ? f.esc(roomsText(e.rooms)) : '',
    `⏳ Zeit-Ausstieg im Rahmen nach ${holdDays} Tagen.`,
    line,
    'Hinweis für deine eigene Analyse, kein geprüftes Signal.',
    `<a href="${appUrl}">In Wolf Desk ansehen</a>`,
  ];
  return L.filter(Boolean).join('\n');
}

// Zeit-Ausstieg: offene Trades, die seit holdDays Tagen laufen und noch nicht erinnert wurden
export function timeExitDue(positions, trades, done = {}, now = Date.now(), holdDays = OBS.holdDays) {
  const out = [];
  for (const p of positions || []) {
    const t = (trades || []).find((x) => x.coin === p.coin && x.closedAt == null);
    if (!t?.openedAt || t.partial) continue;
    const key = `time|${p.coin}|${t.openedAt}`;
    if (done[key] || now - t.openedAt < holdDays * 864e5) continue;
    out.push({ key, coin: p.coin, side: p.side, openedAt: t.openedAt, days: Math.floor((now - t.openedAt) / 864e5) });
  }
  return out;
}
export function timeExitText(x, holdDays = OBS.holdDays) {
  const d = new Date(x.openedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
  return `⏰ <b>${f.esc(dn(x.coin))}</b> ${x.side === 'short' ? 'Short' : 'Long'} läuft seit ${x.days} Tagen (Einstieg ${d}). Im gemessenen Rahmen ist nach ${holdDays} Tagen Schluss: Zeit-Ausstieg prüfen, oder bewusst weiterlaufen lassen und den Stop nachziehen.`;
}

// Bias-Wechsel: nur zwischen den drei Lagen (bullisch ab +20, bärisch ab −20, sonst gemischt), damit es nicht flackert
export const biasSide = (t) => (!t ? null : t.value >= 20 ? 'bullisch' : t.value <= -20 ? 'bärisch' : 'gemischt');
export function biasTurn(prev, tacho) {
  const now = biasSide(tacho);
  if (!now || !prev || prev === now) return null;
  return { from: prev, to: now };
}
export function biasTurnText(turn, tacho, bias, positions) {
  const pos = (positions || []).map((p) => `${dn(p.coin)} ${p.side === 'short' ? 'Short' : 'Long'}`).join(', ');
  const against = (positions || []).some((p) => (p.side === 'short' ? turn.to === 'bullisch' : turn.to === 'bärisch'));
  return [`🧭 <b>Markt-Bias dreht: ${turn.from} → ${turn.to}</b> (${f.esc(tacho.label)})`, ...(bias ? biasLines(bias).slice(0, 2).map((t) => f.esc(t)) : []),
    `Offen: ${f.esc(pos)}${against ? ' · mindestens eine Position steht jetzt gegen den Markt' : ''}.`].join('\n');
}
