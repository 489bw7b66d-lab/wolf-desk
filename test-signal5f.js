import { signalText, signalLeverage, signalWhy } from './core-alerts.js';
import { planWithStop, planOrigStop } from './core-guard.js';

const P = { dir: 'long', entry: 54.75, stop: 50, zone: [54.5, 55], tps: [57.5, 60, 63, 67, 72], R: 4.75, stopDistPct: 8.68, stopLabel: 'hinter Struktur / ATR' };
const R = { coin: 'DASH', dir: 'long', best: 'swing', mode: 'swing', plan: P, confirms: [{ dir: 'long' }], tfs: ['1d', '4h', '1h'],
  analyses: [{ stack: 'bull', structure: 'up' }], events: [{ name: 'Ausbruch aus Dreieck', dir: 'long', tf: '1d', strong: 1, barsAgo: 0 }], waves: [] };
const A = { score: 84, price: 54.9, pos: { state: 'zone' } };

export const tests = [
  ['Telegram-Signal: Kopf mit Nummer, Richtung, Stil und Hebel-Spanne', () => {
    const t = signalText(R, A, { id: 7, appUrl: 'x' });
    return t.includes('#WD-0007') && t.includes('LONG') && t.includes('DASH') && t.includes('Swing') && /Hebel: \d+(–\d+)?×/.test(t);
  }],
  ['Telegram-Signal: Einstieg, vier Ziele, Stop mit Abstand, Ungültig-Zeile', () => {
    const t = signalText(R, A, { appUrl: 'x' });
    return t.includes('Einstieg:</b> 54,50 – 55,00') && t.includes('TP4') && !t.includes('TP5') && t.includes('Stop:</b> 50,00 (−8,7 %)') && t.includes('Ungültig bei Schluss unter 50,00');
  }],
  ['Telegram-Signal: Begründung aus Trend und Ereignissen', () => { const w = signalWhy(R); return w.includes('Trend 1D bullisch') && w.includes('höhere Hochs') && w.includes('Ausbruch aus Dreieck'); }],
  ['Telegram-Signal: Hebel-Spanne beachtet Stop und Höchsthebel des Marktes', () => signalLeverage(P, 'swing') !== signalLeverage(P, 'swing', 3) && signalLeverage({ ...P, stop: 54 }, 'swing', 3) === '1–3×'],
  ['Trade-Karte: Vorschlag übernehmen und zurück zum Plan-Stop', () => {
    const a = planWithStop(P, 49);
    const b = planOrigStop(a);
    return a.stop === 49 && a.stopAdjusted && a.origStop === 50 && Math.abs(a.R - 5.75) < 1e-9 && b.stop === 50 && !b.stopAdjusted && b.stopLabel === 'hinter Struktur / ATR' && Math.abs(b.R - 4.75) < 1e-9;
  }],
  ['Trade-Karte: unsinniger Vorschlag (auf der falschen Seite) wird ignoriert', () => planWithStop(P, 60) === P && planOrigStop(P) === P],
];
