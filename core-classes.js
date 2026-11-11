// Assetklassen (8y, Jensen 04.11.2026): Seit Ledger auch Rohstoffe, Aktien und Indizes über Hyperliquid anbietet (trade.xyz),
// landen diese Märkte in der Liste. Hyperliquid liefert keine Kategorie, deshalb diese kleine Liste von Hand.
//  - Hauptbörse (Namen ohne Präfix): Krypto. Ausnahme: PAXG und XAUT sind Gold-Token und zählen als Rohstoff.
//  - Märkte mit Börsen-Präfix (xyz:GOLD …): nach dem Namen. 8y1: Unbekannte Namen zählen als Aktie (bei xyz sind fast alle neuen
//    Listings Aktien oder Pre-IPO); Rohstoffe und Devisen stehen ausdrücklich in der Liste. Die geschätzten zeigt die App unter ⚙️.
// Alt-Index, Breite und Kompass rechnen nur mit Krypto. Rohstoffe und Aktien & Indizes bekommen eigene Linien.
export const CLASS = { krypto: 'Krypto', rohstoff: 'Rohstoff', aktie: 'Aktie & Index', fx: 'Devisen', sonst: 'Sonstige' };

const GOLD_TOKENS = new Set(['PAXG', 'XAUT']);
const COMMODITIES = new Set(['GOLD', 'SILVER', 'CL', 'WTI', 'BRENT', 'BRENTOIL', 'OIL', 'NATGAS', 'GAS', 'COPPER', 'PLATINUM', 'PALLADIUM',
  'URANIUM', 'ALUMINIUM', 'ALUMINUM', 'NICKEL', 'ZINC', 'LEAD', 'TIN', 'IRON', 'LITHIUM', 'WHEAT', 'CORN', 'SOY', 'SOYBEAN', 'SOYBEANS',
  'COCOA', 'COFFEE', 'SUGAR', 'COTTON', 'LUMBER', 'CATTLE', 'XAU', 'XAG', 'XPT', 'XPD', 'HG', 'HO', 'RBOB', 'GASOLINE']);
const INDICES = new Set(['SP500', 'SPX500', 'US500', 'XYZ100', 'NDX', 'NAS100', 'NASDAQ', 'US100', 'US30', 'DJI', 'DOW', 'DJIA', 'RUSSELL', 'RUT',
  'US2000', 'JP225', 'NIKKEI', 'KR200', 'KOSPI', 'DAX', 'DE40', 'GER40', 'FTSE', 'UK100', 'HSI', 'HK50', 'CN50', 'EU50', 'STOXX50', 'CAC40',
  'FR40', 'IBEX', 'ASX200', 'AUS200', 'NIFTY', 'INDIA50', 'VIX', 'SMH', 'SOX', 'EWJ', 'EWY', 'EWZ', 'QQQ', 'SPY', 'IWM', 'DIA', 'TLT', 'GLD', 'SLV', 'USO', 'URA']);
