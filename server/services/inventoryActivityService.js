const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function createActivity(data = {}) {
  const itemId = data.itemId || data.inventoryItemId || data.itemId;

  if (!itemId) {
    // If no itemId provided, try to attach by itemName if available
    if (data.itemName) {
      const item = await InventoryItem.findOne({ name: new RegExp(`^${String(data.itemName).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') });
      if (item) {
        data.itemId = item._id;
      }
    }
  }

  if (!data.itemId) {
    // No item to attach to — skip logging to item activities (fallback: no-op)
    return null;
  }

  const item = await InventoryItem.findById(String(data.itemId));
  if (!item) return null;

  const activity = {
    itemId: item._id,
    itemName: data.itemName || item.name,
    action: data.action || data.type || data.action || '',
    type: data.type || data.action || '',
    category: data.category || item.category || '',
    quantity: Number(data.quantity) || 0,
    previousStock: Number(data.previousStock) || 0,
    newStock: Number(data.newStock) || 0,
    note: data.note || data.notes || '',
    notes: data.notes || data.note || '',
    metadata: data.metadata || {},
    referenceId: data.referenceId || data.donationId || data.referenceId || null,
    referenceType: data.referenceType || data.donationType || data.referenceType || '',
    performedBy: data.performedBy || data.performedByName || null,
    performedByName: data.performedByName || (data.performedBy && (data.performedBy.fullName || data.performedBy.name)) || '',
  };

  // Add activity to beginning of activities array
  item.activities.unshift(activity);

  // Optionally trim activities to a reasonable size (e.g., 1000)
  if (item.activities.length > 5000) {
    item.activities = item.activities.slice(0, 5000);
  }

  await item.save();
  // Return the saved activity (first element)
  return item.activities[0];
}

async function listActivities(limit = 20) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 100) : 20;

  // Aggregate activities across inventory items
  const pipeline = [
    { $match: { activities: { $exists: true, $ne: [] } } },
    { $unwind: "$activities" },
    { $replaceRoot: { newRoot: "$activities" } },
    { $sort: { createdAt: -1 } },
    { $limit: safeLimit },
  ];

  const results = await InventoryItem.aggregate(pipeline).allowDiskUse(true);
  return results || [];
}

module.exports = {
  createActivity,
  listActivities,
};
