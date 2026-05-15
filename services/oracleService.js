import { connectOracle } from "../config/oracle.js";

export async function executeQuery(sql, binds = []) {
    const connection = await connectOracle();

    const result = await connection.execute(sql, binds, {
        autoCommit: true,
    });

    await connection.close();
    return result;
}

export async function getWalletBalance(userId, symbol) {
    const sql = `SELECT get_available_balance(:userId, :symbol) FROM DUAL`;
    const result = await executeQuery(sql, { userId, symbol });
    return result.rows.length > 0 ? result.rows[0][0] : 0;
}

export async function getWalletInfo(connection, userId, symbol) {
    const result = await connection.execute(
        `SELECT wallet_id, balance, locked_balance, asset_id
         FROM wallets
         WHERE user_id = :1 AND asset_id = (SELECT asset_id FROM assets WHERE symbol = :2)`,
        [userId, symbol]
    );

    if (!result.rows.length) {
        throw new Error(`Wallet not found for ${symbol}`);
    }

    const [walletId, balance, lockedBalance, assetId] = result.rows[0];
    return { walletId, balance, lockedBalance, assetId };
}

export async function getWalletInfoForUpdate(connection, userId, symbol) {
    const result = await connection.execute(
        `SELECT wallet_id, balance, locked_balance, asset_id
         FROM wallets
         WHERE user_id = :1 AND asset_id = (SELECT asset_id FROM assets WHERE symbol = :2)
         FOR UPDATE`,
        [userId, symbol]
    );

    if (!result.rows.length) {
        throw new Error(`Wallet not found for ${symbol}`);
    }

    const [walletId, balance, lockedBalance, assetId] = result.rows[0];
    return { walletId, balance, lockedBalance, assetId };
}

export async function updateWalletBalanceWithConnection(connection, walletId, balanceDelta = 0, lockedDelta = 0) {
    await connection.execute(
        `UPDATE wallets
         SET balance = balance + :balanceDelta,
             locked_balance = locked_balance + :lockedDelta
         WHERE wallet_id = :walletId`,
        { balanceDelta, lockedDelta, walletId }
    );
}

export async function insertOracleTransaction(connection, userId, walletId, transactionType, amount, status = "COMPLETED") {
    await connection.execute(
        `INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status)
         VALUES (:1, :2, :3, :4, :5)`,
        [userId, walletId, transactionType, amount, status]
    );
}

export async function updateWalletBalance(userId, symbol, amount) {
    const currentBalance = await getWalletBalance(userId, symbol);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
        throw new Error("Insufficient balance");
    }

    const sql = `
        UPDATE wallets 
        SET balance = :newBalance 
        WHERE user_id = :userId 
        AND asset_id = (SELECT asset_id FROM assets WHERE symbol = :symbol)
    `;
    await executeQuery(sql, { userId, symbol, newBalance });
}