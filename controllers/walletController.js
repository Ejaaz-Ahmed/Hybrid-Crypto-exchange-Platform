import { getTransactionConnection } from "../services/oracleTransaction.js";
import { getWalletInfoForUpdate, updateWalletBalanceWithConnection, insertOracleTransaction } from "../services/oracleService.js";
import { logSystemEvent } from "../services/mongoService.js";

const normalizeWalletRequest = (req) => {
  const { userId } = req.params;
  const { symbol, amount } = req.body;

  return {
    normalizedUserId: Number(userId),
    normalizedSymbol: String(symbol || "").trim().toUpperCase(),
    normalizedAmount: Number(amount),
  };
};

export const depositFunds = async (req, res) => {
  const { normalizedUserId, normalizedSymbol, normalizedAmount } = normalizeWalletRequest(req);

  if (!Number.isFinite(normalizedUserId) || Number(req.user?.userId) !== normalizedUserId) {
    return res.status(403).json({ error: "Forbidden: user mismatch." });
  }

  if (!normalizedSymbol || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ error: "Invalid symbol or amount" });
  }

  let connection;
  try {
    connection = await getTransactionConnection();
    const wallet = await getWalletInfoForUpdate(connection, normalizedUserId, normalizedSymbol);

    await updateWalletBalanceWithConnection(connection, wallet.walletId, normalizedAmount, 0);
    await insertOracleTransaction(connection, normalizedUserId, wallet.walletId, "DEPOSIT", normalizedAmount, "COMPLETED");

    await connection.commit();
    await logSystemEvent("DEPOSIT", { userId: normalizedUserId, symbol: normalizedSymbol, amount: normalizedAmount });
    res.json({ message: "Deposit successful" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Deposit error:", error);
    if (error.message?.includes("Wallet not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Deposit failed" });
  } finally {
    if (connection) await connection.close();
  }
};

export const withdrawFunds = async (req, res) => {
  const { normalizedUserId, normalizedSymbol, normalizedAmount } = normalizeWalletRequest(req);

  if (!Number.isFinite(normalizedUserId) || Number(req.user?.userId) !== normalizedUserId) {
    return res.status(403).json({ error: "Forbidden: user mismatch." });
  }

  if (!normalizedSymbol || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ error: "Invalid symbol or amount" });
  }

  let connection;
  try {
    connection = await getTransactionConnection();
    const wallet = await getWalletInfoForUpdate(connection, normalizedUserId, normalizedSymbol);

    if (wallet.balance < normalizedAmount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await updateWalletBalanceWithConnection(connection, wallet.walletId, -normalizedAmount, 0);
    await insertOracleTransaction(connection, normalizedUserId, wallet.walletId, "WITHDRAWAL", -normalizedAmount, "COMPLETED");

    await connection.commit();
    await logSystemEvent("WITHDRAWAL", { userId: normalizedUserId, symbol: normalizedSymbol, amount: normalizedAmount });
    res.json({ message: "Withdrawal successful" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Withdrawal error:", error);
    if (error.message?.includes("Wallet not found")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Withdrawal failed" });
  } finally {
    if (connection) await connection.close();
  }
};
