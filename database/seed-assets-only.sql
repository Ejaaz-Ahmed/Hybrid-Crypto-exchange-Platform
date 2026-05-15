-- ==========================================
-- SEED ASSETS (10 Assets)
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

COMMIT;

PROMPT Assets seeded successfully.
