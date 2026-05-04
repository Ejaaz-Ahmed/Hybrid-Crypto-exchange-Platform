import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

export async function getTransactionConnection() {

    return await oracledb.getConnection({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING,
    });
}