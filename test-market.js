import { fngLabel, biasFrom, breadthFrom, ratioCandles, compositeBias } from './core-market.js';
const C = (n, f) => [...Array(n)].map((_, i) => ({ t: i, T: i + 1, o: f(i), h: f(i), l: f(i), c: f(i), v: 1 }));

export const tests = [
  ['Fear & Greed: 10 = Extreme Angst', () => fngLabel(10).text === 'Extreme Angst'],
  ['Fear & Greed: 50 = Neutral', () => fngLabel(50).text === 'Neutral'],
  ['Fear & Greed: 80 = Extreme Gier', () => fngLabel(80).text === 'Extreme Gier'],
  ['Fear & Greed: ungültig = null', () => fngLabel(null) === null],
  ['Bias: beide bullisch = Long-Markt', () => biasFrom({ long: 90, short: 20 }, { long: 85, short: 25 }).label === 'Long-Markt'],
  ['Bias: beide bärisch = Short-Markt', () => biasFrom({ long: 20, short: 90 }, { long: 15, short: 80 }).value <= -40],
  ['Bias: Tag zählt mehr als 4H', () => biasFrom({ long: 20, short: 80 }, { long: 80, short: 20 }).value > 0],
  ['Bias: ausgeglichen = Neutral', () => biasFrom({ long: 50, short: 50 }, { long: 55, short: 50 }).label === 'Neutral'],
  ['Bias: bleibt zwischen −100 und +100', () => Math.abs(biasFrom({ long: 100, short: 0 }, { long: 100, short: 0 }).value) <= 100],
  ['Bias: ohne Daten = null', () => biasFrom(null, null) === null],
  ['Breite: alle steigend = +100', () => breadthFrom([...Array(6)].map(() => C(80, (i) => 100 + i)), 50).value === 100],
  ['Breite: halb/halb = 0', () => breadthFrom([...Array(3)].map(() => C(80, (i) => 100 + i)).concat([...Array(3)].map(() => C(80, (i) => 200 - i))), 50).value === 0],
  ['Breite: zu wenig Märkte = null', () => breadthFrom([C(80, (i) => i)], 50) === null],
  ['ETH/BTC: ETH steigt stärker = Verhältnis steigt', () => { const r = ratioCandles(C(10, (i) => 100 + 5 * i), C(10, () => 100)); return r.length === 10 && r.at(-1).c > r[0].c; }],
  ['Gesamt-Bias: gewichteter Mittelwert', () => compositeBias({ btc: 60, eth: 20, breadth: -20, ratio: 0 }, { btc: 40, eth: 20, breadth: 25, ratio: 15 }).value === Math.round((60 * 40 + 20 * 20 - 20 * 25) / 100)],
  ['Gesamt-Bias: fehlende Breite wird herausgerechnet', () => compositeBias({ btc: 50, eth: 50, breadth: null, ratio: 50 }, { btc: 40, eth: 20, breadth: 25, ratio: 15 }).value === 50],
  ['Gesamt-Bias: BTC stark, Breite schwach = nur leicht bullisch', () => compositeBias({ btc: 80, eth: 0, breadth: -60, ratio: -40 }).label !== 'Long-Markt'],
  ['Gesamt-Bias: nichts verfügbar = null', () => compositeBias({ btc: null }) === null],
];
