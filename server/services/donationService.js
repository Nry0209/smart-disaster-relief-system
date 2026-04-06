const mongoose = require('mongoose');
const { Donation } = require('../models');
const { toDateString, normalizeCategory } = require('./serviceUtils');

const normalizeDonationStatus = (status) => {
  const value = String(status || 'Pending').trim().toLowerCase();

  if (value === 'pending') return 'Pending';
  if (value === 'verified') return 'Verified';
  if (value === 'rejected') return 'Rejected';
  if (value === 'completed') return 'Completed';

  return 'Pending';
};

const normalizeDonationType = (value) => {
  const donationType = String(value || 'In-Kind').trim().toLowerCase();

  if (donationType === 'monetary') return 'Monetary';
  if (donationType === 'in-kind' || donationType === 'inkind') return 'In-Kind';

  return 'In-Kind';
};

const normalizeItemList = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    if (typeof item === 'string') {
      const matches = item.match(/^(.*?)(?:\s*\((\d+)\))?$/);
      return {
        itemName: matches?.[1]?.trim() || item.trim(),
        category: '',
        quantity: Number(matches?.[2] || 1),
        unit: '',
        condition: 'Good',
        estimatedValue: 0,
      };
    }

    return {
      itemName: item.itemName || item.name || item.item || 'Item',
      category: item.category ? normalizeCategory(item.category) : '',
      quantity: Number(item.quantity || item.quantityRequested || 1),
      unit: item.unit || '',
      condition: item.condition || 'Good',
      estimatedValue: Number(item.estimatedValue || item.value || 0),
    };
  });
};

const formatDonation = (donation) => ({
  id: donation._id,
  donorName: donation.donorName,
  donorType: donation.donorType || '',
  items: (donation.items || []).map((item) => `${item.itemName} (${item.quantity})`),
  date: toDateString(donation.donationDate || donation.createdAt),
  status: String(donation.status || 'Pending').toLowerCase(),
  value: donation.amount !== undefined && donation.amount !== null ? `$${Number(donation.amount).toLocaleString()}` : 'N/A',
  contact: donation.donorPhone || '',
  email: donation.donorEmail || '',
  notes: donation.notes || donation.description || '',
  donationType: donation.donationType,
  raw: donation,
});

const getAllDonations = async ({ status } = {}) => {
  const query = {};

  if (status) {
    query.status = normalizeDonationStatus(status);
  }

  const donations = await Donation.find(query).sort({ createdAt: -1 });
  return donations.map(formatDonation);
};

const getPendingDonations = async () => getAllDonations({ status: 'pending' });

const getDonationById = async (donationId) => {
  const donation = await Donation.findById(donationId);

  if (!donation) {
    throw new Error('Donation not found');
  }

  return formatDonation(donation);
};

const createDonation = async (payload) => {
  const amount = payload.amount !== undefined && payload.amount !== null
    ? Number(payload.amount)
    : payload.value
      ? Number(String(payload.value).replace(/[^0-9.-]/g, ''))
      : undefined;

  const donation = await Donation.create({
    donorName: String(payload.donorName || payload.contactName || 'Unknown donor').trim(),
    donorType: String(payload.donorType || payload.donorCategory || 'Other').trim(),
    donorEmail: payload.donorEmail || payload.email || undefined,
    donorPhone: payload.donorPhone || payload.contact || undefined,
    donationType: normalizeDonationType(payload.donationType || payload.type || (amount ? 'Monetary' : 'In-Kind')),
    amount,
    status: normalizeDonationStatus(payload.status),
    description: payload.description || payload.notes || '',
    notes: payload.notes || '',
    donationDate: payload.donationDate || payload.date || new Date(),
    items: normalizeItemList(payload.items),
  });

  return formatDonation(donation);
};

const verifyDonation = async (donationId, verifiedBy, notes = '') => {
  const donation = await Donation.findByIdAndUpdate(
    donationId,
    {
      status: 'Verified',
      verifiedBy: verifiedBy || undefined,
      verificationDate: new Date(),
      notes: notes || undefined,
    },
    { new: true }
  );

  if (!donation) {
    throw new Error('Donation not found');
  }

  return formatDonation(donation);
};

const rejectDonation = async (donationId, verifiedBy, notes = '') => {
  const donation = await Donation.findByIdAndUpdate(
    donationId,
    {
      status: 'Rejected',
      verifiedBy: verifiedBy || undefined,
      verificationDate: new Date(),
      notes: notes || undefined,
    },
    { new: true }
  );

  if (!donation) {
    throw new Error('Donation not found');
  }

  return formatDonation(donation);
};

const getDonationSummary = async () => {
  const [total, pending, verified, rejected] = await Promise.all([
    Donation.countDocuments(),
    Donation.countDocuments({ status: 'Pending' }),
    Donation.countDocuments({ status: 'Verified' }),
    Donation.countDocuments({ status: 'Rejected' }),
  ]);

  return { total, pending, verified, rejected };
};

const seedDonations = async () => {
  await Donation.deleteMany({});

  await Donation.create([
    {
      donorName: 'John Smith',
      donorType: 'Individual',
      donorEmail: 'john.smith@email.com',
      donorPhone: '+1 234-567-8900',
      donationType: 'In-Kind',
      amount: 2500,
      status: 'Pending',
      donationDate: new Date('2026-03-15'),
      notes: 'Emergency relief supplies for flood victims',
      items: [
        { itemName: 'Water Bottles', category: 'Water', quantity: 500, unit: 'bottles', condition: 'Good', estimatedValue: 1500 },
        { itemName: 'Food Packages', category: 'Food', quantity: 100, unit: 'packages', condition: 'Good', estimatedValue: 1000 },
      ],
    },
    {
      donorName: 'ABC Corporation',
      donorType: 'Corporate',
      donorEmail: 'donations@abccorp.com',
      donorPhone: '+1 234-567-8901',
      donationType: 'In-Kind',
      amount: 15000,
      status: 'Verified',
      donationDate: new Date('2026-03-14'),
      verifiedBy: new mongoose.Types.ObjectId(),
      verificationDate: new Date('2026-03-14'),
      notes: 'Corporate social responsibility initiative',
      items: [
        { itemName: 'Medical Supplies', category: 'Medical', quantity: 200, unit: 'kits', condition: 'Good', estimatedValue: 8000 },
        { itemName: 'Blankets', category: 'Shelter', quantity: 300, unit: 'blankets', condition: 'Good', estimatedValue: 7000 },
      ],
    },
    {
      donorName: 'Red Cross Foundation',
      donorType: 'Organization',
      donorEmail: 'info@redcross.org',
      donorPhone: '+1 234-567-8902',
      donationType: 'In-Kind',
      amount: 8000,
      status: 'Rejected',
      donationDate: new Date('2026-03-13'),
      verificationDate: new Date('2026-03-13'),
      notes: 'Items did not meet quality standards',
      items: [
        { itemName: 'Emergency Kits', category: 'Medical', quantity: 150, unit: 'kits', condition: 'Fair', estimatedValue: 5000 },
        { itemName: 'Tents', category: 'Shelter', quantity: 50, unit: 'tents', condition: 'Fair', estimatedValue: 3000 },
      ],
    },
  ]);

  return getAllDonations();
};

module.exports = {
  getAllDonations,
  getPendingDonations,
  getDonationById,
  createDonation,
  verifyDonation,
  rejectDonation,
  getDonationSummary,
  seedDonations,
};
