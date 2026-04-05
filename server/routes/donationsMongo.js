const express = require('express');
const {
  getAllDonations,
  getPendingDonations,
  getDonationById,
  createDonation,
  verifyDonation,
  rejectDonation,
  getDonationSummary,
} = require('../services/apiHelpers');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const summary = await getDonationSummary();
    res.json({ success: true, data: summary, message: 'Donation summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const donations = await getPendingDonations();
    res.json({ success: true, data: donations, message: 'Pending donations retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:donationId', async (req, res) => {
  try {
    const donation = await getDonationById(req.params.donationId);
    res.json({ success: true, data: donation, message: 'Donation retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const donations = await getAllDonations({ status: req.query.status });
    res.json({ success: true, data: donations, message: 'All donations retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const donation = await createDonation(req.body);
    res.status(201).json({ success: true, data: donation, message: 'Donation created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/verify/:donationId', async (req, res) => {
  try {
    const donation = await verifyDonation(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation verified successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:donationId/verify', async (req, res) => {
  try {
    const donation = await verifyDonation(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation verified successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/reject/:donationId', async (req, res) => {
  try {
    const donation = await rejectDonation(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:donationId/reject', async (req, res) => {
  try {
    const donation = await rejectDonation(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
