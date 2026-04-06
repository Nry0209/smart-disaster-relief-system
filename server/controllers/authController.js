const User = require('../models/User');
const { generateToken } = require('../config/auth');
const bcrypt = require('bcryptjs');

// System Owner Login (Admin)
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin user in database
    const adminUser = await User.findOne({ 
      email: email.toLowerCase(), 
      role: 'admin',
      status: 'active'
    });

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Compare password
    const isMatch = await adminUser.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    adminUser.lastLogin = new Date();
    await adminUser.save();

    // Generate token
    const token = generateToken(adminUser);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: adminUser._id,
          fullName: adminUser.fullName,
          email: adminUser.email,
          role: adminUser.role,
          status: adminUser.status
        },
        token
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Staff User Login (All roles except admin)
const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Try database first
    try {
      const staffUser = await User.findOne({ 
        email: email.toLowerCase(), 
        role: { $in: ['dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff'] },
        status: 'active'
      });

      if (!staffUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid staff credentials'
        });
      }

      // Compare password
      const isMatch = await staffUser.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid staff credentials'
        });
      }

      // Update last login
      staffUser.lastLogin = new Date();
      await staffUser.save();

      // Generate token
      const token = generateToken(staffUser);

      res.json({
        success: true,
        message: 'Staff login successful',
        data: {
          user: {
            id: staffUser._id,
            fullName: staffUser.fullName,
            email: staffUser.email,
            role: staffUser.role,
            status: staffUser.status
          },
          token
        }
      });

    } catch (dbError) {
      console.log('Database error in staff login');
      return res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Create Staff User (Admin only)
const createStaff = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, department } = req.body;

    // Validate input
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate role
    const validRoles = ['dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role'
      });
    }

    // Try database first
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create new staff user
      const newStaff = new User({
        fullName,
        email: email.toLowerCase(),
        password, // Will be hashed by pre-save middleware
        role,
        phone: phone || '',
        department: department || '',
        status: 'active',
        createdBy: req.user.id // Admin who created this user
      });

      await newStaff.save();

      res.status(201).json({
        success: true,
        message: 'Staff user created successfully',
        data: {
          user: {
            id: newStaff._id,
            fullName: newStaff.fullName,
            email: newStaff.email,
            role: newStaff.role,
            status: newStaff.status
          }
        }
      });

    } catch (dbError) {
      console.log('Database error in create staff');
      return res.status(500).json({
        success: false,
        message: 'Server error while creating staff user'
      });
    }

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating staff user'
    });
  }
};

// Get Current User Profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, department } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (phone) updates.phone = phone;
    if (department) updates.department = department;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

module.exports = {
  adminLogin,
  staffLogin,
  createStaff,
  getCurrentUser,
  updateProfile
};
