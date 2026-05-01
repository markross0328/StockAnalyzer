import { useMemo, useState, useEffect } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Check,
  FileChartColumn,
  Gauge,
  LineChart,
  ListFilter,
  LogIn,
  Scale,
  ScanSearch,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import './App.css'

// Demo users. Ian's auth can replace this with the real session user.
const INITIAL_USERS = {
  Avery: { name: 'Avery Chen', initials: 'AC', favorites: ['MSFT', 'UNH', 'F'] },
  Maya: { name: 'Maya Brooks', initials: 'MB', favorites: ['AAPL', 'NKE'] },
}

const INDUSTRIES = ['All', 'Technology', 'Healthcare', 'Auto', 'Consumer']

// Metric helpers keep the Lynch-rule calculations in one predictable place.
function growthOverPe(stock) {
  if (stock.growth == null || stock.pe == null) return null
  return stock.growth / stock.pe
}

function formatRatio(value) {
  if (value == null) return 'N/A'
  return value.toFixed(2)
}

function signalClass(stock) {
  const ratio = growthOverPe(stock)
  if (ratio == null) return ''
  if (ratio >= 1) return 'pass'
  if (ratio >= 0.6) return 'warn'
  return 'bad'
}

function signalText(stock) {
  const ratio = growthOverPe(stock)
  if (ratio == null) return 'Data unavailable'
  return ratio >= 1 ? 'Growth clears P/E' : 'P/E ahead of growth'
}

// Convert net income history into SVG paths for the sparkline chart.
function pathFromIncome(income) {
  const min = Math.min(...income)
  const max = Math.max(...income)
  const points = income.map((value, index) => {
    const x = 12 + index * (236 / (income.length - 1))
    const y = 110 - ((value - min) / (max - min || 1)) * 92
    return [x, y]
  })
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
  return { line, area: `${line} L 248 118 L 12 118 Z` }
}

function App() {
  const [view, setView] = useState('dashboard')
  const [authMode, setAuthMode] = useState('login')

  // Demo app state. Backend/auth integration can replace these with API/session data.
  const [fetchedStocks, setFetchedStocks] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState(INITIAL_USERS)
  const [currentUser, setCurrentUser] = useState('Avery')
  const [currentTicker, setCurrentTicker] = useState('MSFT')
  const [tickerInput, setTickerInput] = useState('MSFT')
  const [industryFilter, setIndustryFilter] = useState('All')
  const [showError, setShowError] = useState(false)

  const activeUser = users[currentUser]
  const activeStock = fetchedStocks[currentTicker] || {
    name: 'Loading...', industry: '', price: '', move: '', growth: 0, pe: 0, income: [0, 0], events: [], peers: [], thesis: '', target: '', earnings: '', peerPe: ''
  }

  const favoriteTickers = activeUser.favorites
  const filteredFavorites = favoriteTickers.filter(
    (ticker) => fetchedStocks[ticker] && (industryFilter === 'All' || fetchedStocks[ticker].industry === industryFilter),
  )

  // Recompute portfolio summary cards when the current user's favorites change.
  const summary = useMemo(() => {
    const industryCounts = favoriteTickers.reduce((counts, ticker) => {
      const industry = fetchedStocks[ticker]?.industry || 'Unknown'
      counts[industry] = (counts[industry] || 0) + 1
      return counts
    }, {})
    const topIndustry = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    const passCount = favoriteTickers.filter((ticker) => fetchedStocks[ticker] && growthOverPe(fetchedStocks[ticker]) >= 1).length
    const avgPeg =
      favoriteTickers.reduce((total, ticker) => total + (fetchedStocks[ticker] ? growthOverPe(fetchedStocks[ticker]) : 0), 0) /
      (favoriteTickers.length || 1)

    return {
      saved: favoriteTickers.length,
      passCount,
      topIndustry,
      avgPeg: formatRatio(avgPeg),
    }
  }, [favoriteTickers])

  const sparkline = pathFromIncome(activeStock.income)

  // Opens the auth screen in either login or signup mode.
  function openAuth(mode) {
    setAuthMode(mode)
    setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Handles ticker searches and opens the not-found modal for unknown symbols.
  
  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      setIsLoading(true);
      const tickersToFetch = [...new Set([currentTicker, ...users[currentUser].favorites])];
      const stocksData = { ...fetchedStocks };
      
      for (const ticker of tickersToFetch) {
        if (stocksData[ticker]) continue; // Already fetched
        try {
          const basicRes = await fetch(`http://localhost:8000/api/stock/${ticker}`);
          if (!basicRes.ok) continue;
          const basic = await basicRes.json();
          
          const detailRes = await fetch(`http://localhost:8000/api/stock/${ticker}/details`);
          const detail = detailRes.ok ? await detailRes.json() : {};
          
          const peersArray = detail.peers || [];
          const peerData = detail.peerData || {};
          
          // Merge peerData
          Object.assign(stocksData, peerData);
          
          stocksData[ticker] = {
            name: basic.name || basic.symbol,
            industry: basic.industry,
            price: basic.price || 'N/A',
            move: basic.change_percent || 'N/A',
            growth: basic.growth_rate,
            pe: basic.pe_ratio,
            income: basic.income_history && basic.income_history.length >= 2 ? basic.income_history : [0, 0],
            thesis: basic.description || 'No description available.',
            target: detail.target_price || 'N/A',
            earnings: (detail.upcoming_earnings && detail.upcoming_earnings[0]) || 'N/A',
            peerPe: detail.peerPe || 'N/A',
            peers: peersArray,
            events: detail.events || ['Live data pulled from Alpha Vantage']
          };
        } catch (e) {
           console.error("Failed to load", ticker, e);
        }
      }
      if (active) {
        setFetchedStocks(stocksData);
        setIsLoading(false);
      }
    }
    loadInitialData();
    return () => { active = false; };
  }, [currentUser]); // Run on mount and if user changes

