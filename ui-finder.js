// Setup-Finder, Vorschau (8l, überarbeitet in 8l1): durchsucht deine handelbaren Märkte nach den fünf abgenommenen Bausteinen
// und zeigt die aktuellen, noch gültigen Funde mit Bild. Reine Anzeige: kein Telegram, kein Tagebuch, kein Wächter.
// Jede Zeile ist eine „Beobachtung“ und behauptet keinen Vorteil. Logik und Tests: core-finder.js, core-sellblock.js.
import { CONFIG } from './config.js';
import { hl } from './core-api.js';
import { getCandles, getMarketCtx } from './core-scanner.js';
import { closedCandles } from './core-signals.js';
import { scanUniverse } from './core-universe.js';
import { getTradeable } from './core-tradeable.js';
import { NEW_RULES } from './core-ltrules.js';
import { FINDER, BLOCK_NAME, FLAG_NAME, trendNow, liveMarket, coinEntry, sortEntries, countByBlock, agoText, vizWithRoom, tradeResult, atLeast, crowdNotes, sinceText, fibText, rsiText } from './core-finder.js';
import { roomsText } from './core-sellblock.js';
import { blindHtml } from './ui-blindchart.js';
import { esc, dn, tipInline } from './ui-parts.js';

const $ = (id) => document.getElementById(id);
const DAY = 864e5, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let onTrade = null;
let getState = () => ({}), busy = false, stop = false, note = '', list = null, scannedAt = 0, minB = FINDER.minBlocks, filter = '', openCoin = '', info = null, scanned = 0;

const markets = () => Object.values(getState().markets || {}).flat();

async function scan() {
  if (busy) return;
  busy = true; stop = false; list = null; openCoin = ''; info = null; scanned = 0; note = 'Lade Marktliste …'; paint();
  try {
    const ctx = await getMarketCtx(), names = markets();
    if (!names.length) throw new Error('Die Marktliste ist noch nicht geladen. Bitte gleich noch einmal versuchen.');
    const uni = await scanUniverse(names, ctx.ctx, getTradeable());
    const coins = uni.coins.filter((c) => !(ctx.map[c] < CONFIG.signals.minDayVolumeUsd));
    // Stufe 1: Tageskerzen aller Märkte (kommen aus dem Zwischenspeicher, wenn „Heiße Coins“ sie gerade geholt hat)
    const up = [];
    for (let k = 0; k < coins.length && !stop; k++) {
      note = `Tagestrend prüfen: ${k + 1} von ${coins.length} Märkten …`; status();
      try { const d = await getCandles(coins[k], '1d', true); if (trendNow(d)) up.push({ c: coins[k], d }); } catch { /* einzelner Markt fehlgeschlagen, weiter */ }
    }
    // Stufe 2: nur Märkte im Tagestrend aufwärts brauchen die langen 4H-Kerzen
    const found = [];
    for (let k = 0; k < up.length && !stop; k++) {
      note = `Bausteine suchen: ${k + 1} von ${up.length} Märkten im Aufwärtstrend …`; status();
      try {
        const now = Date.now();
        await sleep(CONFIG.signals.hot.requestGapMs);
        const h4 = closedCandles(await hl.candles(up[k].c, '4h', now - FINDER.h4Days * DAY, now), now);
        if (h4.length < 200) continue;
        const M = liveMarket(up[k].c, up[k].d, h4);
        let e = coinEntry(up[k].c, M, null, ctx.ctx?.[up[k].c]?.price);
        scanned++;
        if (!e) continue;
        // Nur für Märkte mit Fund: lange Tagesreihe für die Sell-Blöcke auf Tag und Woche
        if (e.n) { try { await sleep(CONFIG.signals.hot.requestGapMs); const long = closedCandles(await hl.candles(up[k].c, '1d', now - FINDER.dailyDays * DAY, now), now); if (long.length > up[k].d.length) e = coinEntry(up[k].c, M, long, e.price); } catch { /* dann eben mit der kurzen Reihe */ } }
        found.push(e);
        list = sortEntries(found); paintList();
      } catch (err) { if (/Rate-Limit/.test(err.message)) { note = 'Hyperliquid bremst, kurze Pause …'; status(); await sleep(60e3); k--; } }
    }
    list = sortEntries(found); scannedAt = Date.now();
    info = { coins: coins.length, up: up.length, source: uni.source };
    note = stop ? 'Angehalten.' : '';
  } catch (e) { note = `Abgebrochen: ${e.message}`; }
  busy = false; paint();
}

