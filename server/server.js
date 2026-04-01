const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  let dbConnected = false;

  try {
    await connectDB();
    dbConnected = true;
  } catch (error) {
    console.error("Failed to connect MongoDB. Starting with in-memory fallback:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}${dbConnected ? "" : " (in-memory mode)"}`);
  });
}

startServer();