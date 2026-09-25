# Wolf Desk

Trading-Dashboard für Hyperliquid (Krypto, Rohstoffe, Forex). Nur lesender Zugriff.

## Aufbau (flach, damit alles vom iPhone hochgeladen werden kann)
- `config.js` – alle Einstellungen (Watchlist, Börsen-Bereiche, Aktualisierung)
- `core-*.js` – Daten-Kern: Schnittstelle, Live-Kurse, Konto, Rechnen, Datenqualität
- `ui-*.js` – Anzeige-Module (lesen nur aus dem Store)
- `test-*.js` – Tests für alle Rechenfunktionen, aufrufbar über `tests.html`

## Stand
Etappe 1: Daten-Kern + Testseite.
