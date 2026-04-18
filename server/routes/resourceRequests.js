const express = require('express');
const router = express.Router();
const {
  createResourceRequest,
  listResourceRequests,
  getResourceRequestById,
  updateResourceRequestStatus,
  checkStockAvailability
} = require('../controllers/resourceRequestController');
const {
  authenticateToken,
  inventoryOfficerOnly,
  adminOnly
} = require('../config/auth');

// Get all resource requests (Inventory Officer and Admin only)
router.get('/', authenticateToken, inventoryOfficerOnly, listResourceRequests);

// Check stock availability (Inventory Officer and Admin only)
router.post('/check-stock', authenticateToken, inventoryOfficerOnly, checkStockAvailability);

// Create resource request (Inventory Officer and Admin only)
router.post('/', authenticateToken, inventoryOfficerOnly, createResourceRequest);

// Get resource request by ID (Inventory Officer and Admin only)
router.get('/:id', authenticateToken, inventoryOfficerOnly, getResourceRequestById);

// Update resource request status (Inventory Officer and Admin only)
router.patch('/:id/status', authenticateToken, inventoryOfficerOnly, updateResourceRequestStatus);

module.exports = router;
