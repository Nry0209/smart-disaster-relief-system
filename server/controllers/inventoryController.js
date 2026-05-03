const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const inventoryActivityService = require("../services/inventoryActivityService");
const { ITEM_CATEGORIES, ITEM_CATEGORY_ENUM } = require("../utils/constants");

const DEFAULT_INVENTORY_ITEMS = [
  {
    name: "Bottled Water",
    category: "Water",
    stock: 4500,
    min: 6000,
    warehouse: "Warehouse 1",
    packageSize: "500 ml",
    unit: "bottle",
  },
  {
    name: "Dry Ration",
    category: "Food",
    stock: 3900,
    min: 3500,
    warehouse: "Warehouse 1",
    packageSize: "1 kg",
    unit: "pack",
  },
  {
    name: "Blankets",
    category: "Shelter",
    stock: 2600,
    min: 2000,
    warehouse: "Warehouse 2",
    packageSize: "1 piece",
    unit: "piece",
  },
  {
    name: "Tents",
    category: "Shelter",
    stock: 240,
    min: 400,
    warehouse: "Warehouse 3",
    packageSize: "1 tent",
    unit: "unit",
  },
  {
    name: "Medicine Kits",
    category: "Medical",
    stock: 310,
    min: 500,
    warehouse: "Warehouse 2",
    packageSize: "1 kit",
    unit: "kit",
  },
];

const DEFAULT_MEASURE_BY_CATEGORY = {
  Water: { packageSize: "1 bottle", unit: "bottle" },
  Food: { packageSize: "1 pack", unit: "pack" },
  Shelter: { packageSize: "1 piece", unit: "piece" },
  Medical: { packageSize: "1 kit", unit: "kit" },
  Other: { packageSize: "1 unit", unit: "unit" },
};

const ALLOWED_ACTION_TYPES = ["adjust", "consume", "restock"];
const UPDATABLE_FIELDS = ["name", "category", "stock", "min", "warehouse", "packageSize", "unit"];

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
  const isSelectable = item.status !== "expired" && item.status !== "damaged";
  const defaultMeasure = DEFAULT_MEASURE_BY_CATEGORY[item.category] || DEFAULT_MEASURE_BY_CATEGORY.Other;

  return {
    id: item._id.toString(),
    name: item.name,
    category: item.category,
    stock: item.stock,
    min: item.min,
    warehouse: item.warehouse,
    packageSize: item.packageSize || defaultMeasure.packageSize,
    unit: item.unit || defaultMeasure.unit,
    status: item.status,
    isSelectable,
    stockStatus: getStockStatus(item.stock, item.min),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function isMeasureRequired(category) {
  return category !== ITEM_CATEGORIES.CLOTHING;
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
  await inventoryActivityService.createActivity(data);
}

async function createInventoryItem(req, res) {
  try {
    const { name, category, stock, min, warehouse, packageSize, unit, performedBy } = req.body;

    if (!name || category === undefined || stock === undefined || min === undefined) {
      return res.status(400).json({ message: "name, category, stock, and min are required." });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ message: "Invalid category value." });
    }

    if (isMeasureRequired(normalizedCategory) && !String(packageSize || "").trim()) {
      return res.status(400).json({ message: "packageSize is required." });
    }

    const stockValue = toNonNegativeNumber(stock);
    const minValue = toPositiveNumber(min);

    if (stockValue === null || minValue === null) {
      return res.status(400).json({ message: "stock must be a non-negative number and min must be at least 1." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    // Check if item with same name and category already exists
    const existingItem = await InventoryItem.findOne({
      name: String(name).trim(),
      category: normalizedCategory
    });

    let item;
    let previousStock = 0;
    let action = "create";

    if (existingItem) {
      // Update existing item stock
      previousStock = existingItem.stock;
      existingItem.stock += stockValue;
      existingItem.lastUpdatedBy = performedBy;
      item = await existingItem.save();
      action = "restock";
    } else {
      // Create new item
      item = await InventoryItem.create({
        name: String(name).trim(),
        category: normalizedCategory,
        stock: stockValue,
        min: minValue,
        warehouse: String(warehouse || "Warehouse 1").trim() || "Warehouse 1",
        packageSize: isMeasureRequired(normalizedCategory) ? String(packageSize || "").trim() : "",
        unit: isMeasureRequired(normalizedCategory) ? String(unit || "").trim() || "units" : "",
      });
    }

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: action,
      quantity: stockValue,
      previousStock: previousStock,
      newStock: item.stock,
      note: `${action === "create" ? "Created" : "Updated"} inventory item in ${item.warehouse}.`,
      performedBy: String(performedBy || "Inventory Officer"),
    });

    return res.status(action === "create" ? 201 : 200).json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create inventory item.", error: error.message });
  }
}

