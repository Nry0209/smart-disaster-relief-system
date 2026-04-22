
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { createAdminUser } = require('./createAdminUser');
const dbConfig = require('../config/db');

async function runSeeds() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');
    await createAdminUser();
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
}


if (require.main === module) {
  runSeeds().then(async () => {
    await mongoose.disconnect();
    console.log('✅ Seeding complete. Database disconnected.');
  });
}

module.exports = { runSeeds };
