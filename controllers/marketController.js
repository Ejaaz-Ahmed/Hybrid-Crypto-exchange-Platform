import MarketPrice from "../models/MarketPrice.js";
import OrderBook from "../models/OrderBook.js";
import TradeAnalytics from "../models/TradeAnalytics.js";
import SystemLog from "../models/SystemLog.js";

export const updateMarketPrice = async (req, res) => {
    try {
        const { trading_pair, price, volume_24h } = req.body;

        const newPrice = await MarketPrice.create({
            trading_pair: trading_pair.toUpperCase(),
            price,
            volume_24h
        });

        await SystemLog.create({
            service: "MarketDataService",
            event: "Price Updated"
        });

        res.status(201).json(newPrice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getLatestPrice = async (req, res) => {
    try {
        const { pair } = req.query;

        if (!pair) {
            return res.status(400).json({ error: "Trading pair is required." });
        }

        const price = await MarketPrice
            .findOne({ trading_pair: pair.toUpperCase() })
            .sort({ timestamp: -1 });

        if (!price) {
            return res.status(404).json({ error: "Price not found for the requested pair." });
        }

        res.json(price);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getLatestPrices = async (req, res) => {
    try {
        const prices = await MarketPrice.aggregate([
            { $sort: { trading_pair: 1, timestamp: -1 } },
            {
                $group: {
                    _id: "$trading_pair",
                    trading_pair: { $first: "$trading_pair" },
                    price: { $first: "$price" },
                    volume_24h: { $first: "$volume_24h" },
                    timestamp: { $first: "$timestamp" }
                }
            },
            { $sort: { price: -1 } }
        ]);

        res.json(prices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getAnalyticsList = async (req, res) => {
    try {
        const analytics = await TradeAnalytics.find()
            .sort({ recorded_at: -1 })
            .limit(10);

        res.json(analytics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

import { executeQuery } from "../services/oracleService.js";

export const getOrderBook = async (req, res) => {
    try {
        const { pair } = req.query;

        if (!pair) {
            return res.status(400).json({ error: "Trading pair is required." });
        }

        const normalizedPair = pair.toUpperCase();

        const bidsResult = await executeQuery(
            `SELECT price, SUM(quantity - filled_quantity) as qty
             FROM ORDERS
             WHERE trading_pair = :1 AND order_type = 'BUY' AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
             GROUP BY price
             ORDER BY price DESC
             FETCH FIRST 10 ROWS ONLY`,
            [normalizedPair]
        );

        const asksResult = await executeQuery(
            `SELECT price, SUM(quantity - filled_quantity) as qty
             FROM ORDERS
             WHERE trading_pair = :1 AND order_type = 'SELL' AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
             GROUP BY price
             ORDER BY price ASC
             FETCH FIRST 10 ROWS ONLY`,
            [normalizedPair]
        );

        const snapshot = {
            trading_pair: normalizedPair,
            bids: bidsResult.rows.map(row => ({ price: row[0], quantity: row[1] })),
            asks: asksResult.rows.map(row => ({ price: row[0], quantity: row[1] })),
            snapshot_time: new Date()
        };

        res.json(snapshot);
    } catch (err) {
        console.error("OrderBook Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const createAnalytics = async (req, res) => {
    try {
        const { trading_pair, avg_price, trade_count, volatility_index } = req.body;

        const analytics = await TradeAnalytics.create({
            trading_pair,
            avg_price,
            trade_count,
            volatility_index
        });

        res.status(201).json(analytics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};