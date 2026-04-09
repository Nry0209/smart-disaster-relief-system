// module.exports = connectDB;
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
    return true; // ✅ return success
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return false; // ❌ return failure
  }
};
mongoose.connection.on("connected", () => {
  console.log("🟢 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.log("🔴 Mongoose error:", err);
});

module.exports = connectDB;