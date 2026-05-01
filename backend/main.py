from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from stock_service import get_basic_metrics, get_detailed_metrics, StockAPIError

app = FastAPI(title="Stock Analyzer API")

# Configure CORS so the Vite frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stock/{ticker}")
def read_stock_metrics(ticker: str):
    """
    Returns basic metrics for a stock ticker.
    """
    try:
        data = get_basic_metrics(ticker.upper())
        return data
    except StockAPIError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/stock/{ticker}/details")
def read_stock_details(ticker: str):
    """
    Returns in-depth metrics for a stock ticker (target price, earnings, peers).
    """
    try:
        data = get_detailed_metrics(ticker.upper())
        return data
    except StockAPIError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
