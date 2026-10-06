// Einmaliger Hinweis nach einem Update, das Werte verändert (8e). Verschwindet nach „Verstanden“ und kommt nicht wieder.
import { CONFIG, RECOMMENDED } from './config.js';

const KEY = 'wolfdesk.notice.8e';
const num = (v) => String(v).replace('.', ',');
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };

// Text aus den Werten, die jetzt tatsächlich gelten. Eigene Abweichungen werden als solche genannt.
export function noticeLines(cfg = CONFIG, rec = RECOMMENDED) {
  const r = cfg.rules, q = rec.rules;
  const own = (same, text) => text + (same ? '' : ' (dein eigener Wert, die Empfehlung ist anders)');
  return [
    own(r.riskSteps.join('/') === q.riskSteps.join('/'), `Risiko-Stufen ${r.riskSteps.map(num).join(' / ')} % (bis 8d: 2 / 3 / 5 %)`),
    own(r.riskPerTradeMaxPct === q.riskPerTradeMaxPct, `Risiko pro Trade gelb ab ${num(r.riskPerTradeWarnPct)} %, rot ab ${num(r.riskPerTradeMaxPct)} % (bis 8d: 3 und 5 %)`),
    own(r.dailyLossLimitPct === q.dailyLossLimitPct, `Tagesverlust: Schluss ab ${num(r.dailyLossLimitPct)} % (bis 8d: 15 %)`),
    own(r.marginBudgetPct === q.marginBudgetPct, `Margin je Trade höchstens ${num(r.marginBudgetPct)} % vom Freien (bis 8d: 50 %)`),
    `Neu: „Greifen alle Stops“ gelb ab ${num(r.totalRiskWarnPct)} %, rot ab ${num(r.totalRiskMaxPct)} % vom Konto`,
  ];
}

export function initNotice() {
  const el = document.getElementById('update-note');
  if (!el || seen()) return;
  el.hidden = false;
  el.innerHTML = `<b>Neu seit 8e: kleinere Risiko-Werte</b>
    <ul>${noticeLines().map((l) => `<li>${l}</li>`).join('')}</ul>
    <span>Die Werte gelten ab sofort, auch für den Wächter. Positionen, die du mit mehr Risiko eröffnet hast, können dadurch gelb oder rot erscheinen und einmal per Telegram gemeldet werden. Ändern kannst du alles unter ⚙️ → Risiko.</span>
    <button type="button" id="update-note-ok">Verstanden</button>`;
  el.querySelector('#update-note-ok').addEventListener('click', () => { try { localStorage.setItem(KEY, '1'); } catch { /* ohne Speicher bleibt der Hinweis */ } el.hidden = true; });
}
