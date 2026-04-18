const mongoose = require("mongoose");
const Allocation = require("../models/Allocation");
const DisasterReport = require("../models/DisasterReport");
const InventoryItem = require("../models/InventoryItem");
const InventoryActivity = require("../models/InventoryActivity");
const TrackingRecord = require("../models/TrackingRecord");

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Create allocation plan (Allocation Officer)
async function createAllocation(req, res) {
  try {
    const { disasterId, items, notes } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    // Validate required fields
    if (!disasterId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: "Disaster ID and items array are required." 
      });
    }

    // Validate disaster exists
    const disaster = await DisasterReport.findById(disasterId);
    if (!disaster) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    // Check if allocation already exists for this disaster
    const existingAllocation = await Allocation.findOne({ 
      disasterId, 
      status: { $in: ["draft", "confirmed"] } 
    });
    
    if (existingAllocation) {
      return res.status(400).json({ 
        message: "Allocation already exists for this disaster." 
      });
    }

    // Validate and check stock for each item
    const allocationItems = [];
    const stockChecks = [];

    for (const item of items) {
      if (!item.inventoryItemId || !item.quantityAllocated || item.quantityAllocated <= 0) {
        return res.status(400).json({ 
          message: "Each item must have valid inventoryItemId and quantityAllocated." 
        });
      }

      const inventoryItem = await InventoryItem.findById(item.inventoryItemId);
      if (!inventoryItem) {
        return res.status(404).json({ 
          message: `Inventory item not found: ${item.inventoryItemId}` 
        });
      }

      if (inventoryItem.stock < item.quantityAllocated) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.stock}, Requested: ${item.quantityAllocated}` 
        });
      }

      allocationItems.push({
        inventoryItemId: item.inventoryItemId,
        itemName: inventoryItem.name,
        quantityAllocated: item.quantityAllocated,
        unit: inventoryItem.unit
      });

      stockChecks.push({
        itemName: inventoryItem.name,
        allocatedQuantity: item.quantityAllocated,
        availableStock: inventoryItem.stock,
        remainingStock: inventoryItem.stock - item.quantityAllocated
      });
    }

    // Create allocation
    const allocation = new Allocation({
      disasterId,
      createdBy: req.user.id,
      items: allocationItems,
      notes: notes || "",
      status: "draft"
    });

    await allocation.save();

    return res.status(201).json({
      message: "Allocation plan created successfully.",
      allocation,
      stockChecks
    });

  } catch (error) {
    console.error("Create allocation error:", error);
    return res.status(500).json({ 
      message: "Failed to create allocation plan.", 
      error: error.message 
    });
  }
}

// Confirm allocation and update inventory (Allocation Officer)
async function confirmAllocation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid allocation ID." });
    }

    const allocation = await Allocation.findById(id).populate('disasterId');
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found." });
    }

    if (allocation.status !== "draft") {
      return res.status(400).json({ 
        message: "Only draft allocations can be confirmed." 
      });
    }

    // Check stock availability again before confirming
    const stockUpdates = [];
    
    for (const item of allocation.items) {
      const inventoryItem = await InventoryItem.findById(item.inventoryItemId);
      
      if (!inventoryItem) {
        return res.status(404).json({ 
          message: `Inventory item not found: ${item.inventoryItemId}` 
        });
      }

      if (inventoryItem.stock < item.quantityAllocated) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.stock}, Required: ${item.quantityAllocated}` 
        });
      }

      stockUpdates.push({
        inventoryItemId: item.inventoryItemId,
        itemName: inventoryItem.name,
        previousStock: inventoryItem.stock,
        allocatedQuantity: item.quantityAllocated,
        newStock: inventoryItem.stock - item.quantityAllocated
      });
    }

    // Update inventory stock and create activity records
    for (const update of stockUpdates) {
      const inventoryItem = await InventoryItem.findById(update.inventoryItemId);
      
      // Update stock
      inventoryItem.stock = update.newStock;
      inventoryItem.lastUpdatedBy = req.user.id;
      await inventoryItem.save();

      // Create inventory activity record
      const activity = new InventoryActivity({
        inventoryItemId: update.inventoryItemId,
        itemName: update.itemName,
        category: inventoryItem.category,
        type: "allocation",
        quantity: update.allocatedQuantity,
        previousStock: update.previousStock,
        newStock: update.newStock,
        referenceId: allocation._id,
        referenceType: "allocation",
        performedBy: req.user.id,
        performedByName: req.user.fullName || req.user.name,
        notes: `Allocated for disaster: ${allocation.disasterId.disasterType} at ${allocation.disasterId.location}`
      });

      await activity.save();
    }

    // Update allocation status
    allocation.status = "confirmed";
    await allocation.save();

    // Update disaster report status
    await DisasterReport.findByIdAndUpdate(allocation.disasterId._id, {
      status: "allocated",
      allocatedResources: {
        quantities: new Map(),
        lineItems: allocation.items.map(item => ({
          itemId: item.inventoryItemId.toString(),
          itemName: item.itemName,
          quantity: item.quantityAllocated,
          category: ""
        })),
        message: allocation.notes,
        allocatedDate: new Date(),
        allocatedBy: req.user.fullName || req.user.name,
        lastUpdated: new Date()
      }
    });

    return res.json({
      message: "Allocation confirmed successfully. Inventory updated.",
      allocation,
      stockUpdates
    });

  } catch (error) {
    console.error("Confirm allocation error:", error);
    return res.status(500).json({ 
      message: "Failed to confirm allocation.", 
      error: error.message 
    });
  }
}

