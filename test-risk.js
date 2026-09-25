// Tests für core-risk.js
import { liqCheck, maxLeverageForStop, approxLiqDistPct, positionRisk, findStopLoss, lossToStop, liqBeforeStop, realizedPnl, positionSize, checkPosition, checkAccount } from './core-risk.js';

const near = (a, b, eps = 1e-6) => a != null && Math.abs(a - b) < eps;
const R = { riskPerTradeWarnPct: 10, riskPerTradeMaxPct: 15, dailyLossLimitPct: 15, maxLeverage: 20, liqBufferPct: 1, liqNoStopMinShare: 0.5, maxOpenPositions: 5 };
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
  ['Regel: 12 % Risiko ab Einstieg = Warnung', () => checkPosition({ coin: 'X', side: 'long', size: 1, entry: 100, liq: 1, leverage: 5 }, 100, 88, 50, 100, R).checks.find((c) => c.rule === 'Risiko ab Einstieg').status === 'warn'],
  // Buddys SOL: Einstieg 114,39, Kurs 122,13, Stop 106,45, 37,69 Stk.
  ['SOL: Risiko ab Einstieg ≈ 299,26 $', () => near(positionRisk({ side: 'long', size: 37.69, entry: 114.39, liq: 102.85, leverageType: 'isoliert', leverage: 8 }, 122.13, 106.45).fromEntry, 37.69 * 7.94, 1e-6)],
  ['SOL: Verlust ab jetzt ≈ 590,79 $', () => near(positionRisk({ side: 'long', size: 37.69, entry: 114.39, liq: 102.85, leverageType: 'isoliert', leverage: 8 }, 122.13, 106.45).fromNow, 37.69 * 15.68, 1e-6)],
  ['SOL: davon Buchgewinn ≈ 291,72 $', () => near(positionRisk({ side: 'long', size: 37.69, entry: 114.39, liq: 102.85, leverageType: 'isoliert', leverage: 8 }, 122.13, 106.45).giveBack, 37.69 * 7.74, 1e-6)],
  ['ETH isoliert, Liq vor Stop: Maximalverlust = Margin', () => positionRisk({ side: 'long', size: 2.2609, entry: 2679, liq: 2556.7, leverageType: 'isoliert', leverage: 15, marginUsed: 427.13 }, 2694.1, 2534.1).fromNow === 427.13],
  ['ETH isoliert, Liq vor Stop: Risiko ab Einstieg = Anfangs-Margin', () => near(positionRisk({ side: 'long', size: 2.2609, entry: 2679, liq: 2556.7, leverageType: 'isoliert', leverage: 15, marginUsed: 427.13 }, 2694.1, 2534.1).fromEntry, 2679 * 2.2609 / 15)],
  ['Cross, Liq vor Stop: Verlust bis Liquidation', () => near(positionRisk({ side: 'long', size: 1, entry: 100, liq: 90, leverageType: 'cross', leverage: 10 }, 100, 85).fromEntry, 10)],
  ['Regel: Liq vor Stop = Verstoß', () => checkPosition(longEth, 2697.6, 2534.1, 5.2, 2400, R).worst === 'bad'],
  ['Regel: Hebel 25× = Verstoß', () => checkPosition({ ...longEth, leverage: 25 }, 2700, 2600, 50, 1e9, R).checks.find((c) => c.rule === 'Hebel').status === 'bad'],
  ['Regel: kein SL = Warnung', () => checkPosition({ ...longEth, liq: 1000 }, 2700, null, 60, 2400, R).checks[0].status === 'warn'],
  ['Konto: 16 % Tagesverlust = Verstoß', () => checkAccount({ equity: 1000, positionsCount: 1, realizedToday: -160, openRiskTotal: 0 }, R)[0].status === 'bad'],
  ['Konto: Gewinn-Tag = ok', () => checkAccount({ equity: 1000, positionsCount: 1, realizedToday: 50, openRiskTotal: 0 }, R)[0].status === 'ok'],
  ['Konto: 6 Positionen = Verstoß', () => checkAccount({ equity: 1000, positionsCount: 6, realizedToday: 0, openRiskTotal: 0 }, R)[1].status === 'bad'],
  // Hebel-angepasste Liquidationsregeln
  ['Buddys SOL 8×: Liq 3,5 % hinter Stop = ok', () => liqCheck({ side: 'long', liq: 102.85, leverage: 8 }, 122.13, 106.45, 15.8, R, false).status === 'ok'],
  ['Liq nur 0,5 % hinter Stop = Warnung', () => liqCheck({ side: 'long', liq: 99.5, leverage: 10 }, 100, 100, 0.5, R, false).status === 'warn'],
  ['15× ohne Stop, frisch eröffnet (6 %) = ok', () => liqCheck({ side: 'long', liq: 94, leverage: 15 }, 100, null, 6, R, false).status === 'ok'],
  ['15× ohne Stop, nur noch 2 % = Warnung', () => liqCheck({ side: 'long', liq: 98, leverage: 15 }, 100, null, 2, R, false).status === 'warn'],
  ['15× ohne Stop, nur noch 1 % = Verstoß', () => liqCheck({ side: 'long', liq: 99, leverage: 15 }, 100, null, 1, R, false).status === 'bad'],
  ['Anfangsabstand 20× ≈ 4,5 %', () => near(approxLiqDistPct(20), 4.5)],
  ['Max. Hebel: 5 % Stop + 1 % Puffer = 15×', () => maxLeverageForStop(5, 1, 20) === 15],
  ['Max. Hebel: enger Stop wird bei Regel-Max. gedeckelt', () => maxLeverageForStop(1, 1, 20) === 20],
  ['Max. Hebel: weiter Stop 40 % = 2×', () => maxLeverageForStop(40, 1, 20) === 2],
];
