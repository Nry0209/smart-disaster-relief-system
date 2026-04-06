const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Seed System Admin User
const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@disasterrelief.org' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@disasterrelief.org');
      console.log('🔑 Password: Admin@123456');
      return;
    }

    // Create system admin
    const adminUser = new User({
      fullName: 'System Administrator',
      email: 'admin@disasterrelief.org',
      password: 'Admin@123456', // Change this in production
      role: 'admin',
      status: 'active',
      profilePicture: null,
      joinDate: new Date(),
      lastLogin: null,
      createdBy: null // System created
    });

    await adminUser.save();
    console.log('✅ System admin user created successfully');
    console.log('📧 Email: admin@disasterrelief.org');
    console.log('🔑 Password: Admin@123456');
    console.log('⚠️  Remember to change the default password in production!');

  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
  }
};

module.exports = seedAdmin;
