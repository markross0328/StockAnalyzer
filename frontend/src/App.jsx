import { useMemo, useState } from 'react'
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

// Demo stock records. Mark can replace this object with backend API responses.
const STOCKS = {
  MSFT: {
    name: 'Microsoft Corp.',
    industry: 'Technology',
    price: '$412.80',
    move: '+1.34% today',
    growth: 18.6,
    pe: 31.2,
    income: [61.3, 72.7, 72.4, 88.1, 101.8],
    thesis:
      'Strong cloud and productivity revenue, durable margins, and net-income growth currently outruns most peers but not its own P/E.',
    target: '$470',
    earnings: 'Jul 23',
    peerPe: '28.4',
    peers: ['AAPL', 'GOOGL', 'ORCL'],
    events: ['Azure growth is the key margin driver', 'AI capex watch item', 'Dividend raised 10% last cycle'],
  },
  AAPL: {
    name: 'Apple Inc.',
    industry: 'Technology',
    price: '$184.42',
    move: '+0.58% today',
    growth: 7.4,
    pe: 27.9,
    income: [94.7, 99.8, 97.0, 93.7, 103.5],
    thesis: 'Exceptional cash generation, but net-income growth is slower than the current earnings multiple.',
    target: '$210',
    earnings: 'Aug 1',
    peerPe: '25.2',
    peers: ['MSFT', 'GOOGL', 'SONY'],
    events: ['Services mix improving', 'Hardware cycle risk', 'Buyback remains material'],
  },
  TSLA: {
    name: 'Tesla Inc.',
    industry: 'Auto',
    price: '$173.74',
    move: '-0.82% today',
    growth: 24.1,
    pe: 58.6,
    income: [5.5, 12.6, 15.0, 7.1, 13.1],
    thesis: 'Growth remains exciting, but P/E requires a very forgiving view of auto margins and optionality.',
    target: '$205',
    earnings: 'Jul 17',
    peerPe: '18.9',
    peers: ['F', 'GM', 'RIVN'],
    events: ['Delivery growth is uneven', 'Energy storage accelerating', 'Margins drive the debate'],
  },
  NKE: {
    name: 'Nike Inc.',
    industry: 'Consumer',
    price: '$91.16',
    move: '+0.21% today',
    growth: 5.8,
    pe: 23.4,
    income: [5.7, 6.0, 5.1, 5.5, 6.3],
    thesis: 'A global brand with improving discipline, though valuation needs faster earnings recovery.',
    target: '$104',
    earnings: 'Jun 27',
    peerPe: '21.7',
    peers: ['LULU', 'ADDYY', 'DECK'],
    events: ['Direct channel reset', 'Inventory normalization', 'China trend is important'],
  },
  UNH: {
    name: 'UnitedHealth Group',
    industry: 'Healthcare',
    price: '$501.28',
    move: '+0.93% today',
    growth: 12.9,
    pe: 18.1,
    income: [17.3, 20.1, 22.4, 23.1, 28.0],
    thesis: 'Steady healthcare compounding with a P/E that sits closer to the Lynch comfort zone.',
    target: '$575',
    earnings: 'Jul 12',
    peerPe: '19.6',
    peers: ['HUM', 'CI', 'ELV'],
    events: ['Optum growth remains central', 'Policy headline sensitivity', 'Cash conversion is strong'],
  },
  F: {
    name: 'Ford Motor Co.',
    industry: 'Auto',
    price: '$12.84',
    move: '+1.02% today',
    growth: 10.2,
    pe: 7.6,
    income: [17.9, -2.0, 4.3, 4.9, 7.1],
    thesis: 'Low P/E screens well, but cyclical earnings make the growth calculation noisier.',
    target: '$15',
    earnings: 'Jul 24',
    peerPe: '8.8',
    peers: ['GM', 'TSLA', 'TM'],
    events: ['Truck margins matter most', 'EV losses narrowing', 'Dividend attracts value buyers'],
  },
}

// Demo users. Ian's auth can replace this with the real session user.
const INITIAL_USERS = {
  Avery: { name: 'Avery Chen', initials: 'AC', favorites: ['MSFT', 'UNH', 'F'] },
  Maya: { name: 'Maya Brooks', initials: 'MB', favorites: ['AAPL', 'NKE'] },
}

const INDUSTRIES = ['All', 'Technology', 'Healthcare', 'Auto', 'Consumer']

