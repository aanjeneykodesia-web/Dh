import streamlit as st
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import anthropic
import json
from datetime import datetime, timedelta
import numpy as np

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Stock Analyst",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');

:root {
  --bg: #0a0e1a;
  --surface: #111827;
  --border: #1f2d45;
  --accent: #00d4aa;
  --accent2: #7c3aed;
  --danger: #ef4444;
  --warn: #f59e0b;
  --text: #e2e8f0;
  --muted: #64748b;
}

html, body, [class*="css"] {
  font-family: 'Syne', sans-serif;
  background-color: var(--bg);
  color: var(--text);
}

.stApp { background-color: var(--bg); }

/* Sidebar */
[data-testid="stSidebar"] {
  background: var(--surface) !important;
  border-right: 1px solid var(--border);
}

/* Metric cards */
.metric-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}
.metric-card:hover { border-color: var(--accent); }
.metric-label { font-size: 0.72rem; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 4px; }
.metric-value { font-size: 1.6rem; font-weight: 800; font-family: 'Space Mono', monospace; }
.metric-delta { font-size: 0.82rem; font-family: 'Space Mono', monospace; margin-top: 2px; }
.pos { color: var(--accent); }
.neg { color: var(--danger); }

/* Signal badge */
.signal-badge {
  display: inline-block;
  padding: 0.35rem 1.1rem;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: 'Space Mono', monospace;
}
.signal-buy   { background: rgba(0,212,170,0.15); color: var(--accent); border: 1px solid var(--accent); }
.signal-sell  { background: rgba(239,68,68,0.15);  color: var(--danger); border: 1px solid var(--danger); }
.signal-hold  { background: rgba(245,158,11,0.15); color: var(--warn);   border: 1px solid var(--warn); }

/* AI response box */
.ai-box {
  background: linear-gradient(135deg, #111827 0%, #0f1a2e 100%);
  border: 1px solid var(--accent2);
  border-radius: 14px;
  padding: 1.5rem 2rem;
  font-size: 0.95rem;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: 'Syne', sans-serif;
}

/* Section headers */
.section-title {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.8rem;
  margin-top: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.4rem;
}

/* Tabs */
button[data-baseweb="tab"] {
  font-family: 'Space Mono', monospace !important;
  font-size: 0.78rem !important;
  letter-spacing: 0.06em !important;
}

/* Inputs */
.stTextInput input, .stSelectbox select, .stNumberInput input {
  background: var(--surface) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
}

/* Buttons */
.stButton > button {
  background: var(--accent) !important;
  color: #0a0e1a !important;
  font-family: 'Space Mono', monospace !important;
  font-weight: 700 !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.55rem 1.6rem !important;
  letter-spacing: 0.06em !important;
  transition: opacity 0.2s !important;
}
.stButton > button:hover { opacity: 0.85 !important; }

/* Header banner */
.app-header {
  background: linear-gradient(90deg, #0a0e1a 0%, #0f1a2e 50%, #0a0e1a 100%);
  border-bottom: 1px solid var(--border);
  padding: 1.2rem 0 1rem;
  margin-bottom: 1.5rem;
}
.app-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}
.app-title span { color: var(--accent); }
.app-subtitle { color: var(--muted); font-size: 0.8rem; letter-spacing: 0.1em; margin-top: 4px; }

/* Trade log table */
.trade-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--border);
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
}
.trade-row:hover { background: rgba(255,255,255,0.02); }

/* Indicators */
.ind-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.9rem 1.2rem;
  text-align: center;
}
.ind-name { font-size: 0.65rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; }
.ind-val  { font-size: 1.2rem; font-weight: 700; font-family: 'Space Mono', monospace; margin-top: 2px; }

