const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

const checkAdminUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const adminUsers = await User.find({ role: 'admin' });
    console.log('Found admin users:', adminUsers.length);
    
    adminUsers.forEach(user => {
      console.log(`Email: ${user.email}, Name: ${user.fullName}, Status: ${user.status}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkAdminUsers();
