const express = require("express");
const { authenticateToken, inventoryOfficerOnly } = require("../config/auth");
const {
  createInventoryItem,
  listInventoryItems,
  listInventoryActivities,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
  reduceInventoryStock,
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/", authenticateToken, listInventoryItems);
router.post("/", authenticateToken, inventoryOfficerOnly, createInventoryItem);
router.get("/activity", authenticateToken, listInventoryActivities);
router.get("/:id", authenticateToken, getInventoryItemById);
router.put("/:id", authenticateToken, inventoryOfficerOnly, updateInventoryItem);
router.delete("/:id", authenticateToken, inventoryOfficerOnly, deleteInventoryItem);
router.post("/:id/adjust", authenticateToken, inventoryOfficerOnly, adjustInventoryStock);
router.post("/reduce", authenticateToken, inventoryOfficerOnly, reduceInventoryStock);

module.exports = router;
