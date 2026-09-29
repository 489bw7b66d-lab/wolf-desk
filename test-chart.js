import { viewWindow, chartSvg, GEO } from './ui-chart.js';
import { priceAt, yAt, panView, zoomView, getLines, setLines } from './ui-chartview.js';
import { liveCandle } from './ui-chart.js';
import { tipKey, tipInline, rememberTip } from './ui-parts.js';

const C = (T, c) => ({ T, o: c, h: c, l: c, c });

export const tests = [
  ['Chart: Live-Kerze je Markt getrennt (kein fremder Kurs beim Öffnen)', () => {
    const t = 1_700_000_000_000;
    const link = liveCandle([C(t, 15)], '4h', 15.2, 'LINK');
    const pump = liveCandle([C(t, 0.0052)], '4h', 0.00521, 'PUMP');
    return link.h === 15.2 && pump.o === 0.0052 && pump.h === 0.00521 && pump.l === 0.0052;
  }],
  ['Chart: Live-Kerze läuft je Markt weiter (Hoch/Tief)', () => {
    const t = 1_700_000_100_000;
    liveCandle([C(t, 10)], '1h', 10.5, 'SOL');
    const x = liveCandle([C(t, 10)], '1h', 9.8, 'SOL');
    return x.h === 10.5 && x.l === 9.8 && x.c === 9.8;
  }],
  ['Chart: neue fertige Kerze startet neue Live-Kerze', () => {
    liveCandle([C(1, 10)], '15m', 12, 'ETH');
    const x = liveCandle([C(2, 11)], '15m', 11.1, 'ETH');
    return x.o === 11 && x.h === 11.1;
  }],
  ['Chart: unplausibler Live-Kurs (über 50 % daneben) wird ignoriert', () => liveCandle([C(3, 0.005)], '4h', 15, 'PUMP') === null],
  ['ⓘ: Schlüssel ohne Zahlen (Betrag ändert sich, Erklärung bleibt dieselbe)', () => tipKey('Netto 96,22 $ nach Gebühren') === tipKey('Netto 101,50 $ nach Gebühren')],
  ['ⓘ: gemerkte Erklärung bleibt nach dem Neuzeichnen offen', () => {
    const closed = !/ open/.test(tipInline('Testtext A'));
    rememberTip(tipKey('Testtext A'), true);
    const open = / open/.test(tipInline('Testtext A 2'));
    rememberTip(tipKey('Testtext A'), false);
    return closed && open && !/ open/.test(tipInline('Testtext A'));
  }],

  ['Chart-Ausschnitt: Standard 70 Kerzen am rechten Rand', () => { const w = viewWindow(300, null); return w.count === 70 && w.back === 0 && w.from === 230 && w.to === 300; }],
  ['Chart-Ausschnitt: Zoom und Verschieben bleiben in den Daten', () => {
    const a = viewWindow(300, { count: 5, back: 0 }), b = viewWindow(300, { count: 999, back: 0 }), c = viewWindow(300, { count: 70, back: 500 });
    return a.count === 15 && b.count === 300 && c.back === 230 && c.from === 0;
  }],
  ['Chart: Finger-Höhe ↔ Preis passen zusammen', () => { const g = { lo: 100, hi: 200 }; return Math.abs(priceAt(g, yAt(g, 150)) - 150) < 1e-9 && yAt(g, 200) < yAt(g, 100); }],
  ['Chart: nach rechts wischen = ältere Kerzen', () => { const g = { len: 300, cw: 5 }; const v = panView(g, { count: 70, back: 0 }, 50); return v.back === 10 && panView(g, { count: 70, back: 10 }, -100).back === 0; }],
  ['Chart: Finger auseinander = näher ran (weniger Kerzen)', () => { const g = { len: 300 }; return zoomView(g, { count: 70, back: 0 }, 100, 200).count === 35 && zoomView(g, { count: 70, back: 0 }, 200, 100).count === 140; }],
  ['Chart: eigene Linien je Markt speichern, max. 8', () => {
    const mem = {}; const st = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
    setLines('SOL', [100, 110], st); setLines('BTC', Array.from({ length: 12 }, (_, i) => i + 1), st);
    const ok = getLines('SOL', st).join() === '100,110' && getLines('BTC', st).length === 8;
    setLines('SOL', [], st);
    return ok && getLines('SOL', st).length === 0 && getLines('BTC', st).length === 8;
  }],
  ['Chart: Fadenkreuz, Linien und Hebel-Hinweis werden gezeichnet, Geometrie gemerkt', () => {
    const cs = Array.from({ length: 100 }, (_, i) => ({ t: i * 36e5, T: i * 36e5 + 1, o: 10 + i * 0.01, h: 10.2 + i * 0.01, l: 9.8 + i * 0.01, c: 10.05 + i * 0.01 }));
    const svg = chartSvg({ coin: 'X', candles: cs, tf: '1h', cross: { x: 100, y: 100 }, hlines: [10.5], levTag: '⚡ 6× empfohlen', key: 'test-box', view: { count: 40, back: 10 } });
    const g = GEO.get('test-box');
    const plain = chartSvg({ coin: 'X', candles: cs, tf: '1h', levTag: '⚡ 6× empfohlen', key: 'test-box2' });
    // Beim Fadenkreuz stehen die Kerzenwerte in der Ecke statt des Hebel-Hinweises
    return svg.includes('cv-cross') && svg.includes('O ') && !svg.includes('6× empfohlen') && plain.includes('6× empfohlen') && svg.includes('#7CC4FF') && svg.includes('10 zurück') && svg.includes('cv-hit') && g.count === 40 && g.back === 10 && g.n === 40;
  }],
];
