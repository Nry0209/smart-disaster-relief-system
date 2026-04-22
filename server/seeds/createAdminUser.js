const User = require('../models/User');
const mongoose = require('mongoose');

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@disasterrelief.org' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists, updating password...');
      // Update password with plain text (dev mode - no encryption)
      existingAdmin.password = 'Admin@123456';
      existingAdmin.markModified('password');
      // Save without triggering pre-save middleware to keep plain text
      await existingAdmin.save({ validateBeforeSave: false });
      console.log('📧 Email: admin@disasterrelief.org');
      console.log('🔑 Password: Admin@123456');
      console.log('✅ Admin password set to plain text for dev mode');
      return;
    }

    // Create admin user with plain text password (dev mode)
    const adminUser = new User({
      fullName: 'System Administrator',
      email: 'admin@disasterrelief.org',
      password: 'Admin@123456',  // Plain text password (dev mode)
      role: 'admin',
      status: 'active',
      phone: '',
      department: 'System Administration'
    });

    await adminUser.save({ validateBeforeSave: false });
    
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@disasterrelief.org');
    console.log('🔑 Password: Admin@123456');
    console.log('✅ Admin password stored as plain text for dev mode');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

module.exports = { createAdminUser };
