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
  ['Export: handelbare Märkte nur, wenn eingetragen', () => !('tradeable' in listsForExport(['BTC'], [], { watchlist: ['BTC'] })) && listsForExport(['BTC'], ['SOL'], { watchlist: ['BTC'] }).tradeable.join() === 'SOL'],
];
