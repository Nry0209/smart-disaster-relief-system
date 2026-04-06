const express = require('express');
const {
  getAllResourceRequests,
  getResourceRequestById,
  createResourceRequest,
  approveResourceRequest,
  rejectResourceRequest,
  getResourceRequestSummary,
  getPendingResourceRequests,
} = require('../controllers/resourceRequestController');

const router = express.Router();

router.get('/summary', getResourceRequestSummary);
router.get('/pending', getPendingResourceRequests);
router.get('/:requestId', getResourceRequestById);
router.get('/', getAllResourceRequests);
router.post('/', createResourceRequest);
router.put('/approve/:requestId', approveResourceRequest);
router.patch('/:requestId/approve', approveResourceRequest);
router.put('/reject/:requestId', rejectResourceRequest);
router.patch('/:requestId/reject', rejectResourceRequest);

module.exports = router;