const tradeBtn = (e) => (onTrade ? `<button type="button" class="small-btn fd-take" data-take="${esc(e.coin)}">In Trade-Karte übernehmen</button>` : '');
const status = () => { const s = $('finder-status'); if (s) s.textContent = note; };

function row(e) {
  const blocks = e.finds.map((f) => `<span class="chip strong">${esc(BLOCK_NAME[f.rule])} <small>${esc(agoText(f.t))}</small></span>`).join('');
  const open = openCoin === e.coin, inBlock = e.rooms.some((x) => x.state === 'im');
  const fib = fibText(e.fib), rs = rsiText(e.rsiDay, e.rsiH4);
  let h = `<button type="button" class="fd-row" data-coin="${esc(e.coin)}" aria-expanded="${open}">
    <span class="fd-coin"><b>${esc(dn(e.coin))}</b> <span class="muted">Beobachtung · ${e.n} ${e.n === 1 ? 'Baustein' : 'Bausteine'}</span></span>
    ${blocks ? `<span class="chips">${blocks}</span>` : ''}
    <span class="fd-room ${inBlock ? 'short' : 'muted'}">${esc(roomsText(e.rooms))}</span>
    ${fib ? `<span class="fd-room ${e.fib.gp ? 'gold' : 'muted'}">${esc(fib)}</span>` : ''}
    ${rs ? `<span class="fd-room muted">${esc(rs)}</span>` : ''}
    ${e.overlap ? '<span class="fd-room muted">Order Block in der Fib-Zone</span>' : ''}</button>`;
  if (open && e.finds.length) h += `<div class="fd-detail">${e.finds.map((f) => `<div class="lt-bcard"><b>${esc(BLOCK_NAME[f.rule])}</b> <span class="muted">${esc([...Object.values(f.mk || {}), sinceText(f.since)].filter(Boolean).join(' · '))}</span>${blindHtml({ M: e.M, i: f.i, viz: vizWithRoom(f, e) })}</div>`).join('')}
    <p class="set-hint">Gold = Level oder Zone des Bausteins · Rot = nächste 4H-Sell-Blöcke über dem Kurs, ab der Kerze, aus der sie stammen (nur wenn sie nah liegen) · ▲ = Signalkerze · „jetzt“ = Kurs von eben. Das Bild endet an der Signalkerze.</p>${tradeBtn(e)}</div>`;
  else if (open) h += '<div class="fd-detail"><p class="set-hint">Kein Baustein hat hier ausgelöst. Der Coin steht nur wegen Fib-Lage oder RSI in der Liste.</p>' + tradeBtn(e) + '</div>';
  return h;
}

