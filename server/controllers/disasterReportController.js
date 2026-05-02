const DisasterReport = require("../models/DisasterReport");
const InventoryItem = require("../models/InventoryItem");
const Allocation = require("../models/Allocation");
const AuditLog = require("../models/AuditLog");
const inventoryActivityService = require("../services/inventoryActivityService");
const mongoose = require("mongoose");
const ALLOWED_STATUSES = ["draft", "active", "pending_inventory", "allocated", "monitoring", "resolved"];
const MIN_AFFECTED_POPULATION = 1;
const MAX_AFFECTED_POPULATION = 10000000;
const UPDATABLE_FIELDS = [
  "disasterType",
  "location",
  "severity",
  "affectedPopulation",
  "eventDate",
  "priority",
  "description",
  "immediateNeeds",
  "requiredItems",
  "status",
  "reportedBy",
  "allocatedResources",
];
 
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPastDate(value) {
  const parsed = toIsoDateOrNull(value);
  if (!parsed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function parseAffectedPopulation(value) {
  const population = Number(value);

  if (
    !Number.isInteger(population) ||
    population < MIN_AFFECTED_POPULATION ||
    population > MAX_AFFECTED_POPULATION
  ) {
    return null;
  }

  return population;
}

function normalizeAllocatedResources(value) {
  if (value === null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("allocatedResources must be an object or null.");
  }

  const rawQuantities =
    value.quantities && typeof value.quantities === "object" && !Array.isArray(value.quantities)
      ? value.quantities
      : {};

  const quantities = {};
  Object.entries(rawQuantities).forEach(([key, qty]) => {
    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty < 0) {
      throw new Error("allocatedResources quantities must be non-negative numbers.");
    }
    quantities[key] = parsedQty;
  });

  const rawLineItems = Array.isArray(value.lineItems) ? value.lineItems : [];
  const lineItems = rawLineItems.map((item) => {
    const quantity = Number(item.quantity);
    const itemId = String(item.itemId || "").trim();
    const itemName = String(item.itemName || "").trim();

    if (!itemId || !itemName || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("allocatedResources lineItems contain invalid data.");
    }

    return {
      itemId,
      itemName,
      quantity,
      category: String(item.category || "").trim(),
    };
  });

  const allocatedDate = value.allocatedDate ? toIsoDateOrNull(value.allocatedDate) : new Date();
  if (value.allocatedDate && !allocatedDate) {
    throw new Error("allocatedResources allocatedDate is invalid.");
  }

  const incidentDate = value.incidentDate ? toIsoDateOrNull(value.incidentDate) : null;
  if (value.incidentDate && !incidentDate) {
    throw new Error("allocatedResources incidentDate is invalid.");
  }

  const allocatedDaysRaw = value.allocatedDays === undefined ? null : Number(value.allocatedDays);
  if (allocatedDaysRaw !== null && (!Number.isFinite(allocatedDaysRaw) || !Number.isInteger(allocatedDaysRaw) || allocatedDaysRaw < 1)) {
    throw new Error("allocatedResources allocatedDays must be an integer >= 1.");
  }
  const allocatedDays = allocatedDaysRaw === null ? null : allocatedDaysRaw;

  const lastUpdated = value.lastUpdated ? toIsoDateOrNull(value.lastUpdated) : new Date();
  if (value.lastUpdated && !lastUpdated) {
    throw new Error("allocatedResources lastUpdated is invalid.");
  }

  return {
    quantities,
    lineItems,
    message: String(value.message || "").trim(),
    allocatedDate,
    incidentDate,
    allocatedDays,
    allocatedBy: String(value.allocatedBy || "Allocation Officer").trim(),
    lastUpdated,
  };
}

function buildAllocationLineItemMap(allocatedResources) {
  const lineItems = Array.isArray(allocatedResources?.lineItems) ? allocatedResources.lineItems : [];
  const quantityEntries = allocatedResources?.quantities
    ? allocatedResources.quantities instanceof Map
      ? Array.from(allocatedResources.quantities.entries())
      : Object.entries(allocatedResources.quantities)
    : [];

  const entries = new Map();

  lineItems.forEach((item) => {
    const ref = String(item?.itemId || item?.inventoryItemId || item?.itemName || "").trim();
    const itemName = String(item?.itemName || item?.inventoryItemId || item?.itemId || ref || "").trim();
    const quantity = Number(item?.quantity || 0);

    if (ref && Number.isFinite(quantity)) {
      entries.set(ref, { ref, itemName, quantity });
    }
  });

  quantityEntries.forEach(([ref, quantity]) => {
    const normalizedRef = String(ref || "").trim();
    const normalizedQuantity = Number(quantity || 0);
    if (!normalizedRef || !Number.isFinite(normalizedQuantity)) {
      return;
    }

    if (!entries.has(normalizedRef)) {
      entries.set(normalizedRef, {
        ref: normalizedRef,
        itemName: normalizedRef,
        quantity: normalizedQuantity,
      });
    }
  });

  return entries;
}

function calculateAllocationDeltas(previousResources, nextResources) {
  const previousEntries = buildAllocationLineItemMap(previousResources);
  const nextEntries = buildAllocationLineItemMap(nextResources);
  const refs = new Set([...previousEntries.keys(), ...nextEntries.keys()]);

  return Array.from(refs)
    .map((ref) => {
      const previousEntry = previousEntries.get(ref);
      const nextEntry = nextEntries.get(ref);
      const previousQuantity = Number(previousEntry?.quantity || 0);
      const nextQuantity = Number(nextEntry?.quantity || 0);

      return {
        ref,
        itemName: nextEntry?.itemName || previousEntry?.itemName || ref,
        delta: nextQuantity - previousQuantity,
      };
    })
    .filter((entry) => entry.delta !== 0);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveInventoryItemForAllocation(ref, itemName) {
  if (ref && mongoose.Types.ObjectId.isValid(ref)) {
    const byId = await InventoryItem.findById(ref);
    if (byId) {
      return byId;
    }
  }

  const candidates = [itemName, ref].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = String(candidate).trim();
    if (!normalized) continue;

    const byName = await InventoryItem.findOne({
      name: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" },
    });
    if (byName) {
      return byName;
    }
  }

  return null;
}

async function applyInventoryDeltas(deltas, reportId, performedBy) {
  const stockChanges = [];

  for (const entry of deltas) {
    const inventoryItem = await resolveInventoryItemForAllocation(entry.ref, entry.itemName);

    if (!inventoryItem) {
      throw new Error(`Inventory item not found for allocation entry: ${entry.itemName || entry.ref}`);
    }

    const previousStock = Number(inventoryItem.stock || 0);
    const nextStock = previousStock - entry.delta;

    if (nextStock < 0) {
      throw new Error(`Insufficient stock for ${inventoryItem.name}. Available: ${previousStock}, Required: ${entry.delta > 0 ? entry.delta : Math.abs(entry.delta)}`);
    }

    inventoryItem.stock = nextStock;
    inventoryItem.lastUpdatedBy = performedBy?.id || performedBy || inventoryItem.lastUpdatedBy || null;
    await inventoryItem.save();

    await inventoryActivityService.createActivity({
      itemId: inventoryItem._id,
      itemName: inventoryItem.name,
      category: inventoryItem.category,
      action: entry.delta > 0 ? "allocation" : "deallocation",
      type: entry.delta > 0 ? "allocation" : "deallocation",
      quantity: Math.abs(entry.delta),
      previousStock,
      newStock: nextStock,
      note: entry.delta > 0 ? `Allocated for report ${reportId}` : `Returned from report ${reportId}`,
      referenceId: reportId,
      referenceType: "disaster_report_allocation",
      performedBy: performedBy?.id || performedBy || null,
      performedByName: performedBy?.fullName || performedBy?.name || String(performedBy || "Allocation Officer"),
    });

    stockChanges.push({
      inventoryItemId: inventoryItem._id.toString(),
      itemName: inventoryItem.name,
      previousStock,
      newStock: nextStock,
      delta: entry.delta,
    });
  }

  return stockChanges;
}

async function syncInventoryForAllocation(report, nextResources, performedBy) {
  const previousResources = report?.allocatedResources || null;
  const deltas = calculateAllocationDeltas(previousResources, nextResources);

  if (!deltas.length) {
    return [];
  }

  return applyInventoryDeltas(deltas, report._id.toString(), performedBy);
}

function normalizeRequiredItems(value) {
  if (!Array.isArray(value)) {
    throw new Error("requiredItems must be an array.");
  }

  if (value.length === 0) {
    return [];
  }

  const normalizedInput = value.map((item) => ({
    inventoryItemId: String(item?.inventoryItemId || "").trim(),
    itemName: String(item?.itemName || "").trim(),
    category: String(item?.category || "").trim(),
    requiredQuantity: Number(item?.requiredQuantity),
  }));

  // Validate required fields
  if (normalizedInput.some((item) => !item.itemName)) {
    throw new Error("Each required item must have an itemName.");
  }

  if (normalizedInput.some((item) => !item.category)) {
    throw new Error("Each required item must have a category.");
  }

  if (normalizedInput.some((item) => !Number.isFinite(item.requiredQuantity) || item.requiredQuantity <= 0)) {
    throw new Error("requiredItems requiredQuantity must be greater than zero.");
  }

  // For new structure, inventoryItemId is just the itemName (string), not ObjectId
  return normalizedInput.map((item) => ({
    inventoryItemId: item.itemName, // Use itemName as inventoryItemId for new structure
    itemName: item.itemName,
    category: item.category,
    requiredQuantity: Math.floor(item.requiredQuantity),
  }));
}

function formatAllocatedResources(allocatedResources) {
  if (!allocatedResources) {
    return null;
  }

  const quantities = allocatedResources.quantities;
  const normalizedQuantities =
    quantities instanceof Map
      ? Object.fromEntries(quantities.entries())
      : quantities && typeof quantities === "object"
        ? quantities
        : {};

  return {
    quantities: normalizedQuantities,
    lineItems: Array.isArray(allocatedResources.lineItems)
      ? allocatedResources.lineItems.map((item) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          category: item.category,
        }))
      : [],
    message: allocatedResources.message || "",
    allocatedDate: allocatedResources.allocatedDate || null,
    incidentDate: allocatedResources.incidentDate || null,
    allocatedDays: allocatedResources.allocatedDays || null,
    allocatedBy: allocatedResources.allocatedBy || "",
    lastUpdated: allocatedResources.lastUpdated || null,
  };
}