// Get all allocations
async function listAllocations(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { page = 1, limit = 10, status, disasterId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (disasterId) filter.disasterId = disasterId;

    const allocations = await Allocation.find(filter)
      .populate('disasterId', 'disasterType location severityLevel affectedPopulation')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Allocation.countDocuments(filter);

    return res.json({
      allocations,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("List allocations error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve allocations.", 
      error: error.message 
    });
  }
}

// Get allocation by ID
async function getAllocationById(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid allocation ID." });
    }

    const allocation = await Allocation.findById(id)
      .populate('disasterId', 'disasterType location severityLevel affectedPopulation status')
      .populate('createdBy', 'fullName email')
      .populate('items.inventoryItemId', 'name category unit');

    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found." });
    }

    // Check if tracking record exists
    const trackingRecord = await TrackingRecord.findOne({ allocationId: id });

    return res.json({ 
      allocation, 
      hasTrackingRecord: !!trackingRecord 
    });

  } catch (error) {
    console.error("Get allocation error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve allocation.", 
      error: error.message 
    });
  }
}

// Update allocation (draft only)
async function updateAllocation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    const { items, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid allocation ID." });
    }

    const allocation = await Allocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found." });
    }

    if (allocation.status !== "draft") {
      return res.status(400).json({ 
        message: "Only draft allocations can be updated." 
      });
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      const allocationItems = [];
      
      for (const item of items) {
        if (!item.inventoryItemId || !item.quantityAllocated || item.quantityAllocated <= 0) {
          return res.status(400).json({ 
            message: "Each item must have valid inventoryItemId and quantityAllocated." 
          });
        }

        const inventoryItem = await InventoryItem.findById(item.inventoryItemId);
        if (!inventoryItem) {
          return res.status(404).json({ 
            message: `Inventory item not found: ${item.inventoryItemId}` 
          });
        }

        allocationItems.push({
          inventoryItemId: item.inventoryItemId,
          itemName: inventoryItem.name,
          quantityAllocated: item.quantityAllocated,
          unit: inventoryItem.unit
        });
      }

      allocation.items = allocationItems;
    }

    // Update notes if provided
    if (notes !== undefined) {
      allocation.notes = notes;
    }

    await allocation.save();

    return res.json({
      message: "Allocation updated successfully.",
      allocation
    });

  } catch (error) {
    console.error("Update allocation error:", error);
    return res.status(500).json({ 
      message: "Failed to update allocation.", 
      error: error.message 
    });
  }
}

// Cancel allocation (draft only)
async function cancelAllocation(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid allocation ID." });
    }

    const allocation = await Allocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ message: "Allocation not found." });
    }

    if (allocation.status !== "draft") {
      return res.status(400).json({ 
        message: "Only draft allocations can be cancelled." 
      });
    }

    allocation.status = "cancelled";
    await allocation.save();

    return res.json({
      message: "Allocation cancelled successfully.",
      allocation
    });

  } catch (error) {
    console.error("Cancel allocation error:", error);
    return res.status(500).json({ 
      message: "Failed to cancel allocation.", 
      error: error.message 
    });
  }
}

// Get allocation statistics
async function getAllocationStatistics(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const statusStats = await Allocation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalAllocated = await Allocation.aggregate([
      {
        $match: { status: "confirmed" }
      },
      {
        $unwind: "$items"
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$items.quantityAllocated" }
        }
      }
    ]);

    return res.json({
      statusStats,
      totalAllocated: totalAllocated[0]?.totalItems || 0
    });

  } catch (error) {
    console.error("Get allocation statistics error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve allocation statistics.", 
      error: error.message 
    });
  }
}

module.exports = {
  createAllocation,
  confirmAllocation,
  listAllocations,
  getAllocationById,
  updateAllocation,
  cancelAllocation,
  getAllocationStatistics
};
