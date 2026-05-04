import { connectOracle } from './config/oracle.js';

async function fixBalances() {
  const connection = await connectOracle();
  try {
    // 1. Delete all OPEN orders to clear the bad state
    await connection.execute(`DELETE FROM ORDERS WHERE order_status = 'OPEN'`);
    
    // 2. Reset all locked_balances to 0
    await connection.execute(`UPDATE WALLETS SET locked_balance = 0`);
    
    // 3. Commit
    await connection.commit();
    console.log("Fixed! Open orders cleared and locked balances reset to 0.");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.close();
  }
}

fixBalances();
