import { approxLiqDistPct, maxLeverageForStop } from './core-risk.js';
import { recommendedFor, levTagText } from './core-levpreview.js';
import { levPreview } from './core-levpreview.js';

const L = { dir: 'long', entry: 100, stop: 95, tps: [105, 110, 115, 120] };  // Stop 5 %
const S = { dir: 'short', entry: 100, stop: 105, tps: [95, 90, 85] };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Hebel-Vorschau: niedriger Hebel = Liquidation weit weg (am Rand), Puffer grün', () => {
    const p = levPreview(L, 3, { bufferPct: 1 });
    return p.pinned && p.ticks[0].at === 0 && p.status === 'ok' && near(p.liqDist, 30) && near(p.buffer, 25);
  }],
  ['Hebel-Vorschau: mehr Hebel = Liq rückt an den Stop', () => {
    const a = levPreview(L, 12, { bufferPct: 1 }), b = levPreview(L, 16, { bufferPct: 1 });
    return !a.pinned && a.ticks[0].at < b.ticks[0].at && b.ticks[0].at < b.ticks[1].at;
  }],
  ['Hebel-Vorschau: Puffer unter Mindestabstand = gelb', () => { const p = levPreview(L, 16, { bufferPct: 1 }); return near(p.buffer, 0.625) && p.status === 'warn'; }],
  ['Hebel-Vorschau: Liquidation vor dem Stop = rot', () => { const p = levPreview(L, 20, { bufferPct: 1 }); return p.buffer < 0 && p.status === 'bad' && p.ticks[0].at > p.ticks[1].at; }],
  ['Hebel-Vorschau: Liquidationspreis Long/Short', () => near(levPreview(L, 10).liqPrice, 91) && near(levPreview(S, 10).liqPrice, 109)],
  ['Hebel-Vorschau: Short hat Verlustseite links wie Long', () => {
    const p = levPreview(S, 10);
    const [liq, sl, e, tp1] = p.ticks;
    return liq.at < sl.at && sl.at < e.at && e.at < tp1.at && near(e.at, 0.4);
  }],
  ['Hebel-Vorschau: höchstens 3 Ziele, Einstieg bei 40 % (2× Stop links, 3R rechts)', () => {
    const p = levPreview(L, 5);
    return p.ticks.filter((t) => t.key === 'tp').length === 3 && near(p.ticks[2].at, 0.4) && near(p.ticks.at(-1).at, 1);
  }],
  ['Hebel-Vorschau: Margin-Anteil am freien Kapital mit Ampel', () => {
    const a = levPreview(L, 5, { margin: 200, available: 1000, budgetPct: 50 });
    const b = levPreview(L, 5, { margin: 600, available: 1000, budgetPct: 50 });
    const c = levPreview(L, 5, { margin: 1200, available: 1000, budgetPct: 50 });
    return near(a.share, 20) && a.marginStatus === 'ok' && b.marginStatus === 'warn' && c.marginStatus === 'bad';
  }],
  ['Hebel-Vorschau: ohne Kontodaten kein Margin-Balken', () => levPreview(L, 5).share === null],
  ['Hebel-Vorschau: ungültige Eingaben = nichts', () => levPreview({ ...L, stop: 100 }, 5) === null && levPreview({ ...L, stop: 105 }, 5) === null && levPreview(L, 0) === null],
  ['Hebel-Vorschau: Lücke zwischen Liq und Stop immer von links nach rechts', () => {
    const a = levPreview(L, 12), b = levPreview(L, 25);
    return a.gap.from <= a.gap.to && b.gap.from <= b.gap.to && near(b.gap.to, b.ticks[0].at);
  }],

  ['Empfohlener Hebel: gleiche Regeln wie Trade-Karte', () => {
    const r = recommendedFor({ entry: 100, stop: 95 }, { equity: 1000, available: 1000, riskPct: 2, cap: 10, bufferPct: 1, budgetPct: 50 });
    // Risiko 20 $, 5 % Stop = 400 $ Position, max. 15× laut Liq-Regel -> Deckel 10×, Budget 500 $ -> 1×
    return r.maxLev === 10 && r.lev === 1 && levTagText(r).includes('1× empfohlen (2 % Risiko)');
  }],
  ['Empfohlener Hebel: ohne Konto nur Höchsthebel', () => { const r = recommendedFor({ entry: 100, stop: 90 }, { riskPct: 2, cap: 20, bufferPct: 1 }); return r.lev === null && r.maxLev === 8 && levTagText(r).includes('max. 8×'); }],
  ['Empfohlener Hebel: Kapital zu knapp wird gesagt', () => { const r = recommendedFor({ entry: 100, stop: 99.5 }, { equity: 10000, available: 50, riskPct: 5, cap: 3, bufferPct: 1 }); return r.lev === null && r.need > 3 && levTagText(r).includes('reicht nicht'); }],
  ['Liquidation: Höchsthebel des Marktes zählt (ALGO max. 5×)', () => {
    // Wartungs-Margin = halbe Anfangs-Margin beim Höchsthebel: 5× bei max. 5× → ~10 % statt ~18 %
    return Math.abs(approxLiqDistPct(5, 5) - 10) < 1e-9 && Math.abs(approxLiqDistPct(5, 50) - 18) < 1e-9 && approxLiqDistPct(5) === 18;
  }],
  ['Höchsthebel für Stop: ALGO-Fall (Stop 13,2 %) wäre nur bis 4× sicher, nicht 6×', () => maxLeverageForStop(13.16, 1, 20, 5) === 4 && maxLeverageForStop(13.16, 1, 20) === 6],
  ['Hebel-Vorschau: bei niedrigem Höchsthebel rückt die Liq vor den Stop', () => {
    const P = { dir: 'long', entry: 0.13439, stop: 0.11671, tps: [0.14, 0.15] };
    const a = levPreview(P, 5, { bufferPct: 1, exchangeMax: 5 }), b = levPreview(P, 5, { bufferPct: 1 });
    return a.status === 'bad' && a.buffer < 0 && b.status === 'ok';
  }],
  ['Empfohlener Hebel beachtet den Höchsthebel des Marktes', () => recommendedFor({ entry: 100, stop: 87 }, { riskPct: 2, cap: 20, bufferPct: 1, exchangeMax: 5 }).maxLev === 4],
];
