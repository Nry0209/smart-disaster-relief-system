const express = require('express');
const router = express.Router();
const {
  adminLogin,
  staffLogin,
  createStaff,
  getCurrentUser,
  updateProfile
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

// Create Staff User (Admin only)
router.post('/staff/create', authenticateToken, adminOnly, createStaff);

// Get Current User Profile (All authenticated users)
router.get('/profile', authenticateToken, getCurrentUser);

// Update User Profile (All authenticated users)
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
