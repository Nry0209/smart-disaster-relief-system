const express = require('express');
const {
  getAllResourceRequests,
  getResourceRequestById,
  createResourceRequest,
  approveResourceRequest,
  rejectResourceRequest,
  getResourceRequestSummary,
} = require('../services/apiHelpers');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const summary = await getResourceRequestSummary();
    res.json({ success: true, data: summary, message: 'Resource request summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const requests = await getAllResourceRequests({ status: 'pending' });
    res.json({ success: true, data: requests, message: 'Pending resource requests retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:requestId', async (req, res) => {
  try {
    const request = await getResourceRequestById(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const requests = await getAllResourceRequests({ status: req.query.status });
    res.json({ success: true, data: requests, message: 'Resource requests retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const request = await createResourceRequest(req.body);
    res.status(201).json({ success: true, data: request, message: 'Resource request created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/approve/:requestId', async (req, res) => {
  try {
    const request = await approveResourceRequest(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:requestId/approve', async (req, res) => {
  try {
    const request = await approveResourceRequest(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/reject/:requestId', async (req, res) => {
  try {
    const request = await rejectResourceRequest(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:requestId/reject', async (req, res) => {
  try {
    const request = await rejectResourceRequest(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
