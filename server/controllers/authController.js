const User = require('../models/User');
const Partner = require('../models/Partner');
const mongoose = require('mongoose');
const { generateToken } = require('../config/auth');
const bcrypt = require('bcryptjs');
const { sendStaffOnboardingEmail, sendTestEmail, sendPasswordResetEmail, sendFirstPasswordSetEmail } = require('../services/emailService');
const crypto = require('crypto');

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const STAFF_ROLES = ['dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff', 'ngo_partner'];

// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });

    const adminUser = await User.findOne({ email: email.toLowerCase(), role: 'admin', status: 'active' });
    if (!adminUser) return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

    const isMatch = adminUser.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

    adminUser.lastLogin = new Date();
    await adminUser.save();

    const token = generateToken(adminUser);

    res.json({ success: true, message: 'Admin login successful', data: { user: { id: adminUser._id, fullName: adminUser.fullName, email: adminUser.email, role: adminUser.role, status: adminUser.status }, token } });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Staff & NGO Login
const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });

    try {
      const staffUser = await User.findOne({ email: email.toLowerCase(), role: { $in: STAFF_ROLES }, status: 'active' });
      if (!staffUser) return res.status(401).json({ success: false, message: 'Invalid staff credentials' });

      if (staffUser.isFirstLogin) return res.status(403).json({ success: false, message: 'First-time login requires OTP/password setup. Please use the setup link sent to your email or verify OTP first.' });

      const isMatch = staffUser.comparePassword(password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid staff credentials' });

      staffUser.lastLogin = new Date();
      await staffUser.save();

      const token = generateToken(staffUser);

      res.json({ success: true, message: staffUser.role === 'ngo_partner' ? 'NGO login successful' : 'Staff login successful', data: { user: { id: staffUser._id, fullName: staffUser.fullName, email: staffUser.email, role: staffUser.role, status: staffUser.status }, token } });
    } catch (dbError) {
      console.error('Database error in staff login', dbError);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Unified Login (Identifies role automatically)
const unifiedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    if (!isDatabaseConnected()) return res.status(503).json({ success: false, message: 'Database unavailable. Please try again shortly.' });

    const normalizedEmail = email.toLowerCase();
    
    // 1. Find user by email
    const user = await User.findOne({ email: normalizedEmail, status: 'active' });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2. Check if it's a first-time login for non-admin
    if (user.role !== 'admin' && user.isFirstLogin) {
      return res.status(403).json({ 
        success: false, 
        message: 'First-time login requires OTP/password setup. Please verify OTP first.' 
      });
    }

    // 3. Verify password
    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 4. Update last login
    user.lastLogin = new Date();
    await user.save();

    // 5. Generate token
    const token = generateToken(user);

    res.json({ 
      success: true, 
      message: 'Login successful', 
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
    console.error('Unified login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Create Staff / NGO partner (admin only)
const createStaff = async (req, res) => {
  try {
    const { fullName, email, role, phone, department, partnerEmail, organizationName } = req.body;
    if (!fullName || !email || !role) return res.status(400).json({ success: false, message: 'Full name, email, and role are required' });
    const validRoles = STAFF_ROLES;
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid staff role' });

    try {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(400).json({ success: false, message: 'User with this email already exists' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

      const setupToken = crypto.randomBytes(32).toString('hex');
      const resetPasswordToken = crypto.createHash('sha256').update(setupToken).digest('hex');
      const resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const tempPassword = crypto.randomBytes(16).toString('hex');

      const newStaff = new User({
        fullName,
        email: email.toLowerCase(),
        password: tempPassword,
        role,
        status: 'active',
        phone: phone || '',
        department: department || '',
        createdBy: req.user ? req.user.id : null,
        isFirstLogin: true,
        otp,
        otpExpires,
        resetPasswordToken,
        resetPasswordExpires
      });

      await newStaff.save();

      let partnerRecord = null;
      if (role === 'ngo_partner') {
        const pEmail = (partnerEmail || email).toLowerCase();
        partnerRecord = new Partner({ organizationName: organizationName || fullName, contactPerson: fullName, email: pEmail, phone: phone || '', status: 'active', createdBy: req.user ? req.user.id : null, userId: newStaff._id });
        await partnerRecord.save();
      }

      const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${setupToken}`;

      const emailSentToUser = await sendStaffOnboardingEmail(newStaff.email, otp, fullName, setupToken);
      let emailSentToPartner = false;
      if (partnerRecord && partnerRecord.email && partnerRecord.email !== newStaff.email) {
        emailSentToPartner = await sendStaffOnboardingEmail(partnerRecord.email, otp, organizationName || fullName, setupToken);
      }

      const anyEmailSent = emailSentToUser || emailSentToPartner;

      const message = anyEmailSent ? (role === 'ngo_partner' ? 'NGO partner created successfully. OTP and password setup link have been sent.' : 'Staff user created successfully. OTP and password setup link have been sent to their email.') : 'User created successfully. Email not sent; use OTP/setup link from response or server logs.';

      res.status(201).json({ success: true, message, data: { userType: role === 'ngo_partner' ? 'ngo_partner' : 'staff', user: { id: newStaff._id, fullName: newStaff.fullName, email: newStaff.email, role: newStaff.role, status: newStaff.status }, partner: partnerRecord ? { id: partnerRecord._id, organizationName: partnerRecord.organizationName, email: partnerRecord.email } : null, emailSentToUser, emailSentToPartner, otp: process.env.NODE_ENV === 'development' || !anyEmailSent ? otp : undefined, setupLink: process.env.NODE_ENV === 'development' || !anyEmailSent ? setupLink : undefined } });

    } catch (dbError) {
      console.error('Database error in create staff', dbError);
      if (dbError && dbError.stack) console.error(dbError.stack);
      return res.status(500).json({ success: false, message: 'Server error while creating staff user' });
    }
  } catch (error) {
    console.error('Create staff error:', error);
    if (error && error.stack) console.error(error.stack);
    res.status(500).json({ success: false, message: 'Server error while creating staff user' });
  }
};

// OTP login
const otpLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const staffUser = await User.findOne({ email: email.toLowerCase(), role: { $in: STAFF_ROLES }, isFirstLogin: true });
    if (!staffUser) return res.status(401).json({ success: false, message: 'User not found or already completed first login' });

    if (!staffUser.otp || !staffUser.otpExpires) return res.status(401).json({ success: false, message: 'No OTP found. Please contact administrator.' });
    if (new Date() > staffUser.otpExpires) return res.status(401).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (staffUser.otp !== otp) return res.status(401).json({ success: false, message: 'Invalid OTP' });

    staffUser.otp = null;
    staffUser.otpExpires = null;
    await staffUser.save();

    res.json({ success: true, message: 'OTP verified successfully. Please set your new password.', data: { tempToken: generateToken(staffUser), isFirstLogin: true, requiresPasswordReset: true, user: { id: staffUser._id, fullName: staffUser.fullName, email: staffUser.email, role: staffUser.role } } });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

// Set password after OTP
const setPasswordAfterOTP = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'New password and confirmation are required' });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    user.isFirstLogin = false;
    user.lastLogin = new Date();
    await user.save();

    await sendFirstPasswordSetEmail(user.email, user.fullName);

    const token = generateToken(user);
    res.json({ success: true, message: 'Password set successfully. You can now login with your email and password.', data: { user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status }, token } });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ success: false, message: 'Server error while setting password' });
  }
};

// Forgot / Reset password and other helpers (kept concise)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.json({ success: true, message: 'If an account exists with this email, a password reset link will be sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    const emailSent = await sendPasswordResetEmail(normalizedEmail, resetToken, user.fullName || user.email || 'User');
    res.json({ success: true, message: emailSent ? 'Password reset link has been sent to your email.' : 'Password reset link prepared (check server logs in development mode).', emailSent, resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error while processing password reset' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: 'Token and passwords are required' });
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });

    const resetPasswordToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired' });

    user.password = newPassword;
    user.isFirstLogin = false;
    user.otp = null;
    user.otpExpires = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. Please login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error while resetting password' });
  }
};

const testEmail = async (req, res) => {
  try {
    const { email, label } = req.body;
    const recipient = email || req.user?.email;
    if (!recipient) return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    const sent = await sendTestEmail(recipient, label || 'SMTP Verification');
    return res.json({ success: true, message: sent ? `Test email sent to ${recipient}.` : 'Email not sent because SMTP is still in fallback mode. Check server logs and .env credentials.', data: { emailSent: sent, recipient, label: label || 'SMTP Verification' } });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ success: false, message: 'Server error while sending test email.' });
  }
};

// Basic user endpoints used elsewhere
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, department } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone) updates.phone = phone;
    if (department) updates.department = department;
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) query.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, email, role, status, phone, department } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.id === userId && role !== 'admin') return res.status(400).json({ success: false, message: 'Cannot change your own admin role' });
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email.toLowerCase();
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (phone !== undefined) updates.phone = phone;
    if (department !== undefined) updates.department = department;
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: 'User updated successfully', data: { user: updatedUser } });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id === userId) return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting user' });
  }
};

module.exports = {
  unifiedLogin,
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
