-- ==============================================================================
-- Hybrid Crypto-exchange: Advanced Database Objects (Oracle)
-- This script adds Procedures, Functions, and Triggers to handle trading logic.
-- ==============================================================================

-- 1. FUNCTION: Get Asset ID from Symbol
CREATE OR REPLACE FUNCTION get_asset_id_by_symbol(p_symbol IN VARCHAR2) 
RETURN NUMBER IS
    v_id NUMBER;
BEGIN
    SELECT asset_id INTO v_id FROM ASSETS WHERE symbol = p_symbol;
    RETURN v_id;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
/

-- 2. FUNCTION: Get Available Balance
-- Returns (balance - locked_balance) for a user and asset
CREATE OR REPLACE FUNCTION get_available_balance(
    p_user_id IN NUMBER,
    p_symbol IN VARCHAR2
) RETURN NUMBER IS
    v_available NUMBER;
BEGIN
    SELECT (balance - locked_balance) INTO v_available
    FROM WALLETS
    WHERE user_id = p_user_id 
      AND asset_id = get_asset_id_by_symbol(p_symbol);
    
    RETURN NVL(v_available, 0);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
END;
/

-- 3. PROCEDURE: Reserve Funds for Order
-- Locks the required amount in the user's wallet
CREATE OR REPLACE PROCEDURE reserve_order_funds(
    p_user_id     IN NUMBER,
    p_order_type  IN VARCHAR2, -- 'BUY' or 'SELL'
    p_base_symbol IN VARCHAR2,
    p_quote_symbol IN VARCHAR2,
    p_price       IN NUMBER,
    p_quantity    IN NUMBER
) IS
    v_wallet_id NUMBER;
    v_amount    NUMBER;
    v_symbol    VARCHAR2(20);
BEGIN
    IF p_order_type = 'BUY' THEN
        v_symbol := p_quote_symbol;
        v_amount := p_price * p_quantity;
    ELSE
        v_symbol := p_base_symbol;
        v_amount := p_quantity;
    END IF;

    -- Get and Lock Wallet for update
    SELECT wallet_id INTO v_wallet_id
    FROM WALLETS
    WHERE user_id = p_user_id 
      AND asset_id = get_asset_id_by_symbol(v_symbol)
    FOR UPDATE;

    -- Check if enough balance (Available = balance - locked)
    -- But according to tradeController.js:
    -- BUY: quoteWallet.balance < requiredQuote
    -- SELL: availableBase < quantity (where availableBase = baseWallet.balance - baseWallet.lockedBalance)
    -- This looks inconsistent in the original code. 
    -- Let's use: balance must be >= amount + existing locked? 
    -- Or simply balance must be >= amount, and we move amount from balance to locked?
    -- In tradeController.js: 
    -- BUY: balance = balance - amount, locked = locked + amount.
    -- SELL: balance = balance - amount, locked = locked + amount.
    
    UPDATE WALLETS
    SET balance = balance - v_amount,
        locked_balance = locked_balance + v_amount
    WHERE wallet_id = v_wallet_id
      AND balance >= v_amount;

    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Insufficient funds to place order.');
    END IF;

    -- Record transaction
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status)
    VALUES (p_user_id, v_wallet_id, 'ORDER_RESERVE', -v_amount, 'COMPLETED');

END;
/

-- 4. PROCEDURE: Execute a Single Match
-- Handles the transfer of assets between buyer and seller
CREATE OR REPLACE PROCEDURE execute_match(
    p_buy_order_id  IN NUMBER,
    p_sell_order_id IN NUMBER,
    p_trade_price   IN NUMBER,
    p_trade_quantity IN NUMBER,
    p_base_symbol    IN VARCHAR2,
    p_quote_symbol   IN VARCHAR2
) IS
    v_buy_user_id  NUMBER;
    v_sell_user_id NUMBER;
    v_buy_price    NUMBER;
    v_quote_amount NUMBER;
    
    v_buyer_quote_wallet_id NUMBER;
    v_buyer_base_wallet_id  NUMBER;
    v_seller_base_wallet_id  NUMBER;
    v_seller_quote_wallet_id NUMBER;
    
    v_locked_deduction NUMBER;
    v_refund NUMBER;
