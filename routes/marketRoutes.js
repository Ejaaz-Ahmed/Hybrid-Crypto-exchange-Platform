import express from "express";
import {
    updateMarketPrice,
    getLatestPrice,
    getLatestPrices,
    getAnalyticsList,
    getOrderBook,
    createAnalytics
} from "../controllers/marketController.js";

const router = express.Router();

router.post("/price", updateMarketPrice);
router.get("/price", getLatestPrice);
router.get("/prices", getLatestPrices);
router.get("/analytics", getAnalyticsList);
router.get("/orderbook", getOrderBook);
router.post("/analytics", createAnalytics);

export default router;