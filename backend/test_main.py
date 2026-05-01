from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

def test_get_stock_metrics_success():
    # Mocking the Alpha Vantage responses
    def mock_requests_get(url, params):
        class MockResponse:
            def __init__(self, json_data):
                self._json_data = json_data
            def json(self):
                return self._json_data

        if params.get("function") == "OVERVIEW":
            return MockResponse({
                "Symbol": "IBM",
                "Industry": "Information Technology",
                "PERatio": "10.5"
            })
        elif params.get("function") == "INCOME_STATEMENT":
            return MockResponse({
                "annualReports": [
                    {"netIncome": "1100000"}, # Ending Value (Recent)
                    {"netIncome": "1000000"}  # Beginning Value (Previous Year)
                ]
            })
        return MockResponse({})

    with patch("stock_service.requests.get", side_effect=mock_requests_get):
        response = client.get("/api/stock/IBM")
        assert response.status_code == 200
        data = response.json()
        
        assert data["symbol"] == "IBM"
        assert data["industry"] == "Information Technology"
        assert data["pe_ratio"] == 10.5
        
        # Growth Rate = ((1100000 - 1000000) / 1000000) * 100 = 10.0%
        assert data["growth_rate"] == 10.0
        
        # PEG = Growth Rate / PE = 10.0 / 10.5 = 0.95
        assert data["peg_ratio"] == 0.95

def test_get_stock_metrics_not_found():
    def mock_requests_get(url, params):
        class MockResponse:
            def __init__(self, json_data):
                self._json_data = json_data
            def json(self):
                return self._json_data
        
        # Simulating an empty response or an error string returned by the API
        return MockResponse({})

    with patch("stock_service.requests.get", side_effect=mock_requests_get):
        response = client.get("/api/stock/INVALID")
        assert response.status_code == 404
        assert "Ticker not found" in response.json()["detail"]

def test_get_detailed_metrics_success():
    def mock_requests_get(url, params):
        class MockResponse:
            def __init__(self, json_data):
                self._json_data = json_data
            def json(self):
                return self._json_data

        if params.get("function") == "OVERVIEW":
            return MockResponse({
                "Symbol": "AAPL",
                "AnalystTargetPrice": "200.50"
            })
        elif params.get("function") == "EARNINGS":
            return MockResponse({
                "quarterlyEarnings": [
                    {"reportedDate": "2026-07-25"}
                ]
            })
        return MockResponse({})

    with patch("stock_service.requests.get", side_effect=mock_requests_get):
        response = client.get("/api/stock/AAPL/details")
        assert response.status_code == 200
        data = response.json()
        
        assert data["symbol"] == "AAPL"
        assert data["target_price"] == "200.50"
        assert "2026-07-25" in data["upcoming_earnings"]
        assert "MSFT" in data["peers"] # Mocked behavior for AAPL
