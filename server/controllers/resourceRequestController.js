const mongoose = require("mongoose");
const ResourceRequest = require("../models/ResourceRequest");
const InventoryItem = require("../models/InventoryItem");
const Partner = require("../models/Partner");
const DisasterReport = require("../models/DisasterReport");
const { sendResourceRequestEmail } = require("../services/emailService");

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Create resource request (Inventory Officer)
async function createResourceRequest(req, res) {
  try {
    const { 
      ngoId, 
      disasterId, 
      urgency, 
      requestedItems, 
      deliveryDate, 
      deliveryAddress, 
      notes 
    } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    // Validate required fields
    if (!ngoId || !disasterId || !urgency || !requestedItems || !deliveryDate || !deliveryAddress) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Validate NGO exists
    const ngo = await Partner.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ message: "NGO not found." });
    }

    // Validate disaster exists
    const disaster = await DisasterReport.findById(disasterId);
    if (!disaster) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    // Check stock availability for requested items
    const stockChecks = await Promise.all(
      requestedItems.map(async (item) => {
        if (item.resourceId) {
          const inventoryItem = await InventoryItem.findById(item.resourceId);
          return {
            itemName: item.itemName,
            requestedQuantity: item.quantity,
            availableStock: inventoryItem ? inventoryItem.stock : 0,
            shortage: inventoryItem ? (item.quantity > inventoryItem.stock) : true
          };
        }
        return {
          itemName: item.itemName,
          requestedQuantity: item.quantity,
          availableStock: 0,
          shortage: true
        };
      })
    );

    const hasShortages = stockChecks.some(check => check.shortage);

    // Create resource request
    const resourceRequest = new ResourceRequest({
      ngoId,
      ngoEmail: ngo.email,
      disasterId,
      disasterType: disaster.disasterType,
      disasterLocation: disaster.location,
      urgency,
      requestedItems,
      deliveryDate,
      deliveryAddress,
      requestedBy: req.user.id,
      requestedByName: req.user.fullName || req.user.name,
      notes: notes || "",
      status: "sent"
    });

    await resourceRequest.save();

    // Send email to NGO if there are shortages
    if (hasShortages) {
      try {
        await sendResourceRequestEmail({
          ngoEmail: ngo.email,
          ngoName: ngo.organizationName || ngo.contactPerson || "Partner Organization",
          disasterType: disaster.disasterType,
          disasterLocation: disaster.location,
          requestedItems: stockChecks,
          deliveryDate,
          urgency,
          requestId: resourceRequest._id
        });
        
        resourceRequest.emailSentAt = new Date();
        await resourceRequest.save();
      } catch (emailError) {
        console.error("Failed to send resource request email:", emailError);
        // Continue even if email fails
      }
    }

    return res.status(201).json({
      message: "Resource request created successfully.",
      resourceRequest: {
        ...resourceRequest.toObject(),
        stockChecks,
        hasShortages
      }
    });

  } catch (error) {
    console.error("Create resource request error:", error);
    return res.status(500).json({ 
      message: "Failed to create resource request.", 
      error: error.message 
    });
  }
}

// Get all resource requests
async function listResourceRequests(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { page = 1, limit = 10, status, urgency, ngoId, disasterId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (ngoId) filter.ngoId = ngoId;
    if (disasterId) filter.disasterId = disasterId;

    const resourceRequests = await ResourceRequest.find(filter)
      .populate('ngoId', 'name email')
      .populate('disasterId', 'disasterType location severityLevel')
      .populate('requestedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ResourceRequest.countDocuments(filter);

    return res.json({
      resourceRequests,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("List resource requests error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve resource requests.", 
      error: error.message 
    });
  }
}

// Get resource request by ID
async function getResourceRequestById(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid resource request ID." });
    }

    const resourceRequest = await ResourceRequest.findById(id)
      .populate('ngoId', 'name email phone')
      .populate('disasterId', 'disasterType location severityLevel affectedPopulation')
      .populate('requestedBy', 'fullName email');

    if (!resourceRequest) {
      return res.status(404).json({ message: "Resource request not found." });
    }

    return res.json({ resourceRequest });

  } catch (error) {
    console.error("Get resource request error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve resource request.", 
      error: error.message 
    });
  }
}

// Update resource request status
async function updateResourceRequestStatus(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid resource request ID." });
    }

    if (!["sent", "fulfilled", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const resourceRequest = await ResourceRequest.findByIdAndUpdate(
      id,
      { 
        status, 
        notes: notes || "" 
      },
      { new: true, runValidators: true }
    ).populate('ngoId', 'name email');

    if (!resourceRequest) {
      return res.status(404).json({ message: "Resource request not found." });
    }

    return res.json({
      message: `Resource request ${status} successfully.`,
      resourceRequest
    });

  } catch (error) {
    console.error("Update resource request error:", error);
    return res.status(500).json({ 
      message: "Failed to update resource request.", 
      error: error.message 
    });
  }
}

// Get stock availability for items
async function checkStockAvailability(req, res) {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required." });
    }

    const stockChecks = await Promise.all(
      items.map(async (item) => {
        let inventoryItem = null;
        
        if (item.itemId) {
          inventoryItem = await InventoryItem.findById(item.itemId);
        } else {
          // Search by name if itemId not provided
          inventoryItem = await InventoryItem.findOne({ 
            name: { $regex: item.itemName, $options: 'i' } 
          });
        }

        return {
          itemName: item.itemName,
          requestedQuantity: item.quantity || 0,
          availableStock: inventoryItem ? inventoryItem.stock : 0,
          shortage: inventoryItem ? (item.quantity > inventoryItem.stock) : true,
          inventoryItemId: inventoryItem ? inventoryItem._id : null,
          unit: inventoryItem ? inventoryItem.unit : 'units'
        };
      })
    );

    return res.json({ stockChecks });

  } catch (error) {
    console.error("Check stock availability error:", error);
    return res.status(500).json({ 
      message: "Failed to check stock availability.", 
      error: error.message 
    });
  }
}

module.exports = {
  createResourceRequest,
  listResourceRequests,
  getResourceRequestById,
  updateResourceRequestStatus,
  checkStockAvailability
};
