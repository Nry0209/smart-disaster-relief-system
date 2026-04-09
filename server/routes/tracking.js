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
  updateTrackingStatus
} = require('../controllers/trackingController');
const {
  authenticateToken,
  trackingOfficerOnly,
  adminOnly,
  dmcOfficerOnly
} = require('../config/auth');

// Get all tracking records (with filtering and pagination)
router.get('/', authenticateToken, getAllTrackingRecords);

// Get tracking record by ID
router.get('/:id', authenticateToken, getTrackingRecordById);

// Create tracking record (Tracking Officer and Admin only)
router.post('/', authenticateToken, trackingOfficerOnly, createTrackingRecord);

// Update tracking record (Tracking Officer and Admin only)
router.put('/:id', authenticateToken, trackingOfficerOnly, updateTrackingRecord);

// Delete tracking record (Admin only)
router.delete('/:id', authenticateToken, adminOnly, deleteTrackingRecord);

// Get tracking records by allocation ID
router.get('/allocation/:allocationId', authenticateToken, getTrackingByAllocation);

// Get tracking records by disaster ID
router.get('/disaster/:disasterId', authenticateToken, getTrackingByDisaster);

// Update tracking status (DMC Officer can confirm delivery)
router.patch('/:id/status', authenticateToken, dmcOfficerOnly, updateTrackingStatus);

module.exports = router;
