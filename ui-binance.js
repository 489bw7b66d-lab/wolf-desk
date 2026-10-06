// Backtest: „Lange Historie“ (8h). Holt Binance-Kerzen ab 2020 für den Testplan aufs Gerät.
// Ablauf: Verbindung testen → Märkte prüfen (legt den Stichtag fest) → Vorschau ansehen → Liste einfrieren und 4H-Kerzen laden.
// Hier wird nichts gerechnet und nichts gemeldet; die Regeln kommen im nächsten Paket. Logik und Tests: core-binance.js.
import { BN, periods, loadMeta, saveMeta, newMeta, phaseOf, scanLeft, h4Left, scanMarket, loadH4, selectMarkets, rejectReason, pingBinance, protocolText, metaBytes, delSeries } from './core-binance.js';
import { getTradeable } from './core-tradeable.js';
import { hl } from './core-api.js';
import { esc, dn, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const day = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const mb = (b) => (b / 1e6).toFixed(b < 1e7 ? 1 : 0).replace('.', ',') + ' MB';
let busy = false, stop = false, note = '', open = false, listOpen = false;

// Gegenprobe: Tagesschluss desselben Tages bei Hyperliquid
async function hlClose(coin, dayMs) {
  const rows = await hl.candles(coin, '1d', dayMs, dayMs + 864e5 - 1);
  const c = (rows || []).find((r) => Number(r.t) === dayMs);
  return c ? Number(c.c) : null;
}

// Mehrere Märkte nebeneinander abarbeiten (drei zugleich), nach jedem Markt speichern
async function pool(items, worker, width = 3) {
  let i = 0, firstErr = null;
  const run = async () => {
    while (i < items.length && !stop && !firstErr) {
      const item = items[i++];
      try { await worker(item); } catch (e) { firstErr = e; }
    }
  };
  await Promise.all([...Array(Math.min(width, items.length))].map(run));
  if (firstErr) throw firstErr;
}

async function doScan() {
  let m = loadMeta();
  if (!m) {
    const cand = getTradeable();
    if (!cand.length) { note = 'Keine handelbaren Märkte hinterlegt (⚙️ → Handelbare Märkte).'; return; }
    const today = day(Math.floor(Date.now() / 864e5) * 864e5);
    if (!confirm(`Märkte prüfen?\n\nDamit wird der Stichtag festgelegt: ${today}. Er gilt für den ganzen Testplan und wird nie mehr verschoben.`)) return;
    m = newMeta(Date.now(), cand);
    if (!saveMeta(m)) { note = 'Das Protokoll ließ sich nicht speichern.'; return; }
  }
  await work(async () => {
    const todo = scanLeft(m), total = m.candidates.length;
    await pool(todo, async (coin) => {
      m.scanned[coin] = await scanMarket(coin, m, { hlClose });
      saveMeta(m);
      note = `Prüfe Märkte: ${total - scanLeft(m).length} von ${total} …`; paint();
    });
    note = scanLeft(m).length ? 'Angehalten. „Weitermachen“ setzt an derselben Stelle fort.' : '';
  });
}

async function doFreeze() {
  const m = loadMeta();
  if (!m) return;
  if (!m.markets) {
    const list = selectMarkets(m.scanned, m.stichtag);
    if (!list.length) { note = 'Kein Markt erfüllt die Bedingungen.'; paint(); return; }
    if (!confirm(`Liste mit ${list.length} Märkten einfrieren?\n\nDanach wird sie für diesen Testplan nicht mehr geändert. Hast du die Vorschau angesehen?`)) return;
    m.markets = list; m.frozenAt = Date.now();
    saveMeta(m);
    // Tageskerzen der nicht gewählten Märkte wieder freigeben
    for (const c of Object.keys(m.scanned)) if (!list.includes(c) && m.scanned[c]?.n) delSeries('1d', c);
  }
  await work(async () => {
    const total = m.markets.length;
    await pool(h4Left(m), async (coin) => {
      m.h4[coin] = await loadH4(coin, m);
      saveMeta(m);
      note = `Lade 4H-Kerzen: ${total - h4Left(m).length} von ${total} …`; paint();
    });
    note = h4Left(m).length ? 'Angehalten. „Weitermachen“ setzt an derselben Stelle fort.' : '';
  });
}

async function work(fn) {
  if (busy) return;
  busy = true; stop = false; note = 'Läuft …'; paint();
  try { await fn(); } catch (e) { note = `Unterbrochen: ${e.message}. Schon Geladenes bleibt, „Weitermachen“ setzt fort.`; }
  busy = false; paint();
}

async function doPing() {
  note = 'Teste Verbindung …'; paint();
  try { const r = await pingBinance(); note = `✓ Binance ist aus der App erreichbar (erste Kerze ${day(r.first)}).`; }
  catch (e) { note = `✗ ${e.message}. Sag Buddy1 Bescheid, dann holt der Wächter die Kerzen.`; }
  paint();
}

async function doCopy(btn) {
  const text = protocolText(loadMeta());
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Kopiert ✓'; }
  catch { note = 'Kopieren hat nicht geklappt.'; paint(); }
}

function marketList(m) {
  const frozen = !!m.markets, list = m.markets || selectMarkets(m.scanned, m.stichtag);
  const rows = list.map((c, i) => {
    const s = m.scanned[c], h = m.h4[c];
    const gap = (s.gap || 0) + (h?.gap || 0);
    return `<li><b>${i + 1}. ${esc(dn(c))}</b> <span class="muted">${esc(s.symbol)}${s.mult > 1 ? ' × ' + s.mult : ''} · ab ${day(s.first)} · ${s.cross === 'ok' ? '✓ Gegenprobe' : 'ohne Gegenprobe'}${gap ? ` · ${gap} Lücken` : ''}${frozen ? (h ? ' · 4H ✓' : ' · 4H fehlt') : ''}</span></li>`;
  }).join('');
  const out = {};
  for (const c of m.candidates) { const r = m.scanned[c] && rejectReason(m.scanned[c], m.stichtag); if (r) out[r] = (out[r] || 0) + 1; }
  const rest = Object.entries(out).map(([r, n]) => `${n} × ${esc(r)}`).join(' · ');
  return `<details class="bt-saved-box" id="bn-list"${listOpen ? ' open' : ''}><summary>${frozen ? 'Eingefrorene Liste' : 'Vorschau der Liste'} (${list.length})</summary>
    <ol class="bn-list">${rows}</ol>${rest ? `<p class="set-hint">Ausgeschieden: ${rest}</p>` : ''}</details>`;
}

function body() {
  const m = loadMeta(), ph = phaseOf(m);
  const btn = (id, label, ghost = false) => `<button type="button" class="small-btn${ghost ? ' ghost' : ''}" id="${id}"${busy ? ' disabled' : ''}>${label}</button>`;
  const stopBtn = busy ? '<button type="button" class="small-btn ghost" id="bn-stop">Anhalten</button>' : '';
  let h = '';
  if (ph === 'neu') {
    h = `<p class="set-hint">Noch nichts geladen. Erst die Verbindung testen, dann die Märkte prüfen.</p>
      <div class="mk-actions">${btn('bn-ping', 'Verbindung testen', true)}${btn('bn-scan', 'Märkte prüfen')}</div>`;
  } else {
    const p = periods(m.stichtag);
    h = `<p class="set-hint">Stichtag <b>${day(m.stichtag)}</b> · Kerzen bis ${day(p.vault[0] - 1)} · Tresor ${day(p.vault[0])} bis ${day(p.vault[1] - 1)}: <b>${m.vaultOpened ? 'geöffnet' : 'nicht geladen'}</b></p>`;
    if (ph === 'pruefen') h += `<p class="set-hint">Geprüft: ${m.candidates.length - scanLeft(m).length} von ${m.candidates.length} Märkten.</p><div class="mk-actions">${busy ? stopBtn : btn('bn-scan', 'Weitermachen')}</div>`;
    if (ph === 'vorschau') h += `${marketList(m)}<p class="set-hint">Bitte die Vorschau ansehen (stimmt jeder Coin?) und kopieren. Danach einfrieren.</p>
      <div class="mk-actions">${btn('bn-copy', 'Vorschau kopieren', true)}${btn('bn-freeze', 'Einfrieren und 4H laden')}</div>`;
    if (ph === 'laden') h += `${marketList(m)}<p class="set-hint">4H-Kerzen: ${m.markets.length - h4Left(m).length} von ${m.markets.length} Märkten geladen.</p><div class="mk-actions">${busy ? stopBtn : btn('bn-freeze', 'Weitermachen')}</div>`;
    if (ph === 'fertig') h += `<p class="set-hint"><b class="long">✓ Vollständig:</b> ${m.markets.length} Märkte, Tages- und 4H-Kerzen, rund ${mb(metaBytes(m))}.</p>${marketList(m)}
      <div class="mk-actions">${btn('bn-copy', 'Protokoll kopieren', true)}</div>`;
  }
  return h + (note ? `<p class="set-hint" role="status">${esc(note)}</p>` : '');
}

function paint() {
  const el = $('bn-area');
  if (!el) return;
  const m = loadMeta(), ph = phaseOf(m);
  const badge = { neu: 'leer', pruefen: 'Prüfung läuft', vorschau: 'Vorschau', laden: 'lädt', fertig: '✓' }[ph];
  el.innerHTML = `<details class="bt-saved-box" id="bn-box"${open ? ' open' : ''}><summary>Lange Historie (Binance) · ${badge}</summary>
    <div>${tipInline(`Kerzen ab 2020 von Binance für den Testplan: höchstens ${BN.maxMarkets} Märkte, die es dort seit zwei Jahren gibt, gewählt nach Umsatz vor der Tresor-Grenze. Die letzten 12 Monate vor dem Stichtag (Tresor) werden nicht geladen. Öffentliche Marktdaten, kein Konto, kein Schlüssel.`, 'bn-intro')}</div>
    ${body()}</details>`;
}

export function initBinance() {
  const el = $('bn-area');
  if (!el) return;
  el.addEventListener('toggle', (e) => { if (e.target.id === 'bn-box') open = e.target.open; if (e.target.id === 'bn-list') listOpen = e.target.open; }, true);
  el.addEventListener('click', (e) => {
    const id = e.target.closest('button')?.id;
    if (id === 'bn-ping') doPing();
    if (id === 'bn-scan') doScan().then(paint);
    if (id === 'bn-freeze') doFreeze();
    if (id === 'bn-copy') doCopy(e.target.closest('button'));
    if (id === 'bn-stop') { stop = true; note = 'Hält nach dem laufenden Markt an …'; paint(); }
  });
  paint();
}
