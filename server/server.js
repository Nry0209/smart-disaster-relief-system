// const dotenv = require("dotenv");
// const app = require("./app");
// const connectDB = require("./config/db");

// // Load environment variables from .env file
// dotenv.config();

// console.log('🔍 Environment check:');
// console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
// console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// // Connect to database (but don't fail if it doesn't work)
// connectDB().catch(err => {
//   if (err) {
//     console.log('⚠️ Database connection failed, but server will continue without database');
//     console.log('🔧 Authentication will work in limited mode');
//   } else {
//     console.log('✅ Database connected successfully');
//   }
// });

// const PORT = process.env.PORT || 5000;

// // Seed admin user on server start (only if database is connected)
// const { runSeeds } = require('./seeds');

// const startServer = async () => {
//   try {
//     // Only run seeds if database is connected
//     if (process.env.MONGODB_URI) {
//       setTimeout(async () => {
//         await runSeeds();
//       }, 3000); // Wait 3 seconds for DB to be ready
//     }

//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//       console.log('🔐 Authentication: Admin-Only User Creation');
//       console.log('📧 Admin Email: admin@disasterrelief.org');
//       console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
//       console.log('🗄️ Database:', process.env.MONGODB_URI ? 'Connected' : 'Not Connected');
//     });

//   } catch (error) {
//     console.error('❌ Server startup error:', error);
//   }
// };

// startServer();

const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");
const User = require('./models/User');

dotenv.config({ path: require('path').resolve(__dirname, '.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin123@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

const updateAdminCredentials = async () => {
  try {
    const adminUser = await User.findOne({
      $or: [
        { role: 'admin' },
        { email: 'admin@disasterrelief.org' }
      ]
    });

    if (!adminUser) {
      console.log('⚠️ No existing admin record found. Creating admin user with new credentials.');
      const newAdmin = new User({
        fullName: 'System Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        status: 'active',
        phone: '',
        department: 'System Administration',
        isFirstLogin: false
      });
      await newAdmin.save({ validateBeforeSave: false });
      console.log(`✅ Admin user created with email ${ADMIN_EMAIL}`);
      return true;
    }

    if (adminUser.email !== ADMIN_EMAIL || adminUser.password !== ADMIN_PASSWORD) {
      adminUser.email = ADMIN_EMAIL;
      adminUser.password = ADMIN_PASSWORD;
      adminUser.markModified('password');
      await adminUser.save({ validateBeforeSave: false });
      console.log(`✅ Admin credentials updated to ${ADMIN_EMAIL}`);
    } else {
      console.log(`✅ Admin credentials already match ${ADMIN_EMAIL}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error updating admin credentials:', error);
    return false;
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🔍 Environment check:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

    // ✅ WAIT for DB connection
    const isConnected = await connectDB();

    if (!isConnected) {
      console.log('❌ Database connection failed. Server will stop.');
      process.exit(1);
    }

    console.log('✅ Database connected successfully');

    await updateAdminCredentials();

    // ✅ Start server ONLY after DB is ready
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('🔐 Authentication: Database-backed admin login');
      console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
      console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
      console.log('🗄️ Database: Connected');
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();