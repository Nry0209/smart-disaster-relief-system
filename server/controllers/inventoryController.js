const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const InventoryActivity = require("../models/InventoryActivity");
const { ITEM_CATEGORY_ENUM } = require("../utils/constants");

const DEFAULT_INVENTORY_ITEMS = [
  {
    name: "Bottled Water",
    category: "Water",
    stock: 4500,
    min: 6000,
    warehouse: "Warehouse 1",
    unit: "units",
  },
  {
    name: "Dry Ration",
    category: "Food",
    stock: 3900,
    min: 3500,
    warehouse: "Warehouse 1",
    unit: "units",
  },
  {
    name: "Blankets",
    category: "Shelter",
    stock: 2600,
    min: 2000,
    warehouse: "Warehouse 2",
    unit: "units",
  },
  {
    name: "Tents",
    category: "Shelter",
    stock: 240,
    min: 400,
    warehouse: "Warehouse 3",
    unit: "units",
  },
  {
    name: "Medicine Kits",
    category: "Medical",
    stock: 310,
    min: 500,
    warehouse: "Warehouse 2",
    unit: "units",
  },
];

const ALLOWED_ACTION_TYPES = ["adjust", "consume", "restock"];
const UPDATABLE_FIELDS = ["name", "category", "stock", "min", "warehouse"];

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function normalizeCategory(value) {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return ITEM_CATEGORY_ENUM.includes(normalizedValue) ? normalizedValue : null;
}

function toNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getStockStatus(stock, min) {
  if (min <= 0) {
    return stock > 0 ? "good" : "warning";
  }

  const ratio = stock / min;
  if (ratio >= 1) return "good";
  if (ratio >= 0.7) return "warning";
  if (ratio >= 0.4) return "low";
  return "critical";
}

function formatInventoryItem(item) {
  return {
    id: item._id.toString(),
    name: item.name,
    category: item.category,
    stock: item.stock,
    min: item.min,
    warehouse: item.warehouse,
    unit: item.unit,
    stockStatus: getStockStatus(item.stock, item.min),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function formatInventoryActivity(activity) {
  return {
    id: activity._id.toString(),
    itemId: activity.itemId ? activity.itemId.toString() : null,
    itemName: activity.itemName,
    action: activity.action,
    quantity: activity.quantity,
    previousStock: activity.previousStock,
    newStock: activity.newStock,
    note: activity.note,
    metadata: activity.metadata,
    performedBy: activity.performedBy,
    createdAt: activity.createdAt,
  };
}

async function createActivityLog(data) {
  await InventoryActivity.create(data);
}

async function createInventoryItem(req, res) {
  try {
    const { name, category, stock, min, warehouse, unit, performedBy } = req.body;

    if (!name || category === undefined || stock === undefined || min === undefined) {
      return res.status(400).json({ message: "name, category, stock, and min are required." });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ message: "Invalid category value." });
    }

    const stockValue = toNonNegativeNumber(stock);
    const minValue = toNonNegativeNumber(min);

    if (stockValue === null || minValue === null) {
      return res.status(400).json({ message: "stock and min must be non-negative numbers." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const item = await InventoryItem.create({
      name: String(name).trim(),
      category: normalizedCategory,
      stock: stockValue,
      min: minValue,
      warehouse: String(warehouse || "Warehouse 1").trim() || "Warehouse 1",
    });

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: "create",
      quantity: stockValue,
      previousStock: 0,
      newStock: stockValue,
      note: `Created inventory item in ${item.warehouse}.`,
      performedBy: String(performedBy || "Inventory Officer"),
    });

    return res.status(201).json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create inventory item.", error: error.message });
  }
}

async function listInventoryItems(req, res) {
  try {
    const { category, search, warehouse, status } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const filter = {};

    if (category && String(category).toLowerCase() !== "all") {
      const normalizedCategory = normalizeCategory(category);
      if (!normalizedCategory) {
        return res.status(400).json({ message: "Invalid category filter value." });
      }
      filter.category = normalizedCategory;
    }

    if (warehouse) {
      filter.warehouse = { $regex: String(warehouse).trim(), $options: "i" };
    }

    if (search) {
      const searchQuery = String(search).trim();
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
        { warehouse: { $regex: searchQuery, $options: "i" } },
      ];
    }

    let items = await InventoryItem.find(filter).sort({ updatedAt: -1 });

    const hasFilters = Boolean(category || search || warehouse || status);

    if (!items.length && !hasFilters) {
      const activityCount = await InventoryActivity.estimatedDocumentCount();

      if (activityCount === 0) {
        const seededItems = await InventoryItem.insertMany(DEFAULT_INVENTORY_ITEMS);

        await Promise.all(
          seededItems.map((item) =>
            createActivityLog({
              itemId: item._id,
              itemName: item.name,
              action: "create",
              quantity: item.stock,
              previousStock: 0,
              newStock: item.stock,
              note: "Default inventory item initialized.",
              performedBy: "System",
            })
          )
        );

        items = seededItems;
      }
    }

    let formatted = items.map(formatInventoryItem);

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      formatted = formatted.filter((item) => item.stockStatus === normalizedStatus);
    }

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch inventory items.", error: error.message });
  }
}

