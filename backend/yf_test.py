import yfinance as yf
import json
import pandas as pd

ticker = yf.Ticker("AAPL")
info = ticker.info
print(f"PE: {info.get('trailingPE')} or {info.get('forwardPE')}")
print(f"Industry: {info.get('industry')}")
print(f"Target Price: {info.get('targetMeanPrice')}")

fin = ticker.financials
if 'Net Income' in fin.index:
    net_income = fin.loc['Net Income'].dropna()
    print("Net Income:")
    print(net_income)
else:
    print("Net income not found")

cal = ticker.calendar
if cal is not None:
    print("Calendar:")
    print(cal)
else:
    print("No calendar")
