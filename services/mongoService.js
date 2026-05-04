import { connectMongo } from "../config/mongodb.js";
import SystemLog from "../models/SystemLog.js";

export async function logSystemEvent(eventType, details) {
    await connectMongo();
    const userId = Number(details?.userId);
    await SystemLog.create({
        service: "WalletService",
        event: eventType,
        user_id: Number.isFinite(userId) ? userId : undefined,
        details: details || {},
    });
}