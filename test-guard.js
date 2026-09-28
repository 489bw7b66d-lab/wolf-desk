import { stopNoise, suggestImpact, lossStreak, cooldown, cooledRisk, leftText } from './core-guard.js';
import { cooldownText } from './core-alerts.js';

const CFG = { stopNoiseAtr: 1.0, stopTightAtr: 1.5, suggestAtr: 1.5, lossStreak: 2, cooldownHours: 4 };
const H = 36e5;
const T = (closedAt, realized, coin = 'SOL') => ({ coin, closedAt, realized, partial: false });
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

export const tests = [
  ['Stop-Check: 0,5 ATR = im Rauschen (rot)', () => stopNoise(100, 99, 2, CFG).status === 'bad'],
  ['Stop-Check: 1,2 ATR = knapp (gelb)', () => stopNoise(100, 97.6, 2, CFG).status === 'warn'],
  ['Stop-Check: 2 ATR = genug Luft', () => { const n = stopNoise(100, 96, 2, CFG); return n.status === 'ok' && n.suggest === null; }],
  ['Stop-Check: Vorschlag Long = Einstieg − 1,5 ATR', () => near(stopNoise(100, 99, 2, CFG).suggest.stop, 97)],
  ['Stop-Check: Vorschlag Short = Einstieg + 1,5 ATR', () => near(stopNoise(100, 101, 2, CFG).suggest.stop, 103)],
  ['Stop-Check: ohne ATR = keine Aussage', () => stopNoise(100, 99, null, CFG) === null],
  ['Stop-Check: weiterer Stop bei gleichem Risiko = kleinere Position', () => { const i = suggestImpact(1000, 2, 100, 99, 97); return near(i.factor, 1 / 3); }],
  ['Abkühlphase: 2 Verluste in Folge = aktiv für 4 Std.', () => { const c = cooldown([T(10 * H, -5), T(9 * H, -3)], 11 * H, CFG); return c.active && c.until === 14 * H && c.streak === 2; }],
  ['Abkühlphase: nach 4 Std. vorbei', () => !cooldown([T(10 * H, -5), T(9 * H, -3)], 14.1 * H, CFG).active],
  ['Abkühlphase: Gewinn dazwischen unterbricht die Serie', () => lossStreak([T(10 * H, -5), T(9 * H, 8), T(8 * H, -3)]).streak === 1],
  ['Abkühlphase: nur 1 Verlust = keine Abkühlphase', () => !cooldown([T(10 * H, -5), T(9 * H, 4)], 10.5 * H, CFG).active],
  ['Abkühlphase: noch offene Trades zählen nicht', () => lossStreak([{ coin: 'X', closedAt: null, realized: -9 }, T(5, -1), T(4, -1)]).streak === 2],
  ['Abkühlphase: Risiko-Vorschlag halbiert (2 % → 1 %)', () => cooledRisk(2, true) === 1 && cooledRisk(2, false) === 2 && cooledRisk(3, true) === 1.5],
  ['Abkühlphase: Restzeit lesbar', () => leftText(10 * H, 10 * H - 90 * 60e3) === '1 Std. 30 Min.' && leftText(10, 10 - 5 * 60e3) === '5 Min.'],
  ['Abkühlphase: Telegram-Text ohne Dollarbeträge', () => { const t = cooldownText({ until: 14 * H, streak: 2, coins: ['SOL', 'xyz:GOLD'] }, 4); return t.includes('🧊') && t.includes('GOLD') && !t.includes('xyz') && !t.includes('$'); }],
];
