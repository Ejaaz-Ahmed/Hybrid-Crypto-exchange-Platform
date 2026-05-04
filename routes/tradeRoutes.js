import express from "express";
import { placeOrder, executeTrade, getOrders } from "../controllers/tradeController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/order", authenticateToken, placeOrder);
router.post("/execute", executeTrade);
router.get("/orders/:userId", authenticateToken, getOrders);

export default router;