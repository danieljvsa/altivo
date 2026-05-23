# Altivo

A single-page portfolio command center that tracks assets, transactions, and valuations with external price feeds.

## Features

- **Dashboard** — overview with total value, gain/loss, allocation by type/platform
- **Assets** — sortable/filterable table with positions derived from transactions
- **Transactions** — full CRUD for buy/sell entries, auto-calculates quantities
- **Charts** — allocation donuts, type/platform breakdown, portfolio evolution over time
- **Price History** — log of manually-set prices per asset with optional date tracking
- **ISIN auto-lookup** — fetches ticker and name from Yahoo Finance
- **Multi-currency** — supports EUR, USD, GBP, CHF, with live FX conversion
- **Manual prices** — set fallback prices for assets with no API data
- **Export/Import** — JSON portfolio backup and restore
- **Keyboard shortcuts** — `N` add asset, `R` refresh, `1`–`5` switch tabs

## Getting Started

Altivo runs entirely in the browser. Because external API calls (Yahoo Finance, CoinGecko, FX rates) are blocked on the `file://` protocol, you must serve the files via a local HTTP server:

```sh
npx serve .
```

Then open the URL shown in the terminal (typically `http://localhost:3000`).

## Data Storage

All data is stored in `localStorage`. Nothing is sent to any server — the app is fully client-side.

| Key | Purpose |
|-----|---------|
| `portfolio_cmd_v2` | Portfolio data (assets, transactions, settings) |
| `portfolio_price_cache_v2` | Temporary API price cache (5 min TTL) |
| `portfolio_fx_v2` | Cached FX rates (1 hour TTL) |
| `portfolio_history_v2` | Historical total-value snapshots for charts |

## Asset Types

| Type | Identifier | Price Source |
|------|-----------|--------------|
| ETF / Stock | ISIN + ticker | Yahoo Finance |
| Crypto | CoinGecko ID | CoinGecko |
| Savings / P2P / Manual | — | Manual price only |

ISIN is required for all types except `manual`. Ticker is auto-resolved from the ISIN via Yahoo Finance.

## Price Fallback Chain

API price → manual price → average buy price → 0

## Project Structure

```
index.html   — HTML structure (5 tabs)
styles.css   — All styles (dark theme, responsive)
app.js       — All logic (portfolio, UI, price fetching, transactions)
```

## License

MIT