BEGIN
    -- Fetch order details and Lock
    SELECT user_id, price INTO v_buy_user_id, v_buy_price FROM ORDERS WHERE order_id = p_buy_order_id FOR UPDATE;
    SELECT user_id INTO v_sell_user_id FROM ORDERS WHERE order_id = p_sell_order_id FOR UPDATE;

    v_quote_amount := p_trade_price * p_trade_quantity;

    -- Get Wallet IDs
    SELECT wallet_id INTO v_buyer_quote_wallet_id FROM WALLETS WHERE user_id = v_buy_user_id AND asset_id = get_asset_id_by_symbol(p_quote_symbol) FOR UPDATE;
    SELECT wallet_id INTO v_buyer_base_wallet_id  FROM WALLETS WHERE user_id = v_buy_user_id AND asset_id = get_asset_id_by_symbol(p_base_symbol) FOR UPDATE;
    SELECT wallet_id INTO v_seller_base_wallet_id  FROM WALLETS WHERE user_id = v_sell_user_id AND asset_id = get_asset_id_by_symbol(p_base_symbol) FOR UPDATE;
    SELECT wallet_id INTO v_seller_quote_wallet_id FROM WALLETS WHERE user_id = v_sell_user_id AND asset_id = get_asset_id_by_symbol(p_quote_symbol) FOR UPDATE;

    -- Record Trade
    INSERT INTO TRADES (buy_order_id, sell_order_id, trade_price, trade_quantity)
    VALUES (p_buy_order_id, p_sell_order_id, p_trade_price, p_trade_quantity);

    -- 1. Update Buyer: Deduct locked quote, refund if trade price < order price, add base asset
    v_locked_deduction := p_trade_quantity * v_buy_price;
    v_refund := v_locked_deduction - v_quote_amount;

    UPDATE WALLETS SET balance = balance + v_refund, locked_balance = locked_balance - v_locked_deduction WHERE wallet_id = v_buyer_quote_wallet_id;
    UPDATE WALLETS SET balance = balance + p_trade_quantity WHERE wallet_id = v_buyer_base_wallet_id;

    -- 2. Update Seller: Deduct locked base, add quote asset
    UPDATE WALLETS SET locked_balance = locked_balance - p_trade_quantity WHERE wallet_id = v_seller_base_wallet_id;
    UPDATE WALLETS SET balance = balance + v_quote_amount WHERE wallet_id = v_seller_quote_wallet_id;

    -- Update Order Statuses
    UPDATE ORDERS 
    SET filled_quantity = filled_quantity + p_trade_quantity,
        order_status = CASE WHEN (filled_quantity + p_trade_quantity) >= quantity THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END
    WHERE order_id IN (p_buy_order_id, p_sell_order_id);

    -- Log Transactions
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status) VALUES (v_buy_user_id, v_buyer_quote_wallet_id, 'TRADE_SETTLE_QUOTE', -v_quote_amount, 'COMPLETED');
    IF v_refund > 0 THEN
        INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status) VALUES (v_buy_user_id, v_buyer_quote_wallet_id, 'TRADE_REFUND_QUOTE', v_refund, 'COMPLETED');
    END IF;
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status) VALUES (v_buy_user_id, v_buyer_base_wallet_id, 'TRADE_SETTLE_BASE', p_trade_quantity, 'COMPLETED');
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status) VALUES (v_sell_user_id, v_seller_base_wallet_id, 'TRADE_RELEASE_BASE', -p_trade_quantity, 'COMPLETED');
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status) VALUES (v_sell_user_id, v_seller_quote_wallet_id, 'TRADE_RECEIVE_QUOTE', v_quote_amount, 'COMPLETED');

END;
/