function growthOverPe(stock) {
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
  return growthOverPe(stock) >= 1 ? 'Growth clears P/E' : 'P/E ahead of growth'
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
  const [users, setUsers] = useState(INITIAL_USERS)
  const [currentUser, setCurrentUser] = useState('Avery')
  const [currentTicker, setCurrentTicker] = useState('MSFT')
  const [tickerInput, setTickerInput] = useState('MSFT')
  const [industryFilter, setIndustryFilter] = useState('All')
  const [showError, setShowError] = useState(false)

  const activeUser = users[currentUser]
  const activeStock = STOCKS[currentTicker]

  const favoriteTickers = activeUser.favorites
  const filteredFavorites = favoriteTickers.filter(
    (ticker) => industryFilter === 'All' || STOCKS[ticker].industry === industryFilter,
  )

  const summary = useMemo(() => {
    const industryCounts = favoriteTickers.reduce((counts, ticker) => {
      const industry = STOCKS[ticker].industry
      counts[industry] = (counts[industry] || 0) + 1
      return counts
    }, {})
    const topIndustry = Object.entries(industryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'
    const passCount = favoriteTickers.filter((ticker) => growthOverPe(STOCKS[ticker]) >= 1).length
    const avgPeg =
      favoriteTickers.reduce((total, ticker) => total + growthOverPe(STOCKS[ticker]), 0) /
      (favoriteTickers.length || 1)

    return {
      saved: favoriteTickers.length,
      passCount,
      topIndustry,
      avgPeg: formatRatio(avgPeg),
    }
  }, [favoriteTickers])

  const sparkline = pathFromIncome(activeStock.income)

  function openAuth(mode) {
    setAuthMode(mode)
    setView('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSearch(event) {
    event.preventDefault()
    const ticker = tickerInput.trim().toUpperCase()

    if (!STOCKS[ticker]) {
      setShowError(true)
      return
    }

    setCurrentTicker(ticker)
    setTickerInput(ticker)
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
              industryFilter={industryFilter}
              setIndustryFilter={setIndustryFilter}
              onOpenFavorite={openFavorite}
            />
            <SpecialSignals stock={activeStock} />
          </aside>
        </div>

        <FavoritesTable favorites={favoriteTickers} />

        <div className="dashboard-grid">
          <Peers stock={activeStock} />
          <PortfolioSummary summary={summary} />
        </div>
      </main>

      {showError && <TickerError onClose={() => setShowError(false)} onAnalyzeMsft={analyzeMsft} />}
    </div>
  )
}

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
        <Metric icon={<TrendingUp size={21} />} label="Growth Rate" value={`${stock.growth.toFixed(1)}%`}>
          Computed from 5-year net income CAGR.
        </Metric>
        <Metric icon={<Scale size={21} />} label="P/E Ratio" value={stock.pe.toFixed(1)}>
          Lynch screen prefers P/E below growth rate.
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

function FavoritesPanel({ favorites, industryFilter, setIndustryFilter, onOpenFavorite }) {
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
          const stock = STOCKS[ticker]
          return (
            <button className="fav-card" type="button" key={ticker} onClick={() => onOpenFavorite(ticker)}>
              <div className="fav-top"><strong>{ticker}</strong><span className="chip">{stock.industry}</span></div>
              <div className="fav-metrics">
                <span>Growth <b>{stock.growth.toFixed(1)}%</b></span>
                <span>P/E <b>{stock.pe.toFixed(1)}</b></span>
                <span>G/P/E <b className={signalClass(stock)}>{formatRatio(growthOverPe(stock))}</b></span>
              </div>
            </button>
          )
        }) : <p className="empty-note">No favorites in this industry yet.</p>}
      </div>
    </section>
  )
}

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

function FavoritesTable({ favorites }) {
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
            const stock = STOCKS[ticker]
            return (
              <tr key={ticker}>
                <td><strong>{ticker}</strong></td>
                <td>{stock.name}</td>
                <td>{stock.industry}</td>
                <td>{stock.growth.toFixed(1)}%</td>
                <td>{stock.pe.toFixed(1)}</td>
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

function Peers({ stock }) {
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
          const peer = STOCKS[ticker] || { industry: 'Comparable', growth: 9.8, pe: 19.2 }
          return (
            <div className="peer-row" key={ticker}>
              <strong>{ticker}</strong>
              <span>{peer.industry}</span>
              <span>Growth {peer.growth.toFixed(1)}%</span>
              <span>P/E {peer.pe.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

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