div[data-testid="stMetricValue"] {
  font-family: 'Space Mono', monospace !important;
  font-size: 1.4rem !important;
}
</style>
""", unsafe_allow_html=True)


# ── Session state init ────────────────────────────────────────────────────────
if "portfolio" not in st.session_state:
    st.session_state.portfolio = {}           # {ticker: {shares, avg_price}}
if "cash" not in st.session_state:
    st.session_state.cash = 100_000.0
if "trade_log" not in st.session_state:
    st.session_state.trade_log = []
if "ai_analyses" not in st.session_state:
    st.session_state.ai_analyses = {}
if "watchlist" not in st.session_state:
    st.session_state.watchlist = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL"]


# ── Helper functions ──────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def fetch_stock_data(ticker: str, period: str = "6mo", interval: str = "1d"):
    try:
        stock = yf.Ticker(ticker)
        hist  = stock.history(period=period, interval=interval)
        info  = stock.info
        return hist, info
    except Exception as e:
        return None, {}


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Moving averages
    df["SMA20"]  = df["Close"].rolling(20).mean()
    df["SMA50"]  = df["Close"].rolling(50).mean()
    df["EMA12"]  = df["Close"].ewm(span=12).mean()
    df["EMA26"]  = df["Close"].ewm(span=26).mean()
    # MACD
    df["MACD"]        = df["EMA12"] - df["EMA26"]
    df["MACD_Signal"] = df["MACD"].ewm(span=9).mean()
    df["MACD_Hist"]   = df["MACD"] - df["MACD_Signal"]
    # RSI
    delta = df["Close"].diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rs    = gain / loss.replace(0, np.nan)
    df["RSI"] = 100 - (100 / (1 + rs))
    # Bollinger Bands
    df["BB_Mid"]   = df["Close"].rolling(20).mean()
    df["BB_Std"]   = df["Close"].rolling(20).std()
    df["BB_Upper"] = df["BB_Mid"] + 2 * df["BB_Std"]
    df["BB_Lower"] = df["BB_Mid"] - 2 * df["BB_Std"]
    # ATR
    df["H-L"]  = df["High"] - df["Low"]
    df["H-PC"] = abs(df["High"] - df["Close"].shift(1))
    df["L-PC"] = abs(df["Low"]  - df["Close"].shift(1))
    df["ATR"]  = df[["H-L","H-PC","L-PC"]].max(axis=1).rolling(14).mean()
    # Volume SMA
    df["Vol_SMA20"] = df["Volume"].rolling(20).mean()
    return df


def get_ai_analysis(ticker: str, hist: pd.DataFrame, info: dict, api_key: str) -> str:
    df = compute_indicators(hist)
    last = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else last

    summary = {
        "ticker": ticker,
        "company": info.get("longName", ticker),
        "sector":  info.get("sector", "N/A"),
        "industry": info.get("industry", "N/A"),
        "current_price": round(float(last["Close"]), 2),
        "prev_close":    round(float(prev["Close"]), 2),
        "change_pct":    round((float(last["Close"]) - float(prev["Close"])) / float(prev["Close"]) * 100, 2),
        "volume":        int(last["Volume"]),
        "avg_volume":    int(last["Vol_SMA20"]) if not np.isnan(last["Vol_SMA20"]) else "N/A",
        "rsi":           round(float(last["RSI"]), 1) if not np.isnan(last["RSI"]) else "N/A",
        "macd":          round(float(last["MACD"]), 3) if not np.isnan(last["MACD"]) else "N/A",
        "macd_signal":   round(float(last["MACD_Signal"]), 3) if not np.isnan(last["MACD_Signal"]) else "N/A",
        "sma20":         round(float(last["SMA20"]), 2) if not np.isnan(last["SMA20"]) else "N/A",
        "sma50":         round(float(last["SMA50"]), 2) if not np.isnan(last["SMA50"]) else "N/A",
        "bb_upper":      round(float(last["BB_Upper"]), 2) if not np.isnan(last["BB_Upper"]) else "N/A",
        "bb_lower":      round(float(last["BB_Lower"]), 2) if not np.isnan(last["BB_Lower"]) else "N/A",
        "atr":           round(float(last["ATR"]), 2) if not np.isnan(last["ATR"]) else "N/A",
        "52w_high":      info.get("fiftyTwoWeekHigh", "N/A"),
        "52w_low":       info.get("fiftyTwoWeekLow",  "N/A"),
        "pe_ratio":      info.get("trailingPE", "N/A"),
        "market_cap":    info.get("marketCap", "N/A"),
        "beta":          info.get("beta", "N/A"),
        "dividend_yield": info.get("dividendYield", "N/A"),
        "analyst_target": info.get("targetMeanPrice", "N/A"),
        "recommendation": info.get("recommendationKey", "N/A"),
    }

    prompt = f"""You are an expert quantitative stock analyst with 20 years of Wall Street experience.

