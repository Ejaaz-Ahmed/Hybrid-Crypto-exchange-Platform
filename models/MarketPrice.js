import mongoose from "mongoose";

const MarketPriceSchema = new mongoose.Schema({
    trading_pair: String,
    price: Number,
    volume_24h: Number,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("MarketPrice", MarketPriceSchema);