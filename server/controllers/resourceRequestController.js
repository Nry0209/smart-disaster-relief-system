const mongoose = require("mongoose");
const ResourceRequest = require("../models/ResourceRequest");
const InventoryItem = require("../models/InventoryItem");
const Partner = require("../models/Partner");
const DisasterReport = require("../models/DisasterReport");
const { sendResourceRequestEmail } = require("../services/emailService");

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Create resource request (NGO/Partner)
async function createResourceRequest(req, res) {
  try {
    const { 
      ngoPartner,
      requestType,
      amount,
      items,
      deliveryWarehouse,
      expectedDeliveryDate,
      problemNote,
      disasterId
    } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    // Validate required fields (except items for monetary requests)
    if (!ngoPartner || !requestType || !deliveryWarehouse || !expectedDeliveryDate || !problemNote) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Validate request type specific requirements
    if (requestType === "monetary" && (!amount || Number(amount) <= 0)) {
      return res.status(400).json({ message: "Valid amount is required for monetary requests." });
    }

    if (requestType === "inventory" && (!items || items.length === 0)) {
      return res.status(400).json({ message: "At least one item is required for inventory requests." });
    }

    // Validate inventory items if request type is inventory
    if (requestType === "inventory" && items) {
      const hasInvalidCount = items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0);
      if (hasInvalidCount) {
        return res.status(400).json({ message: "Invalid count. Quantity cannot be negative." });
      }
    }

    // Validate delivery date is not in the past
    const deliveryDate = new Date(expectedDeliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deliveryDate < today) {
      return res.status(400).json({ message: "Delivery date cannot be in the past." });
    }

    // Validate partner exists and get partner data
    const partner = await Partner.findById(ngoPartner);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found." });
    }

    // Optional: Validate disaster exists if provided
    let disaster = null;
    if (disasterId) {
      disaster = await DisasterReport.findById(disasterId);
      if (!disaster) {
        return res.status(404).json({ message: "Disaster report not found." });
      }
    }

    // Create resource request with new schema
    const resourceRequestData = {
      ngoPartner: partner._id,
      requestType,
      deliveryWarehouse,
      expectedDeliveryDate: deliveryDate,
      problemNote,
      disasterId: disasterId || null,
    };

    // Add request-specific data
    if (requestType === "monetary") {
      resourceRequestData.amount = Number(amount);
    } else {
      resourceRequestData.items = items.map(item => ({
        inventoryItemId: item.inventoryItemId || null,
        itemName: item.itemName,
        category: item.category,
        quantity: Number(item.quantity),
        unit: item.unit || "units"
      }));
    }

    const resourceRequest = new ResourceRequest(resourceRequestData);
    await resourceRequest.save();

    // Send email notification using partner data
    try {
      await sendResourceRequestEmail({
        to: partner.email,
        requesterName: partner.organizationName || partner.contactPerson,
        requestType,
        requestDetails: requestType === "monetary" 
          ? `Amount: LKR ${amount}` 
          : `Items: ${items.map(item => `${item.itemName} (${item.quantity})`).join(", ")}`,
        deliveryWarehouse,
        expectedDeliveryDate: deliveryDate.toDateString(),
        problemNote,
      });
      resourceRequest.emailSentAt = new Date();
      await resourceRequest.save();
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Continue with the request even if email fails
    }

    res.status(201).json({
      message: "Resource request submitted successfully",
      data: resourceRequest,
      emailSent: !!resourceRequest.emailSentAt
    });

  } catch (error) {
    console.error("Create resource request error:", error);
    res.status(500).json({
      message: "Failed to create resource request",
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
