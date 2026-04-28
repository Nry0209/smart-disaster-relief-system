import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, Users, CheckCircle, Clock, ArrowRight, Search, Filter, Truck, MapPin, Calendar, Bell, Trash2, RefreshCcw } from "lucide-react";
import { fetchDisasterReports } from "../services/disasterReportService";
import { upsertAllocationForReport, clearAllocationForReport } from "../services/allocationService";
import { getResourcePrediction } from "../services/predictionService";
import { fetchInventoryItems } from "../services/inventoryService";
import PageHeader from "../components/PageHeader";
import "./Pages.css";

const MAX_ALLOCATION_NOTE_LENGTH = 400;

function getStatus(stock, min) {
  const ratio = stock / min;
  if (ratio >= 1)   return { label: "Good",     color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning",  color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low",      color: "#ea580c", bg: "#ffedd5" };
  return               { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function getUrgencyColor(urgency) {
  switch (urgency) {
    case "critical":
      return { color: "#dc2626", bg: "#fee2e2" };
    case "high":
      return { color: "#ea580c", bg: "#ffedd5" };
    case "medium":
      return { color: "#d97706", bg: "#fef3c7" };
    case "low":
      return { color: "#16a34a", bg: "#dcfce7" };
    default:
      return { color: "#6b7280", bg: "#f3f4f6" };
  }
}

function getStatusColor(status) {
  switch (status) {
    case "pending_inventory":
      return { color: "#1d4ed8", bg: "#dbeafe" };
    case "active":
      return { color: "#0f766e", bg: "#ccfbf1" };
    case "allocated":
      return { color: "#166534", bg: "#dcfce7" };
    case "monitoring":
      return { color: "#d97706", bg: "#fef3c7" };
    case "resolved":
      return { color: "#0891b2", bg: "#cffafe" };
    default:
      return { color: "#6b7280", bg: "#f3f4f6" };
  }
}

function formatStatusLabel(status) {
  if (!status) return "UNKNOWN";
  return String(status)
    .split("_")
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function formatEventDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

export default function AllocationPage() {
  const [inventory, setInventory] = useState([]);
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [eventsError, setEventsError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [allocationError, setAllocationError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [predictedResources, setPredictedResources] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [allocationModal, setAllocationModal] = useState(false);
  const [predictionPreviewModal, setPredictionPreviewModal] = useState(false);
  const [predictionPreviewEvent, setPredictionPreviewEvent] = useState(null);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [existingAllocation, setExistingAllocation] = useState(null);

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending_inventory", label: "Pending Allocation" },
    { value: "allocated", label: "Allocated" },
    { value: "monitoring", label: "Monitoring" },
  ];

  const loadPageData = async (showRefreshedMessage = false) => {
    setIsLoadingData(true);
    setEventsError("");
    setInventoryError("");

    try {
      const [reportsResult, inventoryResult] = await Promise.allSettled([
        fetchDisasterReports(),
        fetchInventoryItems(),
      ]);

      if (reportsResult.status === "fulfilled") {
        setDisasterEvents(Array.isArray(reportsResult.value) ? reportsResult.value : []);
      } else {
        setDisasterEvents([]);
        setEventsError(reportsResult.reason?.message || "Failed to load disaster reports from the backend.");
      }

      if (inventoryResult.status === "fulfilled") {
        setInventory(Array.isArray(inventoryResult.value) ? inventoryResult.value : []);
      } else {
        setInventory([]);
        setInventoryError(inventoryResult.reason?.message || "Failed to load inventory from the backend.");
      }

      if (showRefreshedMessage) {
        setActionMessage("Allocation queue refreshed.");
      }
    } catch (error) {
      const message = error.message || "Failed to load synchronized disaster and inventory data.";
      setDisasterEvents([]);
      setInventory([]);
      setEventsError(message);
      setInventoryError(message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getRequestedItems = (event) => {
    if (Array.isArray(event?.requiredItems) && event.requiredItems.length > 0) {
      return event.requiredItems
        .map((item) => ({
          inventoryItemId: String(item.inventoryItemId || ""),
          itemName: String(item.itemName || "").trim(),
          category: String(item.category || "").trim(),
          requiredQuantity: Number(item.requiredQuantity || 0),
        }))
        .filter((item) => item.inventoryItemId && item.itemName);
    }

    const needs = Array.isArray(event?.immediateNeeds) ? event.immediateNeeds : [];
    return needs
      .map((need) => {
        const matched = inventory.find(
          (item) => String(item.name || "").toLowerCase() === String(need || "").toLowerCase()
        );

        if (!matched) {
          return null;
        }

        return {
          inventoryItemId: String(matched.id || matched._id || ""),
          itemName: matched.name,
          category: matched.category,
          requiredQuantity: 0,
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    loadPageData(false);
  }, []);

  const filteredEvents = disasterEvents.filter(event => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      event.location?.toLowerCase().includes(query) ||
      event.disasterType?.toLowerCase().includes(query) ||
      event.reportedBy?.toLowerCase().includes(query);
    const matchesFilter = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalEvents: disasterEvents.length,
    activeEvents: disasterEvents.filter(e => e.status === "active").length,
    pendingEvents: disasterEvents.filter(e => e.status === "pending_inventory").length,
    allocatedEvents: disasterEvents.filter(e => e.status === "allocated").length,
    criticalEvents: disasterEvents.filter(e => e.priority === "critical").length,
    lowStockItems: inventory.filter(item => item.stock < item.min).length
  };

  const findEventById = (eventId) =>
    disasterEvents.find((event) => String(event.id) === String(eventId));

  const fetchPredictionForEvent = async (event) => {
    if (!event) {
      setPredictedResources(null);
      return;
    }

    try {
      setPredictionLoading(true);
      setPredictionError("");
      const prediction = await getResourcePrediction({
        disasterType: event.disasterType,
        severity: String(event.severity || event.priority || "medium").toLowerCase(),
        affectedPopulation: Number(event.affectedPopulation || 0),
        disasterId: event.id,
        location: event.location,
      });
      setPredictedResources(prediction || null);
    } catch (error) {
      setPredictedResources(null);
      setPredictionError(error.message || "Failed to load prediction.");
    } finally {
      setPredictionLoading(false);
    }
  };

  const handlePreviewPrediction = async (eventId) => {
    const event = findEventById(eventId);
    if (!event) return;

    setPredictionPreviewEvent(event);
    setPredictionPreviewModal(true);
    await fetchPredictionForEvent(event);
  };

  const closePredictionPreview = () => {
    setPredictionPreviewModal(false);
    setPredictionPreviewEvent(null);
  };

  const handleQuantityChange = (inventoryItemId, value) => {
    const parsed = Number(value);
    const qty = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;

    setAllocationQuantities((prev) => ({
      ...prev,
      [inventoryItemId]: qty,
    }));
  };

  const applyPredictionAsSuggestion = () => {
    if (!selectedEvent || !predictedResources) return;

    const suggestion = {};
    const requestedItems = getRequestedItems(selectedEvent);

    requestedItems.forEach((item) => {
      const normalizedName = String(item.itemName || "").toLowerCase();
      const normalizedCategory = String(item.category || "").toLowerCase();

      if (normalizedCategory === "water" || normalizedName.includes("water")) {
        suggestion[item.inventoryItemId] = Number(predictedResources.waterNeeded || 0);
      } else if (
        normalizedCategory === "food" ||
        normalizedName.includes("food") ||
        normalizedName.includes("ration")
      ) {
        suggestion[item.inventoryItemId] = Number(predictedResources.foodNeeded || 0);
      } else if (
        normalizedCategory === "medical" ||
        normalizedName.includes("medicine") ||
        normalizedName.includes("medical")
      ) {
        suggestion[item.inventoryItemId] = Number(predictedResources.medicineNeeded || 0);
      } else {
        suggestion[item.inventoryItemId] = Number(allocationQuantities[item.inventoryItemId] || 0);
      }
    });

    setAllocationQuantities((prev) => ({ ...prev, ...suggestion }));
  };

  const deleteAllocationForEvent = async (event, promptConfirm = true) => {
    if (!event || !event.allocatedResources) return;

    if (promptConfirm) {
      const accepted = window.confirm(
        "Are you sure you want to delete this allocation? This will return allocated resources to inventory."
      );
      if (!accepted) return;
    }

    setIsProcessing(true);
    setActionError("");
    setActionMessage("");

    try {
      const allocation = event.allocatedResources;
      const updatedInventory = inventory.map((item) => {
        const itemId = String(item.id || item._id || "");
        const allocatedQty = Number(allocation.quantities?.[itemId] || 0);
        return { ...item, stock: item.stock + allocatedQty };
      });

      const updatedEvents = disasterEvents.map((candidate) =>
        String(candidate.id) === String(event.id)
          ? { ...candidate, status: "active", allocatedResources: null }
          : candidate
      );

      setInventory(updatedInventory);
      setDisasterEvents(updatedEvents);
      setAllocationModal(false);
      setSelectedEvent(null);
      setExistingAllocation(null);
      setAllocationQuantities({});
      setAllocationMessage("");
      setActionMessage("Allocation deleted and inventory restored.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeAllocation = (eventId) => {
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");

    try {
      const updatedEvents = disasterEvents.map((event) =>
        String(event.id) === String(eventId)
          ? { ...event, status: "monitoring" }
          : event
      );

      setDisasterEvents(updatedEvents);
      setActionMessage("Allocation moved to monitoring stage.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAllocationReport = (event) => {
    const allocation = event?.allocatedResources || {};
    const quantities = allocation.quantities || {};
    const lines = Object.entries(quantities).map(([item, qty]) => `- ${item}: ${qty}`);

    const reportText = [
      "Resource Allocation Report",
      `Event ID: ${event?.id || "-"}`,
      `Disaster: ${event?.disasterType || "-"}`,
      `Location: ${event?.location || "-"}`,
      `Status: ${formatStatusLabel(event?.status)}`,
      `Allocated By: ${allocation.allocatedBy || "Allocation Officer"}`,
      `Allocated Date: ${formatEventDate(allocation.allocatedDate)}`,
      "",
      "Allocated Items:",
      ...(lines.length ? lines : ["- No line items available"]),
      "",
      `Notes: ${allocation.message || "-"}`,
    ].join("\n");

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `allocation-report-${event?.id || "event"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleAllocate = (eventId) => {
    const event = findEventById(eventId);
    if (!event) return;
    setSelectedEvent(event);
    
    // Check if there's an existing allocation
    if (event.allocatedResources) {
      setExistingAllocation(event.allocatedResources);
      setAllocationQuantities(event.allocatedResources.quantities || {});
      setAllocationMessage(event.allocatedResources.message || "");
    } else {
      setExistingAllocation(null);
      setAllocationQuantities({});
      setAllocationMessage("");
    }
    
    setAllocationModal(true);
    fetchPredictionForEvent(event);
  };

  const confirmAllocation = async () => {
    if (!selectedEvent) return;
    
    setIsProcessing(true);
    setActionError("");
    setActionMessage("");

    try {
      const requestedItems = getRequestedItems(selectedEvent);

      // Update inventory stock based on allocation quantities
      const updatedInventory = inventory.map(item => {
        const itemId = String(item.id || item._id || "");
        const allocatedQty = allocationQuantities[itemId] || 0;
        const existingQty = existingAllocation?.quantities?.[itemId] || 0;
        const stockChange = allocatedQty - existingQty;
        const newStock = Math.max(0, item.stock - stockChange);
        return { ...item, stock: newStock };
      });

      const lineItems = requestedItems
        .map((item) => ({
          itemId: item.inventoryItemId,
          itemName: item.itemName,
          category: item.category,
          quantity: Number(allocationQuantities[item.inventoryItemId] || 0),
        }))
        .filter((item) => item.quantity > 0);
      
      // Create allocation record
      const allocationRecord = {
        quantities: allocationQuantities,
        lineItems,
        message: allocationMessage,
        allocatedDate: new Date().toISOString(),
        allocatedBy: "Allocation Officer"
      };
      
      // Update event with allocation
      const updatedEvents = disasterEvents.map(event => 
        event.id === selectedEvent.id 
          ? { 
                ...event, 
                status: "allocated",
                allocatedResources: allocationRecord
              }
          : event
      );
      
      // Save allocation to backend
      await upsertAllocationForReport(selectedEvent.id, {
        hasExistingAllocation: Boolean(existingAllocation),
        quantities: allocationQuantities,
        lineItems,
        message: allocationMessage,
        allocatedBy: "Allocation Officer"
      });
      
      setInventory(updatedInventory);
      setDisasterEvents(updatedEvents);
      setAllocationModal(false);
      setSelectedEvent(null);
      setAllocationQuantities({});
      setAllocationMessage("");
      setExistingAllocation(null);
      setActionMessage("Allocation confirmed and status updated to 'allocated'");
      
      // Trigger notification for new allocation
      const notification = {
        type: 'allocation_confirmed',
        message: `New allocation confirmed for ${selectedEvent.disasterType} at ${selectedEvent.location}`,
        eventId: selectedEvent.id,
        timestamp: new Date().toISOString()
      };
      
      // Store notification in localStorage for navbar to pick up
      const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      existingNotifications.unshift(notification);
      localStorage.setItem('notifications', JSON.stringify(existingNotifications.slice(0, 50)));
      
      // Trigger notification refresh in navbar
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    } catch (error) {
      setActionError(error.message || "Failed to confirm allocation");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateAllocation = async () => {
    if (!selectedEvent || !existingAllocation) return;
    setAllocationError("");
    
    // Update inventory stock based on quantity changes
    const requestedItems = getRequestedItems(selectedEvent);

    const updatedInventory = inventory.map(item => {
      const itemId = String(item.id || item._id || "");
      const newQty = allocationQuantities[itemId] || 0;
      const oldQty = existingAllocation.quantities[itemId] || 0;
      const stockChange = newQty - oldQty;
      const newStock = item.stock - stockChange;
      return { ...item, stock: Math.max(0, newStock) };
    });

    const lineItems = requestedItems
      .map((item) => ({
        itemId: item.inventoryItemId,
        itemName: item.itemName,
        category: item.category,
        quantity: Number(allocationQuantities[item.inventoryItemId] || 0),
      }))
      .filter((item) => item.quantity > 0);
    
    // Update allocation record
    const updatedAllocation = {
      ...existingAllocation,
      quantities: allocationQuantities,
      lineItems,
      message: allocationMessage,
      lastUpdated: new Date().toISOString()
    };
    
    // Update event
    const updatedEvents = disasterEvents.map(event => 
      event.id === selectedEvent.id 
        ? { ...event, allocatedResources: updatedAllocation }
        : event
    );
    
    try {
      await upsertAllocationForReport(selectedEvent.id, {
        hasExistingAllocation: true,
        quantities: allocationQuantities,
        lineItems,
        message: allocationMessage,
        allocatedBy: "Allocation Officer",
      });

      setInventory(updatedInventory);
      setDisasterEvents(updatedEvents);
      setAllocationModal(false);
      setSelectedEvent(null);
      setAllocationQuantities({});
      setAllocationMessage("");
      setExistingAllocation(null);
    } catch (error) {
      setAllocationError(error.message || "Failed to update allocation.");
    }
  };

  const deleteAllocation = async () => {
    if (!selectedEvent || !existingAllocation) return;
    setAllocationError("");
    const reportId = selectedEvent.id;
    
    // Return allocated quantities to inventory
    const updatedInventory = inventory.map(item => {
      const itemId = String(item.id || item._id || "");
      const allocatedQty = existingAllocation.quantities[itemId] || 0;
      return { ...item, stock: item.stock + allocatedQty };
    });
    
    // Remove allocation from event
    const updatedEvents = disasterEvents.map(event => 
      event.id === selectedEvent.id 
        ? { 
            ...event, 
            status: "active",
            allocatedResources: null
          }
        : event
    );
    
    try {
      await clearAllocationForReport(reportId, {
        message: "Allocation cleared",
      });

      setInventory(updatedInventory);
      setDisasterEvents(updatedEvents);
      setAllocationModal(false);
      setSelectedEvent(null);
      setAllocationQuantities({});
      setAllocationMessage("");
      setExistingAllocation(null);
    } catch (error) {
      setAllocationError(error.message || "Failed to clear allocation from backend.");
    }
  };

  const handleDeleteAllocationFromTable = async (eventId) => {
    const event = disasterEvents.find((candidate) => candidate.id === eventId);
    if (!event || !event.allocatedResources) {
      setActionError("Allocation record was not found for this report.");
      return;
    }

    if (event.status !== "allocated") {
      setActionError("Only allocated reports can be deleted.");
      return;
    }

    await deleteAllocationForEvent(event, false);
  };

  const getAvailableStock = (inventoryItemId) => {
    const item = inventory.find(inv => String(inv.id || inv._id || "") === String(inventoryItemId));
    const itemId = String(item?.id || item?._id || "");
    const allocatedQty = existingAllocation?.quantities?.[itemId] || 0;
    return item ? item.stock + allocatedQty : 0;
  };

  return (
    <div className="allocation-page">
      <PageHeader
        role="Allocation Officer / Resource Planning"
        title="Resource Allocation"
        description="Receive DMC requests, allocate from live inventory, and synchronize status updates across departments"
      />

      {actionMessage && <div className="allocation-inline-alert success">{actionMessage}</div>}
      {actionError && <div className="allocation-inline-alert error">{actionError}</div>}

      <div className="allocation-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff" }}>
            <Users size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <h3>Total Events</h3>
            <p>{stats.totalEvents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7" }}>
            <Clock size={24} color="#d97706" />
          </div>
          <div className="stat-content">
            <h3>Pending Queue</h3>
            <p>{stats.pendingEvents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7" }}>
            <CheckCircle size={24} color="#16a34a" />
          </div>
          <div className="stat-content">
            <h3>Allocated</h3>
            <p>{stats.allocatedEvents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fee2e2" }}>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div className="stat-content">
            <h3>Low Stock Items</h3>
            <p>{stats.lowStockItems}</p>
          </div>
        </div>
      </div>

      <div className="allocation-inventory-section">
        <h2>
          <Package size={24} color="#2563eb" />
          Current Inventory Status
        </h2>
        <div className="allocation-inventory-grid">
          {inventory.map(item => {
            const status = getStatus(item.stock, item.min);
            const canAllocate = item.stock > 0;
            
            return (
              <div key={item.id} className="allocation-inventory-item">
                <div className="item-header">
                  <div className="item-info">
                    <h3>{item.name}</h3>
                    <span className="category">{item.category}</span>
                  </div>
                  <div className="stock-info">
                    <div className="stock-amount">{item.stock}</div>
                    <div className="min-label">Minimum: {item.min}</div>
                  </div>
                </div>
                <div className="status-info">
                  <span className={`status-badge ${status.label.toLowerCase()}`} style={{ color: status.color, background: status.bg }}>
                    {status.label}
                  </span>
                  <span className="availability" style={{ color: canAllocate ? '#16a34a' : '#dc2626' }}>
                    {canAllocate ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="allocation-filters-section">
        <div className="allocation-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by location, disaster type, or reporting officer..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="allocation-filter-buttons">
          {statusFilters.map((status) => (
            <button
              key={status.value}
              className={`allocation-filter-btn ${filterStatus === status.value ? "active" : ""}`}
              onClick={() => setFilterStatus(status.value)}
            >
              {status.label}
            </button>
          ))}
          <button
            className="allocation-filter-btn"
            onClick={() => loadPageData(false)}
            disabled={isProcessing}
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="allocation-requests-section">
        <h2>DMC Disaster Events</h2>
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Disaster Type</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Reported By</th>
                <th>Requested Needs</th>
                <th>Event Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingData ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading synced DMC and inventory data...
                  </td>
                </tr>
              ) : eventsError ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
                    {eventsError}
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No disaster events found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const priorityStyle = getUrgencyColor(event.priority);
                  const statusStyle = getStatusColor(event.status);
                  const canAllocate = ["active", "pending_inventory"].includes(event.status);
                  const needs = getRequestedItems(event);
                  
                  return (
                    <tr key={event.id}>
                      <td><span className="request-id">{event.id}</span></td>
                      <td><span className="disaster-type">{event.disasterType}</span></td>
                      <td>
                        <div className="location-info">
                          <MapPin size={14} />
                          {event.location}
                        </div>
                      </td>
                      <td>
                        <span className="urgency-badge" style={{ color: priorityStyle.color, background: priorityStyle.bg }}>
                          {String(event.priority || "unknown").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="contact-name">{event.reportedBy || "DMC Officer"}</div>
                          <div className="contact-email">{event.contactEmail || "-"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="items-summary">
                          {needs.length === 0 ? (
                            <div className="item-line">No items listed</div>
                          ) : (
                            needs.map((need, idx) => (
                              <div key={idx} className="item-line">
                                {need.itemName} ({need.category})
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          <Calendar size={14} />
                          {formatEventDate(event.eventDate)}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: statusStyle.color, background: statusStyle.bg }}>
                          {formatStatusLabel(event.status)}
                        </span>
                      </td>
                      <td>
                        <div className="allocation-table-actions">
                          <button
                            className="update-btn"
                            onClick={() => handlePreviewPrediction(event.id)}
                            disabled={isProcessing}
                          >
                            Predict
                          </button>

                          {["active", "pending_inventory"].includes(event.status) && (
                            <button
                              className="allocate-btn"
                              onClick={() => handleAllocate(event.id)}
                              disabled={isProcessing || !!inventoryError || inventory.length === 0}
                            >
                              <ArrowRight size={14} /> Allocate
                            </button>
                          )}

                          {event.status === "allocated" && (
                            <div className="allocated-actions">
                              <button
                                className="update-btn"
                                onClick={() => handleAllocate(event.id)}
                                disabled={isProcessing || !!inventoryError || inventory.length === 0}
                              >
                                <ArrowRight size={14} /> Manage
                              </button>
                              <button
                                className="finalize-btn"
                                onClick={() => finalizeAllocation(event.id)}
                                disabled={isProcessing}
                              >
                                <CheckCircle size={14} /> Mark Monitoring
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => handleDeleteAllocationFromTable(event.id)}
                                disabled={isProcessing}
                              >
                                Delete
                              </button>
                              <button
                                className="finalize-btn"
                                onClick={() => handleExportAllocationReport(event)}
                                disabled={isProcessing}
                              >
                                Export Report
                              </button>
                            </div>
                          )}

                          {event.status === "monitoring" && (
                            <span className="monitoring-text">Monitoring</span>
                          )}

                          {event.status === "active" && (
                            <span className="monitoring-text">Awaiting DMC Queue</span>
                          )}

                          {event.status === "resolved" && (
                            <span className="monitoring-text">Resolved</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {predictionPreviewModal && predictionPreviewEvent && (
        <div className="modal-overlay" onClick={closePredictionPreview}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Prediction Preview</h2>
              <button className="close-btn" onClick={closePredictionPreview}>x</button>
            </div>

            <div className="modal-body">
              <div className="request-summary">
                <h3>Disaster Event Details</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Event ID:</span>
                    <strong>{predictionPreviewEvent.id}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Disaster:</span>
                    <strong>{predictionPreviewEvent.disasterType}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Location:</span>
                    <strong>{predictionPreviewEvent.location}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Priority:</span>
                    <strong>{String(predictionPreviewEvent.priority || "-").toUpperCase()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Affected Population:</span>
                    <strong>{Number(predictionPreviewEvent.affectedPopulation || 0).toLocaleString()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Status:</span>
                    <strong>{formatStatusLabel(predictionPreviewEvent.status)}</strong>
                  </div>
                </div>
              </div>

              <div className="allocation-prediction-section">
                <h3>Prediction-Based Recommendation</h3>

                {predictionLoading ? (
                  <p className="allocation-info-inline">Loading predicted resource recommendation...</p>
                ) : predictionError ? (
                  <p className="allocation-error-inline">{predictionError}</p>
                ) : predictedResources ? (
                  <div className="prediction-grid">
                    <div className="prediction-card">
                      <span className="prediction-label">Food Needed</span>
                      <strong>{Number(predictedResources.foodNeeded || 0).toLocaleString()}</strong>
                    </div>

                    <div className="prediction-card">
                      <span className="prediction-label">Water Needed</span>
                      <strong>{Number(predictedResources.waterNeeded || 0).toLocaleString()}</strong>
                    </div>

                    <div className="prediction-card">
                      <span className="prediction-label">Medicine Needed</span>
                      <strong>{Number(predictedResources.medicineNeeded || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="allocation-info-inline">No prediction available.</p>
                )}

                <div className="prediction-note">
                  This preview is available before allocation is created. Use Allocate/Manage
                  actions when you are ready to set final quantities.
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closePredictionPreview}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {allocationModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setAllocationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{existingAllocation ? 'Manage Allocation' : 'Allocate Resources'}</h2>
              <button className="close-btn" onClick={() => setAllocationModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {allocationError && (
                <div style={{ marginBottom: "16px", color: "#dc2626", fontWeight: 700 }}>
                  {allocationError}
                </div>
              )}

              <div className="request-summary">
                <h3>Disaster Event Details</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Event ID:</span>
                    <strong>{selectedEvent.id}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Disaster:</span>
                    <strong>{selectedEvent.disasterType}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Location:</span>
                    <strong>{selectedEvent.location}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Priority:</span>
                    <strong>{String(selectedEvent.priority || "unknown").toUpperCase()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Affected Population:</span>
                    <strong>{Number(selectedEvent.affectedPopulation || 0).toLocaleString()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Reported By:</span>
                    <strong>{selectedEvent.reportedBy}</strong>
                  </div>
                </div>
              </div>

              <div className="allocation-requested-needs">
                <h3>DMC Requested Needs</h3>
                <div className="items-summary">
                  {getRequestedItems(selectedEvent).length > 0 ? (
                    getRequestedItems(selectedEvent).map((need, idx) => (
                      <div key={`${selectedEvent.id}-modal-need-${idx}`} className="item-line">
                        {need.itemName} ({need.category})
                      </div>
                    ))
                  ) : (
                    <div className="item-line">No specific needs listed by DMC.</div>
                  )}
                </div>
              </div>

              <div className="allocation-prediction-section">
                <h3>Prediction-Based Recommendation</h3>

                {predictionLoading ? (
                  <p className="allocation-info-inline">Loading predicted resource recommendation...</p>
                ) : predictionError ? (
                  <p className="allocation-error-inline">{predictionError}</p>
                ) : predictedResources ? (
                  <>
                    <div className="prediction-grid">
                      <div className="prediction-card">
                        <span className="prediction-label">Food Needed</span>
                        <strong>{Number(predictedResources.foodNeeded || 0).toLocaleString()}</strong>
                      </div>

                      <div className="prediction-card">
                        <span className="prediction-label">Water Needed</span>
                        <strong>{Number(predictedResources.waterNeeded || 0).toLocaleString()}</strong>
                      </div>

                      <div className="prediction-card">
                        <span className="prediction-label">Medicine Needed</span>
                        <strong>{Number(predictedResources.medicineNeeded || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="prediction-actions">
                      <button
                        type="button"
                        className="prediction-apply-btn"
                        onClick={applyPredictionAsSuggestion}
                        disabled={isProcessing}
                      >
                        Use Prediction as Suggested Allocation
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="allocation-info-inline">No prediction available.</p>
                )}

                <div className="prediction-note">
                  These values are system-generated recommendations based on disaster type,
                  severity, and affected population. The Allocation Officer can adjust final
                  quantities according to current inventory availability.
                </div>
              </div>

              <div className="allocation-details">
                <h3>Resource Allocation</h3>
                {getRequestedItems(selectedEvent).map((need, index) => {
                  const available = getAvailableStock(need.inventoryItemId);
                  const currentQty = allocationQuantities[need.inventoryItemId] || 0;
                  const hasStock = currentQty <= available;

                  return (
                    <div key={`${selectedEvent.id}-allocation-${index}`} className="allocation-item">
                      <div className="item-info">
                        <span className="item-name">{need.itemName}</span>
                        <span className="item-quantity">Available: {available.toLocaleString()}</span>
                      </div>
                      <div className="quantity-input">
                        <input
                          type="number"
                          min="0"
                          max={Math.max(available, 0)}
                          value={currentQty}
                          onChange={(event) => handleQuantityChange(need.inventoryItemId, event.target.value)}
                          className={hasStock ? "valid" : "invalid"}
                        />
                        <span className="unit-label">units</span>
                      </div>
                      <div className="stock-info">
                        <span className={`available-stock ${hasStock ? "sufficient" : "insufficient"}`}>
                          {hasStock ? "Available" : "Insufficient"}
                        </span>
                        {!hasStock && <AlertTriangle size={16} color="#dc2626" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="message-section">
                <h3>Allocation Notes</h3>
                <textarea
                  value={allocationMessage}
                  onChange={(event) => setAllocationMessage(event.target.value)}
                  placeholder="Add handling notes, handover instructions, or location specific details..."
                  className="message-textarea"
                  rows="4"
                  maxLength={MAX_ALLOCATION_NOTE_LENGTH}
                />
              </div>

              {existingAllocation && (
                <div className="allocation-info">
                  <h4>Current Allocation Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span>Allocated Date:</span>
                      <strong>{formatEventDate(existingAllocation.allocatedDate)}</strong>
                    </div>
                    <div className="info-item">
                      <span>Allocated By:</span>
                      <strong>{existingAllocation.allocatedBy || "Allocation Officer"}</strong>
                    </div>
                    {existingAllocation.lastUpdated && (
                      <div className="info-item">
                        <span>Last Updated:</span>
                        <strong>{formatEventDate(existingAllocation.lastUpdated)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="warning-message">
                <AlertTriangle size={16} color="#d97706" />
                <span>
                  Saving this allocation will update inventory stock and sync the status for DMC officers.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAllocationModal(false)}>
                Cancel
              </button>

              {existingAllocation ? (
                <>
                  <button 
                    className="btn-primary"
                    onClick={updateAllocation}
                  >
                    Update Allocation
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this allocation? This will return all allocated resources to inventory and cannot be undone.')) {
                        deleteAllocation();
                      }
                    }}
                  >
                    Delete Allocation
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary"
                  onClick={confirmAllocation}
                  disabled={Object.values(allocationQuantities).every(qty => qty === 0)}
                >
                  Confirm Allocation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
