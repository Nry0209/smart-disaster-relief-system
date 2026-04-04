import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Search,
  MapPin,
  Calendar,
  RefreshCcw,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { fetchDisasterReports, updateDisasterReport } from "../services/disasterReportService";
import { fetchInventoryItems, adjustInventoryStock } from "../services/inventoryService";
import "./Pages.css";

function getStatus(stock, min) {
  const ratio = min > 0 ? stock / min : 1;
  if (ratio >= 1) return { label: "Good", color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning", color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low", color: "#ea580c", bg: "#ffedd5" };
  return { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
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

function normalizeAllocationQuantities(allocation, inventoryItems) {
  if (!allocation || !inventoryItems.length) {
    return {};
  }

  const normalized = {};
  const rawQuantities =
    allocation.quantities && typeof allocation.quantities === "object"
      ? allocation.quantities
      : {};

  inventoryItems.forEach((item) => {
    const byId = Number(rawQuantities[item.id]);
    const byName = Number(rawQuantities[item.name]);

    if (Number.isFinite(byId) && byId > 0) {
      normalized[item.id] = byId;
      return;
    }

    if (Number.isFinite(byName) && byName > 0) {
      normalized[item.id] = byName;
    }
  });

  if (Array.isArray(allocation.lineItems)) {
    allocation.lineItems.forEach((lineItem) => {
      const qty = Number(lineItem.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return;
      }

      const matchedItem =
        inventoryItems.find((item) => item.id === lineItem.itemId) ||
        inventoryItems.find(
          (item) => item.name.toLowerCase() === String(lineItem.itemName || "").toLowerCase()
        );

      if (matchedItem) {
        normalized[matchedItem.id] = qty;
      }
    });
  }

  return normalized;
}

function buildAllocationRecord(quantitiesByItemId, inventoryItems, message, existingAllocation) {
  const lineItems = [];
  const quantities = {};

  inventoryItems.forEach((item) => {
    const qty = Number(quantitiesByItemId[item.id] || 0);

    if (!Number.isFinite(qty) || qty <= 0) {
      return;
    }

    quantities[item.id] = qty;
    lineItems.push({
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      category: item.category,
    });
  });

  return {
    quantities,
    lineItems,
    message: String(message || "").trim(),
    allocatedDate: existingAllocation?.allocatedDate || new Date().toISOString(),
    allocatedBy: existingAllocation?.allocatedBy || "Allocation Officer",
    lastUpdated: new Date().toISOString(),
  };
}

function reverseAction(actionType) {
  if (actionType === "consume") return "restock";
  if (actionType === "restock") return "consume";
  return actionType;
}

export default function AllocationPage() {
  const [inventory, setInventory] = useState([]);
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [eventsError, setEventsError] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending_inventory");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allocationModal, setAllocationModal] = useState(false);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "pending_inventory", label: "Pending Allocation" },
    { value: "allocated", label: "Allocated" },
    { value: "monitoring", label: "Monitoring" },
    { value: "resolved", label: "Resolved" },
  ];

  const loadPageData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoadingData(true);
    }

    setEventsError("");
    setInventoryError("");

    const [reportsResult, inventoryResult] = await Promise.allSettled([
      fetchDisasterReports(),
      fetchInventoryItems(),
    ]);

    if (reportsResult.status === "fulfilled") {
      setDisasterEvents(Array.isArray(reportsResult.value) ? reportsResult.value : []);
    } else {
      setDisasterEvents([]);
      setEventsError(reportsResult.reason?.message || "Failed to load disaster events.");
    }

    if (inventoryResult.status === "fulfilled") {
      setInventory(Array.isArray(inventoryResult.value) ? inventoryResult.value : []);
    } else {
      setInventory([]);
      setInventoryError(inventoryResult.reason?.message || "Failed to load inventory items.");
    }

    if (showLoader) {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadPageData(true);
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return disasterEvents.filter((event) => {
      const matchesSearch =
        !query ||
        event.location?.toLowerCase().includes(query) ||
        event.disasterType?.toLowerCase().includes(query) ||
        event.reportedBy?.toLowerCase().includes(query);

      const matchesFilter = filterStatus === "all" || event.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [disasterEvents, filterStatus, searchTerm]);

  const stats = useMemo(
    () => ({
      totalEvents: disasterEvents.length,
      pendingEvents: disasterEvents.filter((event) => event.status === "pending_inventory").length,
      allocatedEvents: disasterEvents.filter((event) => event.status === "allocated").length,
      criticalEvents: disasterEvents.filter((event) => event.priority === "critical").length,
      lowStockItems: inventory.filter((item) => Number(item.stock || 0) < Number(item.min || 0)).length,
    }),
    [disasterEvents, inventory]
  );

  const existingQuantities = useMemo(
    () => normalizeAllocationQuantities(existingAllocation, inventory),
    [existingAllocation, inventory]
  );

  const closeModal = () => {
    setAllocationModal(false);
    setSelectedEvent(null);
    setExistingAllocation(null);
    setAllocationQuantities({});
    setAllocationMessage("");
  };

  const handleAllocate = (eventId) => {
    const event = disasterEvents.find((candidate) => candidate.id === eventId);
    if (!event) {
      return;
    }

    const existing = event.allocatedResources || null;

    setSelectedEvent(event);
    setExistingAllocation(existing);
    setAllocationQuantities(normalizeAllocationQuantities(existing, inventory));
    setAllocationMessage(existing?.message || "");
    setAllocationModal(true);
  };

  const handleQuantityChange = (itemId, value) => {
    const parsed = Number.parseInt(value, 10);
    const quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

    setAllocationQuantities((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
  };

  const getAvailableStock = (item) => {
    const stock = Number(item.stock || 0);
    const previouslyAllocated = Number(existingQuantities[item.id] || 0);
    return stock + previouslyAllocated;
  };

  const validateAllocation = () => {
    let selectedCount = 0;

    for (const item of inventory) {
      const qty = Number(allocationQuantities[item.id] || 0);
      if (!Number.isFinite(qty) || qty < 0) {
        return `Invalid quantity for ${item.name}.`;
      }

      if (qty > 0) {
        selectedCount += 1;
      }

      if (qty > getAvailableStock(item)) {
        return `Insufficient stock for ${item.name}.`;
      }
    }

    if (selectedCount === 0) {
      return "Add at least one resource quantity before confirming allocation.";
    }

    return "";
  };

  const buildDeltaOperations = (eventId) => {
    const operations = [];

    inventory.forEach((item) => {
      const previousQty = Number(existingQuantities[item.id] || 0);
      const nextQty = Number(allocationQuantities[item.id] || 0);
      const delta = nextQty - previousQty;

      if (delta > 0) {
        operations.push({
          itemId: item.id,
          itemName: item.name,
          actionType: "consume",
          quantity: delta,
          note: `Allocation for report ${eventId}`,
        });
      }

      if (delta < 0) {
        operations.push({
          itemId: item.id,
          itemName: item.name,
          actionType: "restock",
          quantity: Math.abs(delta),
          note: `Allocation adjustment for report ${eventId}`,
        });
      }
    });

    return operations;
  };

  const applyInventoryOperations = async (operations) => {
    const applied = [];

    for (const operation of operations) {
      await adjustInventoryStock(operation.itemId, {
        actionType: operation.actionType,
        quantity: operation.quantity,
        note: operation.note,
        performedBy: "Allocation Officer",
      });

      applied.push(operation);
    }

    return applied;
  };

  const rollbackInventoryOperations = async (operations, eventId) => {
    let rollbackFailed = false;

    for (const operation of [...operations].reverse()) {
      try {
        await adjustInventoryStock(operation.itemId, {
          actionType: reverseAction(operation.actionType),
          quantity: operation.quantity,
          note: `Rollback for report ${eventId}`,
          performedBy: "System",
        });
      } catch (error) {
        rollbackFailed = true;
      }
    }

    return rollbackFailed;
  };

  const handleSaveAllocation = async () => {
    if (!selectedEvent) {
      return;
    }

    setActionError("");
    setActionMessage("");

    const validationError = validateAllocation();
    if (validationError) {
      setActionError(validationError);
      return;
    }

    const reportId = selectedEvent.id;
    const allocationRecord = buildAllocationRecord(
      allocationQuantities,
      inventory,
      allocationMessage,
      existingAllocation
    );

    const inventoryOperations = buildDeltaOperations(reportId);

    setIsProcessing(true);

    let appliedOperations = [];

    try {
      if (inventoryOperations.length) {
        appliedOperations = await applyInventoryOperations(inventoryOperations);
      }

      const updated = await updateDisasterReport(reportId, {
        status: "allocated",
        allocatedResources: allocationRecord,
      });

      setDisasterEvents((prev) =>
        prev.map((event) => (event.id === updated.id ? updated : event))
      );

      setActionMessage(
        existingAllocation
          ? "Allocation updated and synced with inventory and DMC report."
          : "Resources allocated and synced with inventory and DMC report."
      );

      closeModal();
      await loadPageData(false);
    } catch (error) {
      if (appliedOperations.length) {
        const rollbackFailed = await rollbackInventoryOperations(appliedOperations, reportId);
        if (rollbackFailed) {
          setActionError(
            `${error.message || "Failed to save allocation."} Inventory rollback partially failed. Please verify stock manually.`
          );
        } else {
          setActionError(
            `${error.message || "Failed to save allocation."} Inventory changes were rolled back.`
          );
        }
      } else {
        setActionError(error.message || "Failed to save allocation.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getRestoreOperationsForEvent = (eventToDelete) => {
    const quantitiesByItemId = normalizeAllocationQuantities(
      eventToDelete?.allocatedResources,
      inventory
    );

    return inventory
      .map((item) => {
        const qty = Number(quantitiesByItemId[item.id] || 0);
        if (!Number.isFinite(qty) || qty <= 0) {
          return null;
        }

        return {
          itemId: item.id,
          itemName: item.name,
          actionType: "restock",
          quantity: qty,
          note: `Allocation removed for report ${eventToDelete.id}`,
        };
      })
      .filter(Boolean);
  };

  const deleteAllocationForEvent = async (eventToDelete, closeModalAfter = false) => {
    if (!eventToDelete || !eventToDelete.allocatedResources) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this allocation and return resources back to inventory?"
    );

    if (!shouldDelete) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsProcessing(true);

    const reportId = eventToDelete.id;
    const restoreOperations = getRestoreOperationsForEvent(eventToDelete);

    let appliedOperations = [];

    try {
      if (restoreOperations.length) {
        appliedOperations = await applyInventoryOperations(restoreOperations);
      }

      const updated = await updateDisasterReport(reportId, {
        status: "pending_inventory",
        allocatedResources: null,
      });

      setDisasterEvents((prev) =>
        prev.map((event) => (event.id === updated.id ? updated : event))
      );

      setActionMessage("Allocation removed and inventory restored.");

      if (closeModalAfter) {
        closeModal();
      }

      await loadPageData(false);
    } catch (error) {
      if (appliedOperations.length) {
        const rollbackFailed = await rollbackInventoryOperations(appliedOperations, reportId);
        if (rollbackFailed) {
          setActionError(
            `${error.message || "Failed to delete allocation."} Inventory rollback partially failed.`
          );
        } else {
          setActionError(
            `${error.message || "Failed to delete allocation."} Inventory changes were rolled back.`
          );
        }
      } else {
        setActionError(error.message || "Failed to delete allocation.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!selectedEvent || !existingAllocation) {
      return;
    }

    await deleteAllocationForEvent(selectedEvent, true);
  };

  const handleDeleteAllocationFromTable = async (eventId) => {
    const event = disasterEvents.find((candidate) => candidate.id === eventId);
    if (!event || !event.allocatedResources) {
      return;
    }

    await deleteAllocationForEvent(event, false);
  };

  const finalizeAllocation = async (eventId) => {
    setActionError("");
    setActionMessage("");
    setIsProcessing(true);

    try {
      const updated = await updateDisasterReport(eventId, {
        status: "monitoring",
      });

      setDisasterEvents((prev) =>
        prev.map((event) => (event.id === updated.id ? updated : event))
      );

      setActionMessage("Allocation marked for monitoring. DMC can now track fulfillment status.");
      await loadPageData(false);
    } catch (error) {
      setActionError(error.message || "Failed to update monitoring status.");
    } finally {
      setIsProcessing(false);
    }
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

        {inventoryError ? (
          <p className="allocation-error-inline">{inventoryError}</p>
        ) : isLoadingData && !inventory.length ? (
          <p className="allocation-error-inline">Loading inventory...</p>
        ) : (
          <div className="allocation-inventory-grid">
            {inventory.map((item) => {
              const status = getStatus(Number(item.stock || 0), Number(item.min || 0));
              const canAllocate = Number(item.stock || 0) > 0;

              return (
                <div key={item.id} className="allocation-inventory-item">
                  <div className="item-header">
                    <div className="item-info">
                      <h3>{item.name}</h3>
                      <span className="category">{item.category}</span>
                    </div>
                    <div className="stock-info">
                      <div className="stock-amount">{Number(item.stock || 0).toLocaleString()}</div>
                      <div className="min-label">Minimum: {Number(item.min || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="status-info">
                    <span
                      className={`status-badge ${status.label.toLowerCase()}`}
                      style={{ color: status.color, background: status.bg }}
                    >
                      {status.label}
                    </span>
                    <span className="availability" style={{ color: canAllocate ? "#16a34a" : "#dc2626" }}>
                      {canAllocate ? "Available" : "Out of Stock"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                  const needs = Array.isArray(event.immediateNeeds) ? event.immediateNeeds : [];

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
                        </div>
                      </td>
                      <td>
                        <div className="items-summary">
                          {needs.length === 0 ? (
                            <div className="item-line">No items listed</div>
                          ) : (
                            needs.map((need, idx) => (
                              <div key={`${event.id}-need-${idx}`} className="item-line">
                                {need}
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
                          {event.status === "pending_inventory" && (
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

      {allocationModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{existingAllocation ? "Manage Allocation" : "Allocate Resources"}</h2>
              <button className="close-btn" onClick={closeModal}>x</button>
            </div>

            <div className="modal-body">
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
                    <strong>{String(selectedEvent.priority || "-").toUpperCase()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Affected Population:</span>
                    <strong>{Number(selectedEvent.affectedPopulation || 0).toLocaleString()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Reported By:</span>
                    <strong>{selectedEvent.reportedBy || "DMC Officer"}</strong>
                  </div>
                </div>
              </div>

              <div className="allocation-requested-needs">
                <h3>DMC Requested Needs</h3>
                <div className="items-summary">
                  {Array.isArray(selectedEvent.immediateNeeds) && selectedEvent.immediateNeeds.length > 0 ? (
                    selectedEvent.immediateNeeds.map((need, idx) => (
                      <div key={`${selectedEvent.id}-modal-need-${idx}`} className="item-line">
                        {need}
                      </div>
                    ))
                  ) : (
                    <div className="item-line">No specific needs listed by DMC.</div>
                  )}
                </div>
              </div>

              <div className="allocation-details">
                <h3>Inventory Allocation</h3>
                {inventory.map((item) => {
                  const available = getAvailableStock(item);
                  const currentQty = Number(allocationQuantities[item.id] || 0);
                  const hasStock = currentQty <= available;

                  return (
                    <div key={item.id} className="allocation-item">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">
                          Available: {available.toLocaleString()} {item.unit || "units"}
                        </span>
                      </div>
                      <div className="quantity-input">
                        <input
                          type="number"
                          min="0"
                          max={available}
                          value={currentQty}
                          onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                          className={hasStock ? "valid" : "invalid"}
                        />
                        <span className="unit-label">{item.unit || "units"}</span>
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
              <button className="btn-secondary" onClick={closeModal} disabled={isProcessing}>
                Cancel
              </button>

              {existingAllocation ? (
                <>
                  <button className="btn-primary" onClick={handleSaveAllocation} disabled={isProcessing}>
                    {isProcessing ? "Saving..." : "Update Allocation"}
                  </button>
                  <button className="btn-danger" onClick={handleDeleteAllocation} disabled={isProcessing}>
                    {isProcessing ? "Removing..." : "Delete Allocation"}
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={handleSaveAllocation} disabled={isProcessing}>
                  {isProcessing ? "Saving..." : "Confirm Allocation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
