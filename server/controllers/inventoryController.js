const {
  getInventoryWithStatus: getInventoryWithStatusService,
  getInventoryByCategory: getInventoryByCategoryService,
  getInventorySummary: getInventorySummaryService,
  getInventoryItemById: getInventoryItemByIdService,
  createInventoryItem: createInventoryItemService,
  updateInventoryItem: updateInventoryItemService,
  deleteInventoryItem: deleteInventoryItemService,
  adjustStockLevel: adjustStockLevelService,
  transferStockBetweenWarehouses: transferStockBetweenWarehousesService,
  getInventoryTransactions: getInventoryTransactionsService,
} = require('../services/apiHelpers');

exports.getInventorySummary = async (req, res) => {
  try {
    const summary = await getInventorySummaryService();
    res.json({ success: true, data: summary, message: 'Inventory summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryTransactions = async (req, res) => {
  try {
    const transactions = await getInventoryTransactionsService(req.query.limit);
    res.json({ success: true, data: transactions, message: 'Inventory transactions retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const inventory = await getInventoryByCategoryService(category);
    res.json({ success: true, data: inventory, message: `Inventory for category '${category}' retrieved successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportInventoryCsv = async (req, res) => {
  try {
    const inventory = await getInventoryWithStatusService();
    const csvRows = [
      'Item,Category,Stock,Min,Status,Expiry Date,Warehouse Location',
      ...inventory.map((item) => `${item.name},${item.category},${item.stock},${item.min},${item.status},${item.expiryDate},${item.warehouseLocation}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
    res.send(csvRows);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const inventory = req.query.category
      ? await getInventoryByCategoryService(req.query.category)
      : await getInventoryWithStatusService();

    res.json({ success: true, data: inventory, message: 'Inventory retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventoryItemById = async (req, res) => {
  try {
    const item = await getInventoryItemByIdService(req.params.itemId);
    res.json({ success: true, data: item, message: 'Inventory item retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const item = await createInventoryItemService(req.body);
    res.status(201).json({ success: true, data: item, message: 'Inventory item created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const item = await updateInventoryItemService(req.params.itemId, req.body);
    res.json({ success: true, data: item, message: 'Inventory item updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const result = await deleteInventoryItemService(req.params.itemId);
    res.json({ success: true, data: result, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateStockLevel = async (req, res) => {
  try {
    const result = await adjustStockLevelService(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock level updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const result = await adjustStockLevelService(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock adjusted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.transferStock = async (req, res) => {
  try {
    const result = await transferStockBetweenWarehousesService(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock transferred successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
