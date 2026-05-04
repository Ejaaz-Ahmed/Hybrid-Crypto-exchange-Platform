import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import MarketPrice from './models/MarketPrice.js';
import OrderBook from './models/OrderBook.js';
import TradeAnalytics from './models/TradeAnalytics.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_exchange';
await mongoose.connect(mongoUri);

async function fetchCryptoData() {
  const coins = [
    { id: 'bitcoin', symbol: 'BTC' },
    { id: 'ethereum', symbol: 'ETH' },
    { id: 'solana', symbol: 'SOL' },
    { id: 'binancecoin', symbol: 'BNB' },
    { id: 'cardano', symbol: 'ADA' },
    { id: 'polygon', symbol: 'MATIC' },
    { id: 'chainlink', symbol: 'LINK' },
    { id: 'polkadot', symbol: 'DOT' },
  ];
  const pairs = coins.map(({ symbol }) => `${symbol}/USDT`);

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coins.map(({ id }) => id).join(',')}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`
    );
    const data = await response.json();
    await Promise.all([
      MarketPrice.deleteMany({}),
      OrderBook.deleteMany({}),
      TradeAnalytics.deleteMany({}),
    ]);

    const prices = [];
    const analytics = [];

    for (const coin of coins) {
      const price = data[coin.id]?.usd || 0;
      const volume24h = data[coin.id]?.usd_24h_vol || 0;
      const changePercent = data[coin.id]?.usd_24h_change || 0;

      prices.push({
        trading_pair: `${coin.symbol}/USDT`,
        price,
        volume_24h: volume24h,
      });

      analytics.push({
        trading_pair: `${coin.symbol}/USDT`,
        avg_price: price,
        trade_count: Math.max(1, Math.round(volume24h / 100000)),
        volatility_index: Math.abs(Number(changePercent || 0)),
      });
    }

    await MarketPrice.insertMany(prices);
    await TradeAnalytics.insertMany(analytics);

    // Generate sample order books
    for (const pair of pairs) {
      const basePrice = prices.find(p => p.trading_pair === pair)?.price || 100;
      const bids = [];
      const asks = [];

      for (let i = 1; i <= 10; i++) {
        bids.push({
          price: basePrice - (i * 0.01),
          quantity: Math.random() * 100,
        });
        asks.push({
          price: basePrice + (i * 0.01),
          quantity: Math.random() * 100,
        });
      }

      await OrderBook.create({
        trading_pair: pair,
        bids,
        asks,
      });
    }

    console.log('Real crypto data inserted successfully.');
  } catch (error) {
    console.error('Error fetching crypto data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fetchCryptoData();