async function listInventoryItems(req, res) {
  try {
    const { category, search, warehouse, status } = req.query;
    const normalizedCategoryQuery = String(category || "").trim();
    const normalizedSearchQuery = String(search || "").trim();
    const normalizedWarehouseQuery = String(warehouse || "").trim();
    const normalizedStatusQuery = String(status || "").trim();

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const filter = {};

    if (normalizedCategoryQuery && normalizedCategoryQuery.toLowerCase() !== "all") {
      const normalizedCategory = normalizeCategory(normalizedCategoryQuery);
      if (!normalizedCategory) {
        return res.status(400).json({ message: "Invalid category filter value." });
      }
      filter.category = normalizedCategory;
    }

    if (normalizedWarehouseQuery) {
      filter.warehouse = { $regex: normalizedWarehouseQuery, $options: "i" };
    }

    if (normalizedSearchQuery) {
      filter.$or = [
        { name: { $regex: normalizedSearchQuery, $options: "i" } },
        { category: { $regex: normalizedSearchQuery, $options: "i" } },
        { warehouse: { $regex: normalizedSearchQuery, $options: "i" } },
      ];
    }

    let items = await InventoryItem.find(filter).sort({ updatedAt: -1 });

    const hasFilters = Boolean(
      (normalizedCategoryQuery && normalizedCategoryQuery.toLowerCase() !== "all") ||
      normalizedSearchQuery ||
      normalizedWarehouseQuery ||
      normalizedStatusQuery
    );

    if (!items.length && !hasFilters) {
      // Count activities by aggregating across items
      const activityAgg = await InventoryItem.aggregate([
        { $project: { count: { $size: { $ifNull: ["$activities", []] } } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]);
      const activityCount = (activityAgg && activityAgg[0] && activityAgg[0].total) || 0;
      const itemCount = await InventoryItem.estimatedDocumentCount();

      // Only use default items if database is completely empty
      if (activityCount === 0 && itemCount === 0) {

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

    if (normalizedStatusQuery) {
      const normalizedStatus = normalizedStatusQuery.toLowerCase();
      formatted = formatted.filter((item) => item.stockStatus === normalizedStatus);
    }

    // Debug logging to check what data is being returned
    console.log('Backend returning inventory items:', formatted.length);
    console.log('Sample returned items:', formatted.slice(0, 3).map(item => ({
      name: item.name,
      stock: item.stock,
      min: item.min,
      category: item.category
    })));

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

    const activities = await inventoryActivityService.listActivities(safeLimit);
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
      const normalizedMin = toPositiveNumber(updates.min);
      if (normalizedMin === null) {
        return res.status(400).json({ message: "min must be at least 1." });
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

    const targetCategory = Object.prototype.hasOwnProperty.call(updates, "category") ? normalizeCategory(updates.category) : item.category;

    if (Object.prototype.hasOwnProperty.call(updates, "packageSize")) {
      const normalizedPackageSize = String(updates.packageSize || "").trim();
      if (isMeasureRequired(targetCategory) && !normalizedPackageSize) {
        return res.status(400).json({ message: "packageSize cannot be empty." });
      }
      updates.packageSize = isMeasureRequired(targetCategory) ? normalizedPackageSize : "";
    }

    if (Object.prototype.hasOwnProperty.call(updates, "unit")) {
      const normalizedUnit = String(updates.unit || "").trim();
      if (isMeasureRequired(targetCategory) && !normalizedUnit) {
        return res.status(400).json({ message: "unit cannot be empty." });
      }
      updates.unit = isMeasureRequired(targetCategory) ? normalizedUnit : "";
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

async function reduceInventoryStock(req, res) {
  try {
    const { name, category, quantity, note, performedBy } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const normalizedName = String(name || "").trim();
    const normalizedCategory = normalizeCategory(category);
    const quantityValue = toNonNegativeNumber(quantity);

    if (!normalizedName || !normalizedCategory) {
      return res.status(400).json({ message: "Name and category are required." });
    }

    if (quantityValue === null || quantityValue === 0) {
      return res.status(400).json({ message: "Quantity must be a positive number." });
    }

    // Find item by name and category
    const item = await InventoryItem.findOne({
      name: normalizedName,
      category: normalizedCategory
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    if (item.stock < quantityValue) {
      return res.status(400).json({ message: "Insufficient stock. Available: " + item.stock });
    }

    const previousStock = item.stock;
    item.stock -= quantityValue;
    item.lastUpdatedBy = performedBy;
    await item.save();

    await createActivityLog({
      itemId: item._id,
      itemName: item.name,
      action: "consumption",
      quantity: -quantityValue,
      previousStock,
      newStock: item.stock,
      note: String(note || `Reduced stock by ${quantityValue}`).trim(),
      performedBy: String(performedBy || "Inventory Officer"),
    });

    return res.json(formatInventoryItem(item));
  } catch (error) {
    return res.status(500).json({ message: "Failed to reduce inventory stock.", error: error.message });
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
      adjust: "Stock adjusted for damaged or expired items.",
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
  reduceInventoryStock,
};
