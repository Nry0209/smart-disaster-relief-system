const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./models/User');

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin123@gmail.com';

const verifyAdmin = async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️ No admin user found in the database.');
      process.exit(0);
    }

    console.log('✅ Admin user found:');
    console.log(`- id: ${adminUser._id}`);
    console.log(`- fullName: ${adminUser.fullName}`);
    console.log(`- email: ${adminUser.email}`);
    console.log(`- role: ${adminUser.role}`);
    console.log(`- status: ${adminUser.status}`);
    console.log(`- isFirstLogin: ${adminUser.isFirstLogin}`);
    console.log(`- expected email: ${ADMIN_EMAIL}`);

    if (adminUser.email === ADMIN_EMAIL) {
      console.log('✅ Admin email matches expected admin123@gmail.com');
    } else {
      console.log('⚠️ Admin email does not match expected email.');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

verifyAdmin();
