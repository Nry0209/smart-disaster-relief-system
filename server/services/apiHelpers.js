const mongoose = require('mongoose');
const {
  InventoryItem,
  StockLevel,
  StockTransaction,
  Donation,
  ResourceRequest,
} = require('../models');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDateString = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const normalizeCategory = (category) => {
  if (!category) {
    return '';
  }

  const value = String(category).trim().toLowerCase();
  const categories = {
    water: 'Water',
    food: 'Food',
    medical: 'Medical',
    shelter: 'Shelter',
  };

  return categories[value] || String(category).trim();
};

const normalizeStockStatus = (stock, min) => {
  const safeStock = Number(stock) || 0;
  const safeMin = Number(min) || 0;

  if (safeMin <= 0) {
    return { label: safeStock > 0 ? 'Good' : 'Critical', color: safeStock > 0 ? '#16a34a' : '#dc2626', bg: safeStock > 0 ? '#dcfce7' : '#fee2e2' };
  }

  const ratio = safeStock / safeMin;
  if (ratio >= 1) {
    return { label: 'Good', color: '#16a34a', bg: '#dcfce7' };
  }
  if (ratio >= 0.7) {
    return { label: 'Warning', color: '#d97706', bg: '#fef3c7' };
  }
  if (ratio >= 0.4) {
    return { label: 'Low', color: '#ea580c', bg: '#ffedd5' };
  }

  return { label: 'Critical', color: '#dc2626', bg: '#fee2e2' };
};

const normalizeDonationStatus = (status) => {
  const value = String(status || 'Pending').trim().toLowerCase();

  if (value === 'pending') return 'Pending';
  if (value === 'verified') return 'Verified';
  if (value === 'rejected') return 'Rejected';
  if (value === 'completed') return 'Completed';

  return 'Pending';
};

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

const normalizeDonationType = (value) => {
  const donationType = String(value || 'In-Kind').trim().toLowerCase();

  if (donationType === 'monetary') return 'Monetary';
  if (donationType === 'in-kind' || donationType === 'inkind') return 'In-Kind';

  return 'In-Kind';
};

