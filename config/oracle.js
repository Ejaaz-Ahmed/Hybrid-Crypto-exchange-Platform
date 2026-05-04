import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

const oracleConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
};

export async function connectOracle() {
    try {
        const connection = await oracledb.getConnection(oracleConfig);
        console.log("Oracle Connected Successfully");
        return connection;
    } catch (err) {
        console.error("Oracle Connection Error:", err);
    }
}