function formatReport(report) {
  return {
    id: report._id.toString(),
    disasterType: report.disasterType,
    location: report.location,
    severity: report.severity,
    affectedPopulation: report.affectedPopulation,
    eventDate: report.eventDate,
    priority: report.priority,
    description: report.description,
    immediateNeeds: report.immediateNeeds,
    requiredItems: Array.isArray(report.requiredItems)
      ? report.requiredItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          itemName: item.itemName,
          category: item.category,
          requiredQuantity: item.requiredQuantity,
        }))
      : [],
    status: report.status,
    reportedBy: report.reportedBy,
    allocatedResources: formatAllocatedResources(report.allocatedResources),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

async function createDisasterReport(req, res) {
  try {
    const {
      disasterType,
      location,
      severity,
      affectedPopulation,
      eventDate,
      priority,
      description,
      immediateNeeds,
      requiredItems,
      status,
      reportedBy,
    } = req.body;

    if (!disasterType || !location || !eventDate) {
      return res.status(400).json({ message: "disasterType, location, and eventDate are required." });
    }

    const parsedPopulation = parseAffectedPopulation(affectedPopulation);
    if (parsedPopulation === null) {
      return res.status(400).json({
        message: `affectedPopulation must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`,
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const createdBy = req.user?.id;
    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(401).json({ message: "Invalid user session. Please sign in again." });
    }

    let normalizedRequiredItems = [];
    if (Array.isArray(requiredItems)) {
      try {
        normalizedRequiredItems = normalizeRequiredItems(requiredItems);
      } catch (error) {
        return res.status(400).json({ message: error.message || "Invalid requiredItems value." });
      }
    }

    const normalizedImmediateNeeds = normalizedRequiredItems.length
      ? normalizedRequiredItems.map((item) => item.itemName)
      : immediateNeeds;

    const report = await DisasterReport.create({
      disasterType,
      location,
      severityLevel: severity,
      severity,
      affectedPeople: parsedPopulation,
      affectedPopulation: parsedPopulation,
      eventDate,
      priority,
      description,
      immediateNeeds: Array.isArray(normalizedImmediateNeeds) ? normalizedImmediateNeeds : [],
      requiredItems: normalizedRequiredItems,
      status,
      reportedBy,
      createdBy,
    });

    return res.status(201).json(formatReport(report));
  } catch (error) {
    if (error?.name === "ValidationError") {
      const validationMessage = Object.values(error.errors || {})
        .map((entry) => entry?.message)
        .filter(Boolean)
        .join(" ");

      return res.status(400).json({
        message: validationMessage || "Invalid disaster report data.",
      });
    }

    return res.status(500).json({ message: "Failed to create disaster report.", error: error.message });
  }
}

async function listDisasterReports(req, res) {
  try {
    const { status, priority, search } = req.query;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { location: { $regex: search, $options: "i" } },
        { disasterType: { $regex: search, $options: "i" } },
        { reportedBy: { $regex: search, $options: "i" } },
      ];
    }

    const reports = await DisasterReport.find(filter).sort({ createdAt: -1 });
    return res.json(reports.map(formatReport));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disaster reports.", error: error.message });
  }
}

