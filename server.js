import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectOracle } from "./config/oracle.js";
import userRoutes from "./routes/userRoutes.js";
import { connectMongo } from "./config/mongodb.js";
import marketRoutes from "./routes/marketRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/users", userRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/trade", tradeRoutes);

app.get("/", (req, res) => {
    res.sendFile(new URL("./public/index.html", import.meta.url));
});

const PORT = 5000;
connectOracle();
connectMongo();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});