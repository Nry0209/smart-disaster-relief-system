const rateLimit = require('express-rate-limit');
const AuditLog = require('../models/AuditLog');

// Basic rate limiting for all requests
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log rate limit violation
    const rateLimitData = {
      type: 'RATE_LIMIT',
      action: 'RATE_LIMIT_EXCEEDED',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        limit: 100,
        windowMs: 15 * 60 * 1000
      }
    };
    
    await AuditLog.create(rateLimitData).catch(err => {
      console.error('Failed to save rate limit log:', err);
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: async (req, res) => {
    // Log authentication rate limit violation
    const authRateLimitData = {
      type: 'SECURITY_ALERT',
      action: 'AUTH_RATE_LIMIT_EXCEEDED',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        body: {
          email: req.body.email ? '[REDACTED]' : null,
          role: req.body.role
        }
      }
    };
    
    await AuditLog.create(authRateLimitData).catch(err => {
      console.error('Failed to save auth rate limit log:', err);
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    });
  }
});

// Rate limiting for data creation endpoints
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 create requests per minute
  message: {
    success: false,
    message: 'Too many creation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log creation rate limit violation
    const createRateLimitData = {
      type: 'RATE_LIMIT',
      action: 'CREATE_RATE_LIMIT_EXCEEDED',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        limit: 30,
        windowMs: 60 * 1000
      }
    };
    
    await AuditLog.create(createRateLimitData).catch(err => {
      console.error('Failed to save create rate limit log:', err);
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many creation requests, please try again later.'
    });
  }
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 uploads per minute
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log upload rate limit violation
    const uploadRateLimitData = {
      type: 'RATE_LIMIT',
      action: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        limit: 10,
        windowMs: 60 * 1000
      }
    };
    
    await AuditLog.create(uploadRateLimitData).catch(err => {
      console.error('Failed to save upload rate limit log:', err);
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many upload requests, please try again later.'
    });
  }
});

// Rate limiting for API documentation
const docsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 50 doc requests per minute
  message: {
    success: false,
    message: 'Too many documentation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for health checks (more lenient)
const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 health checks per minute
  message: {
    success: false,
    message: 'Too many health check requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Custom rate limiter for specific user roles
const createRoleBasedLimiter = (roleLimits) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      if (!req.user) return 50; // Default for unauthenticated users
      
      const role = req.user.role;
      return roleLimits[role] || 50; // Use role-specific limit or default
    },
    message: {
      success: false,
      message: 'Rate limit exceeded for your role, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    }
  });
};

// Role-based rate limits
const roleBasedLimiter = createRoleBasedLimiter({
  admin: 1000,      // Admins can make 1000 requests per 15 minutes
  dmc_officer: 200, // DMC officers: 200 requests per 15 minutes
  inventory_officer: 300, // Inventory officers: 300 requests per 15 minutes
  allocation_officer: 250, // Allocation officers: 250 requests per 15 minutes
  tracking_officer: 400,   // Tracking officers: 400 requests per 15 minutes
  charity_staff: 150       // Charity staff: 150 requests per 15 minutes
});

// Rate limiting for sensitive operations (like password changes)
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 sensitive operations per hour
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `sensitive:${req.user._id}` : `sensitive:${req.ip}`;
  },
  handler: async (req, res) => {
    // Log sensitive operation rate limit violation
    const sensitiveRateLimitData = {
      type: 'SECURITY_ALERT',
      action: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        userId: req.user ? req.user._id : null,
        userEmail: req.user ? req.user.email : null
      }
    };
    
    await AuditLog.create(sensitiveRateLimitData).catch(err => {
      console.error('Failed to save sensitive rate limit log:', err);
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many sensitive operations, please try again later.'
    });
  }
});

module.exports = {
  basicLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  docsLimiter,
  healthLimiter,
  roleBasedLimiter,
  sensitiveLimiter,
  createRoleBasedLimiter
};
