const express = require('express');
const router = express.Router();
const {
  createDonation,
  listDonations,
  getDonationById,
  verifyDonation,
  updateDonation,
  deleteDonation,
  getDonationStatistics
} = require('../controllers/donationController');
const { createNGODonation } = require('../controllers/donationController');
const {
  authenticateToken,
  inventoryOfficerOnly,
  adminOnly
} = require('../config/auth');
const { validateDonation } = require('../middleware/validation');

// Get all donations (Inventory Officer and Admin only)
router.get('/', authenticateToken, inventoryOfficerOnly, listDonations);

// Get donation statistics (Inventory Officer and Admin only)
router.get('/statistics', authenticateToken, inventoryOfficerOnly, getDonationStatistics);

// Create donation (NGO authenticated only)
router.post('/', authenticateToken, validateDonation, createDonation);
// Create NGO donation (Authenticated NGO partners only)
router.post('/ngo', authenticateToken, validateDonation, createNGODonation);


// Get donation by ID (Inventory Officer and Admin only)
router.get('/:id', authenticateToken, inventoryOfficerOnly, getDonationById);

// Update donation (only if pending verification)
router.put('/:id', authenticateToken, inventoryOfficerOnly, updateDonation);

// Verify donation (Inventory Officer and Admin only)
router.patch('/:id/verify', authenticateToken, inventoryOfficerOnly, verifyDonation);

// Delete donation (Admin only)
router.delete('/:id', authenticateToken, adminOnly, deleteDonation);

module.exports = router;
