const mongoose = require('mongoose');
require('dotenv').config();

const Donation = require('../models/Donation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/disaster-relief';

async function migrateBankField() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all monetary donations that don't have selectedBank field or have it as undefined
    const donations = await Donation.find({
      donationType: 'monetary',
      selectedBank: { $exists: false }
    });

    console.log(`Found ${donations.length} monetary donations without selectedBank field`);

    if (donatios.length > 0) {
      // Set selectedBank to null for these records
      const result = await Donation.updateMany(
        {
          donationType: 'monetary',
          selectedBank: { $exists: false }
        },
        {
          $set: { selectedBank: null }
        }
      );

      console.log(`Updated ${result.modifiedCount} donations with selectedBank: null`);
    }

    // Also check for any monetary donations with missing amount or other fields
    const incompleteMonetary = await Donation.find({
      donationType: 'monetary',
      $or: [
        { amount: { $exists: false } },
        { amount: 0 },
        { amount: null }
      ]
    });

    console.log(`Found ${incompleteMonetary.length} monetary donations with missing or zero amount`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateBankField();
