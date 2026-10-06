// Tests für 8e „Geld schützen“: Risiko-Budget, Ampel fürs Gesamt-Risiko, neue empfohlene Werte, Hinweis nach dem Update
import { totalRiskLevel, riskBudget, budgetCheck, budgetText } from './core-riskbudget.js';
import { totalRisk } from './core-totalrisk.js';
import { checkAccount } from './core-risk.js';
import { RECOMMENDED } from './config.js';
import { FIELDS, validate, currentValues } from './core-settings.js';
import { noticeLines } from './ui-notice.js';

const near = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;
const T = (pctNow, extra = {}) => ({ pctNow, noStop: 0, unknown: 0, ...extra });
// Long 10 Stück, Einstieg und Kurs 100, Stop 95: Verlust bis zum Stop 50 $
const pos = (stop = 95) => ({ coin: 'SOL', side: 'long', size: 10, entry: 100, mark: 100, stop, liq: 60, marginUsed: 200 });
const R = { ...RECOMMENDED.rules };
const gesamt = (openRiskTotal, rules = R) => checkAccount({ equity: 1000, positionsCount: 1, realizedToday: 0, openRiskTotal, available: 500 }, rules).find((c) => c.rule === 'Gesamtrisiko bis Stops');

export const tests = [
  ['Empfehlung 8e: Risiko-Stufen 0,5 / 1 / 2 %, gelb ab 1 %, rot ab 2 %', () => R.riskSteps.join('/') === '0.5/1/2' && R.riskPerTradeWarnPct === 1 && R.riskPerTradeMaxPct === 2],
  ['Empfehlung 8e: Tagesverlust 5 %, Margin je Trade 25 %, Gesamt-Risiko 4 % / 6 %', () => R.dailyLossLimitPct === 5 && R.marginBudgetPct === 25 && R.totalRiskWarnPct === 4 && R.totalRiskMaxPct === 6],
  ['Einstellungen: neue Felder für das Gesamt-Risiko vorhanden, Empfehlung ist gültig', () => {
    const f = (p) => FIELDS.find((x) => x.path === p);
    const v = currentValues(RECOMMENDED);
    return !!f('rules.totalRiskWarnPct') && !!f('rules.totalRiskMaxPct') && validate(v).length === 0;
  }],
  ['Einstellungen: „gelb ab“ über „rot ab“ beim Gesamt-Risiko wird abgelehnt', () => { const v = { ...currentValues(RECOMMENDED), 'rules.totalRiskWarnPct': 7, 'rules.totalRiskMaxPct': 6 }; return validate(v).some((e) => e.path === 'rules.totalRiskWarnPct'); }],
  ['Gesamt-Risiko-Ampel: grün unter 4 %, gelb ab 4 %, rot ab 6 %', () => totalRiskLevel(T(-3.9)) === 'ok' && totalRiskLevel(T(-4)) === 'warn' && totalRiskLevel(T(-5.9)) === 'warn' && totalRiskLevel(T(-6)) === 'bad'],
  ['Gesamt-Risiko-Ampel: eigene Grenzen, keine Positionen = grün', () => totalRiskLevel(T(-3), 2, 3) === 'bad' && totalRiskLevel(null) === 'ok' && totalRiskLevel(T(null)) === 'ok'],
  ['Budget: gebunden und frei aus der Zeile „Greifen alle Stops“', () => { const b = riskBudget(T(-3.5), 6); return near(b.usedPct, 3.5) && near(b.leftPct, 2.5) && b.limitPct === 6 && b.known; }],
  ['Budget: ohne Positionen ist alles frei, über dem Limit bleibt nichts', () => near(riskBudget(null, 6).leftPct, 6) && riskBudget(T(-9), 6).leftPct === 0],
  ['Budget: Stops im Gewinn binden kein Risiko', () => riskBudget(T(0.8), 6).usedPct === 0],
  ['Budget: rechnet mit echten Positionen (50 $ bis zum Stop bei 1.000 $ Konto = 5 %)', () => { const b = riskBudget(totalRisk([pos()], 1000), 6); return near(b.usedPct, 5, 1e-6) && near(b.leftPct, 1, 1e-6); }],
  ['Budget: Position ohne Stop zählt bis zur Liquidation und wird genannt', () => { const b = riskBudget(totalRisk([pos(null)], 1000), 6); return b.noStop === 1 && b.usedPct > 6 && budgetText(b, 0.5).text.includes('ohne Stop'); }],
  ['Budget-Prüfung: Trade passt', () => { const c = budgetCheck(riskBudget(T(-3.5), 6), 1); return c.state === 'ok' && c.fitPct === 1; }],
  ['Budget-Prüfung: Trade passt genau auf die Grenze', () => budgetCheck(riskBudget(T(-4), 6), 2).state === 'ok'],
  ['Budget-Prüfung: zu groß, Vorschlag abgerundet auf Viertelprozent', () => { const c = budgetCheck(riskBudget(T(-5.1), 6), 2); return c.state === 'warn' && c.fitPct === 0.75; }],
  ['Budget-Prüfung: Budget voll oder Rest unter 0,25 % = rot', () => budgetCheck(riskBudget(T(-6.5), 6), 0.5).state === 'bad' && budgetCheck(riskBudget(T(-5.9), 6), 0.5).state === 'bad'],
  ['Budget-Text: nennt Budget, Rest und nie Nachschießen oder zweite Position', () => {
    const all = [budgetText(riskBudget(T(-1), 6), 0.5), budgetText(riskBudget(T(-5.1), 6), 2), budgetText(riskBudget(T(-7), 6), 1)];
    return all[0].state === 'ok' && all[0].text.includes('bleiben 5 %') && all[1].text.includes('höchstens 0,75 %') && all[2].state === 'bad' && all.every((x) => !/nachschie|zweite Position/i.test(x.text));
  }],
  ['Konto-Regel Gesamtrisiko: grün, gelb ab 4 %, rot ab 6 %', () => gesamt(30).status === 'ok' && gesamt(40).status === 'warn' && gesamt(60).status === 'bad'],
  ['Konto-Regel Gesamtrisiko: fehlender Stop bleibt gelb, Stops im Gewinn sind grün', () => gesamt(null).status === 'warn' && gesamt(-20).status === 'ok'],
  ['Konto-Regel Gesamtrisiko: ohne die neuen Grenzen wie bis 8d (nie rot)', () => { const old = { ...R }; delete old.totalRiskWarnPct; delete old.totalRiskMaxPct; return gesamt(500, old).status === 'ok'; }],
  ['Konto-Regel Tagesverlust: rot ab 5 % mit der neuen Empfehlung', () => checkAccount({ equity: 1000, positionsCount: 0, realizedToday: -50, openRiskTotal: 0, available: 500 }, R)[0].status === 'bad' && checkAccount({ equity: 1000, positionsCount: 0, realizedToday: -20, openRiskTotal: 0, available: 500 }, R)[0].status === 'ok'],
  ['Hinweis nach dem Update: nennt die geltenden Werte', () => { const l = noticeLines(RECOMMENDED, RECOMMENDED).join(' | '); return l.includes('0,5 / 1 / 2 %') && l.includes('Schluss ab 5 %') && l.includes('höchstens 25 %') && l.includes('rot ab 6 %') && !l.includes('eigener Wert'); }],
  ['Hinweis nach dem Update: eigene Abweichung wird als eigener Wert genannt', () => { const mine = JSON.parse(JSON.stringify(RECOMMENDED)); mine.rules.dailyLossLimitPct = 10; const l = noticeLines(mine, RECOMMENDED); return l[2].includes('10 %') && l[2].includes('eigener Wert') && !l[0].includes('eigener Wert'); }],
];
