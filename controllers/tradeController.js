import { executeQuery, getWalletInfo, getWalletInfoForUpdate, updateWalletBalanceWithConnection, insertOracleTransaction } from "../services/oracleService.js";
import { getTransactionConnection } from "../services/oracleTransaction.js";
import SystemLog from "../models/SystemLog.js";
import MarketPrice from "../models/MarketPrice.js";

const parseTradingPair = (pair) => {
  if (!pair || !pair.includes("/")) return null;
  return pair.split("/").map((symbol) => symbol.trim().toUpperCase());
};

const reserveOrderFunds = async (connection, user_id, order_type, trading_pair, price, quantity) => {
  const [baseSymbol, quoteSymbol] = parseTradingPair(trading_pair);
  if (!baseSymbol || !quoteSymbol) {
    throw new Error("Invalid trading pair format.");
  }

  // Call the new Oracle stored procedure
  await connection.execute(
    `BEGIN reserve_order_funds(:1, :2, :3, :4, :5, :6); END;`,
    [user_id, order_type, baseSymbol, quoteSymbol, price, quantity]
  );
};

const matchOrdersInDb = async (connection, trading_pair) => {
  // Call the new Oracle stored procedure to match all possible orders
  await connection.execute(
    `BEGIN match_all_orders(:1); END;`,
    [trading_pair]
  );

  // the market price in MongoDB based on the latest trade for this pair.
  const latestTradeResult = await connection.execute(
    `SELECT trade_price, trade_quantity 
     FROM (
         SELECT t.trade_price, t.trade_quantity 
         FROM TRADES t
         JOIN ORDERS o ON t.buy_order_id = o.order_id
         WHERE o.trading_pair = :1
         ORDER BY t.executed_at DESC
     ) WHERE ROWNUM = 1`,
    [trading_pair]
  );

  if (latestTradeResult.rows.length > 0) {
    const [price, qty] = latestTradeResult.rows[0];
    try {
      await MarketPrice.findOneAndUpdate(
        { trading_pair: trading_pair },
        { price: price, $inc: { volume_24h: qty }, timestamp: new Date() },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Failed to update market price in mongo:", err);
    }
    return true;
  }

  return false;
};

export const placeOrder = async (req, res) => {
  let connection;

  try {
    const { trading_pair, order_type, price, quantity } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      return res.status(401).json({ error: "Authenticated user required." });
    }

    if (!trading_pair || !order_type || !price || !quantity) {
      return res.status(400).json({ error: "Please provide all order fields." });
    }

    const normalizedPair = String(trading_pair).trim().toUpperCase();
    const normalizedType = order_type.toUpperCase();
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    if (!["BUY", "SELL"].includes(normalizedType)) {
      return res.status(400).json({ error: "Order type must be BUY or SELL." });
    }
    if (!parseTradingPair(normalizedPair)) {
      return res.status(400).json({ error: "Invalid trading pair format. Use BASE/QUOTE." });
    }
    if (!Number.isFinite(numericPrice) || !Number.isFinite(numericQuantity) || numericPrice <= 0 || numericQuantity <= 0) {
      return res.status(400).json({ error: "Price and quantity must be positive numbers." });
    }

    connection = await getTransactionConnection();

    // Lock funds for the order
    await reserveOrderFunds(connection, user_id, normalizedType, normalizedPair, numericPrice, numericQuantity);

    // Insert the initial order
    await connection.execute(
      `INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status)
       VALUES (:1, :2, :3, :4, :5, 0, 'OPEN')`,
      [user_id, normalizedPair, normalizedType, numericPrice, numericQuantity]
    );

    // Matching engine call (handled by database procedure)
    const matched = await matchOrdersInDb(connection, normalizedPair);

    // Commit transaction BEFORE responding to client
    await connection.commit();

    await SystemLog.create({
      service: "TradeService",
      event: "OrderPlaced",
      user_id: Number(user_id)
    });

    if (matched) {
      return res.status(201).json({ message: "Order placed and matching engine triggered." });
    }

    res.status(201).json({ message: "Order placed successfully." });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
};

export const executeTrade = async (req, res) => {
  let connection;

  try {
    const { trading_pair } = req.body;
    const normalizedPair = String(trading_pair || "").trim().toUpperCase();
    const symbols = parseTradingPair(normalizedPair);

    if (!symbols) {
      return res.status(400).json({ error: "Invalid trading pair format." });
    }

    connection = await getTransactionConnection();
    const matched = await matchOrdersInDb(connection, normalizedPair);

    await connection.commit();

    if (!matched) {
      return res.json({ message: "No matching orders available." });
    }

    res.json({ message: `Trades executed successfully. Matches: ${matchCount}` });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    let ordersResult;
    if (userId.toLowerCase() === 'all') {
      ordersResult = await executeQuery(
        `SELECT order_id, trading_pair, order_type, price, quantity, filled_quantity, order_status, created_at
         FROM ORDERS
         ORDER BY created_at DESC
         FETCH FIRST 50 ROWS ONLY`,
        []
      );
    } else {
      ordersResult = await executeQuery(
        `SELECT order_id, trading_pair, order_type, price, quantity, filled_quantity, order_status, created_at
         FROM ORDERS
         WHERE user_id = :1
         ORDER BY created_at DESC`,
        [userId]
      );
    }

    const orders = ordersResult.rows.map(row => ({
      order_id: row[0],
      trading_pair: row[1],
      order_type: row[2],
      price: row[3],
      quantity: row[4],
      filled_quantity: row[5],
      status: row[6],
      created_at: row[7]
    }));

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};