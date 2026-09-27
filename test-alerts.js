import { signalAlert, riskDiff, badChecks, signalText, riskText, telegramView, judgeSignal, journalStats, reportText, linkTrades, executionStats } from './core-alerts.js';
const FL = (coin, time, side, sz, start, pnl = 0) => ({ coin, time, side, sz: String(sz), px: '10', startPosition: String(start), closedPnl: String(pnl), fee: '0' });

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
  ['Risiko: nur noch gelb = keine Entwarnung, Alarm bleibt aktiv', () => {
    const d = riskDiff({ 'ZEC|Abstand Liquidation': 'x' }, {}, { 'ZEC|Abstand Liquidation': 'y' });
    return !d.solved.length && !d.added.length && 'ZEC|Abstand Liquidation' in d.active;
  }],
  ['Risiko: wieder grün = Entwarnung', () => riskDiff({ 'ZEC|Abstand Liquidation': 'x' }, {}, {}).solved.length === 1],
  ['Risiko: pendelt zurück ins Rote = kein zweiter Alarm', () => {
    const d1 = riskDiff({ 'ZEC|L': 'x' }, {}, { 'ZEC|L': 'y' });
    return riskDiff(d1.active, { 'ZEC|L': 'z' }, {}).added.length === 0;
  }],
  ['Risiko: gelb ohne vorherigen Alarm = keine Meldung', () => { const d = riskDiff({}, {}, { 'ETH|L': 'y' }); return !d.added.length && !('ETH|L' in d.active); }],
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
  ['Filter: nur Swing/Daytrade, Scalp wird nicht gemeldet', () => signalAlert(R(82, { best: 'scalp' }), 3.15, {}, 0, { ...CFG, styles: ['swing', 'intraday'] }) === null],
  ['Filter: bester erlaubter Stil statt Scalp', () => {
    const v = telegramView({ styles: { scalp: { ok: true, score: 90 }, intraday: { ok: true, score: 80 }, swing: { ok: false } }, all: { intraday: R(80, { best: null }), scalp: R(90) } }, ['swing', 'intraday']);
    return v?.best === 'intraday';
  }],
  ['Filter: nur Scalp passt = keine Meldung', () => telegramView({ styles: { scalp: { ok: true, score: 90 } }, all: { scalp: R() } }, ['swing', 'intraday']) === null],
  ['Filter: zu wenig Umsatz = keine Meldung', () => signalAlert(R(), 3.15, {}, 0, { ...CFG, minVolumeUsd: 20e6 }, { volume: 5e6 }) === null],
  ['Filter: Richtungswechsel nach 5 Std. gesperrt', () => signalAlert(R(), 3.15, {}, 5 * H, CFG, { lastDir: { TIA: { dir: 'short', at: 0 } } }) === null],
  ['Filter: Richtungswechsel nach 25 Std. erlaubt', () => signalAlert(R(), 3.15, {}, 25 * H, CFG, { lastDir: { TIA: { dir: 'short', at: 0 } } }) !== null],
  ['Text: Long knapp unter der Zone richtig beschriftet', () => signalText(R(), { score: 82, price: 3.05, pos: { state: 'early' } }, { appUrl: 'x' }).includes('unter der Zone')],
  ['Tagebuch: zuerst TP1 = Treffer', () => {
    const e = { dir: 'long', px: 100, stop: 90, tps: [110, 120], at: 0, status: 'offen' };
    return judgeSignal(e, [{ t: 1, T: 2, h: 111, l: 101, c: 109 }, { t: 3, T: 4, h: 105, l: 99, c: 100 }], 5).status === 'tp1';
  }],
  ['Tagebuch: zuerst Stop = Fehlsignal −1R', () => {
    const x = judgeSignal({ dir: 'long', px: 100, stop: 90, tps: [110, 120], at: 0, status: 'offen' }, [{ t: 1, T: 2, h: 111, l: 89, c: 95 }], 5);
    return x.status === 'stop' && x.r === -1;
  }],
  ['Tagebuch: Short bis TP2 = +2R', () => judgeSignal({ dir: 'short', px: 100, stop: 110, tps: [90, 80], at: 0, status: 'offen' }, [{ t: 1, T: 2, h: 99, l: 89, c: 90 }, { t: 3, T: 4, h: 95, l: 79, c: 80 }], 5).r === 2],
  ['Tagebuch: noch nichts passiert = bleibt offen', () => judgeSignal({ dir: 'long', px: 100, stop: 90, tps: [110, 120], at: 0, status: 'offen' }, [{ t: 1, T: 2, h: 105, l: 95, c: 101 }], 5).status === 'offen'],
  ['Tagebuch: Trefferquote 2 von 3', () => {
    const l = [{ status: 'tp1', r: 1 }, { status: 'tp2', r: 2 }, { status: 'stop', r: -1 }, { status: 'offen' }];
    const st = journalStats(l);
    return st.n === 3 && Math.round(st.hit) === 67 && st.open === 1;
  }],
  ['Tagebuch: Auswertung ohne Dollarbeträge', () => !reportText([{ status: 'tp1', r: 1, style: 'swing', score: 80, dir: 'long', events: [] }]).includes('$')],
  ['Umsetzung: Trade 2 Std. nach dem Signal wird zugeordnet', () => {
    const j = [{ coin: 'SOL', dir: 'long', at: 0, status: 'tp1', r: 1 }];
    const l = linkTrades(j, [FL('SOL', 2 * H, 'B', 5, 0), FL('SOL', 5 * H, 'A', 5, 5, 40)]);
    return l.journal[0].taken?.closed === true && l.journal[0].taken.realized === 40 && l.own.length === 0;
  }],
  ['Umsetzung: falsche Richtung = nicht umgesetzt', () => linkTrades([{ coin: 'SOL', dir: 'long', at: 0 }], [FL('SOL', H, 'A', 5, 0)]).journal[0].taken === null],
  ['Umsetzung: 30 Std. später = eigener Trade ohne Signal', () => {
    const l = linkTrades([{ coin: 'SOL', dir: 'long', at: 0 }], [FL('SOL', 30 * H, 'B', 5, 0), FL('SOL', 31 * H, 'A', 5, 5, -10)]);
    return l.journal[0].taken === null && l.own.length === 1 && l.own[0].realized === -10;
  }],
  ['Umsetzung: Auswertung trennt gehandelt und nicht gehandelt', () => {
    const j = [{ status: 'tp2', r: 2, taken: { closed: true, realized: 50 } }, { status: 'stop', r: -1, taken: null }, { status: 'tp1', r: 1, taken: null }];
    const x = executionStats(j, [{ realized: -20 }]);
    return x.takenCount === 1 && x.picked.hit === 100 && x.skipped.n === 2 && x.real.sum === 50 && x.own.hit === 0;
  }],
  ['Text: Risiko-Meldung ohne Dollarbeträge', () => !riskText(['NEAR|Abstand Liquidation'], [], { 'NEAR|Abstand Liquidation': '2,4 % von anfangs ca. 9,0 %' }, {}).includes('$')],
];
