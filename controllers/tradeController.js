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

  if (order_type === "BUY") {
    const quoteWallet = await getWalletInfoForUpdate(connection, user_id, quoteSymbol);
    const requiredQuote = price * quantity;

    if (quoteWallet.balance < requiredQuote) {
      throw new Error("Insufficient quote balance to place buy order.");
    }

    await updateWalletBalanceWithConnection(connection, quoteWallet.walletId, -requiredQuote, requiredQuote);
    await insertOracleTransaction(connection, user_id, quoteWallet.walletId, "ORDER_RESERVE", -requiredQuote, "COMPLETED");
  } else {
    const baseWallet = await getWalletInfoForUpdate(connection, user_id, baseSymbol);

    if (baseWallet.balance < quantity) {
      throw new Error("Insufficient asset balance to place sell order.");
    }

    await updateWalletBalanceWithConnection(connection, baseWallet.walletId, -quantity, quantity);
    await insertOracleTransaction(connection, user_id, baseWallet.walletId, "ORDER_RESERVE", -quantity, "COMPLETED");
  }
};

const matchOrders = async (connection, trading_pair) => {
  const symbols = parseTradingPair(trading_pair);
  if (!symbols) {
    throw new Error("Invalid trading pair format.");
  }

  // Fetch the best OPEN or PARTIALLY_FILLED BUY order
  const buyOrderResult = await connection.execute(
    `SELECT order_id, user_id, price, quantity, filled_quantity, created_at
     FROM ORDERS
     WHERE order_id = (
         SELECT order_id FROM (
             SELECT order_id
             FROM ORDERS
             WHERE trading_pair = :1
             AND order_type = 'BUY'
             AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
             ORDER BY price DESC, created_at ASC
         ) WHERE ROWNUM = 1
     )
     FOR UPDATE`,
    [trading_pair]
  );

  // Fetch the best OPEN or PARTIALLY_FILLED SELL order
  const sellOrderResult = await connection.execute(
    `SELECT order_id, user_id, price, quantity, filled_quantity, created_at
     FROM ORDERS
     WHERE order_id = (
         SELECT order_id FROM (
             SELECT order_id
             FROM ORDERS
             WHERE trading_pair = :1
             AND order_type = 'SELL'
             AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
             ORDER BY price ASC, created_at ASC
         ) WHERE ROWNUM = 1
     )
     FOR UPDATE`,
    [trading_pair]
  );

  if (!buyOrderResult.rows.length || !sellOrderResult.rows.length) {
    return null;
  }

  const buy = buyOrderResult.rows[0];
  const sell = sellOrderResult.rows[0];

  const buyOrderId = buy[0], buyUserId = buy[1], buyPrice = buy[2], buyQty = buy[3], buyFilled = buy[4], buyTime = buy[5];
  const sellOrderId = sell[0], sellUserId = sell[1], sellPrice = sell[2], sellQty = sell[3], sellFilled = sell[4], sellTime = sell[5];

  if (buyPrice < sellPrice) {
    return null; // No price overlap
  }

  // Determine Trade Price (maker's price)
  const tradePrice = (buyTime < sellTime) ? buyPrice : sellPrice;

  // Determine Trade Quantity
  const buyRemaining = buyQty - buyFilled;
  const sellRemaining = sellQty - sellFilled;
  const tradeQty = Math.min(buyRemaining, sellRemaining);
  const quoteAmount = tradePrice * tradeQty;

  const assetResult = await connection.execute(
    `SELECT asset_id, symbol FROM ASSETS WHERE symbol = :1 OR symbol = :2`,
    [symbols[0], symbols[1]]
  );

  if (assetResult.rows.length < 2) {
    throw new Error("Trading pair assets are not configured.");
  }

  const buyerQuoteWallet = await getWalletInfoForUpdate(connection, buyUserId, symbols[1]);
  const buyerBaseWallet = await getWalletInfoForUpdate(connection, buyUserId, symbols[0]);
  const sellerBaseWallet = await getWalletInfoForUpdate(connection, sellUserId, symbols[0]);
  const sellerQuoteWallet = await getWalletInfoForUpdate(connection, sellUserId, symbols[1]);

  await connection.execute(
    `INSERT INTO TRADES (buy_order_id, sell_order_id, trade_price, trade_quantity)
     VALUES (:1, :2, :3, :4)`,
    [buyOrderId, sellOrderId, tradePrice, tradeQty]
  );

  // Locked logic fixes
  const buyerLockedDeduction = tradeQty * buyPrice;
  const buyerRefund = buyerLockedDeduction - quoteAmount; 
  
  await updateWalletBalanceWithConnection(connection, buyerQuoteWallet.walletId, buyerRefund, -buyerLockedDeduction);
  await updateWalletBalanceWithConnection(connection, buyerBaseWallet.walletId, tradeQty, 0);
  
  await updateWalletBalanceWithConnection(connection, sellerBaseWallet.walletId, 0, -tradeQty);
  await updateWalletBalanceWithConnection(connection, sellerQuoteWallet.walletId, quoteAmount, 0);

  await insertOracleTransaction(connection, buyUserId, buyerQuoteWallet.walletId, "TRADE_SETTLE_QUOTE", -quoteAmount, "COMPLETED");
  if (buyerRefund > 0) {
     await insertOracleTransaction(connection, buyUserId, buyerQuoteWallet.walletId, "TRADE_REFUND_QUOTE", buyerRefund, "COMPLETED");
  }
  await insertOracleTransaction(connection, buyUserId, buyerBaseWallet.walletId, "TRADE_SETTLE_BASE", tradeQty, "COMPLETED");
  await insertOracleTransaction(connection, sellUserId, sellerBaseWallet.walletId, "TRADE_RELEASE_BASE", -tradeQty, "COMPLETED");
  await insertOracleTransaction(connection, sellUserId, sellerQuoteWallet.walletId, "TRADE_RECEIVE_QUOTE", quoteAmount, "COMPLETED");

  // Update order statuses
  const updateOrderStatus = async (orderId, newFilled, totalQty) => {
    const status = (newFilled >= totalQty) ? 'FILLED' : 'PARTIALLY_FILLED';
    await connection.execute(
      `UPDATE ORDERS SET filled_quantity = :1, order_status = :2 WHERE order_id = :3`,
      [newFilled, status, orderId]
    );
  };

  await updateOrderStatus(buyOrderId, buyFilled + tradeQty, buyQty);
  await updateOrderStatus(sellOrderId, sellFilled + tradeQty, sellQty);

  // Update Market Price in Mongo
  try {
     await MarketPrice.findOneAndUpdate(
       { trading_pair: trading_pair },
       { price: tradePrice, $inc: { volume_24h: tradeQty }, timestamp: new Date() },
       { upsert: true, new: true }
     );
  } catch (err) {
     console.error("Failed to update market price in mongo:", err);
  }

  return { buy, sell, tradeQty, tradePrice, buyUserId, sellUserId };
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

    // Matching loop (sweep the book until no more matches)
    let matched = true;
    let anyMatches = false;
    let matchCount = 0;
    while (matched && matchCount < 50) { // Safety limit of 50 matches per request
      const matchResult = await matchOrders(connection, normalizedPair);
      if (matchResult) {
        anyMatches = true;
        matchCount++;
        await SystemLog.create({
          service: "MatchingEngine",
          event: "OrderExecuted",
          user_id: Number(matchResult.buyUserId)
        });
      } else {
        matched = false;
      }
    }

    await connection.commit();

    await SystemLog.create({
      service: "TradeService",
      event: "OrderPlaced",
      user_id: Number(user_id)
    });

    if (anyMatches) {
      return res.status(201).json({ message: "Order placed and matched successfully.", matches: matchCount });
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
    let matched = true;
    let matchCount = 0;
    
    while (matched && matchCount < 50) {
      const matchResult = await matchOrders(connection, normalizedPair);
      if (matchResult) {
        matchCount++;
        await SystemLog.create({
          service: "MatchingEngine",
          event: "OrderExecuted",
          user_id: Number(matchResult.buyUserId)
        });
      } else {
        matched = false;
      }
    }

    await connection.commit();

    if (matchCount === 0) {
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