const express = require('express');
const router = express.Router();
const {
  adminLogin,
  staffLogin,
  createStaff,
  otpLogin,
  setPasswordAfterOTP,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/authController');
const {
  authenticateToken,
  adminOnly,
  internalStaffOnly
} = require('../config/auth');

// Admin Login Route
router.post('/admin/login', adminLogin);

// Staff Login Route
router.post('/staff/login', staffLogin);

// OTP-based Login for First-time Staff
router.post('/staff/otp-login', otpLogin);

// Set Password After OTP Login
router.post('/staff/set-password', authenticateToken, setPasswordAfterOTP);

// Forgot Password - Send Reset Link
router.post('/forgot-password', forgotPassword);

// Reset Password Using Token
router.post('/reset-password', resetPassword);

// Create Staff User (Admin only)
router.post('/staff/create', authenticateToken, adminOnly, createStaff);

// Get Current User Profile (All authenticated users)
router.get('/profile', authenticateToken, getCurrentUser);

// Update User Profile (All authenticated users)
router.put('/profile', authenticateToken, updateProfile);

// User Management Routes (Admin only)
router.get('/staff/all', authenticateToken, adminOnly, getAllUsers);
router.get('/users', authenticateToken, adminOnly, getAllUsers);
router.get('/users/:id', authenticateToken, adminOnly, getUserById);
router.put('/users/:id', authenticateToken, adminOnly, updateUser);
router.delete('/users/:id', authenticateToken, adminOnly, deleteUser);

module.exports = router;