Analyze the following data for {ticker} and provide a detailed trading recommendation.

MARKET DATA:
{json.dumps(summary, indent=2)}

RECENT PRICE HISTORY (last 10 sessions):
{df[['Close','Volume','RSI','MACD','SMA20']].tail(10).to_string()}

Provide a structured analysis covering:
1. **TRADING SIGNAL**: BUY / SELL / HOLD (be definitive)
2. **CONFIDENCE**: Low / Medium / High
3. **TECHNICAL ANALYSIS**: Interpret RSI, MACD, Bollinger Bands, moving averages
4. **TREND ANALYSIS**: Short-term and long-term trend direction
5. **KEY LEVELS**: Support, resistance, entry point, stop-loss, take-profit targets
6. **RISK ASSESSMENT**: Risk/reward ratio and key risks
7. **FUNDAMENTAL CHECK**: PE ratio, market cap, analyst targets context
8. **CATALYSTS**: What to watch that could move this stock
9. **SUMMARY**: 2-3 sentence executive summary

Be specific with price levels. Use a professional but clear tone."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return resp.content[0].text
    except Exception as e:
        return f"⚠️ AI analysis error: {str(e)}"


def extract_signal(analysis_text: str) -> str:
    text_upper = analysis_text.upper()
    # Look for explicit signal line first
    for line in analysis_text.split('\n'):
        if 'TRADING SIGNAL' in line.upper() or 'SIGNAL:' in line.upper():
            if 'BUY' in line.upper():  return 'BUY'
            if 'SELL' in line.upper(): return 'SELL'
            if 'HOLD' in line.upper(): return 'HOLD'
    # Fallback: count mentions
    buy_count  = text_upper.count('BUY')
    sell_count = text_upper.count('SELL')
    hold_count = text_upper.count('HOLD')
    if buy_count > sell_count and buy_count > hold_count:   return 'BUY'
    if sell_count > buy_count and sell_count > hold_count:  return 'SELL'
    return 'HOLD'


def signal_badge(signal: str) -> str:
    cls = {"BUY": "signal-buy", "SELL": "signal-sell", "HOLD": "signal-hold"}.get(signal, "signal-hold")
    icon = {"BUY": "▲", "SELL": "▼", "HOLD": "◆"}.get(signal, "◆")
    return f'<span class="signal-badge {cls}">{icon} {signal}</span>'


def fmt_large(n):
    if isinstance(n, (int, float)):
        if n >= 1e12: return f"${n/1e12:.2f}T"
        if n >= 1e9:  return f"${n/1e9:.2f}B"
        if n >= 1e6:  return f"${n/1e6:.2f}M"
        return f"${n:,.0f}"
    return str(n)


