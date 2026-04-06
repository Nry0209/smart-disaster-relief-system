const helmet = require('helmet');
const cors = require('cors');
const AuditLog = require('../models/AuditLog');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:5000", "https://your-api-domain.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://your-frontend-domain.com'
    ];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Sanitize object recursively
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove potential XSS attacks
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// SQL injection detection middleware
const detectSqlInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /(--|;|\/\*|\*\/)/,
    /(\b(HEX|CHAR|CONCAT|SUBSTRING|ASCII)\b)/i
  ];
  
  const checkForInjection = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForInjection);
    }
    return false;
  };
  
  const suspiciousData = {
    body: req.body,
    query: req.query,
    params: req.params
  };
  
  if (checkForInjection(suspiciousData)) {
    console.warn(`🚨 SQL Injection attempt detected: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    
    // Log security event
    const securityData = {
      type: 'SECURITY_ALERT',
      action: 'SQL_INJECTION_ATTEMPT',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        body: sanitizeRequestBody(req.body),
        query: sanitizeRequestBody(req.query),
        params: req.params
      }
    };
    
    AuditLog.create(securityData).catch(err => {
      console.error('Failed to save SQL injection log:', err);
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }
  
  next();
};

// XSS detection middleware
const detectXSS = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src\s*=\s*["']?javascript:/gi,
    /<link[^>]*href\s*=\s*["']?javascript:/gi
  ];
  
  const checkForXSS = (value) => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForXSS);
    }
    return false;
  };
  
  const suspiciousData = {
    body: req.body,
    query: req.query,
    params: req.params
  };
  
  if (checkForXSS(suspiciousData)) {
    console.warn(`🚨 XSS attempt detected: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
    
    // Log security event
    const securityData = {
      type: 'SECURITY_ALERT',
      action: 'XSS_ATTEMPT',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        body: sanitizeRequestBody(req.body),
        query: sanitizeRequestBody(req.query),
        params: req.params
      }
    };
    
    AuditLog.create(securityData).catch(err => {
      console.error('Failed to save XSS attempt log:', err);
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }
  
  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.get('Content-Length');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }
  
  next();
};

// IP blacklist middleware
const ipBlacklist = (req, res, next) => {
  const blacklistedIPs = [
    // Add known malicious IPs here
    // '192.168.1.100',
    // '10.0.0.50'
  ];
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (blacklistedIPs.includes(clientIP)) {
    console.warn(`🚨 Blacklisted IP attempted access: ${clientIP}`);
    
    // Log security event
    const securityData = {
      type: 'SECURITY_ALERT',
      action: 'BLACKLISTED_IP_ACCESS',
      method: req.method,
      url: req.originalUrl,
      ipAddress: clientIP,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    AuditLog.create(securityData).catch(err => {
      console.error('Failed to save blacklisted IP log:', err);
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// User agent validation
const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  // Block requests without user agent
  if (!userAgent) {
    return res.status(400).json({
      success: false,
      message: 'User agent is required'
    });
  }
  
  // Block known malicious user agents
  const blockedUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];
  
  if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
    console.warn(`🚨 Suspicious user agent blocked: ${userAgent}`);
    
    // Log security event
    const securityData = {
      type: 'SECURITY_ALERT',
      action: 'SUSPICIOUS_USER_AGENT',
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: userAgent,
      timestamp: new Date()
    };
    
    AuditLog.create(securityData).catch(err => {
      console.error('Failed to save suspicious user agent log:', err);
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// Helper function to sanitize request body for logging
function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields from logs
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

module.exports = {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  detectSqlInjection,
  detectXSS,
  requestSizeLimiter,
  ipBlacklist,
  validateUserAgent
};