async function handleSearch(event) {
    event.preventDefault()
    const ticker = tickerInput.trim().toUpperCase()
    if (!ticker) return

    setShowError(false)

    try {
      const basicRes = await fetch(`http://localhost:8000/api/stock/${ticker}`)
      if (!basicRes.ok) throw new Error('Not found')
      const basic = await basicRes.json()

      const detailRes = await fetch(`http://localhost:8000/api/stock/${ticker}/details`)
      const detail = detailRes.ok ? await detailRes.json() : {}

      const newStock = {
        name: basic.name || basic.symbol,
        industry: basic.industry,
        price: basic.price || 'N/A',
        move: basic.change_percent || 'N/A',
        growth: basic.growth_rate,
        pe: basic.pe_ratio,
        income: basic.income_history && basic.income_history.length >= 2 ? basic.income_history : [0, 0],
        thesis: basic.description || 'No description available.',
        target: detail.target_price || 'N/A',
        earnings: (detail.upcoming_earnings && detail.upcoming_earnings[0]) || 'N/A',
        peerPe: detail.peerPe || 'N/A',
        peers: detail.peers || [],
        events: detail.events || ['Live data pulled from Alpha Vantage']
      }

      setFetchedStocks(prev => ({ ...prev, ...(detail.peerData || {}), [ticker]: newStock }))
      setCurrentTicker(ticker)
      setTickerInput(ticker)
      setShowError(false)
    } catch (err) {
      setShowError(true)
    }
  }

  function toggleFavorite() {
    setUsers((previousUsers) => {
      const favorites = previousUsers[currentUser].favorites
      const updatedFavorites = favorites.includes(currentTicker)
        ? favorites.filter((ticker) => ticker !== currentTicker)
        : [...favorites, currentTicker]

      return {
        ...previousUsers,
        [currentUser]: {
          ...previousUsers[currentUser],
          favorites: updatedFavorites,
        },
      }
    })
  }

  function openFavorite(ticker) {
    setCurrentTicker(ticker)
    setTickerInput(ticker)
    scrollToSection('searchForm')
  }

  function analyzeMsft() {
    setShowError(false)
    setCurrentTicker('MSFT')
    setTickerInput('MSFT')
  }

  if (isLoading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <h2>Loading live dashboard...</h2>
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthView authMode={authMode} setAuthMode={setAuthMode} setView={setView} />
  }

  return (
    <div className="app-shell">
      <Sidebar
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        scrollToSection={scrollToSection}
      />

      <main className="dashboard">
        <header className="topbar">
          <div>
            <h1>One dashboard for Lynch-style stock research.</h1>
            <p className="subhead">
              Search a ticker, compare growth against P/E, save favorites, filter by industry, and
              preview deeper research without leaving the main screen.
            </p>
          </div>
          <div className="top-actions">
            <button className="ghost" type="button" onClick={() => openAuth('login')}>
              <LogIn size={20} /> Login
            </button>
            <button className="primary" type="button" onClick={() => openAuth('signup')}>
              <UserPlus size={20} /> Sign up
            </button>
            <div className="account-pill">
              <span className="avatar">{activeUser.initials}</span>
              <strong>{activeUser.name}</strong>
            </div>
          </div>
        </header>

        <form className="search-band" id="searchForm" onSubmit={handleSearch}>
          <label className="search-input" aria-label="Ticker symbol">
            <ScanSearch size={21} />
            <input
              value={tickerInput}
              onChange={(event) => setTickerInput(event.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="Enter ticker, e.g. MSFT"
            />
          </label>
          <button className="primary" type="submit">
            <Sparkles size={21} /> Analyze
          </button>
          <button className="ghost" type="button" onClick={() => scrollToSection('researchBrief')}>
            <BarChart3 size={21} /> See Deep Dive
          </button>
        </form>

        <div className="layout">
          <div>
            <StockPanel
              stock={activeStock}
              ticker={currentTicker}
              sparkline={sparkline}
              isFavorite={favoriteTickers.includes(currentTicker)}
              onFavorite={toggleFavorite}
            />
            <ResearchBrief stock={activeStock} ticker={currentTicker} />
          </div>

          <aside className="side-stack">
            <FavoritesPanel
              favorites={filteredFavorites}
              stocks={fetchedStocks}
              industryFilter={industryFilter}
              setIndustryFilter={setIndustryFilter}
              onOpenFavorite={openFavorite}
            />
            <SpecialSignals stock={activeStock} />
          </aside>
        </div>

        <FavoritesTable favorites={favoriteTickers} stocks={fetchedStocks} />

        <div className="dashboard-grid">
          <Peers stock={activeStock} stocks={fetchedStocks} />
          <PortfolioSummary summary={summary} />
        </div>
      </main>

      {showError && <TickerError onClose={() => setShowError(false)} onAnalyzeMsft={analyzeMsft} />}
    </div>
  )
}

// Left navigation and user switcher for the dashboard.
function Sidebar({ currentUser, setCurrentUser, scrollToSection }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <LineChart size={22} />
        </div>
        <div>
          <strong>SignalValue</strong>
          <span>Lynch-style quality screen</span>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        <button className="active" type="button" onClick={() => scrollToSection('searchForm')}>
          <Search size={21} /> <span>Search</span>
        </button>
        <button type="button" onClick={() => scrollToSection('favoritesPanel')}>
          <Star size={21} /> <span>Favorites</span>
        </button>
        <button type="button" onClick={() => scrollToSection('researchBrief')}>
          <Target size={21} /> <span>Deep Dive</span>
        </button>
      </nav>

      <section className="sidebar-section">
        <p className="label">Current User</p>
        <div className="user-switch">
          {Object.entries(INITIAL_USERS).map(([key, user]) => (
            <button
              className={currentUser === key ? 'active' : ''}
              key={key}
              type="button"
              onClick={() => setCurrentUser(key)}
            >
              <span>{user.name}</span>
              {currentUser === key ? <Check size={18} /> : <User size={18} />}
            </button>
          ))}
        </div>
      </section>

      <section className="sidebar-section">
        <p className="label">Market Pulse</p>
        <div className="watchlist-mini">
          <div><span>S&P 500</span><span>+0.7%</span></div>
          <div><span>Nasdaq</span><span>+1.1%</span></div>
          <div><span>10Y Yield</span><span>4.34%</span></div>
        </div>
      </section>
    </aside>
  )
}

