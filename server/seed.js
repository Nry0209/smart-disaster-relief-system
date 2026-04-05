const { connectDB } = require('./models');
const { seedAllSampleData } = require('./services/apiHelpers');

const seedData = async () => {
  try {
    await connectDB();
    await seedAllSampleData();
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
