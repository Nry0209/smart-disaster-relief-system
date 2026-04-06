const {
  InventoryItem,
  StockLevel,
  StockTransaction,
} = require('../models');
const { toDateString, normalizeCategory } = require('./serviceUtils');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
  seedInventory,
};
