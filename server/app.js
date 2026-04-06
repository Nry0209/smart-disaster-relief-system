const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

// Import middleware
const {
  securityHeaders,
  corsOptions,
  sanitizeInput,
  detectSqlInjection,
  detectXSS,
  requestSizeLimiter,
  ipBlacklist,
  validateUserAgent,
  basicLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  docsLimiter,
  healthLimiter,
  requestLogger,
  auditLogger,
  securityLogger,
  performanceLogger,
  errorHandler,
  notFound,
  asyncHandler
} = require('./middleware');

dotenv.config();

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware (applied to all requests)
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(sanitizeInput);
app.use(detectSqlInjection);
app.use(detectXSS);
app.use(requestSizeLimiter);
app.use(ipBlacklist);
app.use(validateUserAgent);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);
app.use(auditLogger);
app.use(securityLogger);
app.use(performanceLogger);

// Rate limiting middleware
app.use(basicLimiter);

// Health check endpoint (with lenient rate limiting)
app.get('/health', healthLimiter, asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: 'Connected', // This would be dynamic in a real app
    memory: process.memoryUsage(),
    services: {
      authentication: 'OK',
      logging: 'OK',
      security: 'OK'
    }
  };
  
  res.json(healthCheck);
}));

// API documentation endpoint
app.get('/api/docs', docsLimiter, (req, res) => {
  res.json({
    title: 'Smart Disaster Relief API',
    version: '1.0.0',
    description: 'API for managing disaster relief operations',
    endpoints: {
      authentication: {
        'POST /api/auth/admin/login': 'Admin login',
        'POST /api/auth/staff/login': 'Staff login',
        'POST /api/auth/staff/create': 'Create staff user (admin only)',
        'GET /api/auth/profile': 'Get current user profile',
        'PUT /api/auth/profile': 'Update user profile'
      },
      disasterReports: {
        'GET /api/disaster-reports': 'Get all disaster reports',
        'POST /api/disaster-reports': 'Create new disaster report',
        'GET /api/disaster-reports/:id': 'Get specific disaster report',
        'PUT /api/disaster-reports/:id': 'Update disaster report'
      },
      inventory: {
        'GET /api/inventory': 'Get all inventory items',
        'POST /api/inventory': 'Create new inventory item',
        'GET /api/inventory/:id': 'Get specific inventory item',
        'PUT /api/inventory/:id': 'Update inventory item',
        'DELETE /api/inventory/:id': 'Delete inventory item'
      },
      allocations: {
        'GET /api/allocations': 'Get all allocation plans',
        'POST /api/allocations': 'Create allocation plan',
        'GET /api/allocations/:id': 'Get specific allocation plan',
        'PUT /api/allocations/:id': 'Update allocation plan'
      },
      dispatch: {
        'GET /api/dispatch': 'Get all dispatch records',
        'POST /api/dispatch': 'Create dispatch record',
        'GET /api/dispatch/:id': 'Get specific dispatch record',
        'PUT /api/dispatch/:id': 'Update dispatch record'
      },
      donations: {
        'GET /api/donations': 'Get all donations',
        'POST /api/donations': 'Create donation',
        'GET /api/donations/:id': 'Get specific donation',
        'PUT /api/donations/:id': 'Update donation'
      },
      partners: {
        'GET /api/partners': 'Get all partners',
        'POST /api/partners': 'Create partner',
        'GET /api/partners/:id': 'Get specific partner',
        'PUT /api/partners/:id': 'Update partner'
      }
    },
    authentication: 'JWT Bearer Token required for protected endpoints',
    rateLimits: {
      basic: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      create: '30 requests per minute',
      upload: '10 requests per minute'
    }
  });
});

// Routes
const authRoutes = require('./routes/auth');
const disasterRoutes = require('./routes/disasterReports');
const inventoryRoutes = require('./routes/inventory');
const allocationRoutes = require('./routes/allocations');
const dispatchRoutes = require('./routes/dispatch');
const donationRoutes = require('./routes/donations');
const partnerRoutes = require('./routes/partners');

// API Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/disaster-reports', createLimiter, disasterRoutes);
app.use('/api/inventory', createLimiter, inventoryRoutes);
app.use('/api/allocations', createLimiter, allocationRoutes);
app.use('/api/dispatch', createLimiter, dispatchRoutes);
app.use('/api/donations', createLimiter, donationRoutes);
app.use('/api/partners', createLimiter, partnerRoutes);

// Root route
app.get("/", healthLimiter, (req, res) => {
  res.json({
    message: "Smart Disaster Relief API is running...",
    version: "1.0.0",
    authentication: "Admin-Only User Creation",
    endpoints: {
      auth: "/api/auth",
      disasterReports: "/api/disaster-reports",
      inventory: "/api/inventory",
      allocations: "/api/allocations",
      dispatch: "/api/dispatch",
      donations: "/api/donations",
      partners: "/api/partners",
      health: "/health",
      docs: "/api/docs"
    },
    security: {
      rateLimiting: "Enabled",
      cors: "Enabled",
      helmet: "Enabled",
      inputValidation: "Enabled",
      sqlInjectionProtection: "Enabled",
      xssProtection: "Enabled"
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;