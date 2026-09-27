import { ratesFrom, parseFunding, costSummary, fundingForTrade, estimateFees, DEFAULT_RATES } from './core-fees.js';

const near = (a, b, e = 1e-9) => a != null && Math.abs(a - b) < e;
const FILL = (time, fee, pnl = 0) => ({ time, fee: String(fee), closedPnl: String(pnl) });
const FUND = (time, coin, usdc) => ({ time, hash: '0x0', delta: { type: 'funding', coin, usdc: String(usdc), szi: '1', fundingRate: '0.0001' } });

export const tests = [
  ['Kosten: dein Satz wird übernommen', () => { const r = ratesFrom({ userCrossRate: '0.00035', userAddRate: '0.0001' }); return r.taker === 0.00035 && r.maker === 0.0001 && r.known; }],
  ['Kosten: ohne Abfrage Standardsatz', () => { const r = ratesFrom(null); return r.taker === DEFAULT_RATES.taker && !r.known; }],
  ['Kosten: Funding wird gelesen', () => { const f = parseFunding([FUND(5, 'ETH', -2.5)]); return f.length === 1 && f[0].coin === 'ETH' && f[0].usdc === -2.5; }],
  ['Kosten: Summe im Zeitraum', () => {
    const s = costSummary([FILL(1, 1, 0), FILL(2, 2, 100), FILL(50, 5, 0)], parseFunding([FUND(3, 'ETH', -7), FUND(60, 'ETH', -1)]), 0, 10);
    return near(s.fees, 3) && near(s.funding, -7) && near(s.gross, 100) && near(s.cost, 10) && near(s.share, 10) && near(s.net, 90);
  }],
  ['Kosten: erhaltenes Funding senkt die Kosten nicht', () => near(costSummary([FILL(1, 2, 50)], parseFunding([FUND(2, 'X', 3)]), 0, 10).cost, 2)],
  ['Kosten: ohne Gewinn kein Anteil', () => costSummary([FILL(1, 2, -50)], [], 0, 10).share === null],
  ['Kosten: Funding nur für diesen Trade', () => {
    const fu = parseFunding([FUND(5, 'SOL', -1), FUND(15, 'SOL', -2), FUND(6, 'ETH', -9)]);
    return near(fundingForTrade({ coin: 'SOL', openedAt: 4, closedAt: 10 }, fu), -1) && near(fundingForTrade({ coin: 'SOL', openedAt: 4, closedAt: null }, fu, 20), -3);
  }],
  ['Kosten: Schätzung 10.000 $ Position, 0,045 % = 9 $ hin und zurück', () => near(estimateFees(10000, { taker: 0.00045, maker: 0.00015 }).taker, 9)],
  ['Kosten: ungültige Position = keine Schätzung', () => estimateFees(0) === null],
];
