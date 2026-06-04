const SK = "portfolio_cmd_v2";
const CK = "portfolio_price_cache_v2";
const HK = "portfolio_history_v2";
const CFG_KEY = "portfolio_cfg_v2";
const FX_KEY = "portfolio_fx_v2";

const DEFAULT_PLATFORMS = [
  "Trading 212","Interactive Brokers","XTB","Degiro","Binance","Coinbase",
  "Kraken","Revolut","eToro","Freedom24","Crédito Agrícola","Bank","Other"
];

const ASSET_TYPES = [
  { value:"etf", label:"ETF" },{ value:"stock", label:"Stock" },
  { value:"crypto", label:"Crypto" },{ value:"fund", label:"Fund" },
  { value:"bond", label:"Bond" },{ value:"p2p", label:"P2P" },
  { value:"savings", label:"Savings" },{ value:"manual", label:"Manual" }
];

const CURRENCIES = ["EUR","USD","GBP","CHF","JPY","CAD","AUD","BRL","PLN","DKK","SEK","NOK"];

const CRYPTO_LIST = {
  bitcoin:      { symbol:"BTC", name:"Bitcoin" },
  ethereum:     { symbol:"ETH", name:"Ethereum" },
  binancecoin:  { symbol:"BNB", name:"BNB" },
  solana:       { symbol:"SOL", name:"Solana" },
  cardano:      { symbol:"ADA", name:"Cardano" },
  ripple:       { symbol:"XRP", name:"XRP" },
  dogecoin:     { symbol:"DOGE", name:"Dogecoin" },
  polkadot:     { symbol:"DOT", name:"Polkadot" },
  "avalanche-2":{ symbol:"AVAX", name:"Avalanche" },
  chainlink:    { symbol:"LINK", name:"Chainlink" },
  "matic-network":{ symbol:"POL", name:"Polygon" },
  "uniswap":    { symbol:"UNI", name:"Uniswap" },
  "litecoin":   { symbol:"LTC", name:"Litecoin" },
  "stellar":    { symbol:"XLM", name:"Stellar" },
  "tron":       { symbol:"TRX", name:"TRON" },
  "near":       { symbol:"NEAR", name:"NEAR Protocol" },
  "aptos":      { symbol:"APT", name:"Aptos" },
  "sui":        { symbol:"SUI", name:"Sui" }
};

const TYPE_LABELS = { etf:"ETF",stock:"Stock",crypto:"Crypto",fund:"Fund",bond:"Bond",p2p:"P2P",savings:"Savings",manual:"Manual" };
const SYM = { EUR:"€",USD:"$",GBP:"£",CHF:"CHF ",JPY:"¥",CAD:"C$",AUD:"A$",BRL:"R$",PLN:"zł",DKK:"kr",SEK:"kr",NOK:"kr" };
const LOC = { EUR:"de-DE",USD:"en-US",GBP:"en-GB",CHF:"de-CH",JPY:"ja-JP",CAD:"en-CA",AUD:"en-AU",BRL:"pt-BR",PLN:"pl-PL",DKK:"da-DK",SEK:"sv-SE",NOK:"nb-NO" };

const CHART_COLORS = ["#4f8ef7","#9b6ef5","#34d399","#fbbf24","#f56565","#22d3ee","#ec4899","#6366f1","#14b8a6","#f97316","#84cc16","#a855f7","#0ea5e9","#e11d48","#7c3aed"];

function loadConfig() {
  try { const d = localStorage.getItem(CFG_KEY); return d ? JSON.parse(d) : {}; } catch { return {}; }
}
function saveConfig(cfg) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {}
}
function getConfig(key, def) {
  const cfg = loadConfig();
  return cfg[key] !== undefined ? cfg[key] : def;
}
function setConfig(key, val) {
  const cfg = loadConfig();
  cfg[key] = val;
  saveConfig(cfg);
}

function getPlatforms() {
  return getConfig("platforms", DEFAULT_PLATFORMS);
}
function getBaseCurrency() {
  return getConfig("baseCurrency", "EUR");
}

function loadPortfolio() {
  try { const d = localStorage.getItem(SK); return d ? JSON.parse(d) : null; } catch { return null; }
}
function savePortfolio(p) {
  try { p.updatedAt = new Date().toISOString(); localStorage.setItem(SK, JSON.stringify(p)); return true; } catch { return false; }
}
function loadPriceCache() {
  try { const d = localStorage.getItem(CK); return d ? JSON.parse(d) : {}; } catch { return {}; }
}
function savePriceCache(c) { try { localStorage.setItem(CK, JSON.stringify(c)); } catch {} }
function getCachedPrice(id) {
  const c = loadPriceCache(); const e = c[id]; if (!e) return null;
  if (Date.now() - e.ts > 5 * 60 * 1000) { delete c[id]; savePriceCache(c); return null; }
  return e.price;
}
function setCachedPrice(id, price) {
  const c = loadPriceCache(); c[id] = { price, ts: Date.now() }; savePriceCache(c);
}
function loadHistory() {
  try { const d = localStorage.getItem(HK); return d ? JSON.parse(d) : []; } catch { return []; }
}
function saveHistoryEntry(val) {
  try {
    const h = loadHistory();
    const lastEntry = h[h.length - 1];
    if (lastEntry) {
      const lastTime = new Date(lastEntry.date).getTime();
      if (Date.now() - lastTime < 30 * 60 * 1000) { h[h.length - 1] = { date: new Date().toISOString(), value: val }; localStorage.setItem(HK, JSON.stringify(h)); return; }
    }
    h.push({ date: new Date().toISOString(), value: val });
    if (h.length > 720) h.splice(0, h.length - 720);
    localStorage.setItem(HK, JSON.stringify(h));
  } catch {}
}
function saveAssetValueSnapshots() {
  const baseCurrency = getBaseCurrency();
  const now = new Date().toISOString();
  for (const a of portfolio.assets) {
    const cp = prices[a.id] ?? 0;
    const { currentValue } = calcGainLossInBase(a, cp, baseCurrency);
    if (!a.valueHistory) a.valueHistory = [];
    const last = a.valueHistory[a.valueHistory.length - 1];
    if (last && (Date.now() - new Date(last.date).getTime() < 30 * 60 * 1000)) {
      a.valueHistory[a.valueHistory.length - 1] = { date: now, value: currentValue };
    } else {
      a.valueHistory.push({ date: now, value: currentValue });
    }
    if (a.valueHistory.length > 720) a.valueHistory.splice(0, a.valueHistory.length - 720);
  }
}
function savePortfolioSnapshot() {
  if (!portfolio || !prices || Object.keys(prices).length === 0) return;
  const m = calcPortfolioMetrics(portfolio.assets, prices, getBaseCurrency());
  if (m.totalCurrentValue > 0) saveHistoryEntry(m.totalCurrentValue);
  saveAssetValueSnapshots();
}

