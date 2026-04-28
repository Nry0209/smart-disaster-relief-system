const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    req.user = user;
    next();
  });
};

// Role-based access control
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const normalizedUserRole = normalizeRole(req.user.role);
    const normalizedRoles = roles.map((role) => normalizeRole(role));

    if (!normalizedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'This action requires different permissions. Please contact your administrator if you need access.' 
      });
    }

    next();
  };
};

// Admin-only access
const adminOnly = authorizeRoles('admin');

// DMC Officer access
const dmcOfficerOnly = authorizeRoles('admin', 'dmc_officer');

// Inventory Officer access
const inventoryOfficerOnly = authorizeRoles('admin', 'inventory_officer');

// Allocation Officer access
const allocationOfficerOnly = authorizeRoles('admin', 'allocation_officer');

// DMC and Allocation Officer access (for updating disaster reports)
const dmcOrAllocationOfficerOnly = authorizeRoles('admin', 'dmc_officer', 'allocation_officer');

// Tracking Officer access
const trackingOfficerOnly = authorizeRoles('admin', 'tracking_officer');

// Charity Staff access
const charityStaffOnly = authorizeRoles('admin', 'charity_staff');

// All internal staff access (except partners)
const internalStaffOnly = authorizeRoles('admin', 'dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  adminOnly,
  dmcOfficerOnly,
  inventoryOfficerOnly,
  allocationOfficerOnly,
  dmcOrAllocationOfficerOnly,
  trackingOfficerOnly,
  charityStaffOnly,
  internalStaffOnly,
  generateToken
};