const FX = new Set(['EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD', 'CNH', 'CNY', 'MXN', 'KRW', 'INR', 'BRL', 'TRY', 'ZAR', 'SEK', 'NOK',
  'EURUSD', 'USDJPY', 'GBPUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'DXY', 'USDKRW', 'USDCNH']);
// Aktien, auch vorbörsliche (Pre-IPO). Groß/klein egal.
const STOCKS = new Set(['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'ORCL', 'PLTR', 'COIN', 'HOOD',
  'MSTR', 'CRCL', 'BABA', 'MU', 'SNDK', 'AVGO', 'TSM', 'TSMC', 'SMCI', 'ARM', 'UBER', 'SHOP', 'PYPL', 'SQ', 'XYZ', 'RIVN', 'LCID', 'NIO', 'GME',
  'AMC', 'DIS', 'BA', 'JPM', 'GS', 'V', 'MA', 'WMT', 'COST', 'KO', 'PEP', 'NKE', 'LLY', 'NVO', 'UNH', 'XOM', 'CVX', 'IBM', 'CRM', 'ADBE',
  'CSCO', 'QCOM', 'TXN', 'SBUX', 'MCD', 'F', 'GM', 'SPOT', 'RBLX', 'SNOW', 'ABNB', 'ZM', 'CRWV', 'CRWD', 'NET', 'PANW', 'ASML', 'SAP',
  'SOFI', 'RKLB', 'IONQ', 'OKLO', 'SMR', 'BMNR', 'SBET', 'GLXY', 'FIG', 'KLAR', 'CRM', 'DELL', 'HPE', 'ANET', 'MRVL', 'LRCX', 'AMAT',
  'KLAC', 'WDC', 'STX', 'BIDU', 'JD', 'PDD', 'TCEHY', 'SONY', 'TM', 'SAMSUNG', 'HYUNDAI', 'SKHX', 'SKHYNIX', 'BRKB', 'BRK', 'BAC', 'C',
  'WFC', 'MS', 'SCHW', 'BLK', 'HIMS', 'APP', 'AFRM', 'UPST', 'CVNA', 'DKNG', 'RDDT', 'DUOL', 'TTD', 'ROKU', 'U', 'PINS', 'SNAP', 'LYFT',
  'NBIS', 'CORZ', 'IREN', 'CLSK', 'MARA', 'RIOT', 'HUT', 'CIFR', 'WULF', 'BTDR', 'ACHR', 'JOBY', 'ASTS', 'LUNR', 'SOUN', 'BBAI', 'QBTS',
  'RGTI', 'QUBT', 'OPENAI', 'SPACEX', 'ANTHROPIC', 'XAI', 'STRIPE', 'DATABRICKS', 'KRAKEN', 'CIRCLE', 'GEMI', 'BLSH', 'BULL', 'ETOR',
  // 8y1: aus Jensens Liste vom 04.11. (xyz, 120 Märkte)
  'SMSN', 'USAR', 'URNM', 'SOFTBANK', 'KIOXIA', 'LITE', 'XLE', 'BX', 'BIRD', 'DRAM', 'CBRS', 'EBAY', 'EWT', 'SPCX', 'MINIMAX', 'BB', 'NOW',
  'BE', 'ZHIPU', 'STRC', 'BOT', 'GIGADEV', 'SKHY', 'KSTR', 'CXMT', 'GEV', 'KORU', 'UNITREE', 'SOXL', 'MAGS', 'AAOI', 'MRNA', 'XBI', 'SHEIN',
  'SNXX', 'OURA', 'UMC', 'CAMBRICON', 'TWST', 'GLW', 'RELIANCE', 'JIO', 'ANT', 'ICE']);

export const baseName = (coin) => String(coin || '').replace(/^[a-z0-9]+:/i, '').toUpperCase();
export const isPrefixed = (coin) => /^[a-z0-9]+:/i.test(String(coin || ''));

// Klasse eines Marktes: 'krypto' | 'rohstoff' | 'aktie' | 'fx' | 'sonst'
export function classOf(coin) {
  const b = baseName(coin);
  if (!isPrefixed(coin)) return GOLD_TOKENS.has(b) ? 'rohstoff' : 'krypto';
  if (COMMODITIES.has(b)) return 'rohstoff';
  if (INDICES.has(b) || STOCKS.has(b)) return 'aktie';
  if (FX.has(b)) return 'fx';
  return 'aktie'; // 8y1: geschätzt, siehe guessed()
}
// Märkte mit Präfix, die nach Namen keiner Liste bekannt sind (als Aktie geschätzt)
export const guessed = (names) => (names || []).filter((c) => { const b = baseName(c); return isPrefixed(c) && !COMMODITIES.has(b) && !INDICES.has(b) && !STOCKS.has(b) && !FX.has(b); });
export const isCrypto = (coin) => classOf(coin) === 'krypto';
export const unclassified = guessed;

// Vermerk für Finder und Wächter: Nicht-Krypto ist nicht gemessen; Funde vom Wochenende stammen aus dünnem Handel
// (xyz handelt rund um die Uhr, die echte Börse ist zu, am Montag kann der Kurs springen).
export function classNote(coin, t = null) {
  const k = classOf(coin);
  if (k === 'krypto') return '';
  const label = k === 'rohstoff' ? 'Rohstoff' : k === 'aktie' ? 'Aktie / Index' : k === 'fx' ? 'Devisen' : 'kein Krypto';
  const day = t == null ? null : new Date(t).getUTCDay();
  const weekend = isPrefixed(coin) && (day === 0 || day === 6);
  return `${label} · nicht gemessen${weekend ? ' · Wochenende, dünner Handel' : ''}`;
}