function exportPortfolio(p) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `portfolio_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function importPortfolio(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const p = JSON.parse(e.target.result);
        if (!p.assets || !Array.isArray(p.assets)) return rej(new Error("Invalid format: missing assets array"));
        if (!p.version) p.version = 1;
        res(p);
      } catch { rej(new Error("Failed to parse JSON file")); }
    };
    r.onerror = () => rej(new Error("Failed to read file"));
    r.readAsText(file);
  });
}

let fxRates = {};
async function fetchFxRates(baseCurrency) {
  const cached = loadFxCache(baseCurrency);
  if (cached) { fxRates = cached; return; }
  try {
    const base = baseCurrency === "EUR" ? "EUR" : baseCurrency;
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!r.ok) throw new Error("FX fetch failed");
    const data = await r.json();
    fxRates = data.rates || {};
    fxRates[base] = 1;
    saveFxCache(baseCurrency, fxRates);
  } catch {
    const EUR_RATES = { EUR:1, USD:1.08, GBP:0.86, CHF:0.96, JPY:163, CAD:1.47, AUD:1.64, BRL:5.5, PLN:4.27, DKK:7.46, SEK:11.5, NOK:11.7 };
    if (baseCurrency === "EUR") { fxRates = EUR_RATES; }
    else {
      const baseRate = EUR_RATES[baseCurrency] || 1;
      fxRates = {};
      for (const [k, v] of Object.entries(EUR_RATES)) fxRates[k] = v / baseRate;
    }
  }
}
function loadFxCache(base) {
  try {
    const d = localStorage.getItem(FX_KEY); if (!d) return null;
    const obj = JSON.parse(d);
    if (obj.base !== base || Date.now() - obj.ts > 3600000) return null;
    return obj.rates;
  } catch { return null; }
}
function saveFxCache(base, rates) {
  try { localStorage.setItem(FX_KEY, JSON.stringify({ base, rates, ts: Date.now() })); } catch {}
}
function convertToBase(amount, fromCurrency, baseCurrency) {
  if (!amount || fromCurrency === baseCurrency) return amount;
  if (!fxRates[fromCurrency]) return amount;
  return amount / fxRates[fromCurrency];
}

function getAssetPosition(assetId) {
  if (!portfolio || !portfolio.transactions) return { quantity: 0, avgBuyPrice: 0, costBasis: 0 };
  const txs = portfolio.transactions.filter(t => t.assetId === assetId);
  let buyQty = 0, buyCost = 0, sellQty = 0;
  for (const t of txs) {
    if (t.type === "buy") { buyQty += t.quantity; buyCost += t.totalValue; }
    else if (t.type === "sell") { sellQty += t.quantity; }
  }
  const netQty = buyQty - sellQty;
  const avgBuyPrice = buyQty > 0 ? buyCost / buyQty : 0;
  const costBasis = netQty * avgBuyPrice;
  return { quantity: netQty, avgBuyPrice, costBasis };
}
function calcGainLoss(asset, currentPrice) {
  const pos = getAssetPosition(asset.id);
  const qty = pos.quantity || asset.quantity || 0;
  const buyPrice = pos.avgBuyPrice || (asset.averageBuyPrice ?? asset.manualPrice ?? 0);
  const invested = qty * buyPrice;
  const currentValue = qty * currentPrice;
  const gainLoss = currentValue - invested;
  const gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;
  return { invested, currentValue, gainLoss, gainLossPercent };
}
function calcGainLossInBase(asset, currentPrice, baseCurrency) {
  const { invested, currentValue, gainLoss, gainLossPercent } = calcGainLoss(asset, currentPrice);
  return {
    invested: convertToBase(invested, asset.currency, baseCurrency),
    currentValue: convertToBase(currentValue, asset.currency, baseCurrency),
    gainLoss: convertToBase(gainLoss, asset.currency, baseCurrency),
    gainLossPercent
  };
}
function calcPortfolioMetrics(assets, prices, baseCurrency) {
  let totalInvested = 0, totalCurrentValue = 0;
  const assetMetrics = [];
  for (const a of assets) {
    const cp = prices[a.id] ?? 0;
    const m = calcGainLossInBase(a, cp, baseCurrency);
    assetMetrics.push({ ...a, currentPrice: cp, ...m });
    totalInvested += m.invested;
    totalCurrentValue += m.currentValue;
  }
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  return { totalInvested, totalCurrentValue, totalGainLoss, totalGainLossPercent, assets: assetMetrics };
}
function calcAllocation(assets, prices, baseCurrency) {
  const vals = assets.map(a => {
    const cp = prices[a.id] ?? 0;
    const pos = getAssetPosition(a.id);
    const qty = pos.quantity || a.quantity || 0;
    return convertToBase(qty * cp, a.currency, baseCurrency);
  });
  const total = vals.reduce((s, v) => s + v, 0);
  return assets.map((a, i) => ({
    name: a.name, type: a.type, value: vals[i],
    percentage: total > 0 ? vals[i] / total * 100 : 0
  })).sort((a, b) => b.value - a.value);
}
function calcGroupAllocation(assets, prices, baseCurrency, groupFn, labelFn) {
  const tv = {}; let total = 0;
  for (const a of assets) {
    const cp = prices[a.id] ?? 0;
    const pos = getAssetPosition(a.id);
    const qty = pos.quantity || a.quantity || 0;
    const v = convertToBase(qty * cp, a.currency, baseCurrency);
    const key = groupFn(a);
    tv[key] = (tv[key] || 0) + v; total += v;
  }
  return Object.entries(tv).map(([key, value]) => ({
    label: labelFn ? labelFn(key) : key, value,
    percentage: total > 0 ? value / total * 100 : 0
  })).sort((a, b) => b.value - a.value);
}
function getTopPerformers(assets, prices, n = 3) {
  return assets.map(a => {
    const cp = prices[a.id] ?? 0;
    return { name: a.name, ...calcGainLoss(a, cp) };
  }).sort((a, b) => b.gainLossPercent - a.gainLossPercent).slice(0, n);
}
function getWorstPerformers(assets, prices, n = 3) {
  return assets.map(a => {
    const cp = prices[a.id] ?? 0;
    return { name: a.name, ...calcGainLoss(a, cp) };
  }).sort((a, b) => a.gainLossPercent - b.gainLossPercent).slice(0, n);
}

function fmtCurrency(amount, currency = "EUR", dec = 2) {
  const sym = SYM[currency] || currency + " ";
  const loc = LOC[currency] || "en-US";
  const abs = Math.abs(amount || 0);
  const fmt = new Intl.NumberFormat(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(abs);
  return (amount < 0 ? "-" : "") + sym + fmt;
}
function fmtPct(v, dec = 2) { return (v >= 0 ? "+" : "") + (v || 0).toFixed(dec) + "%"; }
function fmtCompact(amount, currency = "EUR") {
  const sym = SYM[currency] || currency + " ";
  const abs = Math.abs(amount || 0); const sign = amount < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${sym}${(abs/1e6).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}${sym}${(abs/1000).toFixed(2)}K`;
  return fmtCurrency(amount, currency);
}
function fmtQty(v) {
  if (!v) return "0";
  if (Number.isInteger(v)) return v.toLocaleString();
  if (v < 0.01) return v.toFixed(6);
  if (v < 1) return v.toFixed(4);
  return v.toFixed(2);
}
function fmtRelative(ds) {
  if (!ds) return "N/A";
  const d = new Date(ds); const now = new Date(); const ms = now - d;
  const mins = Math.floor(ms/60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms/3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(ms/86400000);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

async function fetchCryptoPrices(assets, baseCur) {
  const ids = [...new Set(assets.map(a => a.providerId))];
  const byCur = {};
  for (const a of assets) {
    const c = (a.currency || "eur").toLowerCase();
    (byCur[c] = byCur[c] || []).push(a);
  }
  const result = {};
  for (const [cur, curAssets] of Object.entries(byCur)) {
    const curIds = [...new Set(curAssets.map(a => a.providerId))];
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${curIds.join(",")}&vs_currencies=${cur}`);
      if (!r.ok) throw new Error("CoinGecko " + r.status);
      const data = await r.json();
      for (const a of curAssets) {
        if (data[a.providerId]?.[cur] !== undefined) result[a.id] = data[a.providerId][cur];
      }
    } catch (e) { console.warn("CoinGecko:", e.message); }
  }
  return result;
}

async function fetchStockPrice(ticker) {
  const cached = null;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`);
    if (!r.ok) throw new Error("Yahoo " + r.status);
    const data = await r.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch (e) { console.warn("Yahoo:", ticker, e.message); return null; }
}

async function fetchAllPrices(assets) {
  const prices = {};

  const cryptoAssets = assets.filter(a => a.provider === "coingecko" && a.providerId);
  if (cryptoAssets.length > 0) {
    const cp = await fetchCryptoPrices(cryptoAssets);
    Object.assign(prices, cp);
    for (const [id, price] of Object.entries(cp)) setCachedPrice(id, price);
  }

  const stockAssets = assets.filter(a => a.provider === "yahoo" && a.ticker);
  for (const a of stockAssets) {
    const cached = getCachedPrice(a.id);
    if (cached !== null) { prices[a.id] = cached; continue; }
    const p = await fetchStockPrice(a.ticker);
    if (p !== null) { prices[a.id] = p; setCachedPrice(a.id, p); }
  }

  for (const a of assets) {
    if (!(a.id in prices)) {
      prices[a.id] = a.manualPrice ?? a.averageBuyPrice ?? (getAssetPosition(a.id).avgBuyPrice || (a.type === "savings" || a.type === "manual" || a.type === "p2p" ? 1 : 0));
    }
  }

  return prices;
}

async function lookupIsin(isin) {
  if (!isin || isin.trim().length < 8) return null;
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin.trim())}&quotesCount=3&newsCount=0`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.quotes?.length > 0) {
      const q = data.quotes[0];
      return { ticker: q.symbol, name: q.shortname || q.longname };
    }
    return null;
  } catch {
    return null;
  }
}

function showModal(html) {
  const ov = document.getElementById("modal-overlay");
  const ct = document.getElementById("modal-container");
  ct.innerHTML = html;
  ov.classList.add("active");
  document.body.style.overflow = "hidden";
  const overlayHandler = e => { if (e.target === ov) hideModal(); };
  const escHandler = e => { if (e.key === "Escape") hideModal(); };
  ov.addEventListener("click", overlayHandler);
  document.addEventListener("keydown", escHandler);
  ov._cleanup = () => { ov.removeEventListener("click", overlayHandler); document.removeEventListener("keydown", escHandler); };
}
function hideModal() {
  const ov = document.getElementById("modal-overlay");
  ov.classList.remove("active");
  document.body.style.overflow = "";
  if (ov._cleanup) { ov._cleanup(); delete ov._cleanup; }
}

function showAssetModal(asset, onSave) {
  const isEdit = asset !== null;
  const platforms = getPlatforms();
  const html = `
    <div class="modal">
      <div class="modal-header">
        <h2>${isEdit ? "Edit Asset" : "Add Asset"}</h2>
        <button class="modal-close" id="mc">&times;</button>
      </div>
      <form id="asset-form" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>Asset Type</label>
            <select id="a-type">
              ${ASSET_TYPES.map(t => `<option value="${t.value}"${asset?.type===t.value?" selected":""}>${t.label}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="a-cur">
              ${CURRENCIES.map(c => `<option value="${c}"${asset?.currency===c?" selected":""}>${c}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="a-name" value="${asset?.name||""}" required placeholder="e.g., Vanguard FTSE All-World">
        </div>
        <div id="balance-field" style="display:none">
          <div class="form-group">
            <label>Current Balance</label>
            <input type="number" id="a-balance" step="any" min="0" value="${asset?.quantity||""}" placeholder="0.00">
            <span class="form-hint">Total amount saved or invested, no transaction tracking needed</span>
          </div>
        </div>
        <div id="isin-fields" style="display:none">
          <div class="form-group">
            <label>ISIN <span style="color:var(--red)">*</span></label>
            <input type="text" id="a-isin" value="${asset?.isin||""}" placeholder="IE00BK5BQT80" maxlength="12" style="text-transform:uppercase;letter-spacing:0.05em;font-family:var(--mono)">
            <span class="form-hint" id="isin-status"></span>
          </div>
        </div>
        <div id="stock-fields" style="display:none">
          <div class="form-group">
            <label>Ticker Symbol</label>
            <input type="text" id="a-ticker" value="${asset?.ticker||""}" placeholder="Auto-detected from ISIN">
          </div>
        </div>
        <div id="crypto-fields" style="display:none">
          <div class="form-group">
            <label>Cryptocurrency</label>
            <select id="a-provid">
              <option value="">— select cryptocurrency —</option>
              ${Object.entries(CRYPTO_LIST).map(([id,info]) =>
                `<option value="${id}"${asset?.providerId===id?" selected":""}>${info.name} (${info.symbol})</option>`
              ).join("")}
            </select>
          </div>
        </div>
        <div class="form-group" id="platform-group">
          <label>Platform / Broker</label>
          <select id="a-platform">
            <option value="">— none —</option>
            ${platforms.map(p => `<option value="${p}"${asset?.platform===p?" selected":""}>${p}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="a-notes" placeholder="Any notes about this position…">${asset?.notes||""}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="mc2">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save Changes" : "Add Asset"}</button>
        </div>
      </form>
    </div>`;
  showModal(html);
  document.getElementById("mc").addEventListener("click", hideModal);
  document.getElementById("mc2").addEventListener("click", hideModal);
  const typeEl = document.getElementById("a-type");
  updateAssetFormFields(typeEl.value);

  let isinTimer;
  document.getElementById("a-isin")?.addEventListener("input", e => {
    clearTimeout(isinTimer);
    const statusEl = document.getElementById("isin-status");
    statusEl.textContent = "";
    const val = e.target.value.trim().toUpperCase();
    if (val.length >= 10) {
      statusEl.innerHTML = "<span style='color:var(--text-3)'>Looking up…</span>";
      isinTimer = setTimeout(async () => {
        const result = await lookupIsin(val);
        if (result) {
          const nameEl = document.getElementById("a-name");
          const tickerEl = document.getElementById("a-ticker");
          if (!nameEl.value) nameEl.value = result.name;
          if (tickerEl && !tickerEl.value) tickerEl.value = result.ticker;
          statusEl.innerHTML = `<span style="color:var(--green)">✓ ${result.ticker} — ${result.name}</span>`;
        } else {
          statusEl.innerHTML = "<span style='color:var(--text-3)'>No match found</span>";
        }
      }, 600);
    }
  });
  typeEl.addEventListener("change", e => updateAssetFormFields(e.target.value));
  document.getElementById("a-provid")?.addEventListener("change", e => {
    const info = CRYPTO_LIST[e.target.value];
    if (info && !document.getElementById("a-name").value) {
      document.getElementById("a-name").value = info.name;
    }
  });
  document.getElementById("asset-form").addEventListener("submit", e => {
    e.preventDefault();
    onSave(collectAssetFormData(asset));
    hideModal();
  });
}

function updateAssetFormFields(type) {
  const noIsin = type === "manual" || type === "savings" || type === "p2p";
  document.getElementById("isin-fields").style.display = noIsin ? "none" : "block";
  document.getElementById("a-isin").required = !noIsin;
  document.getElementById("crypto-fields").style.display = type === "crypto" ? "block" : "none";
  document.getElementById("stock-fields").style.display = (type === "etf" || type === "stock") ? "block" : "none";
  document.getElementById("balance-field").style.display = (type === "savings" || type === "manual" || type === "p2p") ? "block" : "none";
}

function collectAssetFormData(asset) {
  const type = document.getElementById("a-type").value;
  const data = {
    id: asset?.id || crypto.randomUUID(), type,
    name: document.getElementById("a-name").value.trim(),
    currency: document.getElementById("a-cur").value,
    platform: document.getElementById("a-platform").value || undefined,
    notes: document.getElementById("a-notes").value.trim() || undefined
  };
  if (type !== "manual" && type !== "savings" && type !== "p2p") {
    data.isin = document.getElementById("a-isin").value.trim().toUpperCase() || undefined;
  }
  if (type === "crypto") {
    const pid = document.getElementById("a-provid").value;
    if (pid) {
      data.provider = "coingecko"; data.providerId = pid;
      if (CRYPTO_LIST[pid]) { data.symbol = CRYPTO_LIST[pid].symbol; if (!data.name) data.name = CRYPTO_LIST[pid].name; }
    }
  }
  if (type === "etf" || type === "stock") {
    data.provider = "yahoo";
    data.ticker = document.getElementById("a-ticker").value.trim().toUpperCase() || undefined;
  }
  if (type === "savings" || type === "manual" || type === "p2p") {
    const bal = parseFloat(document.getElementById("a-balance").value);
    if (!isNaN(bal) && bal > 0) data.quantity = bal;
  }
  if (asset) {
    if (asset.priceHistory) data.priceHistory = asset.priceHistory;
    if (asset.manualPrice !== undefined) data.manualPrice = asset.manualPrice;
    if (asset.manualPriceDate) data.manualPriceDate = asset.manualPriceDate;
    if (asset.valueHistory) data.valueHistory = asset.valueHistory;
  }
  return data;
}

function showConfirmModal(msg, onConfirm) {
  showModal(`
    <div class="modal modal-sm">
      <div class="modal-header"><h2>Confirm action</h2><button class="modal-close" id="mc">&times;</button></div>
      <div class="modal-body"><p>${msg}</p></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mc2">Cancel</button>
        <button class="btn btn-danger" id="mc3">Delete</button>
      </div>
    </div>`);
  document.getElementById("mc").addEventListener("click", hideModal);
  document.getElementById("mc2").addEventListener("click", hideModal);
  document.getElementById("mc3").addEventListener("click", () => { onConfirm(); hideModal(); });
}

function showImportModal(onImport) {
  showModal(`
    <div class="modal modal-sm">
      <div class="modal-header"><h2>Import Portfolio</h2><button class="modal-close" id="mc">&times;</button></div>
      <div class="modal-body">
        <p>Select a JSON file exported from this app or a compatible format.</p>
        <input type="file" id="imp-file" accept=".json" class="file-input">
        <p class="form-hint">⚠ This will replace your current portfolio data.</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mc2">Cancel</button>
        <button class="btn btn-primary" id="mc3">Import</button>
      </div>
    </div>`);
  document.getElementById("mc").addEventListener("click", hideModal);
  document.getElementById("mc2").addEventListener("click", hideModal);
  document.getElementById("mc3").addEventListener("click", () => {
    const f = document.getElementById("imp-file").files[0];
    if (!f) { showToast("Please select a file", "error"); return; }
    onImport(f); hideModal();
  });
}

function showSettingsModal() {
  const cur = getBaseCurrency();
  const platforms = getPlatforms();
  const html = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2>Settings</h2><button class="modal-close" id="mc">&times;</button></div>
      <div class="modal-body">
        <div class="settings-section">
          <h3>Portfolio</h3>
          <div class="setting-row">
            <div>
              <div class="setting-label">Base Currency</div>
              <div class="setting-desc">All portfolio totals will be shown in this currency</div>
            </div>
            <select id="s-currency" style="width:120px;padding:8px 12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-1);font-family:var(--font)">
              ${CURRENCIES.map(c => `<option value="${c}"${c===cur?" selected":""}>${c}</option>`).join("")}
            </select>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Clear Price Cache</div>
              <div class="setting-desc">Force fresh price data on next refresh</div>
            </div>
            <button class="btn btn-ghost" id="s-clear-cache">Clear Cache</button>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Reset Portfolio History</div>
              <div class="setting-desc">Delete all saved portfolio value snapshots</div>
            </div>
            <button class="btn btn-ghost" id="s-clear-history" style="color:var(--red)">Reset History</button>
          </div>
        </div>
        <div class="settings-section">
          <h3>Platforms</h3>
          <div class="platforms-wrap" id="platforms-wrap">
            ${platforms.map(p => `
              <span class="platform-tag" data-platform="${p}">${p}
                <button type="button" title="Remove" onclick="removePlatform('${p.replace(/'/g,"\\'")}')">×</button>
              </span>`).join("")}
          </div>
          <div class="add-platform-row">
            <input type="text" id="new-platform" class="form-group input" placeholder="Add new platform…" style="padding:9px 13px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);color:var(--text-1);font-family:var(--font);font-size:0.875rem;">
            <button class="btn btn-ghost" id="s-add-platform">Add</button>
          </div>
        </div>
        <div class="settings-section">
          <h3>Keyboard Shortcuts</h3>
          <div class="setting-row"><div class="setting-label">Add new asset</div><div><span class="kbd">N</span></div></div>
          <div class="setting-row"><div class="setting-label">Refresh prices</div><div><span class="kbd">R</span></div></div>
          <div class="setting-row"><div class="setting-label">Switch to Dashboard</div><div><span class="kbd">1</span></div></div>
          <div class="setting-row"><div class="setting-label">Switch to Assets</div><div><span class="kbd">2</span></div></div>
          <div class="setting-row"><div class="setting-label">Switch to Charts</div><div><span class="kbd">3</span></div></div>
          <div class="setting-row"><div class="setting-label">Switch to Transactions</div><div><span class="kbd">4</span></div></div>
          <div class="setting-row"><div class="setting-label">Close modal</div><div><span class="kbd">Esc</span></div></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mc">Close</button>
        <button class="btn btn-primary" id="s-save">Save Settings</button>
      </div>
    </div>`;
  showModal(html);
  document.querySelectorAll("#mc").forEach(el => el.addEventListener("click", hideModal));
  document.getElementById("s-clear-cache").addEventListener("click", () => {
    localStorage.removeItem(CK); showToast("Price cache cleared", "success");
  });
  document.getElementById("s-clear-history").addEventListener("click", () => {
    if (confirm("Delete all portfolio history snapshots?")) { localStorage.removeItem(HK); showToast("History cleared", "success"); }
  });
  document.getElementById("s-add-platform").addEventListener("click", () => {
    const val = document.getElementById("new-platform").value.trim();
    if (!val) return;
    const plats = getPlatforms();
    if (plats.includes(val)) { showToast("Platform already exists", "error"); return; }
    plats.push(val);
    setConfig("platforms", plats);
    document.getElementById("new-platform").value = "";
    const wrap = document.getElementById("platforms-wrap");
    const tag = document.createElement("span");
    tag.className = "platform-tag"; tag.dataset.platform = val;
    tag.innerHTML = `${val}<button type="button" title="Remove" onclick="removePlatform('${val.replace(/'/g,"\\'")}')">×</button>`;
    wrap.appendChild(tag);
  });
  document.getElementById("s-save").addEventListener("click", () => {
    const newCur = document.getElementById("s-currency").value;
    const oldCur = getBaseCurrency();
    setConfig("baseCurrency", newCur);
    if (newCur !== oldCur) {
      portfolio.baseCurrency = newCur;
      savePortfolio(portfolio);
      localStorage.removeItem(FX_KEY);
    }
    hideModal();
    showToast("Settings saved", "success");
    refreshPrices();
  });
}

window.removePlatform = function(name) {
  const plats = getPlatforms().filter(p => p !== name);
  setConfig("platforms", plats);
  const tag = document.querySelector(`.platform-tag[data-platform="${name}"]`);
  if (tag) tag.remove();
};

function renderDashboard(portfolio, prices) {
  const baseCurrency = getBaseCurrency();
  const m = calcPortfolioMetrics(portfolio.assets, prices, baseCurrency);
  const typeAlloc = calcGroupAllocation(portfolio.assets, prices, baseCurrency, a => a.type, t => TYPE_LABELS[t] || t);
  const platformAlloc = calcGroupAllocation(portfolio.assets, prices, baseCurrency, a => a.platform || "Unknown");
  const top = getTopPerformers(portfolio.assets, prices, 3);
  const worst = getWorstPerformers(portfolio.assets, prices, 3);
  const glClass = m.totalGainLoss >= 0 ? "positive" : "negative";

  const sub = document.getElementById("header-subtitle");
  if (sub) sub.textContent = `${portfolio.assets.length} asset${portfolio.assets.length !== 1 ? "s" : ""} · ${fmtCompact(m.totalCurrentValue, baseCurrency)} · ${baseCurrency}`;

  const history = loadHistory();
  let bestDay = { gain: 0, date: "" };
  for (let i = 1; i < history.length; i++) {
    const g = history[i].value - history[i-1].value;
    if (g > bestDay.gain) { bestDay = { gain: g, date: history[i].date }; }
  }

  document.getElementById("dashboard-content").innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card accent-blue">
        <div class="stat-header"><span class="stat-label">Total Invested</span><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-value">${fmtCurrency(m.totalInvested, baseCurrency)}</div>
        <div class="stat-sub">${portfolio.assets.length} position${portfolio.assets.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="stat-card">
        <div class="stat-header"><span class="stat-label">Current Value</span><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="stat-value">${fmtCurrency(m.totalCurrentValue, baseCurrency)}</div>
        <div class="stat-sub">${platformAlloc.length} platform${platformAlloc.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="stat-card ${m.totalGainLoss >= 0 ? "accent-positive" : "accent-negative"}">
        <div class="stat-header"><span class="stat-label">Total Gain / Loss</span><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${m.totalGainLoss >= 0 ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'}</svg></div>
        <div class="stat-value ${glClass}">${fmtCurrency(m.totalGainLoss, baseCurrency)}</div>
        <div class="stat-sub ${glClass}">${fmtPct(m.totalGainLossPercent)}</div>
      </div>
      <div class="stat-card accent-purple">
        <div class="stat-header"><span class="stat-label">Best Session</span><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <div class="stat-value ${bestDay.gain > 0 ? "positive" : ""}">${bestDay.gain > 0 ? fmtCompact(bestDay.gain, baseCurrency) : "—"}</div>
        <div class="stat-sub">${bestDay.date ? fmtRelative(bestDay.date) : "No history yet"}</div>
      </div>
    </div>

    <div class="dashboard-secondary">
      <div class="card">
        <div class="card-title">By Type</div>
        <div class="allocation-list">
          ${typeAlloc.length ? typeAlloc.map(item => `
            <div class="allocation-item">
              <div class="allocation-info"><span class="allocation-name">${item.label}</span><span class="allocation-pct">${item.percentage.toFixed(1)}%</span></div>
              <div class="alloc-bar"><div class="alloc-fill" style="width:${item.percentage}%"></div></div>
              <span class="allocation-value">${fmtCompact(item.value, baseCurrency)}</span>
            </div>`).join("") : '<p class="empty-list">No assets yet</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">By Platform</div>
        <div class="allocation-list">
          ${platformAlloc.length ? platformAlloc.slice(0,6).map((item,i) => `
            <div class="allocation-item">
              <div class="allocation-info"><span class="allocation-name">${item.label}</span><span class="allocation-pct">${item.percentage.toFixed(1)}%</span></div>
              <div class="alloc-bar"><div class="alloc-fill ${i%3===1?"green":i%3===2?"amber":""}" style="width:${item.percentage}%"></div></div>
              <span class="allocation-value">${fmtCompact(item.value, baseCurrency)}</span>
            </div>`).join("") : '<p class="empty-list">No assets yet</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Top Performers</div>
        <div class="performers-list">
          ${top.length ? top.map(p => `
            <div class="performer-item pos">
              <span class="performer-name" title="${p.name}">${p.name}</span>
              <span class="performer-value">${fmtPct(p.gainLossPercent)}</span>
            </div>`).join("") : '<p class="empty-list">No data yet</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Worst Performers</div>
        <div class="performers-list">
          ${worst.length ? worst.map(p => `
            <div class="performer-item neg">
              <span class="performer-name" title="${p.name}">${p.name}</span>
              <span class="performer-value">${fmtPct(p.gainLossPercent)}</span>
            </div>`).join("") : '<p class="empty-list">No data yet</p>'}
        </div>
      </div>
    </div>
    <div class="last-updated">Last updated: ${fmtRelative(portfolio.updatedAt)}</div>`;
}

let sortKey = "currentValue", sortDir = -1;
let tableFilter = "", tableTypeFilter = "";
let txSortKey = "date", txSortDir = -1;
let txFilter = "";

function renderTable(portfolio, prices, onEdit, onDelete) {
  const baseCurrency = getBaseCurrency();
  const ct = document.getElementById("table-content");
  if (!ct) return;

  if (portfolio.assets.length === 0) {
    ct.innerHTML = `
      <div class="empty-state-wrap">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <p>No assets in your portfolio yet</p>
        <button class="btn btn-primary" onclick="window.showAddAssetModal()">Add your first asset</button>
      </div>`;
    return;
  }

  let filtered = portfolio.assets.filter(a => {
    const q = tableFilter.toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !(a.ticker||"").toLowerCase().includes(q) && !(a.platform||"").toLowerCase().includes(q)) return false;
    if (tableTypeFilter && a.type !== tableTypeFilter) return false;
    return true;
  });

  filtered = filtered.slice().sort((a, b) => {
    const cpA = prices[a.id] ?? 0;
    const cpB = prices[b.id] ?? 0;
    const posA = getAssetPosition(a.id);
    const posB = getAssetPosition(b.id);
    const qtyA = posA.quantity || a.quantity || 0;
    const qtyB = posB.quantity || b.quantity || 0;
    const avgA = posA.avgBuyPrice || (a.averageBuyPrice ?? a.manualPrice ?? 0);
    const avgB = posB.avgBuyPrice || (b.averageBuyPrice ?? b.manualPrice ?? 0);
    const mA = calcGainLossInBase(a, cpA, baseCurrency);
    const mB = calcGainLossInBase(b, cpB, baseCurrency);
    let va, vb;
    switch (sortKey) {
      case "name": return sortDir * a.name.localeCompare(b.name);
      case "type": return sortDir * a.type.localeCompare(b.type);
      case "platform": return sortDir * (a.platform||"").localeCompare(b.platform||"");
      case "qty": va = qtyA; vb = qtyB; break;
      case "avgPrice": va = avgA; vb = avgB; break;
      case "currentPrice": va = cpA; vb = cpB; break;
      case "invested": va = mA.invested; vb = mB.invested; break;
      case "currentValue": va = mA.currentValue; vb = mB.currentValue; break;
      case "gainLoss": va = mA.gainLoss; vb = mB.gainLoss; break;
      case "gainLossPercent": va = mA.gainLossPercent; vb = mB.gainLossPercent; break;
      default: return 0;
    }
    return sortDir * (va - vb);
  });

  const th = (key, label) =>
    `<th data-sort="${key}" class="${sortKey===key?"sorted":""}">${label} ${sortKey===key?(sortDir>0?"↑":"↓"):""}</th>`;

  ct.innerHTML = `
    <div class="filter-bar">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="tbl-search" placeholder="Search by name, ticker, platform…" value="${tableFilter}">
      </div>
      <select class="filter-select" id="tbl-type">
        <option value="">All types</option>
        ${ASSET_TYPES.map(t => `<option value="${t.value}"${tableTypeFilter===t.value?" selected":""}>${t.label}</option>`).join("")}
      </select>
      <span class="filter-count">${filtered.length} / ${portfolio.assets.length} assets</span>
    </div>
    <div class="table-wrapper">
      <div class="table-responsive">
        <table class="asset-table">
          <thead><tr>
            ${th("name","Name")}
            ${th("type","Type")}
            ${th("platform","Platform")}
            ${th("qty","Qty")}
            ${th("avgPrice","Buy Price")}
            ${th("currentPrice","Current")}
            ${th("invested","Invested")}
            ${th("currentValue","Value")}
            ${th("gainLoss","Gain/Loss")}
            ${th("gainLossPercent","G/L %")}
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${filtered.map(a => {
              const cp = prices[a.id] ?? 0;
              const pos = getAssetPosition(a.id);
              const qty = pos.quantity || a.quantity || 0;
              const avgPrice = pos.avgBuyPrice || (a.averageBuyPrice ?? a.manualPrice ?? 0);
              const { invested, currentValue, gainLoss, gainLossPercent } = calcGainLossInBase(a, cp, baseCurrency);
              const gc = gainLoss >= 0 ? "positive" : "negative";
              const fxNote = a.currency !== baseCurrency ? `<span class="fx-badge">${a.currency}</span>` : "";
              return `
                <tr data-id="${a.id}">
                  <td><div class="cell-name">
                    <span class="asset-name">${a.name}</span>
                    ${a.ticker ? `<span class="asset-ticker">${a.ticker}</span>` : ""}
                    ${a.symbol && !a.ticker ? `<span class="asset-ticker">${a.symbol}</span>` : ""}
                    ${a.notes ? `<span class="asset-note" title="${a.notes}">${a.notes}</span>` : ""}
                  </div></td>
                  <td><span class="badge badge-${a.type}">${TYPE_LABELS[a.type]||a.type}</span></td>
                  <td style="color:var(--text-2)">${a.platform||"—"}</td>
                  <td class="mono" style="color:var(--text-2)">${fmtQty(qty)}</td>
                  <td class="mono">${fmtCurrency(avgPrice, a.currency)}${fxNote}</td>
                  <td class="mono" style="color:var(--text-1);font-weight:500">${fmtCurrency(cp, a.currency)}${fxNote}${a.manualPrice ? '<span style="font-size:0.65rem;color:var(--text-3);margin-left:3px">●</span>' : ''}</td>
                  <td class="mono" style="color:var(--text-2)">${fmtCurrency(invested, baseCurrency)}</td>
                  <td class="mono" style="font-weight:500">${fmtCurrency(currentValue, baseCurrency)}</td>
                  <td class="mono ${gc}">${gainLoss>=0?"+":""}${fmtCurrency(gainLoss, baseCurrency)}</td>
                  <td class="mono ${gc}" style="font-weight:600">${fmtPct(gainLossPercent)}</td>
                  <td class="actions-cell">
                    <button class="btn-icon btn-price" data-action="set-price" data-id="${a.id}" title="Set manual price">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                    <button class="btn-icon btn-edit" data-action="edit" data-id="${a.id}" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete" data-action="delete" data-id="${a.id}" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>`;
            }).join("")}
            ${filtered.length === 0 ? `<tr><td colspan="11" style="text-align:center;color:var(--text-3);padding:40px">No assets match your filter</td></tr>` : ""}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById("tbl-search").addEventListener("input", e => {
    tableFilter = e.target.value;
    renderTable(portfolio, prices, onEdit, onDelete);
  });
  document.getElementById("tbl-type").addEventListener("change", e => {
    tableTypeFilter = e.target.value;
    renderTable(portfolio, prices, onEdit, onDelete);
  });
  ct.querySelectorAll("[data-action='edit']").forEach(b => b.addEventListener("click", () => onEdit(b.dataset.id)));
  ct.querySelectorAll("[data-action='delete']").forEach(b => b.addEventListener("click", () => onDelete(b.dataset.id)));
  ct.querySelectorAll("[data-action='set-price']").forEach(el => el.addEventListener("click", () => {
    const asset = portfolio.assets.find(a => a.id === el.dataset.id);
    if (asset) showPriceModal(asset);
  }));
  ct.querySelectorAll("th[data-sort]").forEach(th => th.addEventListener("click", () => {
    if (sortKey === th.dataset.sort) sortDir *= -1; else { sortKey = th.dataset.sort; sortDir = -1; }
    renderTable(portfolio, prices, onEdit, onDelete);
  }));
}

function showPriceModal(asset) {
  const cp = prices[asset.id] ?? 0;
  const hasManual = asset.manualPrice !== undefined && asset.manualPrice !== null;
  showModal(`
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Set Price: ${asset.name}</h2>
        <button class="modal-close" id="mc">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Price per Unit (${asset.currency || 'EUR'})</label>
          <input type="number" id="mp-price" step="any" min="0" value="${cp}" autofocus>
          <span class="form-hint">Used as fallback when no API price is available</span>
        </div>
        <div class="form-group">
          <label>Date (optional)</label>
          <input type="date" id="mp-date" value="${asset.manualPriceDate || ''}">
          <span class="form-hint">When this price was observed</span>
        </div>
        ${hasManual ? `<p style="margin-top:12px"><button class="btn btn-ghost" id="mp-clear" style="color:var(--red)">Clear manual price</button></p>` : ''}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="mc2">Cancel</button>
        <button class="btn btn-primary" id="mp-save">Save</button>
      </div>
    </div>`);
  document.getElementById("mc").addEventListener("click", hideModal);
  document.getElementById("mc2").addEventListener("click", hideModal);
  document.getElementById("mp-save").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("mp-price").value);
    const dateVal = document.getElementById("mp-date").value;
    if (!isNaN(val) && val > 0) {
      asset.manualPrice = val;
      prices[asset.id] = val;
      const date = dateVal || new Date().toISOString().slice(0, 10);
      if (dateVal) asset.manualPriceDate = dateVal;
      else delete asset.manualPriceDate;
      if (!asset.priceHistory) asset.priceHistory = [];
      asset.priceHistory.push({ price: val, date, timestamp: Date.now() });
    } else {
      delete asset.manualPrice;
      delete asset.manualPriceDate;
      delete prices[asset.id];
    }
    savePortfolio(portfolio);
    savePortfolioSnapshot();
    hideModal();
    renderAll();
  });
  document.getElementById("mp-clear")?.addEventListener("click", () => {
    delete asset.manualPrice;
    delete asset.manualPriceDate;
    delete prices[asset.id];
    savePortfolio(portfolio);
    savePortfolioSnapshot();
    hideModal();
    renderAll();
  });
}

let allocChart = null, typeChart = null, platformChart = null, evoChart = null, assetEvoChart = null;
const TOOLTIP = { backgroundColor:"#141926", titleColor:"#e8eaf2", bodyColor:"#8892b0", borderColor:"rgba(99,120,180,0.22)", borderWidth:1, cornerRadius:10, padding:12 };

function destroyCharts() {
  [allocChart, typeChart, platformChart, evoChart, assetEvoChart].forEach(c => { if(c) { try { c.destroy(); } catch {} } });
  allocChart = typeChart = platformChart = evoChart = assetEvoChart = null;
}

function renderCharts(portfolio, prices, history) {
  const baseCurrency = getBaseCurrency();
  renderAllocChart(portfolio, prices, baseCurrency);
  renderTypeChart(portfolio, prices, baseCurrency);
  renderPlatformChart(portfolio, prices, baseCurrency);
  renderEvoChart(history, baseCurrency);
  renderAssetEvoChart(portfolio, baseCurrency);
}

function makeDoughnut(ctxId, labels, data, currency, chartRef) {
  const el = document.getElementById(ctxId); if (!el) return null;
  if (chartRef) chartRef.destroy();
  if (!data.length) {
    el.style.display='none';
    const empId = ctxId+'-empty';
    let emp = document.getElementById(empId);
    if (!emp) { el.insertAdjacentHTML('afterend', `<div class="chart-empty" id="${empId}">No data to display</div>`); }
    return null;
  }
  el.style.display=''; document.getElementById(ctxId+'-empty')?.remove();
  return new Chart(el, {
    type:"doughnut",
    data:{ labels, datasets:[{ data, backgroundColor:CHART_COLORS.slice(0,data.length), borderWidth:0, hoverOffset:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"65%", plugins:{
      legend:{ position:"right", labels:{ color:"#8892b0", padding:12, usePointStyle:true, pointStyleWidth:8, font:{size:11} } },
      tooltip:{ ...TOOLTIP, callbacks:{ label: ctx2 => {
        const total = ctx2.dataset.data.reduce((a,b)=>a+b,0);
        return ` ${fmtCurrency(ctx2.parsed, currency)} (${(ctx2.parsed/total*100).toFixed(1)}%)`;
      }}}
    }}
  });
}

function renderAllocChart(portfolio, prices, baseCurrency) {
  const alloc = calcAllocation(portfolio.assets, prices, baseCurrency);
  allocChart = makeDoughnut("allocation-chart", alloc.map(a=>a.name), alloc.map(a=>a.value), baseCurrency, allocChart);
}

function renderTypeChart(portfolio, prices, baseCurrency) {
  const ta = calcGroupAllocation(portfolio.assets, prices, baseCurrency, a=>a.type, t=>TYPE_LABELS[t]||t);
  const el = document.getElementById("type-chart"); if (!el) return;
  if (typeChart) typeChart.destroy();
  if (!ta.length) {
    el.style.display='none';
    if (!document.getElementById('type-chart-empty')) el.insertAdjacentHTML('afterend', '<div class="chart-empty" id="type-chart-empty">No data</div>');
    return;
  }
  el.style.display=''; document.getElementById('type-chart-empty')?.remove();
  typeChart = new Chart(el, {
    type:"bar",
    data:{ labels:ta.map(t=>t.label), datasets:[{ data:ta.map(t=>t.value), backgroundColor:CHART_COLORS.slice(0,ta.length), borderRadius:8, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...TOOLTIP, callbacks:{label:c=>` ${fmtCurrency(c.parsed.y, baseCurrency)}`}} },
      scales:{ x:{grid:{display:false}, ticks:{color:"#8892b0",font:{size:11}}}, y:{grid:{color:"rgba(99,120,180,0.07)"}, ticks:{color:"#8892b0",font:{size:11}, callback:v=>fmtCompact(v,baseCurrency)}, border:{display:false}} }
    }
  });
}

function renderPlatformChart(portfolio, prices, baseCurrency) {
  const pa = calcGroupAllocation(portfolio.assets, prices, baseCurrency, a=>a.platform||"Unknown");
  platformChart = makeDoughnut("platform-chart", pa.map(p=>p.label), pa.map(p=>p.value), baseCurrency, platformChart);
}

function renderEvoChart(history, baseCurrency) {
  const el = document.getElementById("evolution-chart"); if (!el) return;
  if (evoChart) evoChart.destroy();
  if (!history?.length) {
    el.style.display='none';
    if (!document.getElementById('evo-chart-empty')) el.insertAdjacentHTML('afterend', '<div class="chart-empty" id="evo-chart-empty">Portfolio history will appear here after you refresh prices. Each refresh saves a snapshot.</div>');
    return;
  }
  el.style.display=''; document.getElementById('evo-chart-empty')?.remove();
  const daily = {};
  for (const h of history) {
    const day = h.date.split("T")[0];
    daily[day] = h.value;
  }
  const entries = Object.entries(daily).sort(([a],[b]) => a.localeCompare(b));
  const labels = entries.map(([d]) => { const dt = new Date(d); return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); });
  const values = entries.map(([,v]) => v);

  evoChart = new Chart(el, {
    type:"line",
    data:{ labels, datasets:[{ label:"Portfolio Value", data:values, borderColor:"#4f8ef7", backgroundColor:"rgba(79,142,247,0.07)", fill:true, tension:0.4, pointRadius:values.length > 30 ? 0 : 2, pointHoverRadius:5, borderWidth:2, pointBackgroundColor:"#4f8ef7" }] },
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false},
      plugins:{ legend:{display:false}, tooltip:{...TOOLTIP, callbacks:{ label:c=>` ${fmtCurrency(c.parsed.y,baseCurrency)}` }} },
      scales:{ x:{grid:{display:false}, ticks:{color:"#8892b0",font:{size:11},maxTicksLimit:12}}, y:{grid:{color:"rgba(99,120,180,0.07)"}, ticks:{color:"#8892b0",font:{size:11},callback:v=>fmtCompact(v,baseCurrency)}, border:{display:false}} }
    }
  });
}

function renderAssetEvoChart(portfolio, baseCurrency) {
  const el = document.getElementById("asset-evolution-chart"); if (!el) return;
  if (assetEvoChart) assetEvoChart.destroy();
  const sel = document.getElementById("asset-evo-select");
  if (!sel) return;
  const prevSel = sel._selected;
  sel.innerHTML = `<option value="">— select an asset —</option>` + portfolio.assets.map(a =>
    `<option value="${a.id}"${a.id === prevSel ? " selected" : ""}>${a.name}</option>`
  ).join("");
  const assetId = sel.value || portfolio.assets[0]?.id;
  if (!assetId) { el.style.display='none'; el.insertAdjacentHTML('afterend', '<div class="chart-empty" id="asset-evo-empty">Add assets and set prices to see value history.</div>'); return; }
  el.style.display=''; document.getElementById('asset-evo-empty')?.remove();
  sel._selected = assetId;
  sel.value = assetId;
  const asset = portfolio.assets.find(a => a.id === assetId);
  if (!asset) return;

  // Collect data points from stored snapshots + transactions
  const points = [];

  // 1. Stored valueHistory snapshots
  for (const h of (asset.valueHistory || [])) {
    points.push({ date: h.date, value: h.value });
  }

  // 2. Derive from transactions: running quantity × pricePerUnit
  const txs = (portfolio.transactions || [])
    .filter(t => t.assetId === assetId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningQty = 0;
  for (const tx of txs) {
    if (tx.type === "buy") runningQty += tx.quantity;
    else if (tx.type === "sell") runningQty -= tx.quantity;
    if (runningQty > 0 && tx.pricePerUnit > 0) {
      const val = convertToBase(runningQty * tx.pricePerUnit, tx.currency || asset.currency, baseCurrency);
      points.push({ date: tx.date, value: val });
    }
  }

  // Merge and deduplicate by day
  const daily = {};
  for (const p of points) {
    const day = typeof p.date === "string" ? p.date.split("T")[0] : p.date;
    daily[day] = p.value;
  }
  const entries = Object.entries(daily).sort(([a],[b]) => a.localeCompare(b));
  if (entries.length < 2) { el.style.display='none'; el.insertAdjacentHTML('afterend', '<div class="chart-empty" id="asset-evo-empty">Not enough data points yet. Add transactions or set a manual price.</div>'); return; }
  el.style.display=''; document.getElementById('asset-evo-empty')?.remove();
  const labels = entries.map(([d]) => { const dt = new Date(d); return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); });
  const values = entries.map(([,v]) => v);
  assetEvoChart = new Chart(el, {
    type:"line",
    data:{ labels, datasets:[{ label:asset.name, data:values, borderColor:"#9b6ef5", backgroundColor:"rgba(155,110,245,0.07)", fill:true, tension:0.4, pointRadius:values.length > 30 ? 0 : 2, pointHoverRadius:5, borderWidth:2, pointBackgroundColor:"#9b6ef5" }] },
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false},
      plugins:{ legend:{display:false}, tooltip:{...TOOLTIP, callbacks:{ label:c=>` ${fmtCurrency(c.parsed.y,baseCurrency)}` }} },
      scales:{ x:{grid:{display:false}, ticks:{color:"#8892b0",font:{size:11},maxTicksLimit:12}}, y:{grid:{color:"rgba(99,120,180,0.07)"}, ticks:{color:"#8892b0",font:{size:11},callback:v=>fmtCompact(v,baseCurrency)}, border:{display:false}} }
    }
  });
  if (sel._changeHandler) sel.removeEventListener("change", sel._changeHandler);
  sel._changeHandler = () => {
    sel._selected = sel.value;
    if (assetEvoChart) { try { assetEvoChart.destroy(); } catch {} assetEvoChart = null; }
    renderAssetEvoChart(portfolio, baseCurrency);
  };
  sel.addEventListener("change", sel._changeHandler);
}

function showToast(msg, type = "info") {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = `toast toast-${type}`; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("toast-show")));
  setTimeout(() => { t.classList.remove("toast-show"); setTimeout(() => t.remove(), 350); }, 3500);
}

