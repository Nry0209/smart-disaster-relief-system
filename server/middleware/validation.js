// Input validation middleware
const { body, param, query, validationResult } = require('express-validator');
const { ITEM_CATEGORY_ENUM } = require('../utils/constants');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// User validation rules
const validateUserCreation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['admin', 'dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff', 'ngo_partner'])
    .withMessage('Invalid role specified'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('role')
    .isIn(['admin', 'staff', 'ngo_partner'])
    .withMessage('Role must be admin, staff, or ngo_partner'),
  
  handleValidationErrors
];

// Disaster event validation
const validateDisasterEvent = [
  body('disasterType')
    .isIn(['Flood', 'Earthquake', 'Cyclone', 'Landslide', 'Drought', 'Fire', 'Other'])
    .withMessage('Invalid disaster type'),
  
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  
  body('location')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  
  body('affectedPopulation')
    .isInt({ min: 0 })
    .withMessage('Affected population must be a positive number'),
  
  body('eventDate')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('reportedBy')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Reporter name must be between 2 and 100 characters'),
  
  body('designation')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Designation must be between 2 and 100 characters'),
  
  body('contactPhone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('contactEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('coordinates.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('coordinates.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('estimatedDuration')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Estimated duration must be between 2 and 50 characters'),
  
  body('immediateNeeds')
    .isArray()
    .withMessage('Immediate needs must be an array'),
  
  body('immediateNeeds.*')
    .isIn(['Water', 'Food', 'Medical Supplies', 'Shelter', 'Clothing', 'Other'])
    .withMessage('Invalid immediate need specified'),
  
  handleValidationErrors
];

// Inventory item validation
const validateInventoryItem = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  
  body('category')
    .isIn(['Water', 'Food', 'Medical', 'Shelter', 'Clothing', 'Other'])
    .withMessage('Invalid category specified'),
  
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a positive number'),
  
  body('min')
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a positive number'),
  
  body('unit')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Unit must be between 1 and 20 characters'),
  
  handleValidationErrors
];

// Allocation plan validation
const validateAllocationPlan = [
  body('disasterId')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Disaster ID is required'),
  
  body('allocatedBy')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Allocator name must be between 2 and 100 characters'),
  
  body('allocationDate')
    .isISO8601()
    .withMessage('Please provide a valid allocation date'),
  
  body('allocatedItems')
    .isArray({ min: 1 })
    .withMessage('At least one allocated item is required'),
  
  body('allocatedItems.*.itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('allocatedItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive number'),
  
  body('allocatedItems.*.priority')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level'),
  
  body('transportDetails')
    .optional()
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Transport details must be between 2 and 500 characters'),
  
  body('expectedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expected delivery date'),
  
  handleValidationErrors
];

// Dispatch record validation
const validateDispatchRecord = [
  body('allocationRef')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Allocation reference is required'),
  
  body('dispatchDate')
    .isISO8601()
    .withMessage('Please provide a valid dispatch date'),
  
  body('transportDetails')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Transport details must be between 2 and 500 characters'),
  
  body('currentLocation')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Current location must be between 2 and 200 characters'),
  
  body('status')
    .isIn(['prepared', 'dispatched', 'in_transit', 'delivered', 'verified'])
    .withMessage('Invalid dispatch status'),
  
  body('allocatedItems')
    .isArray({ min: 1 })
    .withMessage('At least one allocated item is required'),
  
  body('allocatedItems.*.itemId')
    .isMongoId()
    .withMessage('Invalid item ID'),
  
  body('allocatedItems.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive number'),
  
  handleValidationErrors
];

// Donation validation
const validateDonation = [
  body('donorName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Donor name must be between 2 and 100 characters'),

  body('donorType')
    .isIn(['individual', 'organization'])
    .withMessage('Donor type must be individual or organization'),

  body('organizationName')
    .if(body('donorType').equals('organization'))
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Organization name must be between 2 and 120 characters'),

  body('donationType')
    .isIn(['monetary', 'inventory'])
    .withMessage('Donation type must be monetary or inventory'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('itemType')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),

  body('items')
    .if(body('donationType').equals('inventory'))
    .isArray({ min: 1 })
    .withMessage('For inventory donations, at least one item is required'),

  body('items.*.inventoryItemId')
    .if(body('donationType').equals('inventory'))
    .isMongoId()
    .withMessage('Each selected donation item must include a valid inventoryItemId'),

  body('items.*.itemName')
    .if(body('donationType').equals('inventory'))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each selected donation item must include an item name between 2 and 100 characters'),

  body('items.*.category')
    .if(body('donationType').equals('inventory'))
    .isIn(ITEM_CATEGORY_ENUM)
    .withMessage('Each selected donation item must include a valid category'),

  body('items.*.quantity')
    .if(body('donationType').equals('inventory'))
    .isInt({ min: 1 })
    .withMessage('Each selected donation item must include a quantity greater than zero'),

  body('sourceResourceRequestId')
    .optional()
    .isMongoId()
    .withMessage('sourceResourceRequestId must be a valid MongoDB ID'),

  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive number'),
  
  body('amount')
    .if(body('donationType').equals('monetary'))
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  handleValidationErrors
];

// MongoDB ID validation
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isAlpha()
    .withMessage('Sort field must contain only letters'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
  
  handleValidationErrors
];

module.exports = {
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
};