def plot_candlestick(df: pd.DataFrame, ticker: str):
    df = compute_indicators(df)
    fig = make_subplots(
        rows=3, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.04,
        row_heights=[0.58, 0.22, 0.20],
        subplot_titles=("", "Volume", "RSI")
    )
    # Candlestick
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"],
        increasing_line_color="#00d4aa", decreasing_line_color="#ef4444",
        increasing_fillcolor="#00d4aa", decreasing_fillcolor="#ef4444",
        name=ticker
    ), row=1, col=1)
    # Bollinger Bands
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Upper"], line=dict(color="rgba(124,58,237,0.4)", width=1), name="BB Upper", showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["BB_Lower"], line=dict(color="rgba(124,58,237,0.4)", width=1), name="BB Lower", fill="tonexty", fillcolor="rgba(124,58,237,0.05)", showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA20"],  line=dict(color="#f59e0b", width=1.5, dash="dot"), name="SMA 20"), row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["SMA50"],  line=dict(color="#3b82f6", width=1.5, dash="dot"), name="SMA 50"), row=1, col=1)
    # Volume bars
    colors = ["#00d4aa" if c >= o else "#ef4444" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], marker_color=colors, name="Volume", opacity=0.7, showlegend=False), row=2, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["Vol_SMA20"], line=dict(color="#f59e0b", width=1), name="Vol MA20", showlegend=False), row=2, col=1)
    # RSI
    fig.add_trace(go.Scatter(x=df.index, y=df["RSI"], line=dict(color="#a78bfa", width=2), name="RSI", showlegend=False), row=3, col=1)
    fig.add_hline(y=70, line_dash="dot", line_color="#ef4444", line_width=1, row=3, col=1)
    fig.add_hline(y=30, line_dash="dot", line_color="#00d4aa", line_width=1, row=3, col=1)
    fig.add_hrect(y0=70, y1=100, fillcolor="rgba(239,68,68,0.05)", line_width=0, row=3, col=1)
    fig.add_hrect(y0=0,  y1=30,  fillcolor="rgba(0,212,170,0.05)", line_width=0, row=3, col=1)

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0a0e1a",
        plot_bgcolor="#0a0e1a",
        font=dict(family="Space Mono", color="#64748b", size=11),
        margin=dict(l=10, r=10, t=30, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="right", x=1, bgcolor="rgba(0,0,0,0)"),
        xaxis_rangeslider_visible=False,
        height=540,
    )
    fig.update_xaxes(gridcolor="#1f2d45", zeroline=False)
    fig.update_yaxes(gridcolor="#1f2d45", zeroline=False)
    return fig


def portfolio_value():
    total = st.session_state.cash
    for ticker, pos in st.session_state.portfolio.items():
        hist, _ = fetch_stock_data(ticker, "5d")
        if hist is not None and not hist.empty:
            price = float(hist["Close"].iloc[-1])
            total += pos["shares"] * price
    return total


# ── SIDEBAR ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('<div style="font-size:1.3rem;font-weight:800;letter-spacing:-0.01em;">📈 AI Analyst</div>', unsafe_allow_html=True)
    st.markdown('<div style="font-size:0.7rem;color:#64748b;letter-spacing:0.1em;margin-bottom:1.2rem;">STOCK TRADING SYSTEM</div>', unsafe_allow_html=True)

    api_key = st.text_input("🔑 Anthropic API Key", type="password", help="Required for AI analysis. Get yours at console.anthropic.com")

    st.markdown('<div class="section-title">Stock Lookup</div>', unsafe_allow_html=True)
    ticker_input = st.text_input("Ticker Symbol", value="AAPL", placeholder="e.g. TSLA, NVDA").upper().strip()
    period_map   = {"1 Month": "1mo", "3 Months": "3mo", "6 Months": "6mo", "1 Year": "1y", "2 Years": "2y"}
    period_label = st.selectbox("Period", list(period_map.keys()), index=2)
    period       = period_map[period_label]

    analyze_btn  = st.button("🔍 Analyze Stock", use_container_width=True)

    st.markdown('<div class="section-title">Virtual Portfolio</div>', unsafe_allow_html=True)
    pval = portfolio_value()
    st.metric("Total Value", f"${pval:,.2f}", f"${pval - 100000:+,.2f}")
    st.metric("Cash", f"${st.session_state.cash:,.2f}")

    st.markdown('<div class="section-title">Quick Trade</div>', unsafe_allow_html=True)
    trade_ticker = st.text_input("Ticker", value=ticker_input, key="trade_ticker").upper().strip()
    trade_action = st.selectbox("Action", ["BUY", "SELL"])
    trade_shares = st.number_input("Shares", min_value=1, max_value=10000, value=10)
    trade_btn    = st.button("Execute Trade", use_container_width=True)

    st.markdown('<div class="section-title">Watchlist</div>', unsafe_allow_html=True)
    wl_add = st.text_input("Add to watchlist", placeholder="TICKER").upper().strip()
    if wl_add and st.button("＋ Add", use_container_width=True):
        if wl_add not in st.session_state.watchlist:
            st.session_state.watchlist.append(wl_add)