// Main stock analysis card: identity, price, net-income trend, and Lynch metrics.
function StockPanel({ stock, ticker, sparkline, isFavorite, onFavorite }) {
  return (
    <section className="panel">
      <div className="stock-hero">
        <div>
          <div className="ticker-row">
            <div className="ticker">
              <div className="ticker-logo">{ticker.slice(0, 2)}</div>
              <div>
                <h2>{stock.name}</h2>
                <p>{ticker} · {stock.industry}</p>
              </div>
            </div>
            <button
              className={`icon-button ${isFavorite ? 'active' : ''}`}
              title="Favorite stock"
              type="button"
              onClick={onFavorite}
            >
              <Star size={22} />
            </button>
          </div>

          <div className="price-row">
            <span className="price">{stock.price}</span>
            <span className="gain">{stock.move}</span>
          </div>
          <p className="thesis">{stock.thesis}</p>
        </div>

        <div className="spark">
          <svg viewBox="0 0 260 126" role="img" aria-label="Five year net income trend">
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f8f6b" stopOpacity=".34" />
                <stop offset="100%" stopColor="#2f8f6b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={sparkline.area} fill="url(#area)" />
            <path d={sparkline.line} fill="none" stroke="#2f8f6b" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="axis"><span>Net income 2021</span><span>2025</span></div>
        </div>
      </div>

      <div className="metrics">
        <Metric icon={<TrendingUp size={21} />} label="Growth Rate" value={stock.growth != null ? `${stock.growth.toFixed(1)}%` : 'N/A'}>
          Computed from 5-year net income CAGR.
        </Metric>
        <Metric icon={<Scale size={21} />} label="P/E Ratio" value={stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}>
          Lynch screen prefers P/E below growth rate.
        </Metric>
        <Metric icon={<Gauge size={21} />} label="Growth / P/E" value={formatRatio(growthOverPe(stock))} tone={signalClass(stock)}>
          Above 1.0 means growth clears valuation.
        </Metric>
      </div>
    </section>
  )
}

// Reusable metric card for growth, P/E, and Growth / P/E.
function Metric({ icon, label, value, tone = '', children }) {
  return (
    <article className="metric">
      <header>{label} {icon}</header>
      <strong className={tone}>{value}</strong>
      <small>{children}</small>
    </article>
  )
}

// Deeper research card for target price, earnings, and peer valuation.
function ResearchBrief({ stock, ticker }) {
  return (
    <section className="panel" id="researchBrief">
      <div className="section-title">
        <div>
          <h3>Research Brief</h3>
          <p>Target price, earnings timing, and peer valuation for the active stock.</p>
        </div>
        <button className="ghost compact" type="button">
          <FileChartColumn size={21} /> {ticker} Brief
        </button>
      </div>
      <div className="detail-grid">
        <div className="detail"><span>Expert target</span><strong>{stock.target}</strong></div>
        <div className="detail"><span>Upcoming earnings</span><strong>{stock.earnings}</strong></div>
        <div className="detail"><span>Peer median P/E</span><strong>{stock.peerPe}</strong></div>
      </div>
    </section>
  )
}

// Favorite stock cards plus the industry filter dropdown.
function FavoritesPanel({ favorites, stocks, industryFilter, setIndustryFilter, onOpenFavorite }) {
  return (
    <section className="panel" id="favoritesPanel">
      <div className="section-title">
        <div>
          <h3>Favorite Stocks</h3>
          <p>Stored per current user with industry tags.</p>
        </div>
      </div>
      <div className="filter-row">
        <select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)} aria-label="Filter favorites by industry">
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>{industry === 'All' ? 'All industries' : industry}</option>
          ))}
        </select>
        <button className="icon-button" title="Filter favorites" type="button">
          <ListFilter size={21} />
        </button>
      </div>
      <div className="favorite-list">
        {favorites.length ? favorites.map((ticker) => {
          const stock = stocks[ticker]
          return (
            <button className="fav-card" type="button" key={ticker} onClick={() => onOpenFavorite(ticker)}>
              <div className="fav-top"><strong>{ticker}</strong><span className="chip">{stock.industry}</span></div>
              <div className="fav-metrics">
                <span>Growth <b>{stock.growth != null ? `${stock.growth.toFixed(1)}%` : 'N/A'}</b></span>
                <span>P/E <b>{stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}</b></span>
                <span>G/P/E <b className={signalClass(stock)}>{formatRatio(growthOverPe(stock))}</b></span>
              </div>
            </button>
          )
        }) : <p className="empty-note">No favorites in this industry yet.</p>}
      </div>
    </section>
  )
}

