// Central middleware export file
// This file exports all middleware for easy importing

// Authentication middleware
const {
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
} = require('./auth');

// Error handling middleware
const {
  errorHandler,
  asyncHandler,
  notFound
} = require('./errorHandler');

// Logging middleware
const {
  requestLogger,
  auditLogger,
  securityLogger,
  rateLimitLogger,
  performanceLogger
} = require('./logger');

// Validation middleware
const {
  validateUserCreation,
  validateLogin,
  validateDisasterEvent,
  validateInventoryItem,
  validateAllocationPlan,
  validateDispatchRecord,
  validateDonation,
  validateMongoId,
  validatePagination,
  handleValidationErrors
} = require('./validation');

// Rate limiting middleware
const {
  basicLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  docsLimiter,
  healthLimiter,
  roleBasedLimiter,
  sensitiveLimiter,
  createRoleBasedLimiter
} = require('./rateLimiter');

// Security middleware
const {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  detectSqlInjection,
  detectXSS,
  requestSizeLimiter,
  ipBlacklist,
  validateUserAgent
} = require('./security');

// Middleware combinations for common use cases
const middlewareCombinations = {
  // Full authentication and authorization
  fullAuth: [authenticateToken],
  
  // Admin only access
  adminAuth: [authenticateToken, adminOnly],
  
  // DMC officer access
  dmcAuth: [authenticateToken, dmcOfficerOnly],
  
  // Inventory officer access
  inventoryAuth: [authenticateToken, inventoryOfficerOnly],
  
  // Allocation officer access
  allocationAuth: [authenticateToken, allocationOfficerOnly],
  
  // Tracking officer access
  trackingAuth: [authenticateToken, trackingOfficerOnly],
  
  // Charity staff access
  charityAuth: [authenticateToken, charityStaffOnly],
  
  // Public access with optional authentication
  publicAuth: [optionalAuth],
  
  // User can access their own resources
  ownResourceAuth: [authenticateToken, canAccessOwnResource],
  
  // Security stack for all requests
  securityStack: [
    securityHeaders,
    sanitizeInput,
    detectSqlInjection,
    detectXSS,
    requestSizeLimiter,
    ipBlacklist,
    validateUserAgent
  ],
  
  // Logging stack for all requests
  loggingStack: [
    requestLogger,
    auditLogger,
    securityLogger,
    performanceLogger
  ],
  
  // Rate limiting for different endpoints
  rateLimiting: {
    basic: basicLimiter,
    auth: authLimiter,
    create: createLimiter,
    upload: uploadLimiter,
    docs: docsLimiter,
    health: healthLimiter,
    roleBased: roleBasedLimiter,
    sensitive: sensitiveLimiter
  },
  
  // Validation for different endpoints
  validation: {
    user: validateUserCreation,
    login: validateLogin,
    disasterEvent: validateDisasterEvent,
    inventoryItem: validateInventoryItem,
    allocationPlan: validateAllocationPlan,
    dispatchRecord: validateDispatchRecord,
    donation: validateDonation,
    mongoId: validateMongoId,
    pagination: validatePagination
  }
};

// Helper function to create custom middleware chains
const createMiddlewareChain = (...middlewares) => {
  return middlewares.flat();
};

// Export everything
module.exports = {
  // Individual middleware
  authenticateToken,
  authorize,
  adminOnly,
  dmcOfficerOnly,
  inventoryOfficerOnly,
  allocationOfficerOnly,
  trackingOfficerOnly,
  charityStaffOnly,
  optionalAuth,
  canAccessOwnResource,
  
  errorHandler,
  asyncHandler,
  notFound,
  
  requestLogger,
  auditLogger,
  securityLogger,
  rateLimitLogger,
  performanceLogger,
  
  validateUserCreation,
  validateLogin,
  validateDisasterEvent,
  validateInventoryItem,
  validateAllocationPlan,
  validateDispatchRecord,
  validateDonation,
  validateMongoId,
  validatePagination,
  handleValidationErrors,
  
  basicLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  docsLimiter,
  healthLimiter,
  roleBasedLimiter,
  sensitiveLimiter,
  createRoleBasedLimiter,
  
  securityHeaders,
  corsOptions,
  sanitizeInput,
  detectSqlInjection,
  detectXSS,
  requestSizeLimiter,
  ipBlacklist,
  validateUserAgent,
  
  // Middleware combinations
  middlewareCombinations,
  createMiddlewareChain
};
