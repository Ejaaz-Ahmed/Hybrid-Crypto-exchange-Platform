-- ==============================================================================
-- Hybrid Cryptoexchange: Advanced Database Seeding Script (Oracle)
-- ==============================================================================
-- Run this in SQL Developer or SQL*Plus to enrich your application with data.

-- 1. CLEAR EXISTING DATA (Must be deleted in correct order due to Foreign Keys)
DELETE FROM TRANSACTIONS;
DELETE FROM TRADES;
DELETE FROM ORDERS;
DELETE FROM WALLETS;
DELETE FROM ASSETS;
DELETE FROM USERS;

-- ==========================================
-- 2. SEED USERS (10 Users)
-- ==========================================
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Alice Smith', 'alice@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'USA');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Bob Johnson', 'bob@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'UK');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Charlie Davis', 'charlie@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'Canada');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Diana Prince', 'diana@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'Brazil');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Ethan Hunt', 'ethan@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'USA');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Fiona Gallagher', 'fiona@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'Ireland');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('George Miller', 'george@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'Australia');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Hannah Abbott', 'hannah@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'UK');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Ian Wright', 'ian@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'Germany');
INSERT INTO USERS (full_name, email, password_hash, country) VALUES ('Julia Stiles', 'julia@example.com', '$2b$10$X8A2/i8b4zX.6c...', 'USA');

-- ==========================================
-- 3. SEED ASSETS (10 Assets)
-- ==========================================
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Bitcoin', 'BTC', 'Bitcoin');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Ethereum', 'ETH', 'Ethereum');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Tether', 'USDT', 'Ethereum');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Solana', 'SOL', 'Solana');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Binance Coin', 'BNB', 'Binance Smart Chain');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Cardano', 'ADA', 'Cardano');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Ripple', 'XRP', 'XRP Ledger');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Polkadot', 'DOT', 'Polkadot');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Dogecoin', 'DOGE', 'Dogecoin');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Chainlink', 'LINK', 'Ethereum');

-- ==========================================
-- 4. SEED WALLETS (40-50 Wallets)
-- ==========================================
DECLARE
    CURSOR c_users IS SELECT user_id FROM USERS FETCH FIRST 10 ROWS ONLY;
    CURSOR c_assets IS SELECT asset_id, symbol FROM ASSETS;
    v_balance NUMBER;
BEGIN
    FOR u IN c_users LOOP
        FOR a IN c_assets LOOP
            -- Give USDT a high balance (fiat peg), others smaller amounts
            IF a.symbol = 'USDT' THEN v_balance := 50000;
            ELSIF a.symbol = 'BTC' THEN v_balance := 2.5;
            ELSIF a.symbol = 'ETH' THEN v_balance := 15.0;
            ELSIF a.symbol IN ('DOGE', 'XRP') THEN v_balance := 10000;
            ELSE v_balance := 500;
            END IF;

            -- Create the wallet
            INSERT INTO WALLETS (user_id, asset_id, balance, locked_balance)
            VALUES (u.user_id, a.asset_id, v_balance, 0);
        END LOOP;
    END LOOP;
END;
/

-- ==========================================
-- 5. SEED ORDERS (40+ Orders)
-- ==========================================
DECLARE
    v_u1 NUMBER; v_u2 NUMBER; v_u3 NUMBER; v_u4 NUMBER;
BEGIN
    -- Get some valid user IDs
    SELECT MIN(user_id) INTO v_u1 FROM USERS;
    v_u2 := v_u1 + 1; v_u3 := v_u1 + 2; v_u4 := v_u1 + 3;

    -- OPEN ORDERS
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u1, 'BTC/USDT', 'BUY', 65000, 0.5, 0, 'OPEN');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u2, 'BTC/USDT', 'SELL', 68000, 1.0, 0, 'OPEN');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u3, 'ETH/USDT', 'BUY', 3400, 5.0, 0, 'OPEN');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u4, 'ETH/USDT', 'SELL', 3600, 2.0, 0, 'OPEN');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u1, 'SOL/USDT', 'BUY', 140, 50, 0, 'OPEN');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u2, 'SOL/USDT', 'SELL', 160, 20, 0, 'OPEN');
    
    -- PARTIALLY FILLED ORDERS
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u3, 'BTC/USDT', 'BUY', 66000, 2.0, 0.5, 'PARTIALLY_FILLED');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u4, 'BTC/USDT', 'SELL', 65500, 1.5, 1.0, 'PARTIALLY_FILLED');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u1, 'ETH/USDT', 'BUY', 3500, 10.0, 4.0, 'PARTIALLY_FILLED');
    INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) VALUES (v_u2, 'ADA/USDT', 'SELL', 0.55, 10000, 2500, 'PARTIALLY_FILLED');

    -- FILLED ORDERS (Historical data)
    FOR i IN 1..30 LOOP
        INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) 
        VALUES (v_u1, 'BTC/USDT', 'BUY', 60000 + (i*10), 0.1, 0.1, 'FILLED');
        
        INSERT INTO ORDERS (user_id, trading_pair, order_type, price, quantity, filled_quantity, order_status) 
        VALUES (v_u2, 'BTC/USDT', 'SELL', 60000 + (i*10), 0.1, 0.1, 'FILLED');
    END LOOP;
END;
/

-- ==========================================
-- 6. SEED TRADES (40+ Trades)
-- ==========================================
DECLARE
    CURSOR c_buy_orders IS SELECT order_id, price FROM ORDERS WHERE order_type='BUY' AND order_status='FILLED';
    CURSOR c_sell_orders IS SELECT order_id, price FROM ORDERS WHERE order_type='SELL' AND order_status='FILLED';
    v_sell_id NUMBER;
    v_price NUMBER;
BEGIN
    OPEN c_sell_orders;
    FOR b IN c_buy_orders LOOP
        FETCH c_sell_orders INTO v_sell_id, v_price;
        EXIT WHEN c_sell_orders%NOTFOUND;
        
        INSERT INTO TRADES (buy_order_id, sell_order_id, trade_price, trade_quantity)
        VALUES (b.order_id, v_sell_id, b.price, 0.1);
    END LOOP;
    CLOSE c_sell_orders;
END;
/

COMMIT;