// Research signals that could later come from analyst/earnings APIs.
function SpecialSignals({ stock }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h3>Special Signals</h3>
          <p>Useful expert research add-ons.</p>
        </div>
      </div>
      <div className="events">
        {stock.events.map((event, index) => (
          <div className="event-row" key={event}>
            <strong>{index === 0 ? 'Primary' : index === 1 ? 'Watch' : 'Note'}</strong>
            <span>{event}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// Full comparison table for the current user's saved stocks.
function FavoritesTable({ favorites, stocks }) {
  return (
    <section className="panel table-wrap wide-panel">
      <div className="section-title">
        <div>
          <h3>Favorites Table</h3>
          <p>Saved stocks with the core Lynch metrics side by side.</p>
        </div>
      </div>
      <table className="wide-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Industry</th>
            <th>Growth</th>
            <th>P/E</th>
            <th>Growth / P/E</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {favorites.map((ticker) => {
            const stock = stocks[ticker]
            return (
              <tr key={ticker}>
                <td><strong>{ticker}</strong></td>
                <td>{stock.name}</td>
                <td>{stock.industry}</td>
                <td>{stock.growth != null ? `${stock.growth.toFixed(1)}%` : 'N/A'}</td>
                <td>{stock.pe != null ? stock.pe.toFixed(1) : 'N/A'}</td>
                <td className={signalClass(stock)}><strong>{formatRatio(growthOverPe(stock))}</strong></td>
                <td>{signalText(stock)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

// Peer comparison list for the selected stock.
function Peers({ stock, stocks }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h3>Peers</h3>
          <p>Compare the active stock against related companies.</p>
        </div>
      </div>
      <div className="peer-table">
        {stock.peers.map((ticker) => {
          const peer = stocks[ticker] || { industry: 'Comparable', growth: 9.8, pe: 19.2 }
          return (
            <div className="peer-row" key={ticker}>
              <strong>{ticker}</strong>
              <span>{peer.industry}</span>
              <span>Growth {peer.growth != null ? `${peer.growth.toFixed(1)}%` : 'N/A'}</span>
              <span>P/E {peer.pe != null ? peer.pe.toFixed(1) : 'N/A'}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Portfolio-level summary derived from saved stocks.
function PortfolioSummary({ summary }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h3>Portfolio Summary</h3>
          <p>A quick read on the current user's saved stock list.</p>
        </div>
      </div>
      <div className="summary-grid">
        <div className="summary-tile"><span>Saved</span><strong>{summary.saved}</strong></div>
        <div className="summary-tile"><span>Lynch Passes</span><strong>{summary.passCount}</strong></div>
        <div className="summary-tile"><span>Top Industry</span><strong>{summary.topIndustry}</strong></div>
        <div className="summary-tile"><span>Avg Growth / P/E</span><strong>{summary.avgPeg}</strong></div>
      </div>
    </section>
  )
}

// Modal shown when the searched ticker is not in the demo data set.
function TickerError({ onClose, onAnalyzeMsft }) {
  return (
    <div className="modal-backdrop show" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div className="modal">
        <button className="icon-button" type="button" title="Close" onClick={onClose}>
          <X size={22} />
        </button>
        <h3 id="modalTitle">Ticker not found</h3>
        <p>Try one of the demo tickers: MSFT, AAPL, TSLA, NKE, UNH, or F.</p>
        <button className="primary" type="button" onClick={onAnalyzeMsft}>
          <Search size={20} /> Analyze MSFT
        </button>
      </div>
    </div>
  )
}

// Separate auth view for Ian's login/signup integration.
function AuthView({ authMode, setAuthMode, setView }) {
  const isLogin = authMode === 'login'

  return (
    <main className="auth-page">
      <section className="brand-side">
        <div>
          <button className="brand brand-button" type="button" onClick={() => setView('dashboard')}>
            <div className="brand-mark"><LineChart size={22} /></div>
            <div>
              <strong>SignalValue</strong>
              <span>Back to dashboard</span>
            </div>
          </button>
          <h1>Login and signup live outside the research dashboard.</h1>
          <p className="supporting">
            This page is the clean handoff point for Ian's auth work: once a user is authenticated,
            the dashboard can scope favorites by session user id.
          </p>
        </div>
        <button className="route-chip" type="button" onClick={() => setView('dashboard')}>
          <ArrowLeft size={20} /> Dashboard
        </button>
      </section>

      <section className="form-side">
        <div className="auth-panel">
          <div className="tabs" role="tablist" aria-label="Authentication mode">
            <button className={`tab ${isLogin ? 'active' : ''}`} type="button" onClick={() => setAuthMode('login')}>
              <LogIn size={20} /> Login
            </button>
            <button className={`tab ${!isLogin ? 'active' : ''}`} type="button" onClick={() => setAuthMode('signup')}>
              <UserPlus size={20} /> Sign up
            </button>
          </div>

          {isLogin ? <LoginForm setView={setView} /> : <SignupForm setView={setView} />}

          <div className="handoff">
            <div><strong>Frontend route</strong><span>/auth</span></div>
            <div><strong>Auth owner</strong><span>Ian</span></div>
            <div><strong>Dashboard needs</strong><span>session user id</span></div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Login form shell. Ian can connect the submit action to the auth backend.
function LoginForm({ setView }) {
  return (
    <form className="auth-form">
      <div className="form-title">
        <h2>Welcome back</h2>
        <p>Use the account Ian authenticates to load user-specific favorites.</p>
      </div>
      <label>Email
        <input type="email" defaultValue="avery@example.com" autoComplete="email" />
      </label>
      <label>Password
        <input type="password" defaultValue="password" autoComplete="current-password" />
      </label>
      <div className="form-actions">
        <button className="primary" type="button"><LogIn size={20} /> Login</button>
        <button className="ghost" type="button" onClick={() => setView('dashboard')}>
          <BarChart3 size={20} /> Continue to dashboard
        </button>
      </div>
    </form>
  )
}

// Signup form shell. Ian can connect this to account creation.
function SignupForm({ setView }) {
  return (
    <form className="auth-form">
      <div className="form-title">
        <h2>Create account</h2>
        <p>New accounts get their own favorite stocks and industry filters.</p>
      </div>
      <label>Name
        <input type="text" defaultValue="Jayden Keaton" autoComplete="name" />
      </label>
      <label>Email
        <input type="email" defaultValue="jayden@example.com" autoComplete="email" />
      </label>
      <label>Password
        <input type="password" defaultValue="password" autoComplete="new-password" />
      </label>
      <div className="form-actions">
        <button className="primary" type="button"><UserPlus size={20} /> Sign up</button>
        <button className="ghost" type="button" onClick={() => setView('dashboard')}>
          <BarChart3 size={20} /> Continue to dashboard
        </button>
      </div>
    </form>
  )
}

export default App
