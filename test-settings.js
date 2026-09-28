import { CONFIG, RECOMMENDED, applySettings, getPath } from './config.js';
import { FIELDS, currentValues, validate, diffFromRecommended, localSnapshot, settingsFile, toShown, fromShown, isChanged } from './core-settings.js';

const base = () => currentValues(RECOMMENDED);

export const tests = [
  ['Einstellungen: Empfehlung ist gültig', () => validate(base()).length === 0],
  ['Einstellungen: jedes Feld existiert in config.js', () => FIELDS.every((f) => getPath(RECOMMENDED, f.path) !== undefined)],
  ['Einstellungen: Empfehlung liegt in den erlaubten Grenzen', () => FIELDS.filter((f) => f.type === 'num').every((f) => { const x = toShown(f, getPath(RECOMMENDED, f.path)); return x >= f.min && x <= f.max; })],
  ['Einstellungen: Ausstiegsplan muss 100 % ergeben', () => { const v = base(); v['exitPlan.0.pct'] = 30; return validate(v).some((e) => e.text.includes('100 %')); }],
  ['Einstellungen: EMA-Längen müssen aufsteigen', () => { const v = base(); v['indicators.emaFast'] = 30; return validate(v).some((e) => e.path === 'indicators.emaFast'); }],
  ['Einstellungen: Wert außerhalb der Grenzen wird erkannt', () => { const v = base(); v['rules.maxLeverage'] = 80; return validate(v).some((e) => e.path === 'rules.maxLeverage'); }],
  ['Einstellungen: gelb muss unter rot liegen', () => { const v = base(); v['rules.riskPerTradeWarnPct'] = 20; return validate(v).some((e) => e.path === 'rules.riskPerTradeWarnPct'); }],
  ['Einstellungen: ohne Stil für Telegram = Fehler', () => { const v = base(); v['alerts.styles'] = []; return validate(v).length > 0; }],
  ['Einstellungen: nur Abweichungen landen im Export', () => { const v = base(); v['rules.maxLeverage'] = 15; const d = diffFromRecommended(v); return Object.keys(d).length === 1 && d['rules.maxLeverage'] === 15; }],
  ['Einstellungen: Zurücksetzen eines Datei-Werts wird gemerkt', () => { const s = localSnapshot(base(), { 'rules.maxLeverage': 12 }); return s['rules.maxLeverage'] === RECOMMENDED.rules.maxLeverage; }],
  ['Einstellungen: Anzeige in Mio. $ und zurück', () => { const f = FIELDS.find((x) => x.path === 'alerts.minVolumeUsd'); return toShown(f, 20e6) === 20 && fromShown(f, 20) === 20e6; }],
  ['Einstellungen: Anzeige 0,5 als 50 %', () => { const f = FIELDS.find((x) => x.path === 'rules.liqNoStopMinShare'); return toShown(f, 0.5) === 50; }],
  ['Einstellungen: Datei ist gültiges JavaScript mit den Werten', () => { const t = settingsFile({ 'rules.maxLeverage': 15 }); return t.includes('export const MY_SETTINGS') && JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))['rules.maxLeverage'] === 15; }],
  ['Einstellungen: unbekannte Pfade werden ignoriert', () => { const o = JSON.parse(JSON.stringify(RECOMMENDED)); applySettings(o, { 'gibts.nicht': 5, 'rules.maxLeverage': 7 }); return o.rules.maxLeverage === 7 && o.gibts === undefined; }],
  ['Einstellungen: Bias-Gewichte müssen 100 % ergeben', () => { const v = base(); v['market.biasWeights.btc'] = 60; return validate(v).some((e) => e.text.includes('Markt-Bias')); }],
  ['Einstellungen: Risiko-Stufen 2 / 3 / 5 % empfohlen', () => RECOMMENDED.rules.riskSteps.join() === '2,3,5'],
  ['Einstellungen: Risiko-Stufen müssen aufsteigen', () => { const v = base(); v['rules.riskSteps.1'] = 1; return validate(v).some((e) => e.text.includes('Risiko-Stufen')); }],
  ['Einstellungen: Positions-Begrenzer ist entfernt', () => RECOMMENDED.rules.maxOpenPositions === undefined && !FIELDS.some((f) => f.path.includes('maxOpenPositions'))],
  ['Einstellungen: gleiche Werte = nicht geändert', () => !isChanged('alerts.styles', [...RECOMMENDED.alerts.styles])],
];