async function getDisasterReportById(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json(formatReport(report));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disaster report.", error: error.message });
  }
}

async function updateDisasterReport(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
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

    if (
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      !ALLOWED_STATUSES.includes(updates.status)
    ) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "affectedPopulation")) {
      const population = parseAffectedPopulation(updates.affectedPopulation);
      if (population === null) {
        return res.status(400).json({
          message: `affectedPopulation must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`,
        });
      }
      updates.affectedPopulation = population;
      updates.affectedPeople = population;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "severity")) {
      updates.severityLevel = updates.severity;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "immediateNeeds")) {
      if (!Array.isArray(updates.immediateNeeds)) {
        return res.status(400).json({ message: "immediateNeeds must be an array." });
      }
      updates.immediateNeeds = updates.immediateNeeds
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "requiredItems")) {
      try {
        updates.requiredItems = normalizeRequiredItems(updates.requiredItems);
        updates.immediateNeeds = updates.requiredItems.map((item) => item.itemName);
      } catch (error) {
        return res.status(400).json({ message: error.message || "Invalid requiredItems value." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "allocatedResources")) {
      try {
        updates.allocatedResources = normalizeAllocatedResources(updates.allocatedResources);
      } catch (error) {
        return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
      }
    }

    const report = await DisasterReport.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json(formatReport(report));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update disaster report.", error: error.message });
  }
}

