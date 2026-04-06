const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");

// Load environment variables from .env file
dotenv.config();

console.log('🔍 Environment check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// Connect to database (but don't fail if it doesn't work)
connectDB().catch(err => {
  if (err) {
    console.log('⚠️ Database connection failed, but server will continue without database');
    console.log('🔧 Authentication will work in limited mode');
  } else {
    console.log('✅ Database connected successfully');
  }
});

const PORT = process.env.PORT || 5000;

// Seed admin user on server start (only if database is connected)
const { runSeeds } = require('./seeds');

const startServer = async () => {
  try {
    // Only run seeds if database is connected
    if (process.env.MONGODB_URI) {
      setTimeout(async () => {
        await runSeeds();
      }, 3000); // Wait 3 seconds for DB to be ready
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('🔐 Authentication: Admin-Only User Creation');
      console.log('📧 Admin Email: admin@disasterrelief.org');
      console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
      console.log('🗄️ Database:', process.env.MONGODB_URI ? 'Connected' : 'Not Connected');
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
  }
};

startServer();