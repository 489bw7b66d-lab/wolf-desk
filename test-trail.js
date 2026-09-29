import { trailStop, hitsFromPath, trailText } from './core-trail.js';
import { honestSplit, dayPnlOf, lifePnlOf } from './core-performance.js';

// Kerzen mit klarer Struktur: Tief 90 (vor dem Trade), Einstieg 100, Hoch, Rücksetzer auf höheres Tief 104, wieder hoch
const H = 36e5;
const mk = (vals) => vals.map((c, i) => ({ t: i * H, T: i * H + H - 1, o: c, h: c + 0.5, l: c - 0.5, c }));
const SERIES = mk([95, 93, 90, 92, 95, 98, 100, 103, 106, 109, 107, 105, 104, 106, 109, 112, 114, 115]);
const OPEN = 6 * H; // Einstieg bei Kerze 6 (Kurs 100)
const base = { side: 'long', entry: 100, stop: 92, mark: 115, candles: SERIES, atrValue: 2, openedAt: OPEN };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Nachziehen: vor TP1 nichts (Trade braucht Luft)', () => trailStop({ ...base, hits: 0 }) === null],
  ['Nachziehen: ab TP1 unter das neue höhere Tief mit ½ ATR Puffer', () => {
    const r = trailStop({ ...base, hits: 1 });
    return r.kind === 'struktur' && near(r.pivot, 103.5) && near(r.stop, 102.5);
  }],
  ['Nachziehen: Tiefs vor der Eröffnung zählen nicht', () => trailStop({ ...base, hits: 1, openedAt: 13 * H }) === null],
  ['Nachziehen: ab TP2 spätestens Einstieg plus Gebühren', () => {
    const r = trailStop({ ...base, hits: 2, candles: null });
    return r.kind === 'einstieg' && near(r.stop, 100.09);
  }],
  ['Nachziehen: Struktur schlägt Einstieg, wenn sie besser ist', () => trailStop({ ...base, hits: 2 }).kind === 'struktur'],
  ['Nachziehen: kein Vorschlag, wenn dein Stop schon dort oder besser ist', () => trailStop({ ...base, hits: 1, stop: 102.5 }) === null && trailStop({ ...base, hits: 2, stop: 104, candles: null }) === null],
  ['Nachziehen: nie über den Kurs (sonst sofort ausgelöst)', () => trailStop({ ...base, hits: 2, mark: 100.1, candles: null }) === null],
  ['Nachziehen: Short gespiegelt (tieferes Hoch, darüber mit Puffer)', () => {
    const S = mk([105, 107, 110, 108, 105, 102, 100, 97, 94, 91, 93, 95, 96, 94, 91, 88, 86, 85]);
    const r = trailStop({ side: 'short', entry: 100, stop: 108, mark: 85, hits: 1, candles: S, atrValue: 2, openedAt: OPEN });
    return r.kind === 'struktur' && near(r.pivot, 96.5) && near(r.stop, 97.5) && trailText(r, '4h', String).includes('tieferes Hoch 4H');
  }],
  ['Nachziehen: erreichte Ziele aus dem Trade-Weg (verkauft oder überschritten)', () => hitsFromPath({ tps: [{ reached: true }, { passed: true }, {}] }) === 2 && hitsFromPath(null) === 0],
  ['Nachziehen: Text für Karte und Telegram', () => trailText({ kind: 'struktur', stop: 102.5, pivot: 103.5 }, '4h', String) === 'SL auf 102.5 nachziehen (neues höheres Tief 4H bei 103.5)'
    && trailText({ kind: 'einstieg', stop: 100.09 }, '4h', String).includes('TP2 erreicht')],
  ['Gewinn ehrlich: Einzahlung zählt nicht als Gewinn', () => {
    // Kontowert 1958, Hyperliquid-PnL gesamt −67, offen −138 → realisiert +71, eingezahlt netto 2025
    const r = honestSplit(1958, -67, -138, 1500);
    return r.source === 'hl' && r.total === -67 && r.realized === 71 && r.invested === 2025 && Math.abs(r.pct - (-67 / 2025) * 100) < 1e-9;
  }],
  ['Gewinn ehrlich: ohne Verlauf vorläufig Kontowert − Startkapital', () => { const r = honestSplit(1958, null, -138, 1500); return r.source === 'start' && r.total === 458 && r.realized === 596; }],
  ['PnL heute und gesamt aus dem Verlauf', () => {
    const pf = [['day', { pnlHistory: [[1, '10'], [2, '25.5']] }], ['allTime', { pnlHistory: [[1, '0'], [2, '-67']] }]];
    return dayPnlOf(pf) === 15.5 && lifePnlOf(pf) === -67 && dayPnlOf(null) === null;
  }],
];
