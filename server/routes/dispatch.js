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

// Dispatch tracking aliases for the operational workflow.
router.get('/', authenticateToken, getAllTrackingRecords);
router.get('/allocation/:allocationId', authenticateToken, getTrackingByAllocation);
router.get('/disaster/:disasterId', authenticateToken, getTrackingByDisaster);
router.get('/:id', authenticateToken, getTrackingRecordById);
router.post('/', authenticateToken, trackingOfficerOnly, createTrackingRecord);
router.put('/:id', authenticateToken, trackingOfficerOnly, updateTrackingRecord);
router.patch('/:id/status', authenticateToken, dmcOfficerOnly, updateTrackingStatus);
router.delete('/:id', authenticateToken, adminOnly, deleteTrackingRecord);

module.exports = router;
