import { executeQuery } from "../services/oracleService.js";

export const getPortfolio = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required." });
        }

        if (Number(req.user?.userId) !== Number(userId)) {
            return res.status(403).json({ error: "Forbidden: user mismatch." });
        }

        const result = await executeQuery(
            `SELECT w.wallet_id, a.asset_name, a.symbol, w.balance, w.locked_balance
             FROM WALLETS w
             JOIN ASSETS a ON w.asset_id = a.asset_id
             WHERE w.user_id = :1`,
            [userId]
        );

        const portfolio = result.rows.map((row) => ({
            walletId: row[0],
            assetName: row[1],
            symbol: row[2],
            balance: row[3],
            lockedBalance: row[4]
        }));

        res.json({ userId, portfolio });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Could not load portfolio." });
    }
};
