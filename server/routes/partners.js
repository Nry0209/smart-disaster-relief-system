const express = require('express');
const router = express.Router();
const {
  listPartners,
  createPartner,
  getPartnerById,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerController');
const { authenticateToken, adminOnly, internalStaffOnly } = require('../config/auth');

router.get('/', authenticateToken, internalStaffOnly, listPartners);
router.post('/', authenticateToken, adminOnly, createPartner);
router.get('/:id', authenticateToken, internalStaffOnly, getPartnerById);
router.put('/:id', authenticateToken, adminOnly, updatePartner);
router.delete('/:id', authenticateToken, adminOnly, deletePartner);

module.exports = router;
