const express = require('express');
const router = express.Router();
const {
  getAllTrackingRecords,
  getTrackingRecordById,
  createTrackingRecord,
  updateTrackingRecord,
  deleteTrackingRecord,
  getTrackingByAllocation,
  getTrackingByDisaster,
  updateTrackingStatus,
  getTransportAssets
} = require('../controllers/trackingController');
const {
  authenticateToken,
  internalStaffOnly,
  adminOnly,
  dmcOfficerOnly
} = require('../config/auth');

// Get all tracking records (with filtering and pagination)
router.get('/', authenticateToken, internalStaffOnly, getAllTrackingRecords);

// Get tracking records by allocation ID
router.get('/allocation/:allocationId', authenticateToken, internalStaffOnly, getTrackingByAllocation);

// Get tracking records by disaster ID
router.get('/disaster/:disasterId', authenticateToken, internalStaffOnly, getTrackingByDisaster);

// Get transport assets for tracking allocation
router.get('/transport-assets', authenticateToken, internalStaffOnly, getTransportAssets);

// Get tracking record by ID
router.get('/:id', authenticateToken, internalStaffOnly, getTrackingRecordById);

// Create tracking record (Tracking Officer and Admin only)
router.post('/', authenticateToken, internalStaffOnly, createTrackingRecord);

// Update tracking record (Tracking Officer and Admin only)
router.put('/:id', authenticateToken, internalStaffOnly, updateTrackingRecord);

// Update tracking status (DMC Officer can confirm delivery)
router.patch('/:id/status', authenticateToken, dmcOfficerOnly, updateTrackingStatus);

// Delete tracking record (Admin only)
router.delete('/:id', authenticateToken, adminOnly, deleteTrackingRecord);

module.exports = router;