const normalizeRequestType = (value) => {
  const requestType = String(value || 'NGO_Request').trim().toLowerCase();

  if (requestType === 'emergency') return 'Emergency';
  if (requestType === 'regular') return 'Regular';
  if (requestType === 'ngo_request' || requestType === 'ngo request') return 'NGO_Request';

  return 'NGO_Request';
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

const formatStockLevel = (stockLevel) => ({
  id: stockLevel._id,
  warehouseLocation: stockLevel.warehouseLocation,
  currentStock: stockLevel.currentStock,
  minStock: stockLevel.minStock,
  status: normalizeStockStatus(stockLevel.currentStock, stockLevel.minStock).label,
  statusColor: normalizeStockStatus(stockLevel.currentStock, stockLevel.minStock).color,
  lastUpdated: stockLevel.lastUpdated,
});

const formatInventoryItem = async (item) => {
  const stockLevels = await StockLevel.find({ itemId: item._id }).sort({ warehouseLocation: 1 });
  const primaryStockLevel = stockLevels[0] || null;
  const totalStock = stockLevels.reduce((sum, stockLevel) => sum + (Number(stockLevel.currentStock) || 0), 0);
  const minStock = Number(item.minStockLevel || primaryStockLevel?.minStock || 0);
  const status = normalizeStockStatus(totalStock, minStock);

  return {
    id: item._id,
    name: item.name,
    category: item.category,
    stock: totalStock,
    min: minStock,
    expiryDate: toDateString(item.expiryDate),
    warehouseLocation: primaryStockLevel?.warehouseLocation || '',
    status: status.label,
    statusColor: status.color,
    stockLevels: stockLevels.map(formatStockLevel),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const getInventoryWithStatus = async () => {
  const inventory = await InventoryItem.find().sort({ category: 1, name: 1 });
  const result = [];

  for (const item of inventory) {
    result.push(await formatInventoryItem(item));
  }

  return result;
};

const getInventoryByCategory = async (category) => {
  const inventory = await getInventoryWithStatus();
  const normalizedCategory = String(category || 'All').trim();
  const isAll = normalizedCategory.toLowerCase() === 'all';

  return inventory.filter((item) => isAll || item.category.toLowerCase() === normalizedCategory.toLowerCase());
};

const getInventorySummary = async () => {
  const inventory = await getInventoryWithStatus();
  const warehouseSet = new Set();

  inventory.forEach((item) => {
    item.stockLevels.forEach((stockLevel) => warehouseSet.add(stockLevel.warehouseLocation));
  });

  const recentWindow = new Date(Date.now() - (7 * DAY_IN_MS));
  const recentUpdates = await StockTransaction.countDocuments({ createdAt: { $gte: recentWindow } });

  return {
    totalItems: inventory.length,
    lowStockItems: inventory.filter((item) => item.status !== 'Good').length,
    warehouses: warehouseSet.size,
    recentUpdates,
  };
};

const getInventoryItemById = async (itemId) => {
  const item = await InventoryItem.findById(itemId);

  if (!item) {
    throw new Error('Inventory item not found');
  }

  return formatInventoryItem(item);
};

const createInventoryItem = async (payload) => {
  const name = String(payload.name || '').trim();
  const category = normalizeCategory(payload.category || 'Water');
  const stock = Number(payload.stock || 0);
  const min = Number(payload.min || payload.minStockLevel || 0);
  const expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : undefined;
  const warehouseLocation = String(payload.warehouseLocation || 'Warehouse 1').trim();

  if (!name) {
    throw new Error('Item name is required');
  }

  if (Number.isNaN(stock) || stock < 0) {
    throw new Error('Stock quantity must be zero or greater');
  }

  if (Number.isNaN(min) || min < 0) {
    throw new Error('Minimum stock must be zero or greater');
  }

  if (expiryDate && Number.isNaN(expiryDate.getTime())) {
    throw new Error('Expiry date is invalid');
  }

  const item = await InventoryItem.create({
    name,
    category,
    minStockLevel: min,
    expiryDate,
    expiryTracking: Boolean(expiryDate),
  });

  await StockLevel.create({
    itemId: item._id,
    warehouseLocation,
    currentStock: stock,
    minStock: min,
  });

  return getInventoryItemById(item._id);
};

const updateInventoryItem = async (itemId, payload) => {
  const updates = {};

  if (payload.name !== undefined) {
    updates.name = String(payload.name).trim();
  }

  if (payload.category !== undefined) {
    updates.category = normalizeCategory(payload.category);
  }

  if (payload.expiryDate !== undefined) {
    updates.expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : undefined;
    updates.expiryTracking = Boolean(payload.expiryDate);
  }

  if (payload.min !== undefined || payload.minStockLevel !== undefined) {
    updates.minStockLevel = Number(payload.min ?? payload.minStockLevel);
  }

  const item = await InventoryItem.findByIdAndUpdate(itemId, updates, { new: true });

  if (!item) {
    throw new Error('Inventory item not found');
  }

  if (updates.minStockLevel !== undefined && !Number.isNaN(updates.minStockLevel)) {
    await StockLevel.updateMany(
      { itemId: item._id },
      { $set: { minStock: updates.minStockLevel } }
    );
  }

  return getInventoryItemById(item._id);
};

const deleteInventoryItem = async (itemId) => {
  const item = await InventoryItem.findByIdAndDelete(itemId);

  if (!item) {
    throw new Error('Inventory item not found');
  }

  await Promise.all([
    StockLevel.deleteMany({ itemId: item._id }),
    StockTransaction.deleteMany({ itemId: item._id }),
  ]);

  return { id: item._id, name: item.name };
};

const adjustStockLevel = async (itemId, payload) => {
  const warehouseLocation = String(payload.warehouseLocation || '').trim();
  const transactionType = String(payload.transactionType || 'OUT').trim().toUpperCase();
  const quantity = Number(payload.quantity || 0);
  const newStock = payload.newStock !== undefined ? Number(payload.newStock) : undefined;
  const reason = String(payload.reason || '').trim();

  if (!warehouseLocation) {
    throw new Error('Warehouse location is required');
  }

  if (Number.isNaN(quantity) || quantity < 0) {
    throw new Error('Quantity must be zero or greater');
  }

  const stockLevel = await StockLevel.findOne({ itemId, warehouseLocation });

  if (!stockLevel) {
    throw new Error('Stock level not found for this item and warehouse');
  }

  const currentStock = Number(stockLevel.currentStock) || 0;
  let updatedStock = currentStock;

  if (transactionType === 'IN') {
    updatedStock = currentStock + quantity;
  } else if (transactionType === 'OUT') {
    updatedStock = currentStock - quantity;
  } else if (transactionType === 'ADJUSTMENT') {
    updatedStock = Number.isFinite(newStock) ? newStock : currentStock + quantity;
  } else {
    throw new Error('Invalid transaction type');
  }

  if (updatedStock < 0) {
    throw new Error('Insufficient stock for this transaction');
  }

  stockLevel.currentStock = updatedStock;
  stockLevel.lastUpdated = new Date();

  await stockLevel.save();

  await StockTransaction.create({
    itemId,
    transactionType,
    quantity: Math.abs(updatedStock - currentStock) || quantity || 0,
    warehouseLocation,
    reason,
  });

  return getInventoryItemById(itemId);
};

const transferStockBetweenWarehouses = async (itemId, payload) => {
  const fromWarehouseLocation = String(payload.fromWarehouseLocation || '').trim();
  const toWarehouseLocation = String(payload.toWarehouseLocation || '').trim();
  const quantity = Number(payload.quantity || 0);
  const reason = String(payload.reason || 'Warehouse transfer').trim();

  if (!fromWarehouseLocation || !toWarehouseLocation) {
    throw new Error('Both source and destination warehouses are required');
  }

  if (fromWarehouseLocation === toWarehouseLocation) {
    throw new Error('Source and destination warehouses must be different');
  }

  if (Number.isNaN(quantity) || quantity <= 0) {
    throw new Error('Transfer quantity must be greater than zero');
  }

  const source = await StockLevel.findOne({ itemId, warehouseLocation: fromWarehouseLocation });

  if (!source) {
    throw new Error('Source stock level not found');
  }

  if (source.currentStock < quantity) {
    throw new Error('Insufficient stock in the source warehouse');
  }

  let destination = await StockLevel.findOne({ itemId, warehouseLocation: toWarehouseLocation });

  if (!destination) {
    destination = await StockLevel.create({
      itemId,
      warehouseLocation: toWarehouseLocation,
      currentStock: 0,
      minStock: source.minStock,
    });
  }

  source.currentStock -= quantity;
  source.lastUpdated = new Date();
  destination.currentStock += quantity;
  destination.lastUpdated = new Date();

  await source.save();
  await destination.save();

  await StockTransaction.create([
    {
      itemId,
      transactionType: 'OUT',
      quantity,
      warehouseLocation: fromWarehouseLocation,
      reason,
    },
    {
      itemId,
      transactionType: 'IN',
      quantity,
      warehouseLocation: toWarehouseLocation,
      reason,
    },
  ]);

  return getInventoryItemById(itemId);
};

const getInventoryTransactions = async (limit = 50) => {
  const transactions = await StockTransaction.find()
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 50)
    .populate('itemId', 'name category');

  return transactions.map((transaction) => ({
    id: transaction._id,
    itemId: transaction.itemId?._id || transaction.itemId,
    itemName: transaction.itemId?.name || '',
    category: transaction.itemId?.category || '',
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    warehouseLocation: transaction.warehouseLocation,
    reason: transaction.reason,
    createdAt: transaction.createdAt,
  }));
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

const seedInventory = async () => {
  await InventoryItem.deleteMany({});
  await StockLevel.deleteMany({});
  await StockTransaction.deleteMany({});

  const items = await InventoryItem.create([
    { name: 'Bottled Water', category: 'Water', minStockLevel: 6000, expiryDate: new Date('2024-12-31'), expiryTracking: true },
    { name: 'Dry Ration', category: 'Food', minStockLevel: 3500, expiryDate: new Date('2024-08-15'), expiryTracking: true },
    { name: 'Blankets', category: 'Shelter', minStockLevel: 2000, expiryDate: new Date('2025-06-30'), expiryTracking: false },
    { name: 'Tents', category: 'Shelter', minStockLevel: 400, expiryDate: new Date('2024-10-20'), expiryTracking: false },
    { name: 'Medicine Kits', category: 'Medical', minStockLevel: 500, expiryDate: new Date('2024-07-31'), expiryTracking: true },
  ]);

  await StockLevel.create([
    { itemId: items[0]._id, warehouseLocation: 'Warehouse 1', currentStock: 4500, minStock: 6000 },
    { itemId: items[1]._id, warehouseLocation: 'Warehouse 2', currentStock: 3900, minStock: 3500 },
    { itemId: items[2]._id, warehouseLocation: 'Warehouse 3', currentStock: 2600, minStock: 2000 },
    { itemId: items[3]._id, warehouseLocation: 'Warehouse 1', currentStock: 240, minStock: 400 },
    { itemId: items[4]._id, warehouseLocation: 'Warehouse 4', currentStock: 310, minStock: 500 },
  ]);

  return getInventoryWithStatus();
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

const seedAllSampleData = async () => {
  const inventory = await seedInventory();
  const donations = await seedDonations();
  const resourceRequests = await seedResourceRequests();

  return { inventory, donations, resourceRequests };
};

module.exports = {
  getInventoryWithStatus,
  getInventoryByCategory,
  getInventorySummary,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStockLevel,
  transferStockBetweenWarehouses,
  getInventoryTransactions,
  getAllDonations,
  getPendingDonations,
  getDonationById,
  createDonation,
  verifyDonation,
  rejectDonation,
  getDonationSummary,
  getAllResourceRequests,
  getResourceRequestById,
  createResourceRequest,
  approveResourceRequest,
  rejectResourceRequest,
  getResourceRequestSummary,
  seedInventory,
  seedDonations,
  seedResourceRequests,
  seedAllSampleData,
};