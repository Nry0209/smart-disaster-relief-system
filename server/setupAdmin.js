const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin123@gmail.com';
const ADMIN_PASSWORD = 'Admin@123456';

const setupAdmin = async () => {
  try {
    await mongoose.connect(uri);

    let adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('⚠️ No admin user found. Creating new admin user...');
      adminUser = new User({
        fullName: 'System Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        status: 'active',
        phone: '',
        department: 'System Administration',
        isFirstLogin: false
      });
      await adminUser.save({ validateBeforeSave: false });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user found. Updating credentials...');
      adminUser.email = ADMIN_EMAIL;
      adminUser.password = ADMIN_PASSWORD;
      adminUser.markModified('password');
      await adminUser.save({ validateBeforeSave: false });
      console.log('✅ Admin user updated successfully');
    }

    console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
    console.log('🚀 Admin login should now work!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

setupAdmin();