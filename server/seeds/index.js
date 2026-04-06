const mongoose = require('mongoose');
const seedAdmin = require('./adminSeed');

// Run all seeds
const runSeeds = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Seed admin user
    await seedAdmin();
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
};

// Run seeds if called directly
if (require.main === module) {
  // Connect to database and run seeds
  require('../config/db').then(() => {
    runSeeds();
  }).catch(error => {
    console.error('❌ Database connection error:', error);
    });
}

module.exports = { runSeeds };
