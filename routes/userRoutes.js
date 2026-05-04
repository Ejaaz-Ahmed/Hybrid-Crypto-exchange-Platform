import express from "express";
import { registerUser, loginUser, getUser } from "../controllers/userController.js";
import { getPortfolio } from "../controllers/portfolioController.js";
import { depositFunds, withdrawFunds } from "../controllers/walletController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:userId", authenticateToken, getUser);
router.get("/:userId/portfolio", authenticateToken, getPortfolio);
router.post("/:userId/deposit", authenticateToken, depositFunds);
router.post("/:userId/withdraw", authenticateToken, withdrawFunds);

export default router;