const express = require('express');
const {
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
} = require('../services/apiHelpers');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const summary = await getInventorySummary();
    res.json({ success: true, data: summary, message: 'Inventory summary retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await getInventoryTransactions(req.query.limit);
    res.json({ success: true, data: transactions, message: 'Inventory transactions retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const inventory = await getInventoryByCategory(category);
    res.json({ success: true, data: inventory, message: `Inventory for category '${category}' retrieved successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const inventory = await getInventoryWithStatus();
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
});

router.get('/', async (req, res) => {
  try {
    const inventory = req.query.category
      ? await getInventoryByCategory(req.query.category)
      : await getInventoryWithStatus();

    res.json({ success: true, data: inventory, message: 'Inventory retrieved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:itemId', async (req, res) => {
  try {
    const item = await getInventoryItemById(req.params.itemId);
    res.json({ success: true, data: item, message: 'Inventory item retrieved successfully' });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await createInventoryItem(req.body);
    res.status(201).json({ success: true, data: item, message: 'Inventory item created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:itemId', async (req, res) => {
  try {
    const item = await updateInventoryItem(req.params.itemId, req.body);
    res.json({ success: true, data: item, message: 'Inventory item updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:itemId', async (req, res) => {
  try {
    const result = await deleteInventoryItem(req.params.itemId);
    res.json({ success: true, data: result, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/stock/:itemId', async (req, res) => {
  try {
    const result = await adjustStockLevel(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock level updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:itemId/adjust', async (req, res) => {
  try {
    const result = await adjustStockLevel(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock adjusted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:itemId/transfer', async (req, res) => {
  try {
    const result = await transferStockBetweenWarehouses(req.params.itemId, req.body);
    res.json({ success: true, data: result, message: 'Stock transferred successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
