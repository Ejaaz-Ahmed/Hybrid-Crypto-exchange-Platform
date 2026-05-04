import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketPrice from './models/MarketPrice.js';
import OrderBook from './models/OrderBook.js';
import TradeAnalytics from './models/TradeAnalytics.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto_exchange';

async function seedMongoRichData() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for rich seeding...");

    // Clear existing
    await Promise.all([
      MarketPrice.deleteMany({}),
      OrderBook.deleteMany({}),
      TradeAnalytics.deleteMany({}),
    ]);
    console.log("Cleared existing Mongo collections.");

    const pairs = [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT',
      'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'LINK/USDT', 'MATIC/USDT'
    ];
    const basePrices = {
      'BTC/USDT': 65000, 'ETH/USDT': 3500, 'SOL/USDT': 150, 'BNB/USDT': 600, 'ADA/USDT': 0.45,
      'XRP/USDT': 0.60, 'DOT/USDT': 7.50, 'DOGE/USDT': 0.15, 'LINK/USDT': 18.20, 'MATIC/USDT': 0.90
    };

    const prices = [];
    const analytics = [];
    const orderbooks = [];

    // Generate 50 MarketPrices & TradeAnalytics (5 time-series entries per pair)
    for (const pair of pairs) {
      let currentPrice = basePrices[pair];
      
      for (let i = 0; i < 5; i++) {
        // Random fluctuation
        currentPrice = currentPrice * (1 + (Math.random() * 0.04 - 0.02)); 
        
        prices.push({
          trading_pair: pair,
          price: currentPrice,
          volume_24h: Math.random() * 10000000 + 1000000, // 1M to 11M
          timestamp: new Date(Date.now() - i * 3600000) // 1 hour intervals back in time
        });

        analytics.push({
          trading_pair: pair,
          avg_price: currentPrice,
          trade_count: Math.floor(Math.random() * 5000) + 500,
          volatility_index: Math.random() * 5 + 1,
          recorded_at: new Date(Date.now() - i * 3600000)
        });
      }

      // Generate Rich Orderbooks (1 snapshot per pair, but 20 bids and 20 asks each = 40 rows inside the document)
      const bids = [];
      const asks = [];
      const bp = basePrices[pair];

      for (let i = 1; i <= 25; i++) {
        bids.push({ price: bp * (1 - i * 0.001), quantity: Math.random() * 10 + 0.1 });
        asks.push({ price: bp * (1 + i * 0.001), quantity: Math.random() * 10 + 0.1 });
      }

      // Sort bids desc, asks asc
      bids.sort((a, b) => b.price - a.price);
      asks.sort((a, b) => a.price - b.price);

      orderbooks.push({
        trading_pair: pair,
        bids: bids,
        asks: asks,
        snapshot_time: new Date()
      });
    }

    await MarketPrice.insertMany(prices);
    console.log(`Inserted ${prices.length} MarketPrice records`);

    await TradeAnalytics.insertMany(analytics);
    console.log(`Inserted ${analytics.length} TradeAnalytics records`);

    await OrderBook.insertMany(orderbooks);
    console.log(`Inserted ${orderbooks.length} OrderBook records`);

    console.log("Rich MongoDB seeding complete!");
  } catch (error) {
    console.error("Error seeding MongoDB:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedMongoRichData();
