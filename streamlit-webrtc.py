import streamlit as st
import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time
from streamlit_webrtc import webrtc_streamer, RTCConfiguration, VideoTransformerBase, VideoProcessorBase
import av
import numpy as np

from model_utils import load_model, get_prediction

# ------------------- Page config -------------------
st.set_page_config(page_title="AI Stock Analyst", layout="wide")
st.title("📈 AI Stock Analyst with Live Screen Share")
st.markdown("---")

# ------------------- Load your custom AI model -------------------
@st.cache_resource
def load_custom_model():
    try:
        model = load_model()
        st.success("✅ Your custom AI model loaded successfully!")
        return model
    except Exception as e:
        st.error(f"❌ Could not load model: {e}")
        st.info("Run `python model_train.py` first to train and save a model.")
        return None

model = load_custom_model()

# ------------------- Sidebar: Stock selection -------------------
with st.sidebar:
    st.header("🔍 Stock Selector")
    symbol = st.text_input("Ticker Symbol", value="AAPL").upper()
    period = st.selectbox("History period", ["1mo", "3mo", "6mo", "1y", "2y"], index=2)
    auto_refresh = st.checkbox("Live auto-refresh (every 10s)", value=False)
    
    st.markdown("---")
    st.header("🤖 AI Prediction")
    if st.button("Predict Next Day Close", use_container_width=True):
        if model is None:
            st.error("No AI model available")
        else:
            # Get last 5 days of closing prices
            stock = yf.Ticker(symbol)
            hist = stock.history(period="5d")
            if len(hist) >= 5:
                last_prices = hist['Close'].tolist()
                pred = get_prediction(model, last_prices, window=5)
                st.metric("📊 Predicted Close (Next Day)", f"${pred:.2f}")
            else:
                st.error("Not enough data (need 5 days).")

# ------------------- Main area: Stock Data & Chart -------------------
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader(f"📊 {symbol} - Real-time Chart")
    placeholder = st.empty()

with col2:
    st.subheader("📰 Live Stats")
    stats_placeholder = st.empty()

# Screen share section
st.markdown("---")
st.subheader("🖥️ Live Screen Share (Collaborative View)")
st.caption("Share your screen (or camera) for live walkthroughs. Viewers will see your broadcast.")

# WebRTC screen share configuration
RTC_CONFIG = RTCConfiguration(
    {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}
)

class ScreenShareProcessor(VideoProcessorBase):
    def recv(self, frame: av.VideoFrame) -> av.VideoFrame:
        # Optional: you can add overlays or annotations here
        return frame

def screen_share_callback():
    webrtc_streamer(
        key="screen-share",
        video_processor_factory=ScreenShareProcessor,
        rtc_configuration=RTC_CONFIG,
        media_stream_constraints={
            "video": True,
            "audio": False,   # Change to True if you want mic
        },
        video_transformer_factory=None,  # Keep original for screen share
    )

# Button to start/stop screen share
if st.button("🎥 Start Screen Sharing", use_container_width=True):
    st.info("Sharing your screen – other users see this feed.")
    screen_share_callback()

# ------------------- Update function for stock data -------------------
def update_stock_data():
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period)
        if hist.empty:
            return None, None
        # Current price
        current = stock.info.get('regularMarketPrice', hist['Close'].iloc[-1])
        change = stock.info.get('regularMarketChange', 0)
        change_pct = stock.info.get('regularMarketChangePercent', 0)
        stats = {
            "Current Price": f"${current:.2f}",
            "Change": f"${change:.2f} ({change_pct:.2f}%)",
            "Day High": f"${stock.info.get('dayHigh', 'N/A')}",
            "Day Low": f"${stock.info.get('dayLow', 'N/A')}",
            "Volume": f"{stock.info.get('volume', 'N/A'):,}",
            "Market Cap": f"${stock.info.get('marketCap', 0)/1e9:.2f}B"
        }
        return hist, stats
    except Exception as e:
        st.error(f"Error fetching data: {e}")
        return None, None

# ------------------- Live loop with auto-refresh -------------------
if auto_refresh:
    # Use a placeholder and loop – Streamlit reruns naturally with st.empty()
    placeholder_chart = placeholder
    while True:
        hist, stats = update_stock_data()
        if hist is not None and not hist.empty:
            # Plotly candlestick chart
            fig = go.Figure(data=[go.Candlestick(x=hist.index,
                                                  open=hist['Open'],
                                                  high=hist['High'],
                                                  low=hist['Low'],
                                                  close=hist['Close'])])
            fig.update_layout(title=f"{symbol} - {period}", xaxis_title="Date", yaxis_title="Price (USD)",
                              template="plotly_dark")
            placeholder_chart.plotly_chart(fig, use_container_width=True)
            
            # Update stats
            stats_df = pd.DataFrame(stats.items(), columns=["Metric", "Value"])
            stats_placeholder.dataframe(stats_df, use_container_width=True)
        time.sleep(10)
else:
    # Manual refresh on button
    if st.button("Refresh Data"):
        hist, stats = update_stock_data()
        if hist is not None and not hist.empty:
            fig = go.Figure(data=[go.Candlestick(x=hist.index,
                                                  open=hist['Open'],
                                                  high=hist['High'],
                                                  low=hist['Low'],
                                                  close=hist['Close'])])
            fig.update_layout(template="plotly_dark")
            placeholder.plotly_chart(fig, use_container_width=True)
            stats_df = pd.DataFrame(stats.items(), columns=["Metric", "Value"])
            stats_placeholder.dataframe(stats_df, use_container_width=True)
    else:
        # initial load
        hist, stats = update_stock_data()
        if hist is not None and not hist.empty:
            fig = go.Figure(data=[go.Candlestick(x=hist.index,
                                                  open=hist['Open'],
                                                  high=hist['High'],
                                                  low=hist['Low'],
                                                  close=hist['Close'])])
            fig.update_layout(template="plotly_dark")
            placeholder.plotly_chart(fig, use_container_width=True)
            stats_df = pd.DataFrame(stats.items(), columns=["Metric", "Value"])
            stats_placeholder.dataframe(stats_df, use_container_width=True)

st.markdown("---")
st.caption("Your custom AI model provides predictions. Screen sharing uses WebRTC – all peers see the broadcaster's screen.")
