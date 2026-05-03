const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  listPartners,
  createPartner,
  getPartnerById,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerController');
const { authenticateToken, adminOnly, internalStaffOnly, authorizeRoles } = require('../config/auth');

const partnerUploadRoot = path.join(__dirname, '..', 'uploads', 'partners');
const partnerDocumentFolders = {
  organizationProfileDocument: 'organization-profiles',
  registrationCertificate: 'registration-certificates',
  verificationDocument: 'verification-documents',
};

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const folder = partnerDocumentFolders[file.fieldname] || 'misc';
    const destination = path.join(partnerUploadRoot, folder);
    ensureDirectory(destination);
    callback(null, destination);
  },
  filename(req, file, callback) {
    const safeFieldName = String(file.fieldname || 'document').replace(/[^a-zA-Z0-9_-]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${safeFieldName}-${uniqueSuffix}.pdf`);
  },
});

const partnerDocumentUpload = multer({
  storage,
  fileFilter(req, file, callback) {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(String(file.originalname || '')).toLowerCase() === '.pdf';

    if (!isPdfMime && !isPdfExt) {
      return callback(new Error('Only PDF files are allowed for partner documents.'));
    }

    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const uploadPartnerDocuments = (req, res, next) => {
  partnerDocumentUpload.fields([
    { name: 'organizationProfileDocument', maxCount: 1 },
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'verificationDocument', maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to upload partner documents.',
      });
    }

    return next();
  });
};

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'dmc_officer', 'inventory_officer', 'allocation_officer', 'tracking_officer', 'charity_staff', 'ngo_partner'),
  listPartners
);
router.post('/', authenticateToken, adminOnly, uploadPartnerDocuments, createPartner);
router.get('/:id', authenticateToken, internalStaffOnly, getPartnerById);
router.put('/:id', authenticateToken, adminOnly, uploadPartnerDocuments, updatePartner);
router.delete('/:id', authenticateToken, adminOnly, deletePartner);

module.exports = router;
