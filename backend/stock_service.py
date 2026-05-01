import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "demo")
BASE_URL = "https://www.alphavantage.co/query"

class StockAPIError(Exception):
    pass

def get_basic_metrics(ticker: str):
    """
    Fetches the overview, income statement, and global quote for a ticker.
    Calculates 1-yr growth rate, P/E, PEG, and returns UI-ready data.
    """
    # 1. Fetch Overview (for P/E, Industry, Description, Name)
    overview_params = {
        "function": "OVERVIEW",
        "symbol": ticker,
        "apikey": API_KEY
    }
    overview_res = requests.get(BASE_URL, params=overview_params)
    overview_data = overview_res.json()

    if not overview_data or "Symbol" not in overview_data:
        if "Information" in overview_data or "Note" in overview_data:
            raise StockAPIError("Alpha Vantage API rate limit reached.")
        raise StockAPIError(f"Ticker {ticker} not found.")

    industry = overview_data.get("Industry", "N/A")
    name = overview_data.get("Name", ticker)
    description = overview_data.get("Description", "No description available.")
    pe_ratio_str = overview_data.get("PERatio", "None")
    
    try:
        pe_ratio = float(pe_ratio_str)
    except (ValueError, TypeError):
        pe_ratio = None

    # 2. Fetch Income Statement (for Growth Rate and Sparkline)
    income_params = {
        "function": "INCOME_STATEMENT",
        "symbol": ticker,
        "apikey": API_KEY
    }
    income_res = requests.get(BASE_URL, params=income_params)
    income_data = income_res.json()

    annual_reports = income_data.get("annualReports", [])
    
    growth_rate = None
    peg_ratio = None
    income_history = []

    if annual_reports:
        # Extract up to 5 years of net income, ordered oldest to newest for the sparkline
        for report in reversed(annual_reports[:5]):
            try:
                income_history.append(float(report.get("netIncome", 0)))
            except (ValueError, TypeError):
                pass

    if len(annual_reports) >= 2:
        try:
            # First element is usually the most recent (Ending Value)
            # Second element is the previous year (Beginning Value)
            ending_value = float(annual_reports[0].get("netIncome", 0))
            beginning_value = float(annual_reports[1].get("netIncome", 0))

            if beginning_value != 0:
                growth_rate = ((ending_value - beginning_value) / abs(beginning_value)) * 100
                
            if growth_rate is not None and pe_ratio is not None and pe_ratio != 0:
                peg_ratio = growth_rate / pe_ratio
                
        except (ValueError, TypeError):
            pass

    # 3. Fetch Global Quote (for current price and daily move)
    quote_params = {
        "function": "GLOBAL_QUOTE",
        "symbol": ticker,
        "apikey": API_KEY
    }
    quote_res = requests.get(BASE_URL, params=quote_params)
    quote_data = quote_res.json().get("Global Quote", {})

    price = quote_data.get("05. price", "N/A")
    if price != "N/A":
        try:
            price = f"${float(price):.2f}"
        except ValueError:
            pass

    change_percent = quote_data.get("10. change percent", "N/A")

    return {
        "symbol": ticker,
        "name": name,
        "industry": industry,
        "description": description,
        "price": price,
        "change_percent": change_percent,
        "income_history": income_history,
        "pe_ratio": round(pe_ratio, 2) if pe_ratio is not None else None,
        "growth_rate": round(growth_rate, 2) if growth_rate is not None else None,
        "peg_ratio": round(peg_ratio, 2) if peg_ratio is not None else None,
    }


def get_detailed_metrics(ticker: str):
    """
    Fetches target prices, upcoming earnings, real events via news sentiment,
    and dynamically fetches metrics for peer companies.
    """
    # 1. Fetch Overview (for Target Price)
    overview_params = {
        "function": "OVERVIEW",
        "symbol": ticker,
        "apikey": API_KEY
    }
    overview_res = requests.get(BASE_URL, params=overview_params)
    overview_data = overview_res.json()

    if not overview_data or "Symbol" not in overview_data:
        raise StockAPIError("Ticker not found or API limit reached.")

    target_price = overview_data.get("AnalystTargetPrice", "N/A")
    if target_price != "N/A":
        try:
            target_price = f"${float(target_price):.2f}"
        except ValueError:
            pass

    # 2. Fetch Earnings Calendar (for upcoming earnings)
    earnings_params = {
        "function": "EARNINGS",
        "symbol": ticker,
        "apikey": API_KEY
    }
    earnings_res = requests.get(BASE_URL, params=earnings_params)
    earnings_data = earnings_res.json()

    upcoming_earnings = []
    quarterly_earnings = earnings_data.get("quarterlyEarnings", [])
    if quarterly_earnings:
        upcoming_earnings.append(quarterly_earnings[0].get("reportedDate", "N/A"))

    # 3. Fetch News Sentiment (for events)
    news_params = {
        "function": "NEWS_SENTIMENT",
        "tickers": ticker,
        "limit": 3,
        "apikey": API_KEY
    }
    news_res = requests.get(BASE_URL, params=news_params)
    news_data = news_res.json()
    
    events = []
    feed = news_data.get("feed", [])
    for article in feed[:3]:
        events.append(article.get("title", "No headline available."))

    if not events:
        events = ["No recent events or news found."]

    # 4. Peers (Dynamically gathered)
    # Since Alpha Vantage doesn't have a reliable peers endpoint, we use a mock list
    # but fetch REAL data for them.
    if ticker.upper() == "AAPL":
        peers = ["MSFT", "GOOGL", "AMZN"]
    elif ticker.upper() == "MSFT":
        peers = ["AAPL", "GOOGL", "ORCL"]
    elif ticker.upper() == "TSLA":
        peers = ["F", "GM", "RIVN"]
    elif ticker.upper() == "UNH":
        peers = ["HUM", "CI", "ELV"]
    elif ticker.upper() == "F":
        peers = ["GM", "TSLA", "TM"]
    elif ticker.upper() == "NKE":
        peers = ["LULU", "DECK", "UAA"]
    else:
        peers = ["AAPL", "META", "NFLX"]

    peer_data = {}
    valid_pes = []
    
    for p_ticker in peers:
        try:
            p_metrics = get_basic_metrics(p_ticker)
            peer_data[p_ticker] = p_metrics
            if p_metrics.get("pe_ratio") is not None:
                valid_pes.append(p_metrics["pe_ratio"])
        except Exception:
            # If a peer fails, skip it so the whole request doesn't crash
            pass

    peer_pe = "N/A"
    if valid_pes:
        valid_pes.sort()
        mid = len(valid_pes) // 2
        if len(valid_pes) % 2 == 0:
            median_pe = (valid_pes[mid - 1] + valid_pes[mid]) / 2.0
        else:
            median_pe = valid_pes[mid]
        peer_pe = round(median_pe, 1)

    return {
        "symbol": ticker,
        "target_price": target_price,
        "upcoming_earnings": upcoming_earnings,
        "events": events,
        "peers": peers,
        "peerPe": peer_pe,
        "peerData": peer_data
    }
