import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Package, AlertTriangle, Users, CheckCircle, Clock, ArrowRight, Search, Filter, Truck, MapPin, Calendar, Bell, Trash2, RefreshCcw, RefreshCw } from "lucide-react";

import { fetchDisasterReports } from "../services/disasterReportService";

import { upsertAllocationForReport, clearAllocationForReport } from "../services/allocationService";

import { getResourcePrediction } from "../services/predictionService";

import { fetchInventoryItems } from "../services/inventoryService";

import PageHeader from "../components/PageHeader";

import { ITEM_CATEGORIES, ITEM_MAPPING } from "../utils/constants";

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

function getResolvedInventoryStock(item) {
  const stockValue = item?.stock ?? item?.quantityAvailable ?? item?.quantity ?? 0;
  const parsedStock = Number(stockValue);
  return Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
}



export default function AllocationPage() {

  const navigate = useNavigate();

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

        const inventoryData = Array.isArray(inventoryResult.value)
          ? inventoryResult.value.map((item) => ({
              ...item,
              stock: getResolvedInventoryStock(item),
            }))
          : [];
        const normalizedInventoryData = inventoryData.map((item) => ({
          ...item,
          stock: getResolvedInventoryStock(item),
        }));

        console.log('Frontend received inventory data:', inventoryData.length, 'items');

        console.log('Sample received items:', inventoryData.slice(0, 3).map(item => ({

          name: item.name,

          stock: item.stock,

          min: item.min,

          category: item.category

        })));

        setInventory(normalizedInventoryData);

      } else {

        console.log('Frontend inventory loading failed:', inventoryResult.reason);

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

    console.log('Processing immediateNeeds:', needs);

    console.log('Available inventory items:', inventory.slice(0, 5).map(item => ({ name: item.name, id: item.id || item._id })));

    

    return needs

      .map((need) => {

        const matched = inventory.find(

          (item) => String(item.name || "").toLowerCase() === String(need || "").toLowerCase()

        );



        console.log('Matching need:', need, 'to item:', matched ? matched.name : 'NOT FOUND');



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
    navigate(`/allocations/${eventId}/manage`);
  };


  const handleAllocate = (eventId) => {
    navigate(`/allocations/${eventId}/manage`);
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



  const hasAllocationErrors = () => {
    if (!selectedEvent) return true;
    
    return getRequestedItems(selectedEvent).some((need) => {
      const currentQty = allocationQuantities[need.inventoryItemId] || 0;
      const available = getAvailableStock(need.inventoryItemId);
      return currentQty < 1 || currentQty > available;
    });
  };



  const applyPredictionAsSuggestion = () => {

    if (!selectedEvent || !predictedResources) return;



    const suggestion = {};

    const requestedItems = getRequestedItems(selectedEvent);



    requestedItems.forEach((item) => {

      const normalizedName = String(item.itemName || "").toLowerCase();

      const normalizedCategory = String(item.category || "").toLowerCase();



      // 🍚 FOOD GROUP (Maps to foodNeeded)

      if (

        normalizedCategory.includes("dry food") ||

        normalizedCategory.includes("ready-to-eat") ||

        normalizedCategory.includes("baby food") ||

        normalizedCategory.includes("nutritional") ||

        normalizedName.includes("rice") ||

        normalizedName.includes("flour") ||

        normalizedName.includes("canned") ||

        normalizedName.includes("biscuit") ||

        normalizedName.includes("noodle") ||

        normalizedName.includes("ration") ||

        normalizedName.includes("formula") ||

        normalizedName.includes("protein") ||

        normalizedName.includes("energy")

      ) {

        suggestion[item.inventoryItemId] = Number(predictedResources.foodNeeded || 0);

      }

      // 💧 WATER GROUP (Maps to waterNeeded)

      else if (

        normalizedCategory.includes("drinking water") ||

        normalizedCategory.includes("water purification") ||

        normalizedName.includes("water") ||

        normalizedName.includes("bottled") ||

        normalizedName.includes("filter") ||

        normalizedName.includes("purification")

      ) {

        suggestion[item.inventoryItemId] = Number(predictedResources.waterNeeded || 0);

      }

      // 💊 MEDICAL GROUP (Maps to medicineNeeded)

      else if (

        normalizedCategory.includes("basic medicine") ||

        normalizedCategory.includes("first aid") ||

        normalizedCategory.includes("emergency medical") ||

        normalizedName.includes("medicine") ||

        normalizedName.includes("medical") ||

        normalizedName.includes("paracetamol") ||

        normalizedName.includes("antibiotic") ||

        normalizedName.includes("bandage") ||

        normalizedName.includes("antiseptic") ||

        normalizedName.includes("kit")

      ) {

        suggestion[item.inventoryItemId] = Number(predictedResources.medicineNeeded || 0);

      }

      // 🏠 SUPPORT GROUP (NOT predicted but IMPORTANT)

      else {

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
    // First try to find by MongoDB ID
    let item = inventory.find(inv => {
      const invId = String(inv.id || inv._id || "");
      const searchId = String(inventoryItemId || "");
      return invId === searchId;
    });

    // Fallback: if not found by ID, try to find by name (for backward compatibility)
    if (!item) {
      item = inventory.find(inv => String(inv.name || "").toLowerCase() === String(inventoryItemId || "").toLowerCase());
    }

    if (!item) {
      return 0;
    }

    const itemId = String(item?.id || item?._id || "");
    // Ensure stock is treated as number (handle potential string conversion)
    const stockNumber = Number(item.stock) || 0;
    return Math.max(0, stockNumber);
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

                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

                            onClick={() => handlePreviewPrediction(event.id)}

                            disabled={isProcessing}

                          >

                            Predict

                          </button>



                          {["active", "pending_inventory"].includes(event.status) && (

                            <button

                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"

                              onClick={() => handleAllocate(event.id)}

                              disabled={isProcessing || !!inventoryError || inventory.length === 0}

                            >

                              <ArrowRight size={14} /> Allocate

                            </button>

                          )}



                          {event.status === "allocated" && (

                            <div className="allocated-actions flex gap-1">

                              <button

                                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"

                                onClick={() => handleAllocate(event.id)}

                                disabled={isProcessing || !!inventoryError || inventory.length === 0}

                              >

                                <ArrowRight size={14} /> Manage

                              </button>

                              <button

                                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"

                                onClick={() => finalizeAllocation(event.id)}

                                disabled={isProcessing}

                              >

                                <CheckCircle size={14} /> Mark Monitoring

                              </button>

                              <button

                                className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

                                onClick={() => handleDeleteAllocationFromTable(event.id)}

                                disabled={isProcessing}

                              >

                                Delete

                              </button>

                              <button

                                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

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
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">

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

        </section>

      )}





              {allocationModal && selectedEvent && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
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
                const hasStock = available > 0;
                const canAllocateCurrentQty = currentQty > 0 && currentQty <= available;
                const hasError = currentQty < 1 || currentQty > available;
                
                return (
                  <div key={`${selectedEvent.id}-allocation-${index}`} className="allocation-item">
                    <div className="item-info">
                      <span className="item-name">{need.itemName}</span>
                      <span className="item-quantity">Current stock: {available.toLocaleString()}</span>
                    </div>
                    <div className="quantity-input">
                      <input
                        type="number"
                        min="1"
                        max={available}
                        value={currentQty}
                        onChange={(event) => handleQuantityChange(need.inventoryItemId, event.target.value)}
                        className={hasError ? "invalid" : "valid"}
                        style={{
                          borderColor: hasError ? "#dc2626" : "#16a34a",
                          backgroundColor: hasError ? "#fee2e2" : "#dcfce7"
                        }}
                      />
                      <span className="unit-label">units</span>
                    </div>
                    <div className="stock-info">
                      <span className={`available-stock ${hasStock ? "sufficient" : "insufficient"}`}>
                        {hasStock ? "Sufficient" : "Insufficient"}
                      </span>
                      {hasError && <AlertTriangle size={16} color="#dc2626" />}
                    </div>
                    {hasError && (
                      <div className="validation-error" style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                        {currentQty < 1 && "Minimum allocation quantity is 1"}
                        {currentQty > available && `Only ${available} available in inventory`}
                      </div>
                    )}
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
                <div className="existing-allocation-details">
                  {Object.entries(existingAllocation.quantities || {}).map(([itemId, qty]) => {
                    const item = inventory.find(inv => String(inv.id || inv._id) === itemId);
                    return (
                      <div key={itemId} className="existing-item">
                        <span>{item?.name || itemId}:</span>
                        <strong>{qty.toLocaleString()}</strong>
                      </div>
                    );
                  })}
                </div>
                <p className="allocation-meta">
                  Allocated by: {existingAllocation.allocatedBy || 'Unknown'} on{' '}
                  {existingAllocation.allocatedDate ? new Date(existingAllocation.allocatedDate).toLocaleDateString() : 'Unknown date'}
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAllocationModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={existingAllocation ? updateAllocation : confirmAllocation}
                disabled={isProcessing || hasAllocationErrors()}
              >
                {isProcessing ? 'Processing...' : (existingAllocation ? 'Update Allocation' : 'Confirm Allocation')}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
