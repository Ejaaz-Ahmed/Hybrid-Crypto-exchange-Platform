import { connectOracle } from './config/oracle.js';

async function cleanUsersData() {
  const connection = await connectOracle();
  try {
    console.log("Starting data cleanup...");

    // Delete in correct order to respect foreign key constraints
    await connection.execute(`DELETE FROM TRADES`);
    console.log("- Deleted TRADES");

    await connection.execute(`DELETE FROM TRANSACTIONS`);
    console.log("- Deleted TRANSACTIONS");

    await connection.execute(`DELETE FROM ORDERS`);
    console.log("- Deleted ORDERS");

    await connection.execute(`DELETE FROM WALLETS`);
    console.log("- Deleted WALLETS");

    await connection.execute(`DELETE FROM USERS`);
    console.log("- Deleted USERS");

    await connection.commit();
    console.log("Cleanup completed successfully! All user and order data removed. Assets preserved.");
  } catch (err) {
    console.error("Error during cleanup:", err);
    await connection.rollback();
  } finally {
    await connection.close();
  }
}

cleanUsersData();
