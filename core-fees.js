// Kosten des Tradings: Handelsgebühren (aus den Fills), Funding (eigene Abfrage) und deine Gebührensätze.
// Reine Funktionen, Tests in test-fees.js.
import { hl } from './core-api.js';

export const DEFAULT_RATES = { taker: 0.00045, maker: 0.00015 }; // Basisstufe von Hyperliquid, falls die Abfrage fehlt

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Deine effektiven Sätze (nach Stufe, Rabatten, Staking). userCrossRate = Taker, userAddRate = Maker
export function ratesFrom(feeInfo) {
  const taker = Number(feeInfo?.userCrossRate), maker = Number(feeInfo?.userAddRate);
  return {
    taker: Number.isFinite(taker) && taker >= 0 ? taker : DEFAULT_RATES.taker,
    maker: Number.isFinite(maker) ? maker : DEFAULT_RATES.maker,
    known: Number.isFinite(taker),
  };
}

// Funding-Zahlungen vereinheitlichen: { time, coin, usdc } (usdc negativ = du hast gezahlt)
export function parseFunding(list) {
  return (Array.isArray(list) ? list : [])
    .filter((x) => x?.delta?.type === 'funding' || x?.delta?.usdc != null)
    .map((x) => ({ time: n(x.time), coin: x.delta.coin, usdc: n(x.delta.usdc) }));
}

// Kosten in einem Zeitraum: Gebühren (positiv = gezahlt), Funding (negativ = gezahlt), Bruttogewinn aus Verkäufen
export function costSummary(fills, funding, from, to = Infinity) {
  const inRange = (t) => t >= from && t < to;
  const f = (fills || []).filter((x) => inRange(n(x.time)));
  const fees = f.reduce((s, x) => s + n(x.fee), 0);
  const gross = f.reduce((s, x) => s + n(x.closedPnl), 0);
  const fund = (funding || []).filter((x) => inRange(x.time)).reduce((s, x) => s + x.usdc, 0);
  const cost = fees - Math.min(0, fund);                 // was dich wirklich Geld gekostet hat
  const net = gross - fees + fund;
  return { fees, funding: fund, gross, net, cost, share: gross > 0 ? (cost / gross) * 100 : null, trades: f.length };
}

// Funding, das während eines Trades anfiel (Markt gleich, Zeitraum Eröffnung bis Schluss)
export function fundingForTrade(trade, funding, now = Date.now()) {
  if (!trade) return 0;
  const end = trade.closedAt ?? now;
  return (funding || []).filter((x) => x.coin === trade.coin && x.time >= trade.openedAt && x.time <= end).reduce((s, x) => s + x.usdc, 0);
}

// Geschätzte Gebühren eines geplanten Trades: Ein- und Ausstieg (Taker, also Market- oder Stop-Order)
export function estimateFees(notional, rates = DEFAULT_RATES) {
  if (!(notional > 0)) return null;
  return { taker: notional * rates.taker * 2, maker: notional * rates.maker * 2 };
}

// Funding seit startTime laden (Hyperliquid liefert seitenweise, höchstens 500 Einträge je Abfrage)
export async function loadFunding(user, startTime) {
  const all = [];
  let from = startTime;
  for (let page = 0; page < 40; page++) {
    const part = await hl.funding(user, from);
    if (!Array.isArray(part) || !part.length) break;
    all.push(...part);
    if (part.length < 500) break;
    from = Math.max(...part.map((x) => n(x.time))) + 1;
  }
  return parseFunding(all);
}
