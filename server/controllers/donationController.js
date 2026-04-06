const {
  getAllDonations: getAllDonationsService,
  getPendingDonations: getPendingDonationsService,
  getDonationById: getDonationByIdService,
  createDonation: createDonationService,
  verifyDonation: verifyDonationService,
  rejectDonation: rejectDonationService,
  getDonationSummary: getDonationSummaryService,
} = require('../services/apiHelpers');

exports.getDonationSummary = async (req, res) => {
  try {
    const summary = await getDonationSummaryService();
    res.json({ success: true, data: summary, message: 'Donation summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingDonations = async (req, res) => {
  try {
    const donations = await getPendingDonationsService();
    res.json({ success: true, data: donations, message: 'Pending donations retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDonationById = async (req, res) => {
  try {
    const donation = await getDonationByIdService(req.params.donationId);
    res.json({ success: true, data: donation, message: 'Donation retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.getAllDonations = async (req, res) => {
  try {
    const donations = await getAllDonationsService({ status: req.query.status });
    res.json({ success: true, data: donations, message: 'All donations retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDonation = async (req, res) => {
  try {
    const donation = await createDonationService(req.body);
    res.status(201).json({ success: true, data: donation, message: 'Donation created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.verifyDonation = async (req, res) => {
  try {
    const donation = await verifyDonationService(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation verified successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.rejectDonation = async (req, res) => {
  try {
    const donation = await rejectDonationService(req.params.donationId, req.body.verifiedBy, req.body.notes);
    res.json({ success: true, data: donation, message: 'Donation rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