async function deleteDisasterReport(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    return res.json({ message: "Disaster report deleted successfully.", id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete disaster report.", error: error.message });
  }
}

async function allocateResources(req, res) {
  try {
    const { id } = req.params;
    const { allocatedResources, allocatedBy, message } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    if (!allocatedResources) {
      return res.status(400).json({ message: "allocatedResources is required." });
    }

    const report = await DisasterReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    // Normalize and validate allocation data
    let normalizedResources;
    try {
      normalizedResources = normalizeAllocatedResources({
        ...allocatedResources,
        allocatedBy: allocatedBy || "Allocation Officer",
        message: message || "",
        allocatedDate: new Date(),
        lastUpdated: new Date(),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
    }

    // Prefer validated normalizedResources, but fall back to raw incoming values for
    // incidentDate/allocatedDays to avoid accidental stripping by other layers.
    const incidentDateToPersist = allocatedResources && allocatedResources.incidentDate
      ? toIsoDateOrNull(allocatedResources.incidentDate)
      : normalizedResources.incidentDate;

    if (!report.allocatedResources && incidentDateToPersist && isPastDate(incidentDateToPersist)) {
      return res.status(400).json({ message: "Incident date cannot be in the past." });
    }

    const allocatedDaysToPersist = allocatedResources && Object.prototype.hasOwnProperty.call(allocatedResources, 'allocatedDays')
      ? (allocatedResources.allocatedDays === null ? null : Number(allocatedResources.allocatedDays))
      : normalizedResources.allocatedDays;

    const nextResources = {
      quantities: normalizedResources.quantities,
      lineItems: normalizedResources.lineItems,
      message: normalizedResources.message,
      allocatedDate: normalizedResources.allocatedDate,
      incidentDate: incidentDateToPersist,
      allocatedDays: allocatedDaysToPersist,
      allocatedBy: normalizedResources.allocatedBy,
      lastUpdated: normalizedResources.lastUpdated,
    };

    let stockChanges = [];
    try {
      stockChanges = await syncInventoryForAllocation(report, nextResources, req.user);
    } catch (inventoryError) {
      return res.status(400).json({ message: inventoryError.message || "Unable to update inventory stock." });
        // Create or update Allocation document with stock snapshots
        let allocationDoc = null;
        try {
          const allocationItems = [];
      
          for (const lineItem of nextResources.lineItems) {
            const inventoryItem = await InventoryItem.findById(lineItem.itemId);
            if (inventoryItem) {
              // Find current stock from stockChanges to get the state before allocation
              const stockChange = stockChanges.find(sc => String(sc.inventoryId) === String(lineItem.itemId));
              const stockAtAllocation = stockChange ? stockChange.previousStock : inventoryItem.stock;
          
              allocationItems.push({
                inventoryItemId: inventoryItem._id,
                itemName: inventoryItem.name,
                quantityAllocated: lineItem.quantity,
                stockAvailableAtAllocation: stockAtAllocation,
                unit: inventoryItem.unit,
                packageSize: inventoryItem.packageSize || ""
              });
            }
          }
      
          // Find or create allocation
          let allocation = await Allocation.findOne({
            disasterId: new mongoose.Types.ObjectId(id),
            status: { $in: ["draft", "confirmed"] }
          });
      
          if (allocation) {
            // Update existing allocation
            allocation.items = allocationItems;
            allocation.allocationDays = allocatedDaysToPersist || 1;
            allocation.notes = normalizedResources.message || "";
            allocation.allocatedDate = new Date();
            allocation.allocatedBy = normalizedResources.allocatedBy;
            allocation.status = "confirmed";
          } else {
            // Create new allocation
            allocation = new Allocation({
              disasterId: new mongoose.Types.ObjectId(id),
              createdBy: req.user?.id || null,
              items: allocationItems,
              allocationDays: allocatedDaysToPersist || 1,
              notes: normalizedResources.message || "",
              allocatedDate: new Date(),
              allocatedBy: normalizedResources.allocatedBy,
              status: "confirmed"
            });
          }
      
          allocationDoc = await allocation.save();
        } catch (allocationError) {
          console.error("Failed to create/update Allocation document:", allocationError);
          // Log but don't fail the entire allocation if Allocation doc fails
        }

    }

    let updateResult;
    try {
      updateResult = await DisasterReport.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            allocatedResources: nextResources,
            status: 'allocated',
            updatedAt: new Date(),
          },
        }
      );
    } catch (reportError) {
      if (stockChanges.length) {
        try {
          await applyInventoryDeltas(
            stockChanges.map((entry) => ({ ...entry, delta: -entry.delta })),
            id,
            req.user
          );
        } catch (rollbackError) {
          console.error("Failed to roll back inventory after allocation write error:", rollbackError);
        }
      }

      return res.status(500).json({ message: "Failed to save allocation.", error: reportError.message });
    }

    const freshReport = await DisasterReport.findById(id);

    if (!freshReport) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    // Notify tracking workflow that a new allocation is ready for dispatch planning.
    try {
      if (req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
        await AuditLog.create({
          userId: req.user.id,
          module: "tracking",
          action: "allocation_confirmed",
          referenceId: freshReport._id,
          description: `Allocation confirmed for ${freshReport.disasterType} at ${freshReport.location}. Dispatch planning required.`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to write allocation notification audit log:", notificationError);
      // Do not fail allocation confirmation if notification logging fails.
    }

    return res.json({
      message: "Resources allocated successfully.",
      report: formatReport(freshReport),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to allocate resources.", error: error.message });
  }
}

async function updateAllocation(req, res) {
  try {
    const { id } = req.params;
    const { allocatedResources, allocatedBy, message } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    if (!report.allocatedResources) {
      return res.status(400).json({ message: "No resources allocated to this report yet." });
    }

    // Normalize and validate allocation data
    let normalizedResources;
    try {
      normalizedResources = normalizeAllocatedResources({
        ...allocatedResources,
        allocatedBy: allocatedBy || report.allocatedResources.allocatedBy,
        message: message || report.allocatedResources.message,
        allocatedDate: report.allocatedResources.allocatedDate,
        lastUpdated: new Date(),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message || "Invalid allocatedResources value." });
    }

    const nextResources = {
      quantities: normalizedResources.quantities,
      lineItems: normalizedResources.lineItems,
      message: normalizedResources.message,
      allocatedDate: normalizedResources.allocatedDate,
      incidentDate: normalizedResources.incidentDate,
      allocatedDays: normalizedResources.allocatedDays,
      allocatedBy: normalizedResources.allocatedBy,
      lastUpdated: normalizedResources.lastUpdated,
    };

    let stockChanges = [];
    try {
      stockChanges = await syncInventoryForAllocation(report, nextResources, req.user);
    } catch (inventoryError) {
      return res.status(400).json({ message: inventoryError.message || "Unable to update inventory stock." });
    }

    let updatedReport;
    try {
      updatedReport = await DisasterReport.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            allocatedResources: nextResources,
            updatedAt: new Date(),
          },
        }
      );
    } catch (reportError) {
      if (stockChanges.length) {
        try {
          await applyInventoryDeltas(
            stockChanges.map((entry) => ({ ...entry, delta: -entry.delta })),
            id,
            req.user
          );
        } catch (rollbackError) {
          console.error("Failed to roll back inventory after allocation update error:", rollbackError);
        }
      }

      return res.status(500).json({ message: "Failed to update allocation.", error: reportError.message });
    }

    updatedReport = await DisasterReport.findById(id);

    return res.json({
      message: "Allocation updated successfully.",
      report: formatReport(updatedReport),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update allocation.", error: error.message });
  }
}

async function deallocateResources(req, res) {
  try {
    const { id } = req.params;

    if (!isDbConnected()) {
      return res.status(503).json({
        message: "Database is not connected. Please verify MongoDB credentials and try again.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const report = await DisasterReport.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Disaster report not found." });
    }

    if (!report.allocatedResources) {
      return res.status(400).json({ message: "No allocated resources found to deallocate." });
    }

    let stockChanges = [];
    try {
      stockChanges = await syncInventoryForAllocation(report, null, req.user);
    } catch (inventoryError) {
      return res.status(400).json({ message: inventoryError.message || "Unable to restore inventory stock." });
    }

    let updatedReport;
    try {
      await DisasterReport.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            allocatedResources: null,
            status: "pending_inventory",
            updatedAt: new Date(),
          },
        }
      );
    } catch (reportError) {
      if (stockChanges.length) {
        try {
          await applyInventoryDeltas(
            stockChanges.map((entry) => ({ ...entry, delta: -entry.delta })),
            id,
            req.user
          );
        } catch (rollbackError) {
          console.error("Failed to roll back inventory after deallocation write error:", rollbackError);
        }
      }

      return res.status(500).json({ message: "Failed to deallocate resources.", error: reportError.message });
    }

    updatedReport = await DisasterReport.findById(id);

    return res.json({
      message: "Resources deallocated successfully.",
      report: formatReport(updatedReport),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to deallocate resources.", error: error.message });
  }
}

module.exports = {
  createDisasterReport,
  listDisasterReports,
  getDisasterReportById,
  updateDisasterReport,
  deleteDisasterReport,
  allocateResources,
  updateAllocation,
  deallocateResources,
};