let portfolio = null;
let prices = {};
let isLoading = false;

function ensureTransactions() {
  if (!portfolio.transactions) portfolio.transactions = [];
}

function addTransaction(data) {
  ensureTransactions();
  portfolio.transactions.push(data);
  savePortfolio(portfolio);
}

function updateTransaction(id, data) {
  ensureTransactions();
  const i = portfolio.transactions.findIndex(t => t.id === id);
  if (i !== -1) { portfolio.transactions[i] = data; savePortfolio(portfolio); }
}

function deleteTransaction(id) {
  ensureTransactions();
  portfolio.transactions = portfolio.transactions.filter(t => t.id !== id);
  savePortfolio(portfolio);
}

function renderTransactions() {
  const ct = document.getElementById("transactions-content");
  if (!ct) return;
  ensureTransactions();
  const baseCurrency = getBaseCurrency();

  const txs = portfolio.transactions;

  // Filter
  let filtered = txs;
  const q = txFilter.toLowerCase();
  if (q) {
    filtered = filtered.filter(t =>
      (t.assetName||"").toLowerCase().includes(q) ||
      (t.platform||"").toLowerCase().includes(q) ||
      (t.notes||"").toLowerCase().includes(q)
    );
  }

  // Sort
  filtered = filtered.slice().sort((a, b) => {
    let va, vb;
    switch (txSortKey) {
      case "date": va = a.date; vb = b.date; return txSortDir * va.localeCompare(vb);
      case "assetName": return txSortDir * (a.assetName||"").localeCompare(b.assetName||"");
      case "type": return txSortDir * (a.type||"").localeCompare(b.type||"");
      case "quantity": va = a.quantity; vb = b.quantity; break;
      case "pricePerUnit": va = a.pricePerUnit; vb = b.pricePerUnit; break;
      case "totalValue": va = a.totalValue; vb = b.totalValue; break;
      case "platform": return txSortDir * (a.platform||"").localeCompare(b.platform||"");
      default: return 0;
    }
    return txSortDir * ((va||0) - (vb||0));
  });

  const th = (key, label) =>
    `<th data-tx-sort="${key}" class="${txSortKey===key?"sorted":""}">${label} ${txSortKey===key?(txSortDir>0?"↑":"↓"):""}</th>`;

  // Summary
  const totalBuys = txs.filter(t => t.type === "buy").reduce((s, t) => s + (t.totalValue||0), 0);
  const totalSells = txs.filter(t => t.type === "sell").reduce((s, t) => s + (t.totalValue||0), 0);

  ct.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
      <div class="tx-summary">
        <div class="tx-stat">
          <span class="tx-stat-label">Total Buys</span>
          <span class="tx-stat-value" style="color:var(--green)">${fmtCurrency(totalBuys, baseCurrency)}</span>
        </div>
        <div class="tx-stat">
          <span class="tx-stat-label">Total Sells</span>
          <span class="tx-stat-value" style="color:var(--red)">${fmtCurrency(totalSells, baseCurrency)}</span>
        </div>
        <div class="tx-stat">
          <span class="tx-stat-label">Net</span>
          <span class="tx-stat-value" style="color:${totalBuys-totalSells >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtCurrency(totalBuys - totalSells, baseCurrency)}</span>
        </div>
        <div class="tx-stat">
          <span class="tx-stat-label">Total Transactions</span>
          <span class="tx-stat-value">${txs.length}</span>
        </div>
      </div>
      <button class="btn btn-primary" id="btn-add-tx">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Transaction
      </button>
    </div>
    <div class="filter-bar">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="tx-search" placeholder="Search by asset, platform, notes…" value="${txFilter}">
      </div>
      <span class="filter-count">${filtered.length} / ${txs.length} transactions</span>
    </div>
    ${txs.length === 0 ? `
      <div class="empty-state-wrap">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <p>No transactions yet. Record your buys and sells to track your trading history.</p>
        <button class="btn btn-primary" onclick="window.showAddTxModal()">Add your first transaction</button>
      </div>` : `
    <div class="table-wrapper">
      <div class="table-responsive">
        <table class="asset-table">
          <thead><tr>
            ${th("date","Date")}
            ${th("assetName","Asset")}
            ${th("type","Type")}
            ${th("quantity","Quantity")}
            ${th("pricePerUnit","Price/Unit")}
            ${th("totalValue","Total")}
            <th>Currency</th>
            ${th("platform","Platform")}
            <th>Notes</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${filtered.map(t => {
              const asset = portfolio.assets.find(a => a.id === t.assetId);
              const displayName = asset ? asset.name : (t.assetName || "Unknown");
              return `
                <tr data-tx-id="${t.id}">
                  <td style="white-space:nowrap;color:var(--text-1)">${t.date || "—"}</td>
                  <td>
                    <span class="asset-name">${displayName}</span>
                    ${t.assetId && !asset ? '<span style="font-size:0.7rem;color:var(--text-3)">(deleted)</span>' : ""}
                  </td>
                  <td><span class="badge ${t.type === "buy" ? "badge-savings" : "badge-p2p"} tx-type-${t.type}">${t.type === "buy" ? "Buy" : "Sell"}</span></td>
                  <td class="mono" style="color:var(--text-2)">${fmtQty(t.quantity)}</td>
                  <td class="mono">${fmtCurrency(t.pricePerUnit||0, t.currency)}</td>
                  <td class="mono" style="font-weight:500">${fmtCurrency(t.totalValue||0, t.currency)}</td>
                  <td style="color:var(--text-3);font-size:0.8rem">${t.currency || "—"}</td>
                  <td style="color:var(--text-2);font-size:0.8rem">${t.platform || "—"}</td>
                  <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;color:var(--text-3);font-size:0.8rem">${t.notes || ""}</td>
                  <td class="actions-cell">
                    <button class="btn-icon btn-edit" data-tx-action="edit" data-tx-id="${t.id}" title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete" data-tx-action="delete" data-tx-id="${t.id}" title="Delete">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>`}`;

  document.getElementById("btn-add-tx")?.addEventListener("click", () => window.showAddTxModal());
  document.getElementById("tx-search")?.addEventListener("input", e => {
    txFilter = e.target.value;
    renderTransactions();
  });
  ct.querySelectorAll("[data-tx-action='edit']").forEach(b => b.addEventListener("click", () => showTxModal(portfolio.transactions.find(t => t.id === b.dataset.txId))));
  ct.querySelectorAll("[data-tx-action='delete']").forEach(b => b.addEventListener("click", () => {
    const t = portfolio.transactions.find(t => t.id === b.dataset.txId);
    if (t) showConfirmModal(`Delete this ${t.type} of <strong>${fmtQty(t.quantity)} ${t.assetName}</strong> from ${t.date}?`, () => {
      deleteTransaction(t.id);
      renderAll();
    });
  }));
  ct.querySelectorAll("th[data-tx-sort]").forEach(th => th.addEventListener("click", () => {
    if (txSortKey === th.dataset.txSort) txSortDir *= -1; else { txSortKey = th.dataset.txSort; txSortDir = -1; }
    renderTransactions();
  }));
}

function showTxModal(tx) {
  const isEdit = tx !== null;
  const platforms = getPlatforms();
  const baseCurrency = getBaseCurrency();
  const assets = portfolio.assets || [];

  const html = `
    <div class="modal">
      <div class="modal-header">
        <h2>${isEdit ? "Edit Transaction" : "Add Transaction"}</h2>
        <button class="modal-close" id="mc">&times;</button>
      </div>
      <form id="tx-form" class="modal-form">
        <div class="form-group">
          <label>Asset</label>
          <select id="tx-asset" required>
            <option value="">— select asset —</option>
            ${assets.map(a => `<option value="${a.id}"${tx?.assetId===a.id?" selected":""}>${a.name}${a.ticker ? ` (${a.ticker})` : ""}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select id="tx-type">
              <option value="buy"${tx?.type==="buy"?" selected":""}>Buy</option>
              <option value="sell"${tx?.type==="sell"?" selected":""}>Sell</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="tx-date" value="${tx?.date || new Date().toISOString().split("T")[0]}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Quantity / Units</label>
            <input type="number" id="tx-qty" step="any" min="0" value="${tx?.quantity||""}" required placeholder="0">
          </div>
          <div class="form-group">
            <label>Price per Unit</label>
            <input type="number" id="tx-price" step="any" min="0" value="${tx?.pricePerUnit||""}" required placeholder="0.00">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Total Value</label>
            <input type="number" id="tx-total" step="any" min="0" value="${tx?.totalValue||""}" placeholder="Auto-calculated" readonly style="opacity:0.7">
            <span class="form-hint" id="tx-total-hint">Auto-calculated from quantity × price</span>
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="tx-currency">
              ${CURRENCIES.map(c => `<option value="${c}"${(tx?.currency||baseCurrency)===c?" selected":""}>${c}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Platform / Broker</label>
          <select id="tx-platform">
            <option value="">— none —</option>
            ${platforms.map(p => `<option value="${p}"${tx?.platform===p?" selected":""}>${p}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="tx-notes" placeholder="Any notes about this transaction…">${tx?.notes||""}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="mc2">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save Changes" : "Add Transaction"}</button>
        </div>
      </form>
    </div>`;
  showModal(html);
  document.getElementById("mc").addEventListener("click", hideModal);
  document.getElementById("mc2").addEventListener("click", hideModal);

  // Auto-calculate total
  const qtyEl = document.getElementById("tx-qty");
  const priceEl = document.getElementById("tx-price");
  const totalEl = document.getElementById("tx-total");
  function updateTotal() {
    const q = parseFloat(qtyEl.value) || 0;
    const p = parseFloat(priceEl.value) || 0;
    totalEl.value = q * p;
  }
  qtyEl.addEventListener("input", updateTotal);
  priceEl.addEventListener("input", updateTotal);

  // Auto-fill from asset
  document.getElementById("tx-asset").addEventListener("change", e => {
    const asset = assets.find(a => a.id === e.target.value);
    if (asset) {
      const curEl = document.getElementById("tx-currency");
      if (!tx) curEl.value = asset.currency || baseCurrency;
      const platEl = document.getElementById("tx-platform");
      if (!tx && asset.platform && !platEl.value) platEl.value = asset.platform;
    }
  });

  document.getElementById("tx-form").addEventListener("submit", e => {
    e.preventDefault();
    const assetEl = document.getElementById("tx-asset");
    const asset = assets.find(a => a.id === assetEl.value);
    const data = {
      id: tx?.id || crypto.randomUUID(),
      assetId: assetEl.value,
      assetName: asset ? asset.name : document.getElementById("tx-asset").options[assetEl.selectedIndex]?.text || "Unknown",
      type: document.getElementById("tx-type").value,
      date: document.getElementById("tx-date").value,
      quantity: parseFloat(document.getElementById("tx-qty").value) || 0,
      pricePerUnit: parseFloat(document.getElementById("tx-price").value) || 0,
      totalValue: parseFloat(document.getElementById("tx-total").value) || 0,
      currency: document.getElementById("tx-currency").value,
      platform: document.getElementById("tx-platform").value || undefined,
      notes: document.getElementById("tx-notes").value.trim() || undefined,
      createdAt: tx?.createdAt || new Date().toISOString()
    };
    if (isEdit) updateTransaction(data.id, data);
    else addTransaction(data);
    // Use transaction price as current price for the asset
    if (data.pricePerUnit > 0) prices[data.assetId] = data.pricePerUnit;
    hideModal();
    savePortfolioSnapshot();
    renderAll();
  });
}

window.showAddTxModal = function() { showTxModal(null); };

function renderAll() {
  renderDashboard(portfolio, prices);
  renderTable(portfolio, prices, handleEditAsset, handleDeleteAsset);
  renderTransactions();
  renderPriceHistory();
  destroyCharts();
  renderCharts(portfolio, prices, loadHistory());
}

async function refreshPrices() {
  if (isLoading || portfolio.assets.length === 0) return;
  isLoading = true;
  const btn = document.getElementById("btn-refresh");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }
  try {
    await fetchFxRates(getBaseCurrency());
    prices = await fetchAllPrices(portfolio.assets);
    savePortfolioSnapshot();
    renderAll();
    showToast("Prices updated", "success");
  } catch (e) {
    console.error(e); showToast("Error refreshing prices — some may be stale", "error");
  } finally {
    isLoading = false;
    if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
  }
}

window.showAddAssetModal = function() {
  showAssetModal(null, async data => {
    portfolio.assets.push(data);
    savePortfolio(portfolio);
    await refreshPrices();
  });
};

function handleEditAsset(id) {
  const a = portfolio.assets.find(x => x.id === id); if (!a) return;
  showAssetModal(a, async data => {
    const i = portfolio.assets.findIndex(x => x.id === id);
    if (i !== -1) { portfolio.assets[i] = data; savePortfolio(portfolio); await refreshPrices(); }
  });
}

function handleDeleteAsset(id) {
  const a = portfolio.assets.find(x => x.id === id); if (!a) return;
  showConfirmModal(`Delete "<strong>${a.name}</strong>"? This cannot be undone.`, async () => {
    portfolio.assets = portfolio.assets.filter(x => x.id !== id);
    savePortfolio(portfolio); delete prices[id]; savePortfolioSnapshot(); renderAll();
  });
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === `tab-${tab}`));
  if (tab === "charts") { destroyCharts(); renderCharts(portfolio, prices, loadHistory()); }
}

function renderPriceHistory() {
  const el = document.getElementById("price-history-content");
  const assets = portfolio.assets;
  if (assets.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-3);padding:60px"><p>No assets yet. Add some assets to track price history.</p></div>`;
    return;
  }
  const selId = (el._selectedAssetId && assets.find(a => a.id === el._selectedAssetId)) ? el._selectedAssetId : assets[0].id;
  const asset = assets.find(a => a.id === selId);
  const history = asset?.priceHistory || [];
  el.innerHTML = `
    <div class="section-header">
      <h2>Price History</h2>
      <div class="form-group" style="margin:0;min-width:260px">
        <select id="ph-asset">
          ${assets.map(a => `<option value="${a.id}"${a.id===selId?" selected":""}>${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:16px">
      ${history.length === 0
        ? `<p style="text-align:center;color:var(--text-3);padding:40px">No manual price entries for this asset yet.</p>`
        : `<div class="table-wrapper"><div class="table-responsive"><table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Price</th>
                <th>Currency</th>
                <th style="width:50px"></th>
              </tr>
            </thead>
            <tbody>
              ${[...history].reverse().map(e => `
                <tr>
                  <td>${e.date}</td>
                  <td class="mono" style="font-weight:500">${fmtCurrency(e.price, asset.currency)}</td>
                  <td>${asset.currency || 'EUR'}</td>
                  <td><button class="btn-icon btn-delete" data-ph-del="${asset.id}" data-ph-ts="${e.timestamp}" title="Delete entry"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
                </tr>`).join('')}
            </tbody>
          </table></div></div>`
      }
    </div>`;
  const sel = document.getElementById("ph-asset");
  if (sel) {
    sel.addEventListener("change", () => {
      el._selectedAssetId = sel.value;
      renderPriceHistory();
    });
  }
  el.querySelectorAll("[data-ph-del]").forEach(btn => btn.addEventListener("click", () => {
    const assetId = btn.dataset.phDel;
    const ts = parseInt(btn.dataset.phTs);
    const a = portfolio.assets.find(x => x.id === assetId);
    if (!a || !a.priceHistory) return;
    a.priceHistory = a.priceHistory.filter(e => e.timestamp !== ts);
    if (a.priceHistory.length === 0) {
      delete a.manualPrice;
      delete a.manualPriceDate;
      delete prices[a.id];
    }
    savePortfolio(portfolio);
    renderPriceHistory();
  }));
}

document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.getElementById("modal-overlay").classList.contains("active")) return;
  switch (e.key.toLowerCase()) {
    case "n": e.preventDefault(); window.showAddAssetModal(); break;
    case "r": e.preventDefault(); refreshPrices(); break;
    case "1": switchTab("dashboard"); document.querySelector('[data-tab="dashboard"]').click(); break;
    case "2": switchTab("assets"); document.querySelector('[data-tab="assets"]').click(); break;
    case "3": switchTab("charts"); document.querySelector('[data-tab="charts"]').click(); break;
    case "4": switchTab("transactions"); document.querySelector('[data-tab="transactions"]').click(); break;
    case "5": switchTab("history"); document.querySelector('[data-tab="history"]').click(); break;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  portfolio = loadPortfolio();
  if (!portfolio) {
    portfolio = { version:1, baseCurrency: getBaseCurrency(), updatedAt: new Date().toISOString(), assets: [], transactions: [] };
    savePortfolio(portfolio);
  }
  if (!portfolio.transactions) portfolio.transactions = [];
  portfolio.baseCurrency = getBaseCurrency();
  // migrate manualPrice -> priceHistory
  portfolio.assets.forEach(a => {
    if (!a.priceHistory) a.priceHistory = [];
    if ((a.manualPrice !== undefined && a.manualPrice !== null) && a.priceHistory.length === 0) {
      a.priceHistory.push({ price: a.manualPrice, date: a.manualPriceDate || new Date().toISOString().slice(0,10), timestamp: Date.now() });
    }
  });

  renderAll();

  document.getElementById("btn-add-asset").addEventListener("click", () => window.showAddAssetModal());
  document.getElementById("btn-refresh").addEventListener("click", refreshPrices);
  document.getElementById("btn-export").addEventListener("click", () => exportPortfolio(portfolio));
  document.getElementById("btn-import").addEventListener("click", () => {
    showImportModal(async file => {
      try {
        portfolio = await importPortfolio(file);
        portfolio.baseCurrency = getBaseCurrency();
        if (!portfolio.transactions) portfolio.transactions = [];
        savePortfolio(portfolio); prices = {};
        await refreshPrices();
        showToast("Portfolio imported successfully", "success");
      } catch (e) { showToast(e.message, "error"); }
    });
  });
  document.getElementById("btn-settings").addEventListener("click", showSettingsModal);
  document.querySelectorAll(".tab-btn").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  if (portfolio.assets.length > 0) {
    await fetchFxRates(getBaseCurrency());
    await refreshPrices();
  }
});
