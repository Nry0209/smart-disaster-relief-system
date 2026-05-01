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
  testEmail,
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

// Staff & NGO Login Route (for established users, non-first login)
// Use after first login setup is complete (OTP → password)
router.post('/staff/login', staffLogin);

// OTP-based Login for First-time Staff & NGO Partners
// First login flow: User receives OTP via email → enters OTP here
router.post('/staff/otp-login', otpLogin);

// Set Password After OTP Verification (First-time login step 2)
// After OTP verification → user sets permanent password here
router.post('/staff/set-password', authenticateToken, setPasswordAfterOTP);

// Forgot Password - Send Reset Link
router.post('/forgot-password', forgotPassword);

// Reset Password Using Token
router.post('/reset-password', resetPassword);

// Send Test Email (Admin only)
router.post('/test-email', authenticateToken, adminOnly, testEmail);

// Create Staff User or NGO Partner (Admin only)
// Supports all roles: dmc_officer, inventory_officer, allocation_officer, tracking_officer, charity_staff, ngo_partner
// NGO partners: use role='ngo_partner' to create both User and Partner records
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
