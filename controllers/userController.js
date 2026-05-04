import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { executeQuery } from "../services/oracleService.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

export const registerUser = async (req, res) => {
    try {
        const { full_name, email, password, country } = req.body;

        if (!full_name || !email || !password || !country) {
            return res.status(400).json({ error: "All registration fields are required." });
        }

        const existingUser = await executeQuery(
            `SELECT user_id FROM USERS WHERE email=:1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "Email already registered." });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const userInsert = `
            INSERT INTO USERS (full_name, email, password_hash, country, kyc_status)
            VALUES (:1, :2, :3, :4, 'Pending')
        `;

        await executeQuery(userInsert, [full_name, email, passwordHash, country]);

        const userResult = await executeQuery(
            `SELECT user_id FROM USERS WHERE email=:1`,
            [email]
        );

        const userId = userResult.rows[0][0];

        const assets = await executeQuery(`SELECT asset_id FROM ASSETS`);

        for (const asset of assets.rows) {
            await executeQuery(
                `INSERT INTO WALLETS (user_id, asset_id, balance, locked_balance)
                 VALUES (:1, :2, 0, 0)`,
                [userId, asset[0]]
            );
        }

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "2h" });

        res.status(201).json({ message: "User registered successfully", userId, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const userResult = await executeQuery(
            `SELECT user_id, password_hash FROM USERS WHERE email=:1`,
            [email]
        );

        if (!userResult.rows.length) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const [userId, passwordHash] = userResult.rows[0];
        const passwordMatches = await bcrypt.compare(password, passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "2h" });

        res.json({ message: "Login successful", userId, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
};

export const getUser = async (req, res) => {
    try {
        const userId = req.user?.userId || req.params.userId;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required." });
        }

        const userResult = await executeQuery(
            `SELECT user_id, full_name, email, country, kyc_status FROM USERS WHERE user_id=:1`,
            [userId]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ error: "User not found." });
        }

        const [id, full_name, email, country, kyc_status] = userResult.rows[0];

        res.json({
            user_id: id,
            full_name,
            email,
            country,
            kyc_status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user details" });
    }
};