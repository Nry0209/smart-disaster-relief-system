const { ResourceRequest } = require('../models');
const { toDateString, normalizeCategory } = require('./serviceUtils');

const normalizeResourceStatus = (status) => {
  const value = String(status || 'Pending').trim().toLowerCase();

  if (value === 'pending') return 'Pending';
  if (value === 'approved') return 'Approved';
  if (value === 'partially_fulfilled' || value === 'partially fulfilled') return 'Partially_Fulfilled';
  if (value === 'fulfilled') return 'Fulfilled';
  if (value === 'rejected') return 'Rejected';

  return 'Pending';
};

const normalizePriority = (priority) => {
  const value = String(priority || 'Medium').trim().toLowerCase();

  if (value === 'low') return 'Low';
  if (value === 'medium') return 'Medium';
  if (value === 'high') return 'High';
  if (value === 'critical') return 'Critical';

  return 'Medium';
};

const normalizeRequestType = (value) => {
  const requestType = String(value || 'NGO_Request').trim().toLowerCase();

  if (requestType === 'emergency') return 'Emergency';
  if (requestType === 'regular') return 'Regular';
  if (requestType === 'ngo_request' || requestType === 'ngo request') return 'NGO_Request';

  return 'NGO_Request';
};

const formatResourceRequest = (request) => ({
  id: request._id,
  requestCode: request.requestCode,
  requesterName: request.requesterName,
  requesterEmail: request.requesterEmail || '',
  requesterPhone: request.requesterPhone || '',
  organization: request.organization || '',
  disasterType: request.disasterType || '',
  requestType: request.requestType,
  priority: String(request.priority || 'Medium').toLowerCase(),
  urgency: String(request.urgencyLevel || 'Medium').toLowerCase(),
  status: String(request.status || 'Pending').toLowerCase(),
  location: request.location || '',
  deliveryAddress: request.deliveryAddress || '',
  neededBy: toDateString(request.neededBy),
  description: request.description || '',
  totalItemsRequested: request.totalItemsRequested || 0,
  items: (request.items || []).map((item) => ({
    itemName: item.itemName,
    category: item.category || '',
    quantityRequested: item.quantityRequested,
    quantityApproved: item.quantityApproved,
    quantityFulfilled: item.quantityFulfilled,
    unit: item.unit || '',
    notes: item.notes || '',
  })),
  allocations: request.allocations || [],
  raw: request,
});

const getAllResourceRequests = async ({ status } = {}) => {
  const query = {};

  if (status) {
    query.status = normalizeResourceStatus(status);
  }

  const requests = await ResourceRequest.find(query).sort({ createdAt: -1 });
  return requests.map(formatResourceRequest);
};

const getResourceRequestById = async (requestId) => {
  const request = await ResourceRequest.findById(requestId);

  if (!request) {
    throw new Error('Resource request not found');
  }

  return formatResourceRequest(request);
};

const createResourceRequest = async (payload) => {
  const requestCode = payload.requestCode || `REQ-${Date.now()}`;
  const items = Array.isArray(payload.items)
    ? payload.items.map((item) => ({
        itemName: item.name || item.itemName || 'Item',
        category: item.category ? normalizeCategory(item.category) : '',
        quantityRequested: Number(item.quantity || item.quantityRequested || 0),
        quantityApproved: Number(item.quantityApproved || 0),
        quantityFulfilled: Number(item.quantityFulfilled || 0),
        unit: item.unit || '',
        notes: item.notes || '',
      }))
    : [];

  const request = await ResourceRequest.create({
    requestCode,
    requesterName: String(payload.contactName || payload.requesterName || payload.organization || 'Inventory Officer').trim(),
    requesterEmail: payload.contactEmail || payload.requesterEmail || undefined,
    requesterPhone: payload.contactPhone || payload.requesterPhone || undefined,
    organization: String(payload.selectedNGOName || payload.selectedNGO || payload.organization || '').trim(),
    disasterType: String(payload.disasterType || '').trim(),
    requestType: normalizeRequestType(payload.requestType),
    priority: normalizePriority(payload.priority || payload.urgency),
    urgencyLevel: normalizePriority(payload.urgency || payload.priority),
    location: String(payload.location || '').trim(),
    deliveryAddress: String(payload.deliveryAddress || '').trim(),
    neededBy: payload.deliveryDate || payload.neededBy || undefined,
    description: String(payload.description || payload.notes || '').trim(),
    totalItemsRequested: items.reduce((sum, item) => sum + (Number(item.quantityRequested) || 0), 0),
    items,
    status: 'Pending',
  });

  return formatResourceRequest(request);
};

