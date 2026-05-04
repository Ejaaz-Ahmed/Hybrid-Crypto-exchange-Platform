-- Oracle schema for Cryptocurrency Exchange Platform
-- Run this script once in Oracle to create the relational tables.

CREATE TABLE USERS (
  user_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name VARCHAR2(200) NOT NULL,
  email VARCHAR2(200) NOT NULL UNIQUE,
  password_hash VARCHAR2(300) NOT NULL,
  country VARCHAR2(100) NOT NULL,
  kyc_status VARCHAR2(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE TABLE ASSETS (
  asset_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_name VARCHAR2(100) NOT NULL,
  symbol VARCHAR2(20) NOT NULL UNIQUE,
  blockchain_network VARCHAR2(100)
);

CREATE TABLE WALLETS (
  wallet_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id NUMBER NOT NULL,
  asset_id NUMBER NOT NULL,
  balance NUMBER DEFAULT 0 CHECK (balance >= 0),
  locked_balance NUMBER DEFAULT 0 CHECK (locked_balance >= 0),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  CONSTRAINT fk_wallet_asset FOREIGN KEY (asset_id) REFERENCES ASSETS(asset_id)
);

CREATE TABLE ORDERS (
  order_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id NUMBER NOT NULL,
  trading_pair VARCHAR2(50) NOT NULL,
  order_type VARCHAR2(10) CHECK (order_type IN ('BUY', 'SELL')),
  price NUMBER NOT NULL CHECK (price > 0),
  quantity NUMBER NOT NULL CHECK (quantity > 0),
  filled_quantity NUMBER DEFAULT 0 CHECK (filled_quantity >= 0),
  order_status VARCHAR2(20) DEFAULT 'OPEN' CHECK (order_status IN ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE TABLE TRADES (
  trade_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buy_order_id NUMBER NOT NULL,
  sell_order_id NUMBER NOT NULL,
  trade_price NUMBER NOT NULL,
  trade_quantity NUMBER NOT NULL,
  executed_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_trade_buy_order FOREIGN KEY (buy_order_id) REFERENCES ORDERS(order_id),
  CONSTRAINT fk_trade_sell_order FOREIGN KEY (sell_order_id) REFERENCES ORDERS(order_id)
);

CREATE TABLE TRANSACTIONS (
  transaction_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id NUMBER NOT NULL,
  wallet_id NUMBER NOT NULL,
  transaction_type VARCHAR2(50),
  amount NUMBER NOT NULL,
  status VARCHAR2(50) DEFAULT 'Pending',
  timestamp TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) REFERENCES WALLETS(wallet_id)
);

-- Seed assets for wallets and trading pair support.
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Bitcoin', 'BTC', 'Bitcoin');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Ethereum', 'ETH', 'Ethereum');
INSERT INTO ASSETS (asset_name, symbol, blockchain_network) VALUES ('Tether', 'USDT', 'Ethereum');

COMMIT;
