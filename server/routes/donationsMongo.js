const express = require('express');
const {
  getAllDonations,
  getPendingDonations,
  getDonationById,
  createDonation,
  verifyDonation,
  rejectDonation,
  getDonationSummary,
} = require('../controllers/donationController');

const router = express.Router();

router.get('/summary', getDonationSummary);
router.get('/pending', getPendingDonations);
router.get('/:donationId', getDonationById);
router.get('/', getAllDonations);
router.post('/', createDonation);
router.put('/verify/:donationId', verifyDonation);
router.patch('/:donationId/verify', verifyDonation);
router.put('/reject/:donationId', rejectDonation);
router.patch('/:donationId/reject', rejectDonation);

module.exports = router;
