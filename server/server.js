const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");
const User = require('./models/User');

dotenv.config({ path: require('path').resolve(__dirname, '.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@disasterrelief.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

const updateAdminCredentials = async () => {
  try {
    // Prefer the configured admin email as the canonical admin record.
    let adminUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' });
    }

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

    const targetEmail = ADMIN_EMAIL.toLowerCase();
    const currentEmail = String(adminUser.email || '').toLowerCase();

    // If another account already owns the configured admin email, do not try to
    // reassign email to avoid duplicate-key startup warnings.
    if (currentEmail !== targetEmail) {
      const emailOwner = await User.findOne({
        email: targetEmail,
        _id: { $ne: adminUser._id }
      });

      if (emailOwner) {
        console.warn(`⚠️ Admin email ${ADMIN_EMAIL} is already used by another user. Keeping existing admin email (${adminUser.email}) to avoid duplicate key conflicts.`);
      } else {
        adminUser.email = targetEmail;
      }
    }

    if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
    }

    if (adminUser.status !== 'active') {
      adminUser.status = 'active';
    }

    if (adminUser.password !== ADMIN_PASSWORD) {
      adminUser.password = ADMIN_PASSWORD;
      adminUser.markModified('password');
    }

    await adminUser.save({ validateBeforeSave: false });
    console.log(`✅ Admin credentials verified for ${adminUser.email}`);

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

    // Wait for DB connection
    const isConnected = await connectDB();

    if (!isConnected) {
      console.log('❌ Database connection failed. Server will stop.');
      process.exit(1);
    }

    console.log('✅ Database connected successfully');

    await updateAdminCredentials();

    // Start server ONLY after DB is ready
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