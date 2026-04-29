# Stock Analyzer

## Overview
The Stock Analyzer is an application that allows users to query a stock by its ticker symbol and display critical financial metrics for evaluation. This tool is designed to help users quickly assess stock performance based on Peter Lynch's investment principles, primarily comparing a company's P/E ratio to its growth rate.

## Minimum Viable Product (MVP) Requirements
- **Stock Search**: Query a stock by its ticker symbol.
- **Error Handling**: Display a pop-up error if the queried ticker symbol is not found.
- **Core Metrics Display**:
  - **Growth Rate**: Computed from net income over time.
    - *Equation*: `Growth Rate = [(Ending Value - Beginning Value) / Beginning Value] * 100`
    - *Implementation*: Call the API's income endpoint to get Net Income for the last 2 years to calculate the 1-year growth rate.
  - **P/E Ratio**: Target companies with P/E ratios less than their growth rate.
  - **PEG Ratio (Growth over P/E)**: Ideally, the growth rate should be higher than the P/E ratio (PEG > 1).

## Nice-to-Have Features
- **Favorites System**: Allow users to favorite a stock and store it in a database.
- **Favorites Dashboard**: Display the user's favorite stocks along with the core metrics above.
- **Industry Tracking**: When storing a favorite stock, include the stock's industry (e.g., tech, healthcare, clothing, auto).
- **Industry Filtering**: Allow the user to search/filter favorited stocks by industry.

## Next-Level Enhancements
- **Authentication & Routing**: Implement user login and routing (e.g., a dedicated page for user favorites or an in-depth stock view).
- **User-Specific Favorites**: Track favorited stocks per individual user rather than globally.
- **Advanced Metrics**: Add expert target prices, upcoming earnings, peers, and other specialized data.

## API Recommendations
- **Finnhub**: High rate limits (60 requests/min).
- **Alpha Vantage**: Great data, but free tier is limited to 25 requests/day per API key.
  - *Example*: `https://www.alphavantage.co/query?function=OVERVIEW&symbol=IBM&apikey=demo` (Good for P/E, 52-week high/low, industry, etc.)
- **yfinance (Python)**: Create a custom backend API leveraging the `yfinance` library for more extensive data fetching without strict rate limits.
*(Note: Ensure any resource leveraged returns current stock data for US markets.)*

## Deliverables & Milestones
- **Paper Prototype & Project Outline**: 
  - Detail each work item/ticket and provide a paper prototype.
  - **Due**: Saturday, Apr 25th @ 5:00 PM.
- **Final Submission & Presentation**: 
  - Requires a production-ready README, unit tests, and a demo screenshare.
  - **Due**: Friday, May 1st @ 12:00 PM.
- **Individual Project Brief**: 
  - Each team member must submit a brief (Doc or PDF) outlining their individual contributions, lessons learned, and hiccups.
  - Include the GitHub repository link.
  - Detail how you would plan and implement a similar project in the future.

## Local Setup

### Frontend
The frontend is built with Vite + React. Jayden's UI is implemented in:
- `frontend/src/App.jsx` - React components, state, demo data, dashboard/auth views.
- `frontend/src/App.css` - dashboard and auth styling.
- `frontend/src/index.css` - global reset and app theme base.
- `stock-ui-preview.png` - screenshot for README/submission use.

The React app currently uses demo stock/user data in `frontend/src/App.jsx`. Mark can replace the `STOCKS` and `INITIAL_USERS` demo objects with backend API calls, while Ian can connect the auth view to the real auth/session flow.

To get started:
```bash
cd frontend
npm install
npm run dev
```

### Backend (If applicable)
*Instructions for setting up the backend (Node.js/Python) will be added here by the development team.*

---

*This project structure is ready for the development team to implement the core logic and begin pushing code.*
