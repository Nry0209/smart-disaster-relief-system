const express = require("express");
const {
  createInventoryItem,
  listInventoryItems,
  listInventoryActivities,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/", listInventoryItems);
router.post("/", createInventoryItem);
router.get("/activity", listInventoryActivities);
router.get("/:id", getInventoryItemById);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);
router.post("/:id/adjust", adjustInventoryStock);

module.exports = router;
