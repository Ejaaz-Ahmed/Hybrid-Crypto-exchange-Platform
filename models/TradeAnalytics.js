import mongoose from "mongoose";

const TradeAnalyticsSchema = new mongoose.Schema({
    trading_pair: String,
    avg_price: Number,
    trade_count: Number,
    volatility_index: Number,
    recorded_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("TradeAnalytics", TradeAnalyticsSchema);