# ── TRADE EXECUTION ───────────────────────────────────────────────────────────
if trade_btn and trade_ticker:
    hist, info = fetch_stock_data(trade_ticker, "5d")
    if hist is not None and not hist.empty:
        price = float(hist["Close"].iloc[-1])
        cost  = price * trade_shares

        if trade_action == "BUY":
            if cost > st.session_state.cash:
                st.sidebar.error(f"Insufficient cash. Need ${cost:,.2f}")
            else:
                st.session_state.cash -= cost
                pos = st.session_state.portfolio.get(trade_ticker, {"shares": 0, "avg_price": 0})
                total_shares = pos["shares"] + trade_shares
                avg_p = (pos["shares"] * pos["avg_price"] + cost) / total_shares
                st.session_state.portfolio[trade_ticker] = {"shares": total_shares, "avg_price": avg_p}
                st.session_state.trade_log.append({
                    "time": datetime.now().strftime("%H:%M:%S"), "action": "BUY",
                    "ticker": trade_ticker, "shares": trade_shares, "price": price, "total": cost
                })
                st.sidebar.success(f"✅ Bought {trade_shares} {trade_ticker} @ ${price:.2f}")

        elif trade_action == "SELL":
            pos = st.session_state.portfolio.get(trade_ticker, {"shares": 0, "avg_price": 0})
            if pos["shares"] < trade_shares:
                st.sidebar.error(f"Only {pos['shares']} shares held")
            else:
                st.session_state.cash += cost
                new_shares = pos["shares"] - trade_shares
                if new_shares == 0:
                    del st.session_state.portfolio[trade_ticker]
                else:
                    st.session_state.portfolio[trade_ticker]["shares"] = new_shares
                pnl = (price - pos["avg_price"]) * trade_shares
                st.session_state.trade_log.append({
                    "time": datetime.now().strftime("%H:%M:%S"), "action": "SELL",
                    "ticker": trade_ticker, "shares": trade_shares, "price": price,
                    "total": cost, "pnl": pnl
                })
                st.sidebar.success(f"✅ Sold {trade_shares} {trade_ticker} @ ${price:.2f}  P&L: ${pnl:+.2f}")
    else:
        st.sidebar.error("Could not fetch price data")


# ── MAIN CONTENT ──────────────────────────────────────────────────────────────
st.markdown("""
<div class="app-header">
  <div class="app-title">AI <span>Stock</span> Analyst</div>
  <div class="app-subtitle">QUANTITATIVE ANALYSIS · TECHNICAL SIGNALS · AI-POWERED RECOMMENDATIONS</div>
</div>
""", unsafe_allow_html=True)

tab1, tab2, tab3, tab4 = st.tabs(["📊  Analysis", "💼  Portfolio", "📋  Trade Log", "👁  Watchlist"])

