// Lädt den Kontozustand von allen konfigurierten Börsen-Bereichen
// und bringt ihn in ein einheitliches Format.
import { hl } from './core-api.js';
import { num, markFromPosition } from './core-calc.js';

function normalizePosition(ap, dex) {
  const p = ap.position || {};
  const size = num(p.szi);
  const value = num(p.positionValue);
  return {
    coin: p.coin,
    dex,
    side: size > 0 ? 'long' : 'short',
    size,
    entry: num(p.entryPx),
    markSnapshot: markFromPosition(value, size),
    value,
    upnl: num(p.unrealizedPnl),
    roe: num(p.returnOnEquity),
    liq: num(p.liquidationPx),
    leverage: num(p.leverage?.value),
    leverageType: p.leverage?.type === 'isolated' ? 'isoliert' : 'cross',
    marginUsed: num(p.marginUsed),
  };
}

export async function loadAccount(user, dexes) {
  const results = await Promise.allSettled([
    ...dexes.map((d) => hl.account(user, d)),
    hl.spot(user),
  ]);

  const errors = [];
  let accountValue = 0, marginUsed = 0, withdrawable = 0, notional = 0;
  const positions = [];

  dexes.forEach((dex, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled') { errors.push(`${dex || 'Haupt'}: ${r.reason.message}`); return; }
    const s = r.value || {};
    const ms = s.marginSummary || {};
    accountValue += num(ms.accountValue) || 0;
    marginUsed += num(ms.totalMarginUsed) || 0;
    notional += num(ms.totalNtlPos) || 0;
    withdrawable += num(s.withdrawable) || 0;
    (s.assetPositions || []).forEach((ap) => {
      const pos = normalizePosition(ap, dex);
      if (pos.size) positions.push(pos);
    });
  });

  let spotUsdc = null;
  const spotRes = results[dexes.length];
  if (spotRes.status === 'fulfilled') {
    const usdc = (spotRes.value?.balances || []).find((b) => b.coin === 'USDC');
    spotUsdc = usdc ? num(usdc.total) : 0;
  } else {
    errors.push(`Spot: ${spotRes.reason.message}`);
  }

  if (errors.length === dexes.length + 1) throw new Error(errors.join(' | '));

  return { accountValue, marginUsed, withdrawable, notional, spotUsdc, positions, partialErrors: errors };
}
