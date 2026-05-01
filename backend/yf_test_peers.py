import yfinance as yf
ticker = yf.Ticker("AAPL")
print("sector:", ticker.info.get('sector'))
print("related:", ticker.info.get('relatedSymbol', 'None'))
