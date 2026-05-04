import mongoose from "mongoose";

export async function connectMongo() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/crypto_exchange";
    try {
        if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
        }

        await mongoose.connect(mongoUri);

        console.log("MongoDB Connected Successfully");
        return mongoose.connection;

    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        throw error;
    }
}