const approveResourceRequest = async (requestId) => {
  const request = await ResourceRequest.findByIdAndUpdate(
    requestId,
    { status: 'Approved' },
    { new: true }
  );

  if (!request) {
    throw new Error('Resource request not found');
  }

  return formatResourceRequest(request);
};

const rejectResourceRequest = async (requestId) => {
  const request = await ResourceRequest.findByIdAndUpdate(
    requestId,
    { status: 'Rejected' },
    { new: true }
  );

  if (!request) {
    throw new Error('Resource request not found');
  }

  return formatResourceRequest(request);
};

const getResourceRequestSummary = async () => {
  const [total, pending, approved, rejected] = await Promise.all([
    ResourceRequest.countDocuments(),
    ResourceRequest.countDocuments({ status: 'Pending' }),
    ResourceRequest.countDocuments({ status: 'Approved' }),
    ResourceRequest.countDocuments({ status: 'Rejected' }),
  ]);

  return { total, pending, approved, rejected };
};

const seedResourceRequests = async () => {
  await ResourceRequest.deleteMany({});

  await ResourceRequest.create([
    {
      requestCode: 'REQ-20260401-001',
      requesterName: 'Inventory Officer',
      requesterEmail: 'inventory@dmc.gov.in',
      requesterPhone: '+91 90000 11111',
      organization: 'Red Cross Society',
      disasterType: 'Flood',
      requestType: 'NGO_Request',
      priority: 'High',
      urgencyLevel: 'High',
      status: 'Pending',
      location: 'Mumbai, Maharashtra',
      deliveryAddress: 'Central Relief Center, Mumbai',
      neededBy: new Date('2026-04-08'),
      description: 'Requesting support for flood response operations.',
      items: [
        { itemName: 'Water', category: 'Water', quantityRequested: 5000, quantityApproved: 0, quantityFulfilled: 0, unit: 'bottles' },
        { itemName: 'Food', category: 'Food', quantityRequested: 2000, quantityApproved: 0, quantityFulfilled: 0, unit: 'packs' },
      ],
      totalItemsRequested: 7000,
    },
    {
      requestCode: 'REQ-20260401-002',
      requesterName: 'Inventory Officer',
      requesterEmail: 'inventory@dmc.gov.in',
      requesterPhone: '+91 90000 11111',
      organization: 'Doctors Without Borders',
      disasterType: 'Earthquake',
      requestType: 'NGO_Request',
      priority: 'Critical',
      urgencyLevel: 'Critical',
      status: 'Approved',
      location: 'Kutch, Gujarat',
      deliveryAddress: 'Kutch Relief Camp',
      neededBy: new Date('2026-04-06'),
      description: 'Urgent medical support required after earthquake response.',
      items: [
        { itemName: 'Medical Kits', category: 'Medical', quantityRequested: 1000, quantityApproved: 800, quantityFulfilled: 0, unit: 'kits' },
      ],
      totalItemsRequested: 1000,
    },
  ]);

  return getAllResourceRequests();
};

module.exports = {
  getAllResourceRequests,
  getResourceRequestById,
  createResourceRequest,
  approveResourceRequest,
  rejectResourceRequest,
  getResourceRequestSummary,
  seedResourceRequests,
};
