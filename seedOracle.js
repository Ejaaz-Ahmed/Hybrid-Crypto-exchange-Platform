import oracledb from 'oracledb';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const oracleConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
};

async function seedOracleData() {
  let connection;

  try {
    connection = await oracledb.getConnection(oracleConfig);
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      { full_name: 'John Doe', email: 'john@example.com', password_hash: passwordHash, country: 'USA' },
      { full_name: 'Jane Smith', email: 'jane@example.com', password_hash: passwordHash, country: 'UK' },
      { full_name: 'Bob Johnson', email: 'bob@example.com', password_hash: passwordHash, country: 'Canada' },
    ];

    for (const user of users) {
      await connection.execute(
        `MERGE INTO USERS u
         USING (SELECT :email AS email FROM dual) src
         ON (u.email = src.email)
         WHEN NOT MATCHED THEN
           INSERT (full_name, email, password_hash, country, kyc_status)
           VALUES (:full_name, :email, :password_hash, :country, 'Pending')`,
        user,
        { autoCommit: false }
      );
    }
    const assetSeeds = [
      { asset_name: 'Bitcoin', symbol: 'BTC', blockchain_network: 'Bitcoin' },
      { asset_name: 'Ethereum', symbol: 'ETH', blockchain_network: 'Ethereum' },
      { asset_name: 'Tether', symbol: 'USDT', blockchain_network: 'Ethereum' },
      { asset_name: 'Solana', symbol: 'SOL', blockchain_network: 'Solana' },
    ];

    for (const asset of assetSeeds) {
      await connection.execute(
        `MERGE INTO ASSETS a
         USING (SELECT :symbol AS symbol FROM dual) src
         ON (a.symbol = src.symbol)
         WHEN NOT MATCHED THEN
           INSERT (asset_name, symbol, blockchain_network)
           VALUES (:asset_name, :symbol, :blockchain_network)`,
        asset,
        { autoCommit: false }
      );
    }

    const userResult = await connection.execute(
      `SELECT user_id, email FROM USERS WHERE email IN ('john@example.com', 'jane@example.com', 'bob@example.com')`
    );
    const userMap = {};
    userResult.rows.forEach((row) => {
      userMap[row[1]] = row[0];
    });
    const assetResult = await connection.execute(
      `SELECT asset_id, symbol FROM ASSETS WHERE symbol IN ('BTC', 'ETH', 'USDT', 'SOL')`
    );
    const assetMap = {};
    assetResult.rows.forEach((row) => {
      assetMap[row[1]] = row[0];
    });

    const wallets = [
      { user_id: userMap['john@example.com'], asset_id: assetMap.BTC, balance: 1.5, locked_balance: 0.0 },
      { user_id: userMap['john@example.com'], asset_id: assetMap.ETH, balance: 10.0, locked_balance: 0.0 },
      { user_id: userMap['john@example.com'], asset_id: assetMap.USDT, balance: 5000.0, locked_balance: 0.0 },
      { user_id: userMap['jane@example.com'], asset_id: assetMap.BTC, balance: 0.8, locked_balance: 0.0 },
      { user_id: userMap['jane@example.com'], asset_id: assetMap.ETH, balance: 5.0, locked_balance: 0.0 },
      { user_id: userMap['jane@example.com'], asset_id: assetMap.USDT, balance: 3000.0, locked_balance: 0.0 },
      { user_id: userMap['bob@example.com'], asset_id: assetMap.BTC, balance: 2.0, locked_balance: 0.0 },
      { user_id: userMap['bob@example.com'], asset_id: assetMap.SOL, balance: 50.0, locked_balance: 0.0 },
      { user_id: userMap['bob@example.com'], asset_id: assetMap.USDT, balance: 10000.0, locked_balance: 0.0 },
    ];

    for (const wallet of wallets) {
      await connection.execute(
        `MERGE INTO WALLETS w
         USING (SELECT :user_id AS user_id, :asset_id AS asset_id FROM dual) src
         ON (w.user_id = src.user_id AND w.asset_id = src.asset_id)
         WHEN MATCHED THEN
           UPDATE SET w.balance = :balance, w.locked_balance = :locked_balance
         WHEN NOT MATCHED THEN
           INSERT (user_id, asset_id, balance, locked_balance)
           VALUES (:user_id, :asset_id, :balance, :locked_balance)`,
        wallet,
        { autoCommit: false }
      );
    }

    // Note: OPEN orders are no longer seeded here because they require corresponding locked_balance
    // updates in the WALLETS table to prevent ORA-02290 constraint violations during matching.
    await connection.commit();

    console.log('Sample Oracle data inserted successfully.');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error seeding Oracle data:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

seedOracleData();