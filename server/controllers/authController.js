const User = require('../models/User');

const { generateToken } = require('../config/auth');

const bcrypt = require('bcryptjs');

const { sendStaffOnboardingEmail, sendTestEmail, sendPasswordResetEmail, sendFirstPasswordSetEmail } = require('../services/emailService');

const crypto = require('crypto');



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

    const isMatch = adminUser.comparePassword(password);

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

        console.log(`[LOGIN] Staff user not found for email: ${email.toLowerCase()}`);

        return res.status(401).json({

          success: false,

          message: 'Invalid staff credentials'

        });

      }

      if (staffUser.isFirstLogin) {

        return res.status(403).json({

          success: false,

          message: 'First-time login requires OTP/password setup. Please use the setup link sent to your email or verify OTP first.'

        });

      }



      // Compare password (plain text comparison in dev mode)

      const isMatch = staffUser.comparePassword(password);

      console.log(`[LOGIN] Password comparison for ${email}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);

      console.log(`[LOGIN] Stored password: "${staffUser.password}"`);

      console.log(`[LOGIN] Provided password: "${password}"`);

      

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

    const { fullName, email, role, phone, department } = req.body;



    // Validate input

    if (!fullName || !email || !role) {

      return res.status(400).json({

        success: false,

        message: 'Full name, email, and role are required'

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



    try {

      // Check if user already exists

      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {

        return res.status(400).json({

          success: false,

          message: 'User with this email already exists'

        });

      }



      // Generate OTP (6 digits)

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // OTP expires in 15 minutes



      // Generate setup token for first-time password creation link

      const setupToken = crypto.randomBytes(32).toString('hex');

      const resetPasswordToken = crypto.createHash('sha256').update(setupToken).digest('hex');

      const resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours



      // Create temporary password (will be replaced after first OTP login)

      const tempPassword = crypto.randomBytes(16).toString('hex');



      // Create new staff user

      const newStaff = new User({

        fullName,

        email: email.toLowerCase(),

        password: tempPassword,

        role,

        phone: phone || '',

        department: department || '',

        status: 'active',

        isFirstLogin: true,

        otp: otp,

        otpExpires: otpExpires,

        resetPasswordToken,

        resetPasswordExpires,

        createdBy: req.user.id // Admin who created this user

      });



      await newStaff.save();



      const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${setupToken}`;



      // Send OTP + setup link via email

      const emailSent = await sendStaffOnboardingEmail(email, otp, fullName, setupToken);



      const message = emailSent

        ? 'Staff user created successfully. OTP and password setup link have been sent to their email.'

        : 'Staff user created successfully. Email not sent; use OTP/setup link from response or server logs.';



      res.status(201).json({

        success: true,

        message: message,

        data: {

          user: {

            id: newStaff._id,

            fullName: newStaff.fullName,

            email: newStaff.email,

            role: newStaff.role,

            status: newStaff.status

          },

          emailSent: emailSent,

          otp: process.env.NODE_ENV === 'development' || !emailSent ? otp : undefined,

          setupLink: process.env.NODE_ENV === 'development' || !emailSent ? setupLink : undefined

        }

      });



    } catch (dbError) {

      console.log('Database error in create staff', dbError);

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



// Get All Users (Admin only)

const getAllUsers = async (req, res) => {

  try {

    const { page = 1, limit = 10, role, status, search } = req.query;

    

    // Build query

    const query = {};

    if (role) query.role = role;

    if (status) query.status = status;

    if (search) {

      query.$or = [

        { fullName: { $regex: search, $options: 'i' } },

        { email: { $regex: search, $options: 'i' } }

      ];

    }



    const users = await User.find(query)

      .select('-password')

      .sort({ createdAt: -1 })

      .limit(limit * 1)

      .skip((page - 1) * limit);



    const total = await User.countDocuments(query);



    res.json({

      success: true,

      data: {

        users,

        pagination: {

          page: parseInt(page),

          limit: parseInt(limit),

          total,

          pages: Math.ceil(total / limit)

        }

      }

    });

  } catch (error) {

    console.error('Get all users error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while fetching users'

    });

  }

};



// Get User by ID (Admin only)

const getUserById = async (req, res) => {

  try {

    const user = await User.findById(req.params.id).select('-password');

    

    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    res.json({

      success: true,

      data: { user }

    });

  } catch (error) {

    console.error('Get user by ID error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while fetching user'

    });

  }

};



// Update User (Admin only)

const updateUser = async (req, res) => {

  try {

    const { fullName, email, role, status, phone, department } = req.body;

    const userId = req.params.id;



    // Find user

    const user = await User.findById(userId);

    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    // Prevent admin from changing their own role to non-admin

    if (req.user.id === userId && role !== 'admin') {

      return res.status(400).json({

        success: false,

        message: 'Cannot change your own admin role'

      });

    }



    // Check if email is being changed and if it's already taken

    if (email && email !== user.email) {

      const existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {

        return res.status(400).json({

          success: false,

          message: 'Email already exists'

        });

      }

    }



    // Update user

    const updates = {};

    if (fullName) updates.fullName = fullName;

    if (email) updates.email = email.toLowerCase();

    if (role) updates.role = role;

    if (status) updates.status = status;

    if (phone !== undefined) updates.phone = phone;

    if (department !== undefined) updates.department = department;



    const updatedUser = await User.findByIdAndUpdate(

      userId,

      updates,

      { new: true, runValidators: true }

    ).select('-password');



    res.json({

      success: true,

      message: 'User updated successfully',

      data: { user: updatedUser }

    });

  } catch (error) {

    console.error('Update user error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while updating user'

    });

  }

};



// Delete User (Admin only)

const deleteUser = async (req, res) => {

  try {

    const userId = req.params.id;



    // Prevent admin from deleting themselves

    if (req.user.id === userId) {

      return res.status(400).json({

        success: false,

        message: 'Cannot delete your own account'

      });

    }



    const user = await User.findById(userId);

    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    await User.findByIdAndDelete(userId);



    res.json({

      success: true,

      message: 'User deleted successfully'

    });

  } catch (error) {

    console.error('Delete user error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while deleting user'

    });

  }

};



// OTP Login for First-time Staff (OTP-based authentication)

const otpLogin = async (req, res) => {

  try {

    const { email, otp } = req.body;



    // Validate input

    if (!email || !otp) {

      return res.status(400).json({

        success: false,

        message: 'Email and OTP are required'

      });

    }



    // Find staff user

    const staffUser = await User.findOne({

      email: email.toLowerCase(),

      role: { $in: ['dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff'] },

      isFirstLogin: true

    });



    if (!staffUser) {

      return res.status(401).json({

        success: false,

        message: 'User not found or already completed first login'

      });

    }



    // Check if OTP exists and is not expired

    if (!staffUser.otp || !staffUser.otpExpires) {

      return res.status(401).json({

        success: false,

        message: 'No OTP found. Please contact administrator.'

      });

    }



    if (new Date() > staffUser.otpExpires) {

      return res.status(401).json({

        success: false,

        message: 'OTP has expired. Please request a new one.'

      });

    }



    // Verify OTP

    if (staffUser.otp !== otp) {

      return res.status(401).json({

        success: false,

        message: 'Invalid OTP'

      });

    }



    // Clear OTP after successful verification

    staffUser.otp = null;

    staffUser.otpExpires = null;

    await staffUser.save();



    res.json({

      success: true,

      message: 'OTP verified successfully. Please set your new password.',

      data: {

        tempToken: generateToken(staffUser),

        isFirstLogin: true,

        requiresPasswordReset: true,

        user: {

          id: staffUser._id,

          fullName: staffUser.fullName,

          email: staffUser.email,

          role: staffUser.role

        }

      }

    });



  } catch (error) {

    console.error('OTP login error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error during OTP verification'

    });

  }

};



// Set Password After First-time OTP Login

const setPasswordAfterOTP = async (req, res) => {

  try {

    const { newPassword, confirmPassword } = req.body;



    // Validate input

    if (!newPassword || !confirmPassword) {

      return res.status(400).json({

        success: false,

        message: 'New password and confirmation are required'

      });

    }



    if (newPassword !== confirmPassword) {

      return res.status(400).json({

        success: false,

        message: 'Passwords do not match'

      });

    }



    if (newPassword.length < 6) {

      return res.status(400).json({

        success: false,

        message: 'Password must be at least 6 characters long'

      });

    }



    // Get user from token

    const user = await User.findById(req.user.id);

    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    // Update password and mark first login as complete

    user.password = newPassword;

    user.isFirstLogin = false;

    user.lastLogin = new Date();

    await user.save();



    // Send confirmation email

    await sendFirstPasswordSetEmail(user.email, user.fullName);



    // Generate new token for regular login

    const token = generateToken(user);



    res.json({

      success: true,

      message: 'Password set successfully. You can now login with your email and password.',

      data: {

        user: {

          id: user._id,

          fullName: user.fullName,

          email: user.email,

          role: user.role,

          status: user.status

        },

        token

      }

    });



  } catch (error) {

    console.error('Set password error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while setting password'

    });

  }

};



// Forgot Password - Send Reset Link

const forgotPassword = async (req, res) => {

  try {

    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();



    // Validate input

    if (!normalizedEmail) {

      return res.status(400).json({

        success: false,

        message: 'Email is required'

      });

    }



    // Find user by email

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {

      // Don't reveal if email exists for security

      return res.json({

        success: true,

        message: 'If an account exists with this email, a password reset link will be sent.'

      });

    }



    // Generate reset token

    const resetToken = crypto.randomBytes(32).toString('hex');

    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // Expires in 1 hour



    // Save reset token and expiry to user

    user.resetPasswordToken = resetPasswordToken;

    user.resetPasswordExpires = resetPasswordExpires;

    await user.save();



    // Send password reset email

    const recipientName = user.fullName || user.email || 'User';
    const emailSent = await sendPasswordResetEmail(normalizedEmail, resetToken, recipientName);



    const message = emailSent 

      ? 'Password reset link has been sent to your email.'

      : 'Password reset link prepared (check server logs in development mode).';



    res.json({

      success: true,

      message: message,

      emailSent: emailSent,

      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined

    });



  } catch (error) {

    console.error('Forgot password error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while processing password reset'

    });

  }

};



// Reset Password Using Token

const resetPassword = async (req, res) => {

  try {

    const { token, newPassword, confirmPassword } = req.body;
    const normalizedToken = String(token || '').trim();



    // Validate input

    if (!normalizedToken || !newPassword || !confirmPassword) {

      return res.status(400).json({

        success: false,

        message: 'Token and passwords are required'

      });

    }



    if (newPassword !== confirmPassword) {

      return res.status(400).json({

        success: false,

        message: 'Passwords do not match'

      });

    }



    if (newPassword.length < 6) {

      return res.status(400).json({

        success: false,

        message: 'Password must be at least 6 characters long'

      });

    }



    // Hash the token to match with database

    const resetPasswordToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');



    // Find user with valid reset token

    const user = await User.findOne({

      resetPasswordToken: resetPasswordToken,

      resetPasswordExpires: { $gt: new Date() }

    });



    if (!user) {

      return res.status(400).json({

        success: false,

        message: 'Password reset token is invalid or has expired'

      });

    }



    // Update password

    user.password = newPassword;

    user.isFirstLogin = false;

    user.otp = null;

    user.otpExpires = null;

    user.resetPasswordToken = null;

    user.resetPasswordExpires = null;

    await user.save();



    res.json({

      success: true,

      message: 'Password has been reset successfully. Please login with your new password.'

    });



  } catch (error) {

    console.error('Reset password error:', error);

    res.status(500).json({

      success: false,

      message: 'Server error while resetting password'

    });

  }

};



const testEmail = async (req, res) => {

  try {

    const { email, label } = req.body;

    const recipient = email || req.user?.email;



    if (!recipient) {

      return res.status(400).json({

        success: false,

        message: 'Recipient email is required.'

      });

    }



    const sent = await sendTestEmail(recipient, label || 'SMTP Verification');



    return res.json({

      success: true,

      message: sent

        ? `Test email sent to ${recipient}.`

        : 'Email not sent because SMTP is still in fallback mode. Check server logs and .env credentials.',

      data: {

        emailSent: sent,

        recipient,

        label: label || 'SMTP Verification'

      }

    });

  } catch (error) {

    console.error('Test email error:', error);

    return res.status(500).json({

      success: false,

      message: 'Server error while sending test email.'

    });

  }

};



module.exports = {

  adminLogin,

  staffLogin,

  createStaff,

  otpLogin,

  setPasswordAfterOTP,

  forgotPassword,

  resetPassword,

  testEmail,

  getCurrentUser,

  updateProfile,

  getAllUsers,

  getUserById,

  updateUser,

  deleteUser

};