-- 5. PROCEDURE: Match All Possible Orders for a Pair
-- Sweeps the order book and executes matches until no more overlap
CREATE OR REPLACE PROCEDURE match_all_orders(
    p_trading_pair IN VARCHAR2
) IS
    v_buy_order_id NUMBER;
    v_sell_order_id NUMBER;
    v_buy_price NUMBER;
    v_sell_price NUMBER;
    v_buy_qty NUMBER;
    v_sell_qty NUMBER;
    v_buy_filled NUMBER;
    v_sell_filled NUMBER;
    v_buy_time TIMESTAMP;
    v_sell_time TIMESTAMP;
    
    v_trade_price NUMBER;
    v_trade_qty NUMBER;
    
    v_base_symbol VARCHAR2(20);
    v_quote_symbol VARCHAR2(20);
    
    v_matched BOOLEAN := TRUE;
    v_counter NUMBER := 0;
BEGIN
    -- Extract symbols from pair (e.g., 'BTC/USDT')
    v_base_symbol := SUBSTR(p_trading_pair, 1, INSTR(p_trading_pair, '/') - 1);
    v_quote_symbol := SUBSTR(p_trading_pair, INSTR(p_trading_pair, '/') + 1);

    WHILE v_matched AND v_counter < 50 LOOP
        v_matched := FALSE;
        
        -- Find Best Buy
        BEGIN
            SELECT order_id, price, quantity, filled_quantity, created_at
            INTO v_buy_order_id, v_buy_price, v_buy_qty, v_buy_filled, v_buy_time
            FROM (
                SELECT order_id, price, quantity, filled_quantity, created_at
                FROM ORDERS
                WHERE trading_pair = p_trading_pair
                  AND order_type = 'BUY'
                  AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
                ORDER BY price DESC, created_at ASC
            ) WHERE ROWNUM = 1;
        EXCEPTION WHEN NO_DATA_FOUND THEN v_buy_order_id := NULL;
        END;

        -- Find Best Sell
        BEGIN
            SELECT order_id, price, quantity, filled_quantity, created_at
            INTO v_sell_order_id, v_sell_price, v_sell_qty, v_sell_filled, v_sell_time
            FROM (
                SELECT order_id, price, quantity, filled_quantity, created_at
                FROM ORDERS
                WHERE trading_pair = p_trading_pair
                  AND order_type = 'SELL'
                  AND order_status IN ('OPEN', 'PARTIALLY_FILLED')
                ORDER BY price ASC, created_at ASC
            ) WHERE ROWNUM = 1;
        EXCEPTION WHEN NO_DATA_FOUND THEN v_sell_order_id := NULL;
        END;

        -- Check for match
        IF v_buy_order_id IS NOT NULL AND v_sell_order_id IS NOT NULL AND v_buy_price >= v_sell_price THEN
            v_matched := TRUE;
            v_counter := v_counter + 1;
            
            -- Maker price logic
            v_trade_price := CASE WHEN v_buy_time < v_sell_time THEN v_buy_price ELSE v_sell_price END;
            v_trade_qty := LEAST(v_buy_qty - v_buy_filled, v_sell_qty - v_sell_filled);
            
            -- Execute the match
            execute_match(v_buy_order_id, v_sell_order_id, v_trade_price, v_trade_qty, v_base_symbol, v_quote_symbol);
        END IF;
    END LOOP;
END;
/

-- 6. TRIGGER: Audit Order Status Changes
-- Note: Requires a table to log into, or uses TRANSACTIONS with a special type
CREATE OR REPLACE TRIGGER trg_log_order_status
AFTER UPDATE OF order_status ON ORDERS
FOR EACH ROW
BEGIN
    INSERT INTO TRANSACTIONS (user_id, wallet_id, transaction_type, amount, status)
    VALUES (:NEW.user_id, (SELECT MIN(wallet_id) FROM WALLETS WHERE user_id = :NEW.user_id), 'ORDER_STATUS_CHANGE', 0, :NEW.order_status);
END;
/

PROMPT Advanced database objects created successfully.