function paintList() {
  const el = $('finder-list');
  if (!el) return;
  if (!list) { el.innerHTML = ''; return; }
  const withFind = list.filter((e) => e.n > 0), base = atLeast(list, minB), cnt = countByBlock(base), stale = list.reduce((a, e) => a + e.stale, 0);
  const isFlag = !!FLAG_NAME[filter];
  // Filter nach Baustein gilt innerhalb der gewählten Mindestzahl; Filter nach Fib-Lage oder RSI zeigt alle geprüften Märkte
  const shown = isFlag ? list.filter((e) => e.flags[filter]) : filter ? base.filter((e) => e.finds.some((f) => f.rule === filter)) : base;
  const b = (on, attrs, text) => `<button type="button" class="chip-btn${on ? ' ghost-chip' : ''}" ${attrs}>${text}</button>`;
  const mins = `<div class="chips fd-filter">${[[1, 'Alle'], [2, 'ab 2 Bausteinen'], [3, 'ab 3']].map(([k, t]) => b(minB === k && !isFlag, `data-min="${k}"`, `${t} ${atLeast(withFind, k).length}`)).join('')}</div>`;
  const rules = `<div class="chips fd-filter">${NEW_RULES.map((r) => b(filter === r, `data-f="${r}"`, `${esc(BLOCK_NAME[r])} ${cnt[r]}`)).join('')}</div>`;
  const flags = `<div class="chips fd-filter">${Object.keys(FLAG_NAME).map((k) => b(filter === k, `data-f="${k}"`, `${esc(FLAG_NAME[k])} ${list.filter((e) => e.flags[k]).length}`)).join('')}</div>`;
  const crowd = crowdNotes(list, scanned).map((t) => `<p class="set-hint fd-crowd">${esc(t)}</p>`).join('');
  const empty = !withFind.length ? 'Kein Baustein hat in den letzten 24 Stunden ausgelöst oder gilt noch.' : isFlag ? 'Kein Markt erfüllt das gerade.' : filter ? 'Kein Fund für diesen Baustein in dieser Ansicht.' : `Kein Coin hat gerade ${minB} oder mehr Bausteine. Tippe auf „Alle“.`;
  el.innerHTML = mins + rules + flags + crowd + (stale ? `<p class="set-hint">${stale} überholte ${stale === 1 ? 'Fund' : 'Funde'} ausgeblendet (der Kurs hat das Level seither durchschlagen).</p>` : '')
    + (shown.length ? shown.map(row).join('') : `<p class="set-hint">${empty}</p>`);
}

function paint() {
  const el = $('finder');
  if (!el) return;
  el.innerHTML = `<div class="mk-actions"><button type="button" class="small-btn" id="finder-go"${busy ? ' disabled' : ''}>Märkte durchsuchen</button>
    ${busy ? '<button type="button" class="small-btn ghost" id="finder-stop">Anhalten</button>' : ''}</div>
    <p class="set-hint" id="finder-status" role="status">${esc(note)}</p>
    ${info && !busy ? `<p class="set-hint">${esc(info.source)}: ${info.coins} Märkte geprüft, ${info.up} im Tagestrend aufwärts, ${list.filter((e) => e.n > 0).length} mit gültigem Fund. Stand ${new Date(scannedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr.</p>` : ''}
    <div id="finder-list"></div>`;
  paintList();
}

export function initFinder(stateGetter, openTrade = null) {
  onTrade = openTrade;
  const el = $('finder');
  if (!el) return;
  getState = stateGetter;
  const tip = $('finder-tip');
  if (tip) tip.innerHTML = tipInline('Sucht auf deinen handelbaren Märkten nach den fünf Bausteinen, die du in den Blindproben abgenommen hast: Key-Level mit Retest, Fib-Rücklauf, VWAP, Sweep und Order Block, jeweils nur im Tagestrend aufwärts. Gezeigt wird, was in den letzten 24 Stunden ausgelöst hat und noch gilt. Das ist ein Hinweisgeber für deine eigene Analyse und kein geprüftes Signal: In der Messung war kein Baustein besser als der Zufall. Sortiert wird nach der Zahl der Bausteine je Coin, nicht nach Güte. „Platz nach oben“ nennt je Zeitebene den Abstand bis zum nächsten Sell-Block über dem Kurs in R; ein R ist 2 × Tages-ATR. Fib-Lage (Tageschart, Kerzenkörper) und RSI mit Divergenz (Tag und 4H) sind zusätzliche Angaben; sie zählen nicht als Baustein und ändern die Reihenfolge nicht.', 'finder-intro');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'finder-go') scan();
    else if (b.id === 'finder-stop') { stop = true; note = 'Halte an …'; status(); }
    else if (b.dataset.take) { const en = list?.find((x) => x.coin === b.dataset.take), r = en && tradeResult(en, getState().prices?.[en.coin]); if (r) onTrade(r); }
    else if (b.dataset.min) { minB = Number(b.dataset.min); if (FLAG_NAME[filter]) filter = ''; openCoin = ''; paintList(); }
    else if (b.dataset.f != null) { filter = filter === b.dataset.f ? '' : b.dataset.f; openCoin = ''; paintList(); }
    else if (b.dataset.coin) { openCoin = openCoin === b.dataset.coin ? '' : b.dataset.coin; paintList(); }
  });
  paint();
}
