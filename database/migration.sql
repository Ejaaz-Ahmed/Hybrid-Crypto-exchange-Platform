-- Migration Script to synchronize existing Oracle DB with the new Application state.
-- Run these commands in your Oracle SQL Developer or sqlplus console.

-- 1. Add the new filled_quantity column to the ORDERS table
ALTER TABLE ORDERS ADD filled_quantity NUMBER DEFAULT 0;

-- 2. Backfill existing data for filled_quantity
-- If an order is already FILLED, its filled_quantity should equal its quantity
UPDATE ORDERS SET filled_quantity = quantity WHERE order_status = 'FILLED';
-- Ensure OPEN orders start at 0
UPDATE ORDERS SET filled_quantity = 0 WHERE order_status = 'OPEN';

-- 3. Add CHECK constraints to WALLETS to prevent negative balances
ALTER TABLE WALLETS ADD CONSTRAINT chk_wallet_balance CHECK (balance >= 0);
ALTER TABLE WALLETS ADD CONSTRAINT chk_wallet_locked CHECK (locked_balance >= 0);

-- 4. Add CHECK constraints to ORDERS to validate inputs and statuses
ALTER TABLE ORDERS ADD CONSTRAINT chk_order_price CHECK (price > 0);
ALTER TABLE ORDERS ADD CONSTRAINT chk_order_qty CHECK (quantity > 0);
ALTER TABLE ORDERS ADD CONSTRAINT chk_order_filled CHECK (filled_quantity >= 0);

-- Note: In the original schema, order_status had no CHECK constraint, so we just add one now.
ALTER TABLE ORDERS ADD CONSTRAINT chk_order_status 
  CHECK (order_status IN ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'));

COMMIT;
