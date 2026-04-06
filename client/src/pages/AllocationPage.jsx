import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, Users, CheckCircle, Clock, ArrowRight, Search, MapPin, Calendar } from "lucide-react";
import { fetchDisasterReports } from "../services/disasterReportService";
import { adjustInventoryItem, fetchInventoryItems } from "../services/inventoryService";
import { clearAllocationForReport, upsertAllocationForReport } from "../services/allocationService";
import "./Pages.css";

function getStatus(stock, min) {
  const safeMin = min > 0 ? min : 1;
  const ratio = stock / safeMin;
  if (ratio >= 1)   return { label: "Good",     color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning",  color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low",      color: "#ea580c", bg: "#ffedd5" };
  return               { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function getUrgencyColor(urgency) {
  switch(urgency) {
    case 'critical': return { color: "#dc2626", bg: "#fee2e2" };
    case 'high': return { color: "#ea580c", bg: "#ffedd5" };
    case 'medium': return { color: "#d97706", bg: "#fef3c7" };
    case 'low': return { color: "#16a34a", bg: "#dcfce7" };
    default: return { color: "#6b7280", bg: "#f3f4f6" };
  }
}

function getStatusColor(status) {
  switch(status) {
    case 'pending_inventory': return { color: "#1d4ed8", bg: "#dbeafe" };
    case 'active': return { color: "#0f766e", bg: "#ccfbf1" };
    case 'allocated': return { color: "#16a34a", bg: "#dcfce7" };
    case 'monitoring': return { color: "#d97706", bg: "#fef3c7" };
    case 'resolved': return { color: "#0891b2", bg: "#cffafe" };
    case 'pending': return { color: "#d97706", bg: "#fef3c7" };
    case 'rejected': return { color: "#dc2626", bg: "#fee2e2" };
    default: return { color: "#6b7280", bg: "#f3f4f6" };
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

function normalizeRequestedResources(event) {
  const requirements = Array.isArray(event?.resourceRequirements) ? event.resourceRequirements : [];

  if (requirements.length > 0) {
    return requirements
      .map((item) => ({
        name: String(item?.name || "").trim(),
        quantity: Number(item?.quantity) > 0 ? Math.round(Number(item.quantity)) : 0,
      }))
      .filter((item) => item.name);
  }

  const immediateNeeds = Array.isArray(event?.immediateNeeds) ? event.immediateNeeds : [];
  return immediateNeeds
    .map((need) => String(need).trim())
    .filter(Boolean)
    .map((name) => ({ name, quantity: 0 }));
}

function buildInitialAllocationQuantities(event) {
  return normalizeRequestedResources(event).reduce((acc, item) => {
    if (item.quantity > 0) {
      acc[item.name] = item.quantity;
    }
    return acc;
  }, {});
}

function normalizeAllocationQuantities(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [name, quantity]) => {
    const normalizedName = String(name || "").trim();
    const normalizedQuantity = Number(quantity);

    if (!normalizedName || !Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
      return acc;
    }

    acc[normalizedName] = Math.round(normalizedQuantity);
    return acc;
  }, {});
}

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toReasonToken(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return token || "value";
}

const INVENTORY_ALIAS_MAP = {
  water: "Bottled Water",
  "meal packs": "Dry Ration",
  "medical kits": "Medicine Kits",
};

export default function AllocationPage() {
  const [inventory, setInventory] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [inventoryError, setInventoryError] = useState("");
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allocationModal, setAllocationModal] = useState(false);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);
  const [allocationError, setAllocationError] = useState("");

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "pending_inventory", label: "Pending Allocation" },
    { value: "active", label: "Active" },
    { value: "allocated", label: "Allocated" },
    { value: "monitoring", label: "Monitoring" },
  ];

  const loadDisasterEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError("");

    try {
      const reports = await fetchDisasterReports();
      setDisasterEvents(Array.isArray(reports) ? reports : []);
    } catch (error) {
      setDisasterEvents([]);
      setEventsError(error.message || "Failed to load disaster events.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    setInventoryError("");

    try {
      const items = await fetchInventoryItems();
      setInventory(Array.isArray(items) ? items : []);
    } catch (error) {
      setInventory([]);
      setInventoryError(error.message || "Failed to load inventory.");
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  useEffect(() => {
    loadDisasterEvents();
    loadInventory();
  }, [loadDisasterEvents, loadInventory]);

  const filteredEvents = useMemo(
    () =>
      disasterEvents.filter((event) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          event.location?.toLowerCase().includes(query) ||
          event.disasterType?.toLowerCase().includes(query) ||
          event.reportedBy?.toLowerCase().includes(query) ||
          event.contactPhone?.toLowerCase().includes(query) ||
          event.contactEmail?.toLowerCase().includes(query);
        const matchesFilter = filterStatus === "all" || event.status === filterStatus;
        return matchesSearch && matchesFilter;
      }),
    [disasterEvents, searchTerm, filterStatus]
  );

  const stats = useMemo(
    () => ({
      totalEvents: disasterEvents.length,
      activeEvents: disasterEvents.filter((e) => e.status === "active").length,
      allocatedEvents: disasterEvents.filter((e) => e.status === "allocated").length,
      criticalEvents: disasterEvents.filter((e) => e.priority === "critical").length,
      lowStockItems: inventory.filter((item) => item.stock < item.min).length,
    }),
    [disasterEvents, inventory]
  );

  const selectedEventRequestedResources = useMemo(
    () => normalizeRequestedResources(selectedEvent),
    [selectedEvent]
  );

  const modalResourceRows = useMemo(() => {
    const requested = selectedEventRequestedResources;
    const existingQuantities = normalizeAllocationQuantities(existingAllocation?.quantities || {});
    const names = new Set(requested.map((resource) => resource.name));

    Object.keys(existingQuantities).forEach((name) => names.add(name));

    return Array.from(names).map((name) => ({
      name,
      quantity: requested.find((resource) => resource.name === name)?.quantity || 0,
    }));
  }, [selectedEventRequestedResources, existingAllocation]);

  const findInventoryItemForNeed = useCallback(
    (resourceName) => {
      const normalizedNeed = normalizeLookupKey(resourceName);
      if (!normalizedNeed) {
        return null;
      }

      const alias = INVENTORY_ALIAS_MAP[normalizedNeed];
      if (alias) {
        const aliasItem = inventory.find(
          (item) => normalizeLookupKey(item.name) === normalizeLookupKey(alias)
        );
        if (aliasItem) {
          return aliasItem;
        }
      }

      const exactByName = inventory.find(
        (item) => normalizeLookupKey(item.name) === normalizedNeed
      );
      if (exactByName) {
        return exactByName;
      }

      const exactByCategory = inventory.find(
        (item) => normalizeLookupKey(item.category) === normalizedNeed
      );
      if (exactByCategory) {
        return exactByCategory;
      }

      const partialByName = inventory.find((item) => {
        const normalizedItemName = normalizeLookupKey(item.name);
        return (
          normalizedItemName.includes(normalizedNeed) ||
          normalizedNeed.includes(normalizedItemName)
        );
      });

      return partialByName || null;
    },
    [inventory]
  );

  const getExistingAllocationQuantity = useCallback(
    (resourceName) => {
      const normalizedNeed = normalizeLookupKey(resourceName);
      const quantities = normalizeAllocationQuantities(existingAllocation?.quantities || {});

      for (const [name, quantity] of Object.entries(quantities)) {
        if (normalizeLookupKey(name) === normalizedNeed) {
          return quantity;
        }
      }

      return 0;
    },
    [existingAllocation]
  );

  const closeAllocationModal = (forceClose = false) => {
    if (isSubmittingAllocation && !forceClose) {
      return;
    }

    setAllocationModal(false);
    setSelectedEvent(null);
    setAllocationQuantities({});
    setAllocationMessage("");
    setExistingAllocation(null);
    setAllocationError("");
    setIsSubmittingAllocation(false);
  };

  const handleAllocate = (eventId) => {
    const event = disasterEvents.find((e) => e.id === eventId);
    if (!event) {
      return;
    }

    setSelectedEvent(event);
    setAllocationError("");
    
    // Check if there's an existing allocation
    if (event.allocatedResources && typeof event.allocatedResources === "object") {
      const normalizedExisting = normalizeAllocationQuantities(event.allocatedResources.quantities || {});
      setExistingAllocation(event.allocatedResources);
      setAllocationQuantities(normalizedExisting);
      setAllocationMessage(String(event.allocatedResources.message || ""));
    } else {
      setExistingAllocation(null);
      const initialQuantities = buildInitialAllocationQuantities(event);
      const adjustedDefaults = Object.entries(initialQuantities).reduce((acc, [name, quantity]) => {
        acc[name] = findInventoryItemForNeed(name) ? quantity : 0;
        return acc;
      }, {});
      setAllocationQuantities(adjustedDefaults);
      setAllocationMessage("");
    }
    
    setAllocationModal(true);
  };

  const buildAllocationPlan = useCallback(
    (targetValues) => {
      const previousQuantities = normalizeAllocationQuantities(existingAllocation?.quantities || {});
      const targetQuantities = normalizeAllocationQuantities(targetValues);
      const resourceNames = new Set([
        ...Object.keys(previousQuantities),
        ...Object.keys(targetQuantities),
      ]);

      const operations = [];

      resourceNames.forEach((resourceName) => {
        const previousQuantity = previousQuantities[resourceName] || 0;
        const nextQuantity = targetQuantities[resourceName] || 0;

        if (previousQuantity === nextQuantity) {
          return;
        }

        const matchedInventoryItem = findInventoryItemForNeed(resourceName);
        if (!matchedInventoryItem) {
          throw new Error(
            `No matching inventory item found for "${resourceName}". Add this item in inventory first.`
          );
        }

        const inventoryDelta = previousQuantity - nextQuantity;
        const reducingStock = inventoryDelta < 0;

        if (reducingStock && matchedInventoryItem.stock < Math.abs(inventoryDelta)) {
          throw new Error(
            `Insufficient stock for "${matchedInventoryItem.name}". Available: ${matchedInventoryItem.stock}, requested additional: ${Math.abs(inventoryDelta)}.`
          );
        }

        operations.push({
          resourceName,
          item: matchedInventoryItem,
          delta: inventoryDelta,
        });
      });

      const totalAllocated = Object.values(targetQuantities).reduce(
        (sum, quantity) => sum + (Number(quantity) || 0),
        0
      );

      return {
        targetQuantities,
        operations,
        totalAllocated,
      };
    },
    [existingAllocation, findInventoryItemForNeed]
  );

  const applyInventoryOperations = async (operations, reasonPrefix) => {
    const appliedOperations = [];

    for (const operation of operations) {
      if (!operation.delta) {
        continue;
      }

      await adjustInventoryItem(operation.item.id, {
        delta: operation.delta,
        reason: `${reasonPrefix}_${toReasonToken(operation.resourceName)}`,
      });

      appliedOperations.push(operation);
    }

    return appliedOperations;
  };

  const rollbackInventoryOperations = async (operations, reasonPrefix) => {
    const reverseOperations = [...operations].reverse();

    for (const operation of reverseOperations) {
      await adjustInventoryItem(operation.item.id, {
        delta: -operation.delta,
        reason: `${reasonPrefix}_${toReasonToken(operation.resourceName)}`,
      });
    }
  };

  const persistAllocation = async ({ targetQuantities, status, clearAllocation }) => {
    if (!selectedEvent) {
      return;
    }

    setAllocationError("");
    setIsSubmittingAllocation(true);

    let appliedOperations = [];

    try {
      const { targetQuantities: normalizedQuantities, operations, totalAllocated } =
        buildAllocationPlan(targetQuantities);

      if (!clearAllocation && totalAllocated === 0) {
        throw new Error("Allocate at least one resource quantity greater than 0.");
      }

      const eventToken = toReasonToken(selectedEvent.id || "event");
      appliedOperations = await applyInventoryOperations(
        operations,
        `allocation_${eventToken}`
      );

      const nowIso = new Date().toISOString();
      const nextAllocationRecord = clearAllocation
        ? null
        : {
            ...(existingAllocation && typeof existingAllocation === "object" ? existingAllocation : {}),
            quantities: normalizedQuantities,
            message: String(allocationMessage || "").trim(),
            allocatedDate: existingAllocation?.allocatedDate || nowIso,
            allocatedBy: existingAllocation?.allocatedBy || "Allocation Officer",
            lastUpdated: existingAllocation ? nowIso : undefined,
          };

      if (nextAllocationRecord && !nextAllocationRecord.lastUpdated) {
        delete nextAllocationRecord.lastUpdated;
      }

      if (clearAllocation) {
        await clearAllocationForReport(selectedEvent.id, {
          status,
        });
      } else {
        await upsertAllocationForReport(selectedEvent.id, {
          quantities: normalizedQuantities,
          message: String(allocationMessage || "").trim(),
          allocatedBy: nextAllocationRecord.allocatedBy,
          status,
        });
      }

      await Promise.all([loadDisasterEvents(), loadInventory()]);
      closeAllocationModal(true);
    } catch (error) {
      let rollbackMessage = "";

      if (appliedOperations.length > 0) {
        try {
          await rollbackInventoryOperations(appliedOperations, "allocation_rollback");
        } catch (rollbackError) {
          rollbackMessage = ` Inventory rollback failed: ${rollbackError.message}`;
        }
      }

      setAllocationError(`${error.message || "Failed to persist allocation."}${rollbackMessage}`.trim());
      await loadInventory();
    } finally {
      setIsSubmittingAllocation(false);
    }
  };

  const confirmAllocation = async () => {
    if (!selectedEvent) return;

    await persistAllocation({
      targetQuantities: allocationQuantities,
      status: "allocated",
      clearAllocation: false,
    });
  };

  const updateAllocation = async () => {
    if (!selectedEvent || !existingAllocation) return;

    await persistAllocation({
      targetQuantities: allocationQuantities,
      status: "allocated",
      clearAllocation: false,
    });
  };

  const deleteAllocation = async () => {
    if (!selectedEvent || !existingAllocation) return;

    await persistAllocation({
      targetQuantities: {},
      status: "active",
      clearAllocation: true,
    });
  };

  const handleQuantityChange = (resourceName, value) => {
    const qty = parseInt(value) || 0;
    setAllocationQuantities(prev => ({
      ...prev,
      [resourceName]: qty
    }));
  };

  const getAvailableStock = (itemName) => {
    const item = findInventoryItemForNeed(itemName);
    const allocatedQty = getExistingAllocationQuantity(itemName);

    if (!item) {
      return allocatedQty;
    }

    return item.stock + allocatedQty;
  };

  return (
    <div className="allocation-page">
      {/* HEADER */}
      <div className="allocation-header">
        <h1>Resource Allocation</h1>
        <p>Manage and allocate resources to DMC officer requests based on available inventory</p>
      </div>

      {/* STATS CARDS */}
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
            <h3>Active</h3>
            <p>{stats.activeEvents}</p>
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
            <h3>Critical Priority</h3>
            <p>{stats.criticalEvents}</p>
          </div>
        </div>
      </div>

      {/* INVENTORY SECTION */}
      <div className="allocation-inventory-section">
        <h2>
          <Package size={24} color="#2563eb" />
          Current Inventory Status
        </h2>
        {isLoadingInventory ? (
          <div style={{ padding: "24px", color: "#64748b" }}>Loading inventory...</div>
        ) : inventoryError ? (
          <div style={{ padding: "24px", color: "#dc2626" }}>{inventoryError}</div>
        ) : (
          <div className="allocation-inventory-grid">
            {inventory.map((item) => {
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

      {/* FILTERS AND SEARCH */}
      <div className="allocation-filters-section">
        <div className="allocation-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by location, disaster type, or contact name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        </div>
      </div>

      {/* DISASTER EVENTS TABLE */}
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
                <th>Contact</th>
                <th>Resources Needed</th>
                <th>Event Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingEvents ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    Loading disaster events...
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
                filteredEvents.map(event => {
                  const priorityStyle = getUrgencyColor(event.priority);
                  const statusStyle = getStatusColor(event.status);
                  const canAllocate = ["active", "pending_inventory"].includes(event.status);
                  const requestedResources = normalizeRequestedResources(event);
                  
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
                          <div className="contact-email">{event.contactPhone || "-"}</div>
                          <div className="contact-email">{event.contactEmail || "-"}</div>
                        </div>
                      </td>
                      <td>
                        <div className="items-summary">
                          {requestedResources.length === 0 ? (
                            <div className="item-line">No items listed</div>
                          ) : (
                            requestedResources.map((resource, idx) => (
                              <div key={`${resource.name}-${idx}`} className="item-line">
                                {resource.name}
                                {resource.quantity > 0 ? ` x ${resource.quantity}` : ""}
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
                        <div className="action-buttons">
                          {canAllocate && (
                            <button 
                              className="allocate-btn"
                              onClick={() => handleAllocate(event.id)}
                            >
                              <ArrowRight size={14} /> Allocate
                            </button>
                          )}
                          {event.status === "allocated" && (
                            <div className="allocated-actions">
                              <button 
                                className="update-btn"
                                onClick={() => handleAllocate(event.id)}
                              >
                                <ArrowRight size={14} /> Update
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleAllocate(event.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                          {!canAllocate && event.status === "monitoring" && (
                            <span className="monitoring-text">📋 Monitoring</span>
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

      {/* ALLOCATION MODAL */}
      {allocationModal && selectedEvent && (
        <div className="modal-overlay" onClick={closeAllocationModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{existingAllocation ? 'Manage Allocation' : 'Allocate Resources'}</h2>
              <button className="close-btn" onClick={closeAllocationModal}>×</button>
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
                    <strong>{selectedEvent.reportedBy || "DMC Officer"}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Contact Number:</span>
                    <strong>{selectedEvent.contactPhone || "-"}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Email:</span>
                    <strong>{selectedEvent.contactEmail || "-"}</strong>
                  </div>
                </div>
              </div>
              
              <div className="allocation-details">
                <h3>Resource Allocation</h3>
                {modalResourceRows.length === 0 ? (
                  <p style={{ color: "#64748b", marginBottom: "12px" }}>
                    No requested resources listed for this event.
                  </p>
                ) : (
                  modalResourceRows.map((resource, index) => {
                  const need = resource.name;
                  const available = getAvailableStock(need);
                  const currentQty =
                    allocationQuantities[need] ?? (resource.quantity > 0 ? resource.quantity : 0);
                  const hasStock = currentQty <= available;
                  
                  return (
                    <div key={index} className="allocation-item">
                      <div className="item-info">
                        <span className="item-name">{need}</span>
                        {resource.quantity > 0 && (
                          <span className="item-quantity">
                            Requested: {resource.quantity.toLocaleString()} units
                          </span>
                        )}
                        <span className="item-quantity">Available: {available.toLocaleString()}</span>
                      </div>
                      <div className="quantity-input">
                        <input
                          type="number"
                          min="0"
                          max={Math.max(available, 0)}
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(need, e.target.value)}
                          placeholder="0"
                          className={`qty-input ${hasStock ? 'valid' : 'invalid'}`}
                        />
                        <span className="unit-label">units</span>
                      </div>
                      <div className="stock-info">
                        <span className={`available-stock ${hasStock ? 'sufficient' : 'insufficient'}`}>
                          {hasStock ? '✓ Available' : '⚠ Insufficient'}
                        </span>
                        {!hasStock && currentQty > available && (
                          <AlertTriangle size={16} color="#dc2626" />
                        )}
                      </div>
                    </div>
                  );
                })
                )}
              </div>
              
              <div className="message-section">
                <h3>Allocation Notes & Instructions</h3>
                <textarea
                  value={allocationMessage}
                  onChange={(e) => setAllocationMessage(e.target.value)}
                  placeholder="Enter detailed instructions for this allocation, special handling requirements, delivery access points, or any other important notes..."
                  className="message-textarea"
                  rows="4"
                />
                <div className="message-options">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked={existingAllocation?.sendSMS || false} />
                    Send SMS updates to contact person
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked={existingAllocation?.sendEmail || false} />
                    Send email confirmation
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked={existingAllocation?.requireSignature || false} />
                    Require signature on delivery
                  </label>
                </div>
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
                  {existingAllocation 
                    ? "Updating this allocation will adjust inventory stock accordingly."
                    : "This will allocate resources and update inventory stock."
                  }
                </span>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeAllocationModal} disabled={isSubmittingAllocation}>
                Cancel
              </button>
              {existingAllocation ? (
                <>
                  <button 
                    className="btn-primary"
                    onClick={updateAllocation}
                    disabled={isSubmittingAllocation}
                  >
                    {isSubmittingAllocation ? "Updating..." : "Update Allocation"}
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this allocation? This will return all allocated resources to inventory and cannot be undone.')) {
                        deleteAllocation();
                      }
                    }}
                    disabled={isSubmittingAllocation}
                  >
                    {isSubmittingAllocation ? "Deleting..." : "Delete Allocation"}
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary"
                  onClick={confirmAllocation}
                  disabled={
                    isSubmittingAllocation ||
                    Object.values(allocationQuantities).every((qty) => qty === 0)
                  }
                >
                  {isSubmittingAllocation ? "Allocating..." : "Confirm Allocation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}