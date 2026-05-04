import mongoose from "mongoose";

const OrderBookSchema = new mongoose.Schema({
    trading_pair: String,
    bids: [{ price: Number, quantity: Number }],
    asks: [{ price: Number, quantity: Number }],
    snapshot_time: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("OrderBook", OrderBookSchema);