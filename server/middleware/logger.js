const AuditLog = require('../models/AuditLog');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request details
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Audit logging middleware
const auditLogger = async (req, res, next) => {
  // Only log if user is authenticated
  if (!req.user) {
    return next();
  }

  const originalSend = res.send;
  
  res.send = function(data) {
    // Log audit entry for successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const auditData = {
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: getActionFromMethod(req.method),
        resource: getResourceFromUrl(req.originalUrl),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        details: {
          body: sanitizeRequestBody(req.body),
          params: req.params,
          query: req.query
        }
      };

      // Save audit log asynchronously
      AuditLog.create(auditData).catch(err => {
        console.error('Failed to save audit log:', err);
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection attempts
    /javascript:/i  // JavaScript protocol
  ];
  
  const url = req.originalUrl;
  const body = JSON.stringify(req.body || {});
  const combined = url + ' ' + body;
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(combined));
  
  if (isSuspicious) {
    console.warn(`🚨 Suspicious request detected: ${req.method} ${url} from IP: ${req.ip}`);
    
    // Log security event
    const securityData = {
      type: 'SECURITY_ALERT',
      action: 'SUSPICIOUS_REQUEST',
      method: req.method,
      url: url,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      details: {
        body: sanitizeRequestBody(req.body),
        pattern: suspiciousPatterns.find(pattern => pattern.test(combined))
      }
    };
    
    // Save security log asynchronously
    AuditLog.create(securityData).catch(err => {
      console.error('Failed to save security log:', err);
    });
  }
  
  next();
};

// Rate limiting logger
const rateLimitLogger = (req, res, next) => {
  // This would integrate with a rate limiting library
  // For now, just log the request for monitoring
  next();
};

// Helper functions
function getActionFromMethod(method) {
  const actions = {
    'GET': 'READ',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  return actions[method] || 'UNKNOWN';
}

function getResourceFromUrl(url) {
  const pathParts = url.split('/');
  if (pathParts.length >= 2) {
    return pathParts[1]; // e.g., /users -> users
  }
  return 'UNKNOWN';
}

function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields from logs
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
    
    // Log performance metrics
    const performanceData = {
      type: 'PERFORMANCE',
      method: req.method,
      url: req.originalUrl,
      duration: duration,
      statusCode: res.statusCode,
      timestamp: new Date()
    };
    
    // Save performance log asynchronously
    AuditLog.create(performanceData).catch(err => {
      console.error('Failed to save performance log:', err);
    });
  });
  
  next();
};

module.exports = {
  requestLogger,
  auditLogger,
  securityLogger,
  rateLimitLogger,
  performanceLogger
};
