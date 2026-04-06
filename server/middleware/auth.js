const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware - verifies JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during authentication'
      });
    }
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    next();
  };
};

// Admin-only middleware
const adminOnly = authorize('admin');

// DMC Officer middleware
const dmcOfficerOnly = authorize('admin', 'dmc_officer');

// Inventory Officer middleware
const inventoryOfficerOnly = authorize('admin', 'inventory_officer');

// Allocation Officer middleware
const allocationOfficerOnly = authorize('admin', 'allocation_officer');

// Tracking Officer middleware
const trackingOfficerOnly = authorize('admin', 'tracking_officer');

// Charity Staff middleware
const charityStaffOnly = authorize('admin', 'charity_staff');

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id).select('-password');
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Optional auth - don't fail, just continue without user
    next();
  }
};

// Check if user can access their own resources
const canAccessOwnResource = (req, res, next) => {
  const targetUserId = req.params.userId || req.params.id;
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin can access any resource
  if (req.user.role === 'admin') {
    return next();
  }

  // Users can only access their own resources
  if (req.user._id.toString() !== targetUserId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied - can only access own resources'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorize,
  adminOnly,
  dmcOfficerOnly,
  inventoryOfficerOnly,
  allocationOfficerOnly,
  trackingOfficerOnly,
  charityStaffOnly,
  optionalAuth,
  canAccessOwnResource
};
