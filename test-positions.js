import { enrichPositions, accountRisk } from './core-positions.js';
import { getManualStop, setManualStop } from './core-stops.js';

// Testdaten: ein Long mit Stop-Order, einer ohne Stop, einer mit Stop hinter der Liquidation
const now = Date.now();
const pos = (coin, extra) => ({ coin, dex: '', side: 'long', size: 10, entry: 100, markSnapshot: 105, value: 1050, upnl: 50, roe: 0.2, liq: 80, leverage: 5, leverageType: 'isoliert', marginUsed: 210, ...extra });
const stopOrder = (coin, px) => ({ coin, orderType: 'Stop Market', triggerPx: String(px), side: 'A', reduceOnly: true, isTrigger: true, sz: '10', origSz: '10' });
const state = (positions, orders) => ({ account: { orders, fillsToday: [], accountValue: 500, marginUsed: 400, withdrawable: 1000, notional: 3000, spotUsdc: 2000, positions, partialErrors: [] },
  prices: Object.fromEntries(positions.map((p) => [p.coin, 105])), priceTs: Object.fromEntries(positions.map((p) => [p.coin, now])), streamOk: true });

export const tests = [
  ['Positionen: Stop aus der Stop-Order, Regel „Stop vor Liquidation“ grün', () => {
    const [p] = enrichPositions(state([pos('TSTA')], [stopOrder('TSTA', 95)]), now);
    const c = p.evaluation.checks.find((x) => x.rule === 'Stop-Loss');
    return p.stop === 95 && p.stopSource === 'Order' && c.status === 'ok' && Math.abs(p.evaluation.fromEntry - 50) < 1e-9;
  }],
  ['Positionen: ohne Stop gelb und Risiko unbegrenzt', () => {
    const [p] = enrichPositions(state([pos('TSTB')], []), now);
    const c = p.evaluation.checks.find((x) => x.rule === 'Stop-Loss');
    return p.stop == null && p.stopSource == null && c.status === 'warn' && /unbegrenzt/.test(c.text);
  }],
  ['Positionen: Stop hinter der Liquidation ist ein Regelverstoß', () => {
    const [p] = enrichPositions(state([pos('TSTC')], [stopOrder('TSTC', 75)]), now);
    return p.evaluation.checks.find((x) => x.rule === 'Stop-Loss').status === 'bad' && p.evaluation.worst === 'bad';
  }],
  ['Positionen: Risiko ab Einstieg in % vom Konto (Warnung ab 3 %)', () => {
    const [p] = enrichPositions(state([pos('TSTD', { size: 20 })], [stopOrder('TSTD', 95)]), now); // 100 $ Risiko bei 2.000 $ Konto = 5 %
    const c = p.evaluation.checks.find((x) => x.rule === 'Risiko ab Einstieg');
    return Math.abs(p.evaluation.riskPct - 5) < 1e-9 && c.status !== 'ok';
  }],
  ['Konto: Gesamtrisiko nur, wenn alle Positionen einen Stop haben', () => {
    const withStops = accountRisk(state([pos('TSTE'), pos('TSTF')], [stopOrder('TSTE', 95), stopOrder('TSTF', 98)]), now);
    const missing = accountRisk(state([pos('TSTE'), pos('TSTG')], [stopOrder('TSTE', 95)]), now);
    return withStops.openRiskTotal > 0 && missing.openRiskTotal === null;
  }],
  ['Manueller Stop: speichern, lesen, löschen (nur ohne Stop-Order)', () => {
    const had = typeof localStorage !== 'undefined';
    if (!had) { const m = {}; globalThis.localStorage = { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }; }
    setManualStop('TSTH', 90);
    const [p] = enrichPositions(state([pos('TSTH')], []), now);
    const ok = getManualStop('TSTH') === 90 && p.stop === 90 && p.stopSource === 'manuell';
    setManualStop('TSTH', null);
    const gone = getManualStop('TSTH') === null;
    if (!had) delete globalThis.localStorage;
    return ok && gone;
  }],
];
