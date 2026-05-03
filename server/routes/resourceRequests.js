const express = require('express');
const router = express.Router();
const {
  createResourceRequest,
  listResourceRequests,
  getResourceRequestById,
  updateResourceRequestStatus,
  deleteResourceRequest,
  checkStockAvailability
} = require('../controllers/resourceRequestController');
const {
  authenticateToken,
  inventoryOfficerOnly,
  adminOnly
} = require('../config/auth');

// Get resource requests (staff see all, NGO partners see their own)
router.get('/', authenticateToken, listResourceRequests);

// Check stock availability (Inventory Officer and Admin only)
router.post('/check-stock', authenticateToken, inventoryOfficerOnly, checkStockAvailability);

// Create resource request (Inventory Officer and Admin only)
router.post('/', authenticateToken, inventoryOfficerOnly, createResourceRequest);

// Get resource request by ID (Inventory Officer, Admin, and linked NGO only)
router.get('/:id', authenticateToken, getResourceRequestById);

// Remove own resource request (NGO partner only)
router.delete('/:id', authenticateToken, deleteResourceRequest);

// Update resource request status (Inventory Officer and Admin only)
router.patch('/:id/status', authenticateToken, inventoryOfficerOnly, updateResourceRequestStatus);

module.exports = router;
