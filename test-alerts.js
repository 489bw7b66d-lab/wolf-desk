import { signalAlert, riskDiff, badChecks, signalText, riskText } from './core-alerts.js';

const CFG = { minScore: 75, repeatHours: 12, states: ['zone', 'early'], appUrl: 'https://x' };
const R = (score = 82, over = {}) => ({
  coin: 'TIA', dir: 'long', best: 'swing', total: { long: score, short: 20 },
  plan: { dir: 'long', zone: [3.1, 3.2], entry: 3.15, stop: 2.95, tps: [3.4, 3.6, 3.8, 4.0] },
  events: [{ name: 'Golden Cross (55/200 Tag)', dir: 'long', strong: true, barsAgo: 1, tf: '1d' }], waves: [], confirms: [{ dir: 'long' }], ...over,
});
const H = 3600e3;

export const tests = [
  ['Alarm: starkes Signal in der Zone wird gemeldet', () => signalAlert(R(), 3.15, {}, 0, CFG)?.key === 'TIA|long'],
  ['Alarm: Score unter 75 = keine Meldung', () => signalAlert(R(70), 3.15, {}, 0, CFG) === null],
  ['Alarm: Kurs davongelaufen = keine Meldung', () => signalAlert(R(), 3.5, {}, 0, CFG) === null],
  ['Alarm: kein passender Stil = keine Meldung', () => signalAlert(R(82, { best: null }), 3.15, {}, 0, CFG) === null],
  ['Alarm: vor 5 Std. gemeldet = nicht wiederholen', () => signalAlert(R(), 3.15, { 'TIA|long': 0 }, 5 * H, CFG) === null],
  ['Alarm: vor 13 Std. gemeldet = wieder melden', () => signalAlert(R(), 3.15, { 'TIA|long': 0 }, 13 * H, CFG) !== null],
  ['Risiko: neuer Verstoß und Entwarnung erkannt', () => {
    const d = riskDiff({ 'ETH|Stop-Loss': 'x' }, { 'NEAR|Abstand Liquidation': 'y' });
    return d.added[0] === 'NEAR|Abstand Liquidation' && d.solved[0] === 'ETH|Stop-Loss';
  }],
  ['Risiko: gleicher Stand = nichts melden', () => { const d = riskDiff({ a: 1 }, { a: 1 }); return !d.added.length && !d.solved.length; }],
  ['Risiko: nur rote Punkte zählen', () => {
    const b = badChecks({ positions: [{ coin: 'NEAR', evaluation: { checks: [{ rule: 'A', status: 'bad', text: 't' }, { rule: 'B', status: 'warn', text: 'w' }] } }], checks: [{ rule: 'Freies Kapital', status: 'bad', text: 'k' }] });
    return Object.keys(b).join() === 'NEAR|A,Konto|Freies Kapital';
  }],
  ['Text: Signal enthält Richtung, Stop und Link, xyz ausgeblendet', () => {
    const t = signalText(R(82, { coin: 'xyz:GOLD' }), { score: 82, price: 3.15, pos: { state: 'zone' } }, { appUrl: 'https://x' });
    return t.includes('LONG · GOLD') && t.includes('Stop') && t.includes('href="https://x"') && !t.includes('xyz');
  }],
  ['Text: ohne Kapital mit Hinweis', () => signalText(R(), { score: 82, price: 3.15, pos: { state: 'zone' } }, { noCapital: true, appUrl: 'x' }).includes('Kein Kapital frei')],
  ['Text: Risiko-Meldung ohne Dollarbeträge', () => !riskText(['NEAR|Abstand Liquidation'], [], { 'NEAR|Abstand Liquidation': '2,4 % von anfangs ca. 9,0 %' }, {}).includes('$')],
];
