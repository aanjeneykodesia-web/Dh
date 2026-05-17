# model_train.py
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import pickle
import os

def prepare_features(data, window=5):
    """Create lag features for stock prediction"""
    df = data.copy()
    for i in range(1, window+1):
        df[f'lag_{i}'] = df['Close'].shift(i)
    df['target'] = df['Close'].shift(-1)
    df.dropna(inplace=True)
    return df

def train_model(symbol='AAPL', period='2y'):
    print(f"Downloading {symbol} data...")
    stock = yf.Ticker(symbol)
    df = stock.history(period=period)
    
    # Feature engineering
    df = prepare_features(df, window=5)
    features = [c for c in df.columns if 'lag_' in c]
    X = df[features]
    y = df['target']
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    # Train model (replace with your own!)
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    print(f"✅ Model trained. MAE: ${mae:.2f}")
    
    # Save model
    os.makedirs('models', exist_ok=True)
    with open('models/my_stock_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Model saved to models/my_stock_model.pkl")

if __name__ == '__main__':
    # You can change symbol, period, or any logic
    train_model('AAPL', '2y')
