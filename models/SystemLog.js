import mongoose from "mongoose";

const SystemLogSchema = new mongoose.Schema({
    service: String,
    event: String,
    user_id: Number,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("SystemLog", SystemLogSchema);