import { LEDGER_MARKETS } from './ledger-markets.js';
import { migrateTradeable, resolveTradeable, isAuto, skipsOf, AUTO } from './core-tradeable.js';
import { classOf, classNote, unclassified } from './core-classes.js';
import { matchMarkets, knownTradeable, byName } from './core-tradeable.js';
import { ownUniverse } from './core-universe.js';
import { listsForExport } from './core-settings.js';

const NAMES = ['BTC', 'ETH', 'SOL', 'kPEPE', 'SOLV', 'xyz:GOLD', 'xyz:SILVER', 'xyz:TSLA', 'GOAT', 'AAVE'];

export const tests = [
  ['Marktsuche: exakter Treffer zuerst', () => matchMarkets('sol', NAMES).join() === 'SOL,SOLV'],
  ['Marktsuche: xyz-Märkte ohne Präfix finden', () => matchMarkets('gold', NAMES)[0] === 'xyz:GOLD' && matchMarkets('GO', NAMES).join() === 'GOAT,xyz:GOLD'],
  ['Marktsuche: kPEPE über „pepe“', () => matchMarkets('pepe', NAMES)[0] === 'kPEPE'],
  ['Marktsuche: schon gewählte Märkte ausblenden, leer = nichts', () => matchMarkets('sol', NAMES, ['SOL']).join() === 'SOLV' && matchMarkets('  ', NAMES).length === 0],
  ['Marktsuche: „im Namen“ nach „am Anfang“', () => matchMarkets('ve', NAMES).join() === 'AAVE,xyz:SILVER' && matchMarkets('so', NAMES).join() === 'SOL,SOLV'],
  ['Handelbare Märkte: vertippte fallen raus', () => knownTradeable(['SOL', 'XXX', 'xyz:GOLD'], NAMES).join() === 'SOL,xyz:GOLD'],
  ['Scan: eigene Liste ersetzt die Top-Coins (auch xyz, unbekannte raus)', () => {
    const u = ownUniverse(NAMES, ['SOL', 'xyz:GOLD', 'NOPE']);
    return u.own && u.coins.join() === 'SOL,xyz:GOLD' && /\(2\)/.test(u.source);
  }],
  ['Scan: leere Liste = wie bisher Top-Coins', () => ownUniverse(NAMES, []) === null && ownUniverse(NAMES, ['NOPE']) === null && ownUniverse(NAMES, undefined) === null],
  ['Export: Watchlist nur, wenn geändert', () => {
    const rec = { watchlist: ['BTC', 'ETH'] };
    return !('watchlist' in listsForExport(['BTC', 'ETH'], [], rec)) && listsForExport(['BTC', 'SOL'], [], rec).watchlist.join() === 'BTC,SOL';
  }],
  ['Export: handelbare Märkte nur, wenn sie von „automatisch“ abweichen (8y)', () => { const rec = { watchlist: ['BTC'], tradeable: ['*'] }; return !('tradeable' in listsForExport(['BTC'], ['*'], rec)) && listsForExport(['BTC'], ['SOL'], rec).tradeable.join() === 'SOL' && listsForExport(['BTC'], ['*', '-UNI'], rec).tradeable.join() === '*,-UNI' && listsForExport(['BTC'], [], rec).tradeable.length === 0; }],

  ['Ledger-Liste: 177 Märkte ohne Doppelte, Hyperliquid-Schreibweise', () => LEDGER_MARKETS.length === 177 && new Set(LEDGER_MARKETS).size === 177 && LEDGER_MARKETS.includes('kPEPE') && LEDGER_MARKETS.includes('0G') && !LEDGER_MARKETS.some((c) => /\s/.test(c))],
  ['8y Automatisch: alle Märkte von Hyperliquid, Ausnahmen fallen raus', () => resolveTradeable(['*', '-SOL', '-xyz:GOLD'], NAMES).join() === 'BTC,ETH,kPEPE,SOLV,xyz:SILVER,xyz:TSLA,GOAT,AAVE' && isAuto(['*']) && skipsOf(['*', '-A', 'B']).join() === 'A'],
  ['8y Alte Ledger-Liste wird zu „automatisch“, entfernte Märkte bleiben Ausnahme', () => { const m = migrateTradeable(LEDGER_MARKETS.filter((c) => c !== 'UNI' && c !== 'CASHCAT')); return m[0] === AUTO && skipsOf(m).sort().join() === 'CASHCAT,UNI' && migrateTradeable([...LEDGER_MARKETS].reverse()).join() === '*'; }],
  ['8y Eigene Listen bleiben eigene Listen', () => migrateTradeable(['SOL', 'ETH']).join() === 'SOL,ETH' && migrateTradeable([]).length === 0 && resolveTradeable(['SOL', 'NOPE'], NAMES).join() === 'SOL,NOPE' && !isAuto(['SOL'])],
  ['8y Scan automatisch: abgeschaltete Märkte fallen raus, Quelle sagt „Alle Hyperliquid-Märkte“', () => { const u = ownUniverse(NAMES, ['*', '-AAVE'], { GOAT: { delisted: true } }); return u.auto && u.coins.length === 8 && !u.coins.includes('GOAT') && !u.coins.includes('AAVE') && /Alle Hyperliquid-Märkte \(8\)/.test(u.source); }],
  ['8y Assetklassen: Krypto, PAXG Rohstoff, xyz nach Namen, Unbekanntes in Sonstige', () => classOf('SOL') === 'krypto' && classOf('SPX') === 'krypto' && classOf('PAXG') === 'rohstoff' && classOf('xyz:GOLD') === 'rohstoff' && classOf('xyz:CL') === 'rohstoff' && classOf('xyz:SP500') === 'aktie' && classOf('xyz:XYZ100') === 'aktie' && classOf('xyz:TSLA') === 'aktie' && classOf('xyz:EUR') === 'fx' && classOf('xyz:FOOBAR') === 'sonst' && unclassified(['SOL', 'xyz:FOOBAR', 'xyz:GOLD']).join() === 'xyz:FOOBAR'],
  ['8y Vermerk: Nicht-Krypto „nicht gemessen“, Wochenende bei xyz', () => { const sat = Date.UTC(2026, 9, 31), mon = Date.UTC(2026, 10, 2); return classNote('SOL', sat) === '' && classNote('xyz:GOLD', mon) === 'Rohstoff · nicht gemessen' && /Wochenende, dünner Handel/.test(classNote('xyz:TSLA', sat)) && !/Wochenende/.test(classNote('PAXG', sat)); }],
];
