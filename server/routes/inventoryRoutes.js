const express = require("express");
const {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryItem,
  deleteInventoryItem,
} = require("../controllers/inventoryController");

const router = express.Router();

router.get("/", listInventoryItems);
router.post("/", createInventoryItem);
router.put("/:id", updateInventoryItem);
router.post("/:id/adjust", adjustInventoryItem);
router.delete("/:id", deleteInventoryItem);

module.exports = router;