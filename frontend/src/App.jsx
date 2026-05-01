import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  FileChartColumn,
  Gauge,
  LineChart,
  ListFilter,
  LogIn,
  LogOut,
  Scale,
  ScanSearch,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'stock-analyzer-token'

const EMPTY_STOCK = null

const INDUSTRIES = ['All', 'Technology', 'Healthcare', 'Auto', 'Consumer']

function growthOverPe(stock) {
  if (!Number.isFinite(stock.growth) || !Number.isFinite(stock.pe) || stock.pe === 0) {
    return 0
  }
  return stock.growth / stock.pe
}

function formatRatio(value) {
  return value.toFixed(2)
}

function signalClass(stock) {
  const ratio = growthOverPe(stock)
  if (ratio >= 1) return 'pass'
  if (ratio >= 0.6) return 'warn'
  return 'bad'
}

function signalText(stock) {
  const ratio = growthOverPe(stock)
  if (!ratio) return 'Need more data'
  return ratio >= 1 ? 'Growth clears P/E' : 'P/E ahead of growth'
}

function pathFromIncome() {
  const income = [25, 35, 30, 42, 48]
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

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  return payload
}

function mapLiveStock(stockPayload) {
  return {
    ...stockPayload,
    ...stockPayload,
  }
}

function App() {
  const [view, setView] = useState('auth')
  const [authMode, setAuthMode] = useState('login')
  const [sessionStatus, setSessionStatus] = useState('loading')
  const [authToken, setAuthToken] = useState('')
  const [authUser, setAuthUser] = useState(null)
  const [authError, setAuthError] = useState('')

  const [favoriteTickers, setFavoriteTickers] = useState([])
  const [stockByTicker, setStockByTicker] = useState({})
  const [currentTicker, setCurrentTicker] = useState('')
  const [tickerInput, setTickerInput] = useState('')
  const [industryFilter, setIndustryFilter] = useState('All')
  const [showError, setShowError] = useState(false)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [favoriteIndustryByTicker, setFavoriteIndustryByTicker] = useState({})

  const activeStock = currentTicker ? stockByTicker[currentTicker] || EMPTY_STOCK : EMPTY_STOCK
  const filteredFavorites = favoriteTickers.filter((ticker) => {
    if (industryFilter === 'All') return true
    return favoriteIndustryByTicker[ticker] === industryFilter
  })

  const summary = useMemo(() => {
    const industryCounts = favoriteTickers.reduce((counts, ticker) => {
      const industry = stockByTicker[ticker]?.industry
      if (!industry) return counts
      counts[industry] = (counts[industry] || 0) + 1
      return counts
    }, {})
    const topIndustry = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    const passCount = favoriteTickers.filter((ticker) => growthOverPe(stockByTicker[ticker] || {}) >= 1).length
    const avgPeg =
      favoriteTickers.reduce((total, ticker) => total + growthOverPe(stockByTicker[ticker] || {}), 0) /
      (favoriteTickers.length || 1)

    return {
      saved: favoriteTickers.length,
      passCount,
      topIndustry,
      avgPeg: formatRatio(avgPeg),
    }
  }, [favoriteTickers, stockByTicker])

  const sparkline = pathFromIncome()

  useEffect(() => {
    async function restoreSession() {
      const token = window.localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setSessionStatus('unauthenticated')
        setView('auth')
        return
      }

      try {
        const me = await apiRequest('/auth/me', { token })
        setAuthToken(token)
        setAuthUser(me.user)
        setSessionStatus('authenticated')
        setView('dashboard')
      } catch {
        window.localStorage.removeItem(TOKEN_KEY)
        setSessionStatus('unauthenticated')
        setView('auth')
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !authToken) return
    loadFavorites(industryFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, authToken, industryFilter])

  async function loadTickerData(ticker) {
    if (!ticker) return
    setStockLoading(true)
    try {
      const response = await apiRequest(`/stocks/${ticker}`, { token: authToken })
      const liveStock = mapLiveStock(response.stock)
      setStockByTicker((current) => ({ ...current, [ticker]: liveStock }))
      setCurrentTicker(ticker)
      setShowError(false)
    } catch (error) {
      setAuthError(error.message)
      setShowError(true)
    } finally {
      setStockLoading(false)
    }
  }

  async function loadFavorites(filter) {
    setFavoritesLoading(true)
    setAuthError('')
    try {
      const path = filter === 'All' ? '/favorites' : `/favorites/search?industry=${encodeURIComponent(filter)}`
      const response = await apiRequest(path, { token: authToken })
      const favorites = response.favorites || []
      const tickers = [...new Set(favorites.map((favorite) => favorite.ticker?.toUpperCase()).filter(Boolean))]
      const nextIndustryByTicker = favorites.reduce((accumulator, favorite) => {
        const ticker = favorite.ticker?.toUpperCase()
        if (!ticker) return accumulator
        accumulator[ticker] = favorite.industry || 'Unknown'
        return accumulator
      }, {})
      setFavoriteTickers(tickers)
      setFavoriteIndustryByTicker(nextIndustryByTicker)
    } catch (error) {
      if (error.message.toLowerCase().includes('token')) {
        await logout()
        return
      }
      setAuthError(error.message)
    } finally {
      setFavoritesLoading(false)
    }
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSearch(event) {
    event.preventDefault()
    const ticker = tickerInput.trim().toUpperCase()
    if (!ticker) return
    await loadTickerData(ticker)
  }

  async function saveFavorite() {
    if (!currentTicker || !activeStock || favoriteTickers.includes(currentTicker)) return
    try {
      const industry = activeStock.industry || 'Unknown'
      await apiRequest('/favorites', {
        method: 'POST',
        token: authToken,
        body: { ticker: currentTicker, industry },
      })
      setFavoriteTickers((current) => [...current, currentTicker])
      setFavoriteIndustryByTicker((current) => ({ ...current, [currentTicker]: industry }))
    } catch (error) {
      setAuthError(error.message)
    }
  }

  function openFavorite(ticker) {
    setCurrentTicker(ticker)
    setTickerInput(ticker)
    loadTickerData(ticker)
    scrollToSection('searchForm')
  }

  function analyzeMsft() {
    setShowError(false)
    setCurrentTicker('MSFT')
    setTickerInput('MSFT')
    loadTickerData('MSFT')
  }

  async function handleAuthSuccess(token, user) {
    window.localStorage.setItem(TOKEN_KEY, token)
    setAuthToken(token)
    setAuthUser(user)
    setSessionStatus('authenticated')
    setView('dashboard')
    setAuthError('')
  }

  async function logout() {
    const tokenToRevoke = authToken || window.localStorage.getItem(TOKEN_KEY)
    if (tokenToRevoke) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', token: tokenToRevoke })
      } catch {
        // Always clear local session, even if server-side revocation fails.
      }
    }

    window.localStorage.removeItem(TOKEN_KEY)
    setAuthToken('')
    setAuthUser(null)
    setFavoriteTickers([])
    setFavoriteIndustryByTicker({})
    setStockByTicker({})
    setSessionStatus('unauthenticated')
    setView('auth')
    setAuthMode('login')
  }

  if (sessionStatus === 'loading') {
    return (
      <main className="auth-page">
        <section className="brand-side">
          <div>
            <div className="brand">
              <div className="brand-mark"><LineChart size={22} /></div>
              <div>
                <strong>SignalValue</strong>
                <span>Lynch-style quality screen</span>
              </div>
            </div>
            <h1>Checking your session...</h1>
          </div>
        </section>
      </main>
    )
  }

  if (view === 'auth' || sessionStatus !== 'authenticated') {
    return (
      <AuthView
        authMode={authMode}
        setAuthMode={setAuthMode}
        onAuthSuccess={handleAuthSuccess}
        error={authError}
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar currentUser={authUser} scrollToSection={scrollToSection} />

      <main className="dashboard">
        <header className="topbar">
          <div>
            <h1>Live market dashboard for Lynch-style stock research.</h1>
            <p className="subhead">
              Search a ticker, compare growth against P/E, save favorites, filter by industry, and
              pull live data from Alpha Vantage.
            </p>
          </div>
          <div className="top-actions">
            <button className="ghost" type="button" onClick={logout}>
              <LogOut size={20} /> Logout
            </button>
            <div className="account-pill">
              <span className="avatar">{getInitials(authUser?.name || 'User')}</span>
              <strong>{authUser?.name}</strong>
            </div>
          </div>
        </header>

        {authError ? <p className="auth-inline-error">{authError}</p> : null}

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
            <Sparkles size={21} /> {stockLoading ? 'Loading...' : 'Analyze'}
          </button>
          <button className="ghost" type="button" onClick={() => scrollToSection('researchBrief')}>
            <BarChart3 size={21} /> See Deep Dive
          </button>
        </form>

        <div className="layout">
          <div>
            {activeStock ? (
              <>
                <StockPanel
                  stock={activeStock}
                  ticker={currentTicker}
                  sparkline={sparkline}
                  isFavorite={favoriteTickers.includes(currentTicker)}
                  onFavorite={saveFavorite}
                />
                <ResearchBrief stock={activeStock} ticker={currentTicker} />
              </>
            ) : (
              <section className="panel">
                <div className="section-title">
                  <div>
                    <h3>Enter a ticker to start</h3>
                    <p>We only fetch live data when you submit a ticker symbol.</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="side-stack">
            <FavoritesPanel
              favorites={filteredFavorites}
              stockByTicker={stockByTicker}
              favoriteIndustryByTicker={favoriteIndustryByTicker}
              industryFilter={industryFilter}
              setIndustryFilter={setIndustryFilter}
              onOpenFavorite={openFavorite}
              loading={favoritesLoading}
            />
          </aside>
        </div>

        <FavoritesTable favorites={favoriteTickers} stockByTicker={stockByTicker} favoriteIndustryByTicker={favoriteIndustryByTicker} />

        <div className="dashboard-grid">
          <PortfolioSummary summary={summary} />
        </div>
      </main>

      {showError && <TickerError onClose={() => setShowError(false)} onAnalyzeMsft={analyzeMsft} />}
    </div>
  )
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase()).join('')
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return 'N/A'
  return `$${value.toFixed(2)}`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 'N/A'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function formatMetric(value, suffix = '') {
  if (!Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(1)}${suffix}`
}

function Sidebar({ currentUser, scrollToSection }) {
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
        <p className="label">Signed In User</p>
        <div className="signed-in-user">
          <strong>{currentUser?.name}</strong>
          <span>{currentUser?.email}</span>
        </div>
      </section>
    </aside>
  )
}

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
            <span className="price">{formatMoney(stock.price)}</span>
            <span className="gain">{formatPercent(stock.movePercent)}</span>
          </div>
          <p className="thesis">Live source: Alpha Vantage ({stock.source}).</p>
        </div>

        <div className="spark">
          <svg viewBox="0 0 260 126" role="img" aria-label="Net income trend placeholder">
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f8f6b" stopOpacity=".34" />
                <stop offset="100%" stopColor="#2f8f6b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={sparkline.area} fill="url(#area)" />
            <path d={sparkline.line} fill="none" stroke="#2f8f6b" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="axis"><span>Live quote</span><span>Recent</span></div>
        </div>
      </div>

      <div className="metrics">
        <Metric icon={<TrendingUp size={21} />} label="Growth Rate" value={formatMetric(stock.growth, '%')}>
          Computed from annual net income.
        </Metric>
        <Metric icon={<Scale size={21} />} label="P/E Ratio" value={formatMetric(stock.pe)}>
          Pulled from Alpha Vantage overview.
        </Metric>
        <Metric icon={<Gauge size={21} />} label="Growth / P/E" value={formatRatio(growthOverPe(stock))} tone={signalClass(stock)}>
          Above 1.0 means growth clears valuation.
        </Metric>
      </div>
    </section>
  )
}

function Metric({ icon, label, value, tone = '', children }) {
  return (
    <article className="metric">
      <header>{label} {icon}</header>
      <strong className={tone}>{value}</strong>
      <small>{children}</small>
    </article>
  )
}

function ResearchBrief({ stock, ticker }) {
  return (
    <section className="panel" id="researchBrief">
      <div className="section-title">
        <div>
          <h3>Research Brief</h3>
          <p>Live fundamentals for the active stock.</p>
        </div>
        <button className="ghost compact" type="button">
          <FileChartColumn size={21} /> {ticker} Brief
        </button>
      </div>
      <div className="detail-grid">
        <div className="detail"><span>Market Cap</span><strong>{Number.isFinite(stock.marketCap) ? stock.marketCap.toLocaleString() : 'N/A'}</strong></div>
        <div className="detail"><span>Industry</span><strong>{stock.industry}</strong></div>
        <div className="detail"><span>Last Updated</span><strong>{stock.updatedAt ? new Date(stock.updatedAt).toLocaleTimeString() : 'N/A'}</strong></div>
      </div>
    </section>
  )
}

function FavoritesPanel({ favorites, stockByTicker, favoriteIndustryByTicker, industryFilter, setIndustryFilter, onOpenFavorite, loading }) {
  return (
    <section className="panel" id="favoritesPanel">
      <div className="section-title">
        <div>
          <h3>Favorite Stocks</h3>
          <p>Stored per account with industry tags.</p>
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
        {loading ? <p className="empty-note">Loading favorites...</p> : null}
        {!loading && favorites.length
          ? favorites.map((ticker) => {
            const stock = stockByTicker[ticker] || { name: ticker, industry: favoriteIndustryByTicker[ticker] || 'Unknown' }
            return (
              <button className="fav-card" type="button" key={ticker} onClick={() => onOpenFavorite(ticker)}>
                <div className="fav-top"><strong>{ticker}</strong><span className="chip">{stock.industry}</span></div>
                <div className="fav-metrics">
                  <span>Growth <b>{formatMetric(stock.growth, '%')}</b></span>
                  <span>P/E <b>{formatMetric(stock.pe)}</b></span>
                  <span>G/P/E <b className={signalClass(stock)}>{formatRatio(growthOverPe(stock))}</b></span>
                </div>
              </button>
            )
          })
          : null}
        {!loading && !favorites.length ? <p className="empty-note">No favorites in this industry yet.</p> : null}
      </div>
    </section>
  )
}

function FavoritesTable({ favorites, stockByTicker, favoriteIndustryByTicker }) {
  return (
    <section className="panel table-wrap wide-panel">
      <div className="section-title">
        <div>
          <h3>Favorites Table</h3>
          <p>Saved stocks with live core metrics side by side.</p>
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
            const stock = stockByTicker[ticker] || { name: ticker, industry: favoriteIndustryByTicker[ticker] || 'Unknown' }
            return (
              <tr key={ticker}>
                <td><strong>{ticker}</strong></td>
                <td>{stock.name}</td>
                <td>{stock.industry}</td>
                <td>{formatMetric(stock.growth, '%')}</td>
                <td>{formatMetric(stock.pe)}</td>
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

function PortfolioSummary({ summary }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h3>Portfolio Summary</h3>
          <p>A quick read on your saved stock list.</p>
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

function TickerError({ onClose, onAnalyzeMsft }) {
  return (
    <div className="modal-backdrop show" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div className="modal">
        <button className="icon-button" type="button" title="Close" onClick={onClose}>
          <X size={22} />
        </button>
        <h3 id="modalTitle">Ticker lookup failed</h3>
        <p>Try a valid market symbol like MSFT, AAPL, TSLA, or UNH.</p>
        <button className="primary" type="button" onClick={onAnalyzeMsft}>
          <Search size={20} /> Analyze MSFT
        </button>
      </div>
    </div>
  )
}

function AuthView({ authMode, setAuthMode, onAuthSuccess, error }) {
  const isLogin = authMode === 'login'

  return (
    <main className="auth-page">
      <section className="brand-side">
        <div>
          <div className="brand">
            <div className="brand-mark"><LineChart size={22} /></div>
            <div>
              <strong>SignalValue</strong>
              <span>Sign in to start your dashboard</span>
            </div>
          </div>
          <h1>Sign in to load your account and favorites.</h1>
          <p className="supporting">
            Dashboard access is locked behind authentication. Sign up or log in to continue.
          </p>
        </div>
        <button className="route-chip" type="button" onClick={() => setAuthMode(isLogin ? 'signup' : 'login')}>
          <ArrowLeft size={20} /> Switch to {isLogin ? 'Sign up' : 'Login'}
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

          {isLogin ? <LoginForm onAuthSuccess={onAuthSuccess} /> : <SignupForm onAuthSuccess={onAuthSuccess} />}
          {error ? <p className="auth-error">{error}</p> : null}
        </div>
      </section>
    </main>
  )
}

function LoginForm({ onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      await onAuthSuccess(response.token, response.user)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-title">
        <h2>Welcome back</h2>
        <p>Use your account to load user-specific favorites.</p>
      </div>
      <label>Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
      </label>
      <label>Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <div className="form-actions">
        <button className="primary" type="submit" disabled={submitting}>
          <LogIn size={20} /> {submitting ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </form>
  )
}

function SignupForm({ onAuthSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      })
      await onAuthSuccess(response.token, response.user)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-title">
        <h2>Create account</h2>
        <p>New accounts get their own favorite stocks and industry filters.</p>
      </div>
      <label>Name
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
      </label>
      <label>Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
      </label>
      <label>Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <div className="form-actions">
        <button className="primary" type="submit" disabled={submitting}>
          <UserPlus size={20} /> {submitting ? 'Creating account...' : 'Sign up'}
        </button>
      </div>
    </form>
  )
}

export default App
