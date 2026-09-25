// Tests für core-risk.js
import { findStopLoss, lossToStop, liqBeforeStop, realizedPnl, positionSize, checkPosition, checkAccount } from './core-risk.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const R = { riskPerTradeWarnPct: 10, riskPerTradeMaxPct: 15, dailyLossLimitPct: 15, maxLeverage: 20, minLiqDistancePct: 10, maxOpenPositions: 5 };
const longEth = { coin: 'ETH', side: 'long', size: 2.2609, entry: 2679, liq: 2556.7, leverage: 15 };

export const tests = [
  ['SL finden: Verkaufs-Stop bei Long', () => findStopLoss(longEth, [{ coin: 'ETH', side: 'A', orderType: 'Stop Market', triggerPx: '2534.1' }]) === 2534.1],
  ['SL finden: Take-Profit wird ignoriert', () => findStopLoss(longEth, [{ coin: 'ETH', side: 'A', orderType: 'Take Profit Market', triggerPx: '2900' }]) === null],
  ['SL finden: anderer Coin wird ignoriert', () => findStopLoss(longEth, [{ coin: 'SOL', side: 'A', orderType: 'Stop Market', triggerPx: '100' }]) === null],
  ['SL finden: bei zwei Stops zählt der nähere', () => findStopLoss(longEth, [{ coin: 'ETH', side: 'A', orderType: 'Stop Market', triggerPx: '2500' }, { coin: 'ETH', side: 'A', orderType: 'Stop Limit', triggerPx: '2600' }]) === 2600],
  ['SL finden: Short braucht Kauf-Stop', () => findStopLoss({ coin: 'X', side: 'short' }, [{ coin: 'X', side: 'B', orderType: 'Stop Market', triggerPx: '110' }]) === 110],
  ['Verlust bis Stop Long: 2 Stk. 100 → 90 = 20', () => near(lossToStop('long', 2, 100, 90), 20)],
  ['Verlust bis Stop Short: −2 Stk. 100 → 110 = 20', () => near(lossToStop('short', -2, 100, 110), 20)],
  ['Stop im Gewinn: Verlust 0', () => lossToStop('long', 2, 100, 105) === 0],
  ['Buddys ETH: Liquidation 2.556,7 vor Stop 2.534,1', () => liqBeforeStop('long', 2556.7, 2534.1) === true],
  ['Liq unter Stop bei Long ist ok', () => liqBeforeStop('long', 2400, 2534) === false],
  ['Liq vor Stop bei Short', () => liqBeforeStop('short', 105, 110) === true],
  ['Realisiert: PnL minus Gebühren', () => near(realizedPnl([{ closedPnl: '50', fee: '2' }, { closedPnl: '-20', fee: '1' }]), 27)],
  ['Positionsgröße: 1000 $, 10 %, 100 → 95 = 20 Stk.', () => near(positionSize(1000, 10, 100, 95).size, 20)],
  ['Positionsgröße: ungültig ergibt null', () => positionSize(1000, 10, 100, 100) === null],
  ['Regel: 12 % Risiko = Warnung', () => checkPosition({ coin: 'X', side: 'long', size: 1, liq: 1, leverage: 5 }, 100, 88, 50, 100, R).checks.find((c) => c.rule === 'Risiko bis Stop').status === 'warn'],
  ['Regel: Liq vor Stop = Verstoß', () => checkPosition(longEth, 2697.6, 2534.1, 5.2, 2400, R).worst === 'bad'],
  ['Regel: Hebel 25× = Verstoß', () => checkPosition({ ...longEth, leverage: 25 }, 2700, 2600, 50, 1e9, R).checks.find((c) => c.rule === 'Hebel').status === 'bad'],
  ['Regel: kein SL = Warnung', () => checkPosition({ ...longEth, liq: 1000 }, 2700, null, 60, 2400, R).checks[0].status === 'warn'],
  ['Konto: 16 % Tagesverlust = Verstoß', () => checkAccount({ equity: 1000, positionsCount: 1, realizedToday: -160, openRiskTotal: 0 }, R)[0].status === 'bad'],
  ['Konto: Gewinn-Tag = ok', () => checkAccount({ equity: 1000, positionsCount: 1, realizedToday: 50, openRiskTotal: 0 }, R)[0].status === 'ok'],
  ['Konto: 6 Positionen = Verstoß', () => checkAccount({ equity: 1000, positionsCount: 6, realizedToday: 0, openRiskTotal: 0 }, R)[1].status === 'bad'],
];
