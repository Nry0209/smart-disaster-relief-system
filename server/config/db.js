// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log("MongoDB connected successfully");
//   } catch (error) {
//     console.error("MongoDB connection failed:", error.message);
//     // Don't exit process - let server continue without database
//     console.log("⚠️ Server will continue without database connection");
//   }
// };

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

module.exports = connectDB;