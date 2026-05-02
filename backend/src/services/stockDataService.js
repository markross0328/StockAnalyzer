const env = require("../config/env");

const stockCache = new Map();

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeGrowthFromIncomeReports(reports) {
  if (!Array.isArray(reports) || reports.length < 2) {
    return null;
  }

  const first = toNumber(reports[0]?.netIncome);
  const second = toNumber(reports[1]?.netIncome);
  if (!first || !second || second === 0) {
    return null;
  }

  return ((first - second) / Math.abs(second)) * 100;
}

function getLatestIntradayClose(intradayPayload) {
  const series = intradayPayload?.["Time Series (1min)"];
  if (!series || typeof series !== "object") {
    return null;
  }

  const latestTimestamp = Object.keys(series).sort().at(-1);
  if (!latestTimestamp) {
    return null;
  }

  return toNumber(series[latestTimestamp]?.["4. close"]);
}

function mapStockPayload({ ticker, quote, intraday, overview, incomeStatement }) {
  const growth = computeGrowthFromIncomeReports(incomeStatement?.annualReports || []);
  const pe = toNumber(overview?.PERatio);
  const intradayPrice = getLatestIntradayClose(intraday);
  const quotePrice = toNumber(quote?.["05. price"]);
  const price = intradayPrice ?? quotePrice;
  const previousClose = toNumber(quote?.["08. previous close"]);
  const movePercent = toNumber(quote?.["10. change percent"]?.replace("%", ""));

  return {
    ticker,
    name: overview?.Name || ticker,
    industry: overview?.Industry || "Unknown",
    price,
    previousClose,
    movePercent,
    growth,
    pe,
    marketCap: toNumber(overview?.MarketCapitalization),
    source: "alphavantage",
    updatedAt: new Date().toISOString(),
  };
}

async function fetchAlphaVantage(functionName, ticker) {
  const params = new URLSearchParams({
    function: functionName,
    symbol: ticker,
    apikey: env.alphaVantageApiKey,
  });

  const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.Note) {
    throw new Error("Alpha Vantage rate limit reached. Please retry in one minute.");
  }
  if (payload.Information) {
    throw new Error(payload.Information);
  }
  if (payload["Error Message"]) {
    throw new Error("Ticker not found in Alpha Vantage.");
  }

  return payload;
}

async function fetchIntradayBestEffort(ticker) {
  try {
    return await fetchAlphaVantage("TIME_SERIES_INTRADAY", ticker);
  } catch {
    // Intraday is optional for pricing freshness. We fall back to GLOBAL_QUOTE.
    return {};
  }
}

async function getLiveStockData(tickerRaw) {
  if (!env.alphaVantageApiKey) {
    throw new Error("ALPHAVANTAGE_API_KEY is not configured.");
  }

  const ticker = tickerRaw.trim().toUpperCase();
  if (!ticker) {
    throw new Error("Ticker is required.");
  }

  const cached = stockCache.get(ticker);
  if (cached && Date.now() - cached.cachedAt < env.stockCacheTtlMs) {
    return cached.data;
  }

  const [quote, intraday, overview, incomeStatement] = await Promise.all([
    fetchAlphaVantage("GLOBAL_QUOTE", ticker),
    fetchIntradayBestEffort(ticker),
    fetchAlphaVantage("OVERVIEW", ticker),
    fetchAlphaVantage("INCOME_STATEMENT", ticker),
  ]);

  const data = mapStockPayload({
    ticker,
    quote: quote["Global Quote"] || {},
    intraday,
    overview,
    incomeStatement,
  });

  if (!data.price && !data.pe && !data.growth) {
    throw new Error("No live stock data returned for this ticker.");
  }

  stockCache.set(ticker, {
    cachedAt: Date.now(),
    data,
  });

  return data;
}

module.exports = {
  getLiveStockData,
};
