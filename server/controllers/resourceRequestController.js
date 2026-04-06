const {
  getAllResourceRequests: getAllResourceRequestsService,
  getResourceRequestById: getResourceRequestByIdService,
  createResourceRequest: createResourceRequestService,
  approveResourceRequest: approveResourceRequestService,
  rejectResourceRequest: rejectResourceRequestService,
  getResourceRequestSummary: getResourceRequestSummaryService,
} = require('../services/apiHelpers');

exports.getResourceRequestSummary = async (req, res) => {
  try {
    const summary = await getResourceRequestSummaryService();
    res.json({ success: true, data: summary, message: 'Resource request summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingResourceRequests = async (req, res) => {
  try {
    const requests = await getAllResourceRequestsService({ status: 'pending' });
    res.json({ success: true, data: requests, message: 'Pending resource requests retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getResourceRequestById = async (req, res) => {
  try {
    const request = await getResourceRequestByIdService(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.getAllResourceRequests = async (req, res) => {
  try {
    const requests = await getAllResourceRequestsService({ status: req.query.status });
    res.json({ success: true, data: requests, message: 'Resource requests retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createResourceRequest = async (req, res) => {
  try {
    const request = await createResourceRequestService(req.body);
    res.status(201).json({ success: true, data: request, message: 'Resource request created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.approveResourceRequest = async (req, res) => {
  try {
    const request = await approveResourceRequestService(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.rejectResourceRequest = async (req, res) => {
  try {
    const request = await rejectResourceRequestService(req.params.requestId);
    res.json({ success: true, data: request, message: 'Resource request rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
