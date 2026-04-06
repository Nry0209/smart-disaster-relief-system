const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");

const DEFAULT_INVENTORY_ITEMS = [
  { name: "Bottled Water", category: "Water", stock: 4500, min: 6000 },
  { name: "Dry Ration", category: "Food", stock: 3900, min: 3500 },
  { name: "Blankets", category: "Shelter", stock: 2600, min: 2000 },
  { name: "Tents", category: "Shelter", stock: 240, min: 400 },
  { name: "Medicine Kits", category: "Medical", stock: 310, min: 500 },
];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function formatInventoryItem(item) {
  return {
    id: item._id.toString(),
    name: item.name,
    category: item.category,
    stock: item.stock,
    min: item.min,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureDefaultInventory() {
  const itemCount = await InventoryItem.countDocuments();
  if (itemCount === 0) {
    await InventoryItem.insertMany(DEFAULT_INVENTORY_ITEMS);
  }
}

async function listInventoryItems(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    await ensureDefaultInventory();

    const { search, category } = req.query;
    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const items = await InventoryItem.find(filter).sort({ name: 1 });
    return res.json(items.map(formatInventoryItem));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch inventory items.", error: error.message });
  }
}

async function createInventoryItem(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const stock = Number(req.body.stock);
    const min = Number(req.body.min);

    if (!name || !category) {
      return res.status(400).json({ message: "name and category are required." });
    }

    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(min) || min < 0) {
      return res.status(400).json({ message: "stock and min must be numbers greater than or equal to 0." });
    }

    const existing = await InventoryItem.findOne({
      name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    });

    if (existing) {
      return res.status(409).json({ message: "An inventory item with this name already exists." });
    }

    const item = await InventoryItem.create({
      name,
      category,
      stock: Math.round(stock),
      min: Math.round(min),
    });

    return res.status(201).json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create inventory item.", error: error.message });
  }
}

async function updateInventoryItem(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ message: "name cannot be empty." });
      }
      updates.name = nextName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "category")) {
      const nextCategory = String(req.body.category || "").trim();
      if (!nextCategory) {
        return res.status(400).json({ message: "category cannot be empty." });
      }
      updates.category = nextCategory;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "stock")) {
      const nextStock = Number(req.body.stock);
      if (!Number.isFinite(nextStock) || nextStock < 0) {
        return res.status(400).json({ message: "stock must be greater than or equal to 0." });
      }
      updates.stock = Math.round(nextStock);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "min")) {
      const nextMin = Number(req.body.min);
      if (!Number.isFinite(nextMin) || nextMin < 0) {
        return res.status(400).json({ message: "min must be greater than or equal to 0." });
      }
      updates.min = Math.round(nextMin);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    if (updates.name) {
      const existing = await InventoryItem.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegExp(updates.name)}$`, $options: "i" },
      });
      if (existing) {
        return res.status(409).json({ message: "An inventory item with this name already exists." });
      }
    }

    const item = await InventoryItem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    return res.json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update inventory item.", error: error.message });
  }
}

async function adjustInventoryItem(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const delta = Number(req.body.delta);
    const reason = String(req.body.reason || "manual").trim();

    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ message: "delta must be a non-zero number." });
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    const nextStock = item.stock + Math.round(delta);
    if (nextStock < 0) {
      return res.status(400).json({ message: "Insufficient stock for this adjustment." });
    }

    item.stock = nextStock;
    await item.save();

    return res.json({
      item: formatInventoryItem(item),
      delta: Math.round(delta),
      reason,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to adjust inventory item.", error: error.message });
  }
}

async function deleteInventoryItem(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    return res.json({ message: "Inventory item deleted successfully.", id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete inventory item.", error: error.message });
  }
}

module.exports = {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryItem,
  deleteInventoryItem,
};