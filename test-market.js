import { fngLabel, biasFrom } from './core-market.js';

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
];