# ─────────────────────────── TAB 1: ANALYSIS ──────────────────────────────────
with tab1:
    hist, info = fetch_stock_data(ticker_input, period)

    if hist is None or hist.empty:
        st.error(f"Could not fetch data for **{ticker_input}**. Check the ticker symbol.")
    else:
        df = compute_indicators(hist)
        last  = df.iloc[-1]
        prev  = df.iloc[-2] if len(df) > 1 else last
        price = float(last["Close"])
        chg   = price - float(prev["Close"])
        chg_p = chg / float(prev["Close"]) * 100

        # ── Company header ──
        name   = info.get("longName", ticker_input)
        sector = info.get("sector", "")
        col_t, col_s = st.columns([2, 1])
        with col_t:
            st.markdown(f"### {name}")
            st.markdown(f'<span style="color:#64748b;font-size:0.8rem;">{sector} · {ticker_input}</span>', unsafe_allow_html=True)
        with col_s:
            badge_color = "pos" if chg >= 0 else "neg"
            arrow = "▲" if chg >= 0 else "▼"
            st.markdown(f"""
            <div style="text-align:right;margin-top:0.3rem;">
              <div style="font-size:2rem;font-weight:800;font-family:'Space Mono',monospace;">${price:,.2f}</div>
              <div class="{badge_color}" style="font-family:'Space Mono',monospace;font-size:0.9rem;">{arrow} ${abs(chg):.2f} ({chg_p:+.2f}%)</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("---")

        # ── Key metrics row ──
        cols = st.columns(6)
        metrics = [
            ("Market Cap",     fmt_large(info.get("marketCap", "N/A"))),
            ("P/E Ratio",      f"{info.get('trailingPE', 'N/A'):.1f}" if isinstance(info.get("trailingPE"), float) else "N/A"),
            ("52W High",       f"${info.get('fiftyTwoWeekHigh', 0):.2f}"),
            ("52W Low",        f"${info.get('fiftyTwoWeekLow', 0):.2f}"),
            ("Beta",           f"{info.get('beta', 'N/A'):.2f}" if isinstance(info.get("beta"), float) else "N/A"),
            ("Analyst Target", f"${info.get('targetMeanPrice', 0):.2f}" if info.get('targetMeanPrice') else "N/A"),
        ]
        for col, (label, val) in zip(cols, metrics):
            with col:
                st.markdown(f'<div class="metric-card"><div class="metric-label">{label}</div><div class="metric-value" style="font-size:1rem;">{val}</div></div>', unsafe_allow_html=True)

        # ── Chart ──
        st.markdown('<div class="section-title">Price Chart · Technical Indicators</div>', unsafe_allow_html=True)
        st.plotly_chart(plot_candlestick(df, ticker_input), use_container_width=True)

        # ── Indicator row ──
        rsi  = round(float(last["RSI"]),  1) if not np.isnan(last["RSI"])  else "N/A"
        macd = round(float(last["MACD"]), 3) if not np.isnan(last["MACD"]) else "N/A"
        macd_sig = round(float(last["MACD_Signal"]), 3) if not np.isnan(last["MACD_Signal"]) else "N/A"
        atr  = round(float(last["ATR"]),  2) if not np.isnan(last["ATR"])  else "N/A"
        sma20 = round(float(last["SMA20"]),2) if not np.isnan(last["SMA20"]) else "N/A"
        sma50 = round(float(last["SMA50"]),2) if not np.isnan(last["SMA50"]) else "N/A"
        bb_u = round(float(last["BB_Upper"]),2) if not np.isnan(last["BB_Upper"]) else "N/A"
        bb_l = round(float(last["BB_Lower"]),2) if not np.isnan(last["BB_Lower"]) else "N/A"

        rsi_color = "#ef4444" if isinstance(rsi, float) and rsi > 70 else ("#00d4aa" if isinstance(rsi, float) and rsi < 30 else "#e2e8f0")
        macd_color = "#00d4aa" if isinstance(macd, float) and macd > 0 else "#ef4444"

        ind_cols = st.columns(8)
        indicators = [
            ("RSI (14)",    rsi,      rsi_color),
            ("MACD",        macd,     macd_color),
            ("Signal",      macd_sig, "#e2e8f0"),
            ("SMA 20",      f"${sma20}", "#f59e0b"),
            ("SMA 50",      f"${sma50}", "#3b82f6"),
            ("BB Upper",    f"${bb_u}", "#a78bfa"),
            ("BB Lower",    f"${bb_l}", "#a78bfa"),
            ("ATR (14)",    f"${atr}", "#e2e8f0"),
        ]
        for col, (name_i, val_i, color_i) in zip(ind_cols, indicators):
            with col:
                st.markdown(f'<div class="ind-block"><div class="ind-name">{name_i}</div><div class="ind-val" style="color:{color_i};">{val_i}</div></div>', unsafe_allow_html=True)

        st.markdown("")

        # ── AI Analysis ──
        st.markdown('<div class="section-title">AI Analysis & Trading Recommendation</div>', unsafe_allow_html=True)

        if not api_key:
            st.info("🔑 Enter your Anthropic API key in the sidebar to enable AI analysis.")
        else:
            run_ai = analyze_btn or (ticker_input not in st.session_state.ai_analyses)

            if run_ai:
                with st.spinner("🤖 Analyzing market data..."):
                    analysis = get_ai_analysis(ticker_input, hist, info, api_key)
                    st.session_state.ai_analyses[ticker_input] = analysis
            else:
                analysis = st.session_state.ai_analyses.get(ticker_input, "")

            if analysis and not analysis.startswith("⚠️"):
                signal = extract_signal(analysis)
                st.markdown(f'<div style="margin-bottom:1rem;">{signal_badge(signal)}</div>', unsafe_allow_html=True)
                st.markdown(f'<div class="ai-box">{analysis}</div>', unsafe_allow_html=True)

                # Quick trade buttons
                st.markdown("")
                c1, c2, c3 = st.columns([1, 1, 3])
                with c1:
                    if st.button(f"▲ BUY {ticker_input}", key="quick_buy"):
                        st.session_state["qt_action"] = "BUY"
                with c2:
                    if st.button(f"▼ SELL {ticker_input}", key="quick_sell"):
                        st.session_state["qt_action"] = "SELL"
            elif analysis:
                st.error(analysis)


# ─────────────────────────── TAB 2: PORTFOLIO ─────────────────────────────────
with tab2:
    st.markdown("### Virtual Portfolio")
    st.caption("Starts with $100,000 virtual cash")

    total_invested = sum(p["shares"] * p["avg_price"] for p in st.session_state.portfolio.values())
    total_val = st.session_state.cash
    positions_data = []

    for tkr, pos in st.session_state.portfolio.items():
        h, _ = fetch_stock_data(tkr, "5d")
        if h is not None and not h.empty:
            cur_price = float(h["Close"].iloc[-1])
            mkt_val   = cur_price * pos["shares"]
            cost_b    = pos["avg_price"] * pos["shares"]
            pnl       = mkt_val - cost_b
            pnl_p     = pnl / cost_b * 100
            total_val += mkt_val
            positions_data.append({
                "Ticker": tkr, "Shares": pos["shares"],
                "Avg Cost": f"${pos['avg_price']:.2f}",
                "Current": f"${cur_price:.2f}",
                "Mkt Value": f"${mkt_val:,.2f}",
                "P&L $": pnl, "P&L %": pnl_p
            })

    m1, m2, m3, m4 = st.columns(4)
    with m1: st.metric("Total Portfolio", f"${total_val:,.2f}", f"${total_val-100000:+,.2f}")
    with m2: st.metric("Cash", f"${st.session_state.cash:,.2f}")
    with m3: st.metric("Invested", f"${total_invested:,.2f}")
    with m4: st.metric("Return", f"{(total_val-100000)/1000:.2f}%")

    st.markdown('<div class="section-title">Open Positions</div>', unsafe_allow_html=True)
    if positions_data:
        pdf = pd.DataFrame(positions_data)
        def color_pnl(val):
            return "color: #00d4aa" if val >= 0 else "color: #ef4444"
        styled = pdf.style.applymap(color_pnl, subset=["P&L $", "P&L %"])
        st.dataframe(styled, use_container_width=True, hide_index=True)

        # Pie chart
        if len(positions_data) > 0:
            labels = [p["Ticker"] for p in positions_data] + ["Cash"]
            values = []
            for p in positions_data:
                mv = float(p["Mkt Value"].replace("$", "").replace(",", ""))
                values.append(mv)
            values.append(st.session_state.cash)
            fig_pie = go.Figure(go.Pie(
                labels=labels, values=values, hole=0.5,
                marker=dict(colors=["#00d4aa","#7c3aed","#f59e0b","#3b82f6","#ef4444","#64748b"]),
            ))
            fig_pie.update_layout(
                paper_bgcolor="#0a0e1a", plot_bgcolor="#0a0e1a",
                font=dict(family="Space Mono", color="#e2e8f0"),
                showlegend=True, height=320, margin=dict(l=0, r=0, t=20, b=0)
            )
            st.plotly_chart(fig_pie, use_container_width=True)
    else:
        st.info("No open positions. Use the sidebar to buy stocks.")

    if st.button("🔄 Reset Portfolio"):
        st.session_state.portfolio = {}
        st.session_state.cash      = 100_000.0
        st.session_state.trade_log = []
        st.rerun()


# ─────────────────────────── TAB 3: TRADE LOG ─────────────────────────────────
with tab3:
    st.markdown("### Trade History")
    if not st.session_state.trade_log:
        st.info("No trades yet. Execute trades from the sidebar.")
    else:
        log_df = pd.DataFrame(st.session_state.trade_log[::-1])
        log_df["price"]  = log_df["price"].apply(lambda x: f"${x:.2f}")
        log_df["total"]  = log_df["total"].apply(lambda x: f"${x:,.2f}")
        if "pnl" in log_df.columns:
            log_df["pnl"] = log_df["pnl"].apply(lambda x: f"${x:+.2f}" if pd.notna(x) else "—")
        st.dataframe(log_df, use_container_width=True, hide_index=True)


# ─────────────────────────── TAB 4: WATCHLIST ─────────────────────────────────
with tab4:
    st.markdown("### Watchlist")
    if not st.session_state.watchlist:
        st.info("Add tickers via the sidebar.")
    else:
        wl_data = []
        for tkr in st.session_state.watchlist:
            h, inf = fetch_stock_data(tkr, "5d")
            if h is not None and not h.empty:
                c = float(h["Close"].iloc[-1])
                p = float(h["Close"].iloc[-2]) if len(h) > 1 else c
                chg  = c - p
                chgp = chg / p * 100
                wl_data.append({
                    "Ticker": tkr,
                    "Name":   inf.get("shortName", tkr),
                    "Price":  f"${c:.2f}",
                    "Chg":    chg,
                    "Chg %":  chgp,
                    "Sector": inf.get("sector", "—"),
                })

        if wl_data:
            wl_df = pd.DataFrame(wl_data)
            def color_chg(val):
                if isinstance(val, (int, float)):
                    return "color: #00d4aa" if val >= 0 else "color: #ef4444"
                return ""
            styled_wl = wl_df.style.applymap(color_chg, subset=["Chg", "Chg %"]).format({"Chg": "${:+.2f}", "Chg %": "{:+.2f}%"})
            st.dataframe(styled_wl, use_container_width=True, hide_index=True)

        st.markdown('<div class="section-title">Remove from Watchlist</div>', unsafe_allow_html=True)
        remove_tkr = st.selectbox("Select ticker to remove", st.session_state.watchlist)
        if st.button("Remove"):
            st.session_state.watchlist.remove(remove_tkr)
            st.rerun()
