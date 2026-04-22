const express = require('express');
const router = express.Router();
const {
  createAllocation,
  confirmAllocation,
  listAllocations,
  getAllocationById,
  updateAllocation,
  cancelAllocation,
  getAllocationStatistics
} = require('../controllers/allocationController');
const {
  authenticateToken,
  allocationOfficerOnly,
  inventoryOfficerOnly,
  adminOnly
} = require('../config/auth');

// Get all allocations (authenticated users)
router.get('/', authenticateToken, listAllocations);

// Get allocation statistics (authenticated users)
router.get('/statistics', authenticateToken, getAllocationStatistics);

// Create allocation plan (Allocation Officer and Admin only)
router.post('/', authenticateToken, allocationOfficerOnly, createAllocation);

// Get allocation by ID (authenticated users)
router.get('/:id', authenticateToken, getAllocationById);

// Update allocation (draft only, Allocation Officer and Admin only)
router.put('/:id', authenticateToken, allocationOfficerOnly, updateAllocation);

// Confirm allocation and update inventory (Allocation Officer and Admin only)
router.post('/:id/confirm', authenticateToken, allocationOfficerOnly, confirmAllocation);

// Cancel allocation (draft only, Allocation Officer and Admin only)
router.delete('/:id', authenticateToken, allocationOfficerOnly, cancelAllocation);

module.exports = router;
