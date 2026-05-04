import mongoose from "mongoose";
import TradeAnalytics from "./models/TradeAnalytics.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/crypto_exchange";

const seedAnalytics = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected for seeding");

    // Clear existing data
    await TradeAnalytics.deleteMany({});
    console.log("Cleared existing analytics data");

    // Sample analytics data
    const analyticsData = [
      {
        trading_pair: "BTC/USDT",
        avg_price: 45230.50,
        trade_count: 1250,
        volatility_index: 2.35
      },
      {
        trading_pair: "ETH/USDT",
        avg_price: 2850.75,
        trade_count: 2100,
        volatility_index: 3.12
      },
      {
        trading_pair: "XRP/USDT",
        avg_price: 0.65,
        trade_count: 850,
        volatility_index: 4.22
      },
      {
        trading_pair: "SOL/USDT",
        avg_price: 185.40,
        trade_count: 650,
        volatility_index: 3.85
      },
      {
        trading_pair: "ADA/USDT",
        avg_price: 1.25,
        trade_count: 520,
        volatility_index: 2.95
      },
      {
        trading_pair: "DOGE/USDT",
        avg_price: 0.32,
        trade_count: 980,
        volatility_index: 5.10
      }
    ];

    const inserted = await TradeAnalytics.insertMany(analyticsData);
    console.log(`Inserted ${inserted.length} analytics records`);

    await mongoose.connection.close();
    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Seeding error:", error.message);
    process.exit(1);
  }
};

seedAnalytics();