async function listInventoryActivities(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const activities = await InventoryActivity.find({})
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    return res.json(activities.map(formatInventoryActivity));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch inventory activity.", error: error.message });
  }
}

async function getInventoryItemById(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    return res.json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch inventory item.", error: error.message });
  }
}

async function updateInventoryItem(req, res) {
  try {
    const { id } = req.params;
    const { note, performedBy } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    const updates = {};

    UPDATABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid fields provided for update." });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      const normalizedName = String(updates.name || "").trim();
      if (!normalizedName) {
        return res.status(400).json({ message: "name cannot be empty." });
      }
      updates.name = normalizedName;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "category")) {
      const normalizedCategory = normalizeCategory(updates.category);
      if (!normalizedCategory) {
        return res.status(400).json({ message: "Invalid category value." });
      }
      updates.category = normalizedCategory;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "stock")) {
      const normalizedStock = toNonNegativeNumber(updates.stock);
      if (normalizedStock === null) {
        return res.status(400).json({ message: "stock must be a non-negative number." });
      }
      updates.stock = normalizedStock;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "min")) {
      const normalizedMin = toNonNegativeNumber(updates.min);
      if (normalizedMin === null) {
        return res.status(400).json({ message: "min must be a non-negative number." });
      }
      updates.min = normalizedMin;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "warehouse")) {
      const normalizedWarehouse = String(updates.warehouse || "").trim();
      if (!normalizedWarehouse) {
        return res.status(400).json({ message: "warehouse cannot be empty." });
      }
      updates.warehouse = normalizedWarehouse;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "unit")) {
      updates.unit = String(updates.unit || "units").trim() || "units";
    }

    const previousStock = item.stock;
    Object.assign(item, updates);
    await item.save();

    const changedFields = Object.keys(updates);

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: "update",
      quantity: item.stock - previousStock,
      previousStock,
      newStock: item.stock,
      note: String(note || `Updated fields: ${changedFields.join(", ")}`).trim(),
      metadata: { changedFields },
      performedBy: String(performedBy || "Inventory Officer"),
    });

    return res.json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update inventory item.", error: error.message });
  }
}

async function deleteInventoryItem(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const item = await InventoryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: "delete",
      quantity: -item.stock,
      previousStock: item.stock,
      newStock: 0,
      note: "Inventory item deleted.",
      performedBy: String(req.body?.performedBy || "Inventory Officer"),
    });

    return res.json({ message: "Inventory item deleted successfully.", id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete inventory item.", error: error.message });
  }
}

async function adjustInventoryStock(req, res) {
  try {
    const { id } = req.params;
    const { actionType, quantity, note, destinationWarehouse, performedBy } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid inventory item ID." });
    }

    const normalizedActionType = String(actionType || "").trim().toLowerCase();
    if (!ALLOWED_ACTION_TYPES.includes(normalizedActionType)) {
      return res.status(400).json({ message: "Invalid actionType value." });
    }

    const normalizedQuantity = toPositiveNumber(quantity);
    if (normalizedQuantity === null) {
      return res.status(400).json({ message: "quantity must be a positive number." });
    }

    
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    const previousStock = item.stock;
    let quantityDelta = 0;

    if (normalizedActionType === "adjust" || normalizedActionType === "consume") {
      quantityDelta = -normalizedQuantity;
    }

    if (normalizedActionType === "restock") {
      quantityDelta = normalizedQuantity;
    }

    const nextStock = previousStock + quantityDelta;

    if (nextStock < 0) {
      return res.status(400).json({ message: "Insufficient stock for this operation." });
    }

    
    item.stock = nextStock;
    await item.save();

    const defaultNotes = {
      adjust: "Stock adjusted for damaged or expired units.",
      consume: "Stock consumed for allocation or dispatch.",
      restock: "Stock replenished.",
    };

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: normalizedActionType,
      quantity: quantityDelta,
      previousStock,
      newStock: item.stock,
      note: String(note || defaultNotes[normalizedActionType]).trim(),
      metadata: {
        requestedQuantity: normalizedQuantity,
      },
      performedBy: String(performedBy || "Inventory Officer"),
    });

    return res.json({
      item: formatInventoryItem(item),
      operation: {
        actionType: normalizedActionType,
        requestedQuantity: normalizedQuantity,
        quantityDelta,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to adjust inventory stock.", error: error.message });
  }
}

module.exports = {
  createInventoryItem,
  listInventoryItems,
  listInventoryActivities,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
};
