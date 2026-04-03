const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  let dbConnected = false;

  try {
    await connectDB();
    dbConnected = true;
  } catch (error) {
    console.error("Failed to connect MongoDB:", error.message);
    console.error("API is running in DB-disconnected mode. Report create/list endpoints will return 503 until MongoDB connects.");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}${dbConnected ? "" : " (db disconnected)"}`);
  });
}

startServer();