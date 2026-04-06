const express = require('express');
const {
  getInventory,
  getInventoryByCategory,
  getInventorySummary,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStockLevel,
  adjustStock,
  transferStock,
  getInventoryTransactions,
  exportInventoryCsv,
} = require('../controllers/inventoryController');

const router = express.Router();

router.get('/summary', getInventorySummary);
router.get('/transactions', getInventoryTransactions);
router.get('/category/:category', getInventoryByCategory);
router.get('/export', exportInventoryCsv);
router.get('/', getInventory);
router.get('/:itemId', getInventoryItemById);
router.post('/', createInventoryItem);
router.patch('/:itemId', updateInventoryItem);
router.delete('/:itemId', deleteInventoryItem);
router.put('/stock/:itemId', updateStockLevel);
router.post('/:itemId/adjust', adjustStock);
router.post('/:itemId/transfer', transferStock);

module.exports = router;
