import React, { useState, useEffect } from "react";
import { Package, AlertTriangle, Users, CheckCircle, Clock, ArrowRight, Search, Filter, Truck, MapPin, Calendar, Bell, Trash2 } from "lucide-react";
import { Link } from 'react-router-dom';
import './Pages.css';

// Mock inventory data (same as InventoryPage)
const initialInventory = [
  { id: 1, name: "Bottled Water",  category: "Water",   stock: 4500, min: 6000 },
  { id: 2, name: "Dry Ration",     category: "Food",    stock: 3900, min: 3500 },
  { id: 3, name: "Blankets",       category: "Shelter", stock: 2600, min: 2000 },
  { id: 4, name: "Tents",          category: "Shelter", stock: 240,  min: 400  },
  { id: 5, name: "Medicine Kits",  category: "Medical", stock: 310,  min: 500  },
];

// Mock disaster events from DMC officers (same as DisasterEventPage)
const initialDisasterEvents = [
  {
    id: "DIS-001",
    disasterType: "Flood",
    severity: "critical",
    location: "Mumbai, Maharashtra",
    affectedPopulation: 15000,
    eventDate: "2026-03-28",
    reportedBy: "Rajesh Kumar",
    designation: "DMC Officer",
    contactPhone: "+91 98765 43210",
    contactEmail: "rajesh.kumar@dmc.gov.in",
    description: "Severe flooding in low-lying areas due to heavy rainfall. Multiple evacuation centers established.",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    estimatedDuration: "5-7 days",
    immediateNeeds: ["Water", "Food", "Medical Supplies", "Shelter"],
    status: "active",
    priority: "high",
    lastUpdated: "2026-03-28T14:30:00Z"
  },
  {
    id: "DIS-002",
    disasterType: "Earthquake",
    severity: "high",
    location: "Gujarat, Kutch District",
    affectedPopulation: 8500,
    eventDate: "2026-03-27",
    reportedBy: "Priya Sharma",
    designation: "DMC Officer",
    contactPhone: "+91 87654 32109",
    contactEmail: "priya.sharma@dmc.gov.in",
    description: "Magnitude 6.2 earthquake caused structural damage to buildings. Rescue operations ongoing.",
    coordinates: { lat: 23.8315, lng: 69.6637 },
    estimatedDuration: "2-3 weeks",
    immediateNeeds: ["Tents", "Medical Kits", "Dry Food", "Rescue Equipment"],
    status: "active",
    priority: "critical",
    lastUpdated: "2026-03-27T09:15:00Z"
  },
  {
    id: "DIS-003",
    disasterType: "Cyclone",
    severity: "medium",
    location: "Chennai, Tamil Nadu",
    affectedPopulation: 5000,
    eventDate: "2026-03-26",
    reportedBy: "Anand Verma",
    designation: "DMC Officer",
    contactPhone: "+91 76543 21098",
    contactEmail: "anand.verma@dmc.gov.in",
    description: "Coastal cyclone with wind speeds up to 120 km/h. Power outages reported in affected areas.",
    coordinates: { lat: 13.0827, lng: 80.2707 },
    estimatedDuration: "3-4 days",
    immediateNeeds: ["Emergency Kits", "Water Purification Tablets", "Blankets"],
    status: "active",
    priority: "medium",
    lastUpdated: "2026-03-26T16:45:00Z"
  }
];

function getStatus(stock, min) {
  const ratio = stock / min;
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
    case 'allocated': return { color: "#16a34a", bg: "#dcfce7" };
    case 'pending': return { color: "#d97706", bg: "#fef3c7" };
    case 'rejected': return { color: "#dc2626", bg: "#fee2e2" };
    default: return { color: "#6b7280", bg: "#f3f4f6" };
  }
}

export default function AllocationPage() {
  const [inventory, setInventory] = useState(initialInventory);
  const [disasterEvents, setDisasterEvents] = useState(initialDisasterEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allocationModal, setAllocationModal] = useState(false);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [distributionModal, setDistributionModal] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [distributionForm, setDistributionForm] = useState({
    distributionId: '',
    releaseDate: '',
    releasedDate: '',
    transportMethod: '',
    priorityLevel: 'standard',
    specialInstructions: '',
    allocationOfficerContact: '+91 98765 12345'
  });

  const filteredEvents = disasterEvents.filter(event => {
    const matchesSearch = event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.disasterType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.reportedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || event.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalEvents: disasterEvents.length,
    activeEvents: disasterEvents.filter(e => e.status === "active").length,
    allocatedEvents: disasterEvents.filter(e => e.status === "allocated").length,
    criticalEvents: disasterEvents.filter(e => e.priority === "critical").length,
    lowStockItems: inventory.filter(item => item.stock < item.min).length
  };

  const handleAllocate = (eventId) => {
    const event = disasterEvents.find(e => e.id === eventId);
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
  };

  const confirmAllocation = () => {
    if (!selectedEvent) return;
    
    // Update inventory stock based on allocation quantities
    const updatedInventory = inventory.map(item => {
      const allocatedQty = allocationQuantities[item.name] || 0;
      const existingQty = existingAllocation?.quantities?.[item.name] || 0;
      const stockChange = allocatedQty - existingQty;
      const newStock = Math.max(0, item.stock - stockChange);
      return { ...item, stock: newStock };
    });
    
    // Create allocation record
    const allocationRecord = {
      quantities: allocationQuantities,
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
    
    setInventory(updatedInventory);
    setDisasterEvents(updatedEvents);
    setAllocationModal(false);
    setSelectedEvent(null);
    setAllocationQuantities({});
    setAllocationMessage("");
    setExistingAllocation(null);
  };

  const updateAllocation = () => {
    if (!selectedEvent || !existingAllocation) return;
    
    // Update inventory stock based on quantity changes
    const updatedInventory = inventory.map(item => {
      const newQty = allocationQuantities[item.name] || 0;
      const oldQty = existingAllocation.quantities[item.name] || 0;
      const stockChange = newQty - oldQty;
      const newStock = item.stock - stockChange;
      return { ...item, stock: Math.max(0, newStock) };
    });
    
    // Update allocation record
    const updatedAllocation = {
      ...existingAllocation,
      quantities: allocationQuantities,
      message: allocationMessage,
      lastUpdated: new Date().toISOString()
    };
    
    // Update event
    const updatedEvents = disasterEvents.map(event => 
      event.id === selectedEvent.id 
        ? { ...event, allocatedResources: updatedAllocation }
        : event
    );
    
    setInventory(updatedInventory);
    setDisasterEvents(updatedEvents);
    setAllocationModal(false);
    setSelectedEvent(null);
    setAllocationQuantities({});
    setAllocationMessage("");
    setExistingAllocation(null);
  };

  const deleteAllocation = () => {
    if (!selectedEvent || !existingAllocation) return;
    
    // Return allocated quantities to inventory
    const updatedInventory = inventory.map(item => {
      const allocatedQty = existingAllocation.quantities[item.name] || 0;
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
    
    setInventory(updatedInventory);
    setDisasterEvents(updatedEvents);
    setAllocationModal(false);
    setSelectedEvent(null);
    setAllocationQuantities({});
    setAllocationMessage("");
    setExistingAllocation(null);
  };

  const handleQuantityChange = (resourceName, value) => {
    const qty = parseInt(value) || 0;
    setAllocationQuantities(prev => ({
      ...prev,
      [resourceName]: qty
    }));
  };

  const getAvailableStock = (itemName) => {
    const item = inventory.find(inv => inv.name.toLowerCase() === itemName.toLowerCase());
    const allocatedQty = existingAllocation?.quantities?.[item?.name] || 0;
    return item ? item.stock + allocatedQty : 0;
  };

  const handleReleaseDistribution = (eventId) => {
    const event = disasterEvents.find(e => e.id === eventId);
    setSelectedDistribution(event);
    setDistributionForm({
      distributionId: `DIST-${Date.now()}`,
      releasedDate: new Date().toISOString().slice(0, 16),
      transportMethod: '',
      priorityLevel: event.priority || 'standard',
      specialInstructions: event.allocatedResources?.message || '',
      allocationOfficerContact: '+91 98765 12345'
    });
    setDistributionModal(true);
  };

  const confirmDistribution = () => {
    if (!selectedDistribution) return;

    // Create distribution tracking record for tracking officers
    const trackingRecord = {
      id: Date.now(),
      distributionId: distributionForm.distributionId,
      eventId: selectedDistribution.id,
      disasterType: selectedDistribution.disasterType,
      location: selectedDistribution.location,
      dmcOfficer: selectedDistribution.reportedBy,
      dmcContact: selectedDistribution.contactPhone,
      allocationOfficerContact: distributionForm.allocationOfficerContact,
      releasedDate: distributionForm.releasedDate,
      transportMethod: distributionForm.transportMethod,
      priorityLevel: distributionForm.priorityLevel,
      specialInstructions: distributionForm.specialInstructions,
      allocatedResources: selectedDistribution.allocatedResources,
      status: 'prepared',
      currentLocation: 'Warehouse',
      distributedBy: "Distribution Officer",
      distributedDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store in localStorage for Distribution Tracking page to access
    const existingRecords = JSON.parse(localStorage.getItem('distributionTrackingRecords') || '[]');
    const updatedRecords = [...existingRecords, trackingRecord];
    localStorage.setItem('distributionTrackingRecords', JSON.stringify(updatedRecords));

    // Update event with distribution information
    const updatedEvents = disasterEvents.map(event => 
      event.id === selectedDistribution.id 
        ? { 
            ...event, 
            status: "released",
            distributionInfo: {
              ...distributionForm,
              distributedBy: "Distribution Officer",
              distributedDate: new Date().toISOString(),
              trackingRecordId: trackingRecord.id
            }
          }
        : event
    );
    
    setDisasterEvents(updatedEvents);
    setDistributionModal(false);
    setSelectedDistribution(null);
    setDistributionForm({
      distributionId: '',
      releaseDate: '',
      releasedDate: '',
      transportMethod: '',
      priorityLevel: 'standard',
      specialInstructions: '',
      allocationOfficerContact: '+91 98765 12345'
    });
  };

  const handleDistributionFormChange = (field, value) => {
    setDistributionForm(prev => ({
      ...prev,
      [field]: value
    }));
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
          {["all", "active", "allocated"].map(status => (
            <button
              key={status}
              className={`allocation-filter-btn ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
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
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No disaster events found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(event => {
                  const priorityStyle = getUrgencyColor(event.priority);
                  const statusStyle = getStatusColor(event.status);
                  const canAllocate = event.status === "active";
                  
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
                          {event.priority.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="contact-name">{event.reportedBy}</div>
                          <div className="contact-email">{event.contactEmail}</div>
                        </div>
                      </td>
                      <td>
                        <div className="items-summary">
                          {event.immediateNeeds.map((need, idx) => (
                            <div key={idx} className="item-line">
                              {need}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          <Calendar size={14} />
                          {event.eventDate}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: statusStyle.color, background: statusStyle.bg }}>
                          {event.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {event.status === "active" && canAllocate && (
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
                              <button 
                                className="release-btn"
                                onClick={() => handleReleaseDistribution(event.id)}
                              >
                                <Truck size={14} /> Release to Distribution
                              </button>
                            </div>
                          )}
                          {event.status === "distributed" && (
                            <div className="distributed-info">
                              <span className="distributed-badge">✓ Distributed</span>
                              <button 
                                className="view-distribution-btn"
                                onClick={() => {
                                  setSelectedDistribution(event);
                                  setDistributionForm(event.distributionInfo);
                                  setDistributionModal(true);
                                }}
                              >
                                <Truck size={14} /> View Details
                              </button>
                            </div>
                          )}
                          {event.status === "released" && (
                            <div className="distributed-info">
                              <span className="released-badge">✓ Released</span>
                              <button 
                                className="view-distribution-btn"
                                onClick={() => {
                                  setSelectedDistribution(event);
                                  setDistributionForm(event.distributionInfo);
                                  setDistributionModal(true);
                                }}
                              >
                                <Truck size={14} /> View Details
                              </button>
                            </div>
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
        <div className="modal-overlay" onClick={() => setAllocationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{existingAllocation ? 'Manage Allocation' : 'Allocate Resources'}</h2>
              <button className="close-btn" onClick={() => setAllocationModal(false)}>×</button>
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
                    <strong>{selectedEvent.priority.toUpperCase()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Affected Population:</span>
                    <strong>{selectedEvent.affectedPopulation.toLocaleString()}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Reported By:</span>
                    <strong>{selectedEvent.reportedBy}</strong>
                  </div>
                </div>
              </div>
              
              <div className="allocation-details">
                <h3>Resource Allocation</h3>
                {selectedEvent.immediateNeeds.map((need, index) => {
                  const available = getAvailableStock(need);
                  const currentQty = allocationQuantities[need] || 0;
                  
                  return (
                    <div key={index} className="allocation-item">
                      <div className="item-info">
                        <span className="item-name">{need}</span>
                        <span className="item-quantity">Available: {available.toLocaleString()}</span>
                      </div>
                      <div className="quantity-input">
                        <input
                          type="number"
                          min="0"
                          max={available}
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(need, e.target.value)}
                          placeholder="0"
                          className="qty-input"
                        />
                        <span className="unit-label">units</span>
                      </div>
                    </div>
                  );
                })}
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
              </div>
              
              {existingAllocation && (
                <div className="allocation-info">
                  <h4>Current Allocation Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span>Allocated Date:</span>
                      <strong>{new Date(existingAllocation.allocatedDate).toLocaleDateString()}</strong>
                    </div>
                    <div className="info-item">
                      <span>Allocated By:</span>
                      <strong>{existingAllocation.allocatedBy}</strong>
                    </div>
                    {existingAllocation.lastUpdated && (
                      <div className="info-item">
                        <span>Last Updated:</span>
                        <strong>{new Date(existingAllocation.lastUpdated).toLocaleDateString()}</strong>
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
      
      {/* DISTRIBUTION MODAL */}
      {distributionModal && selectedDistribution && (
        <div className="modal-overlay" onClick={() => setDistributionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Release to Distribution</h2>
              <button className="close-btn" onClick={() => setDistributionModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="request-summary">
                <h3>Event Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Event ID:</span>
                    <strong>{selectedDistribution.id}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Disaster:</span>
                    <strong>{selectedDistribution.disasterType}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Location:</span>
                    <strong>{selectedDistribution.location}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Priority:</span>
                    <strong>{selectedDistribution.priority.toUpperCase()}</strong>
                  </div>
                </div>
              </div>
              
              <div className="distribution-details">
                <h3>Distribution Information</h3>
                
                {/* Section 1: Basic Distribution Details */}
                <div className="distribution-section">
                  <h4>Basic Distribution Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Distribution ID</label>
                      <input type="text" className="form-input" value={distributionForm.distributionId} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Released Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="form-input" 
                        value={distributionForm.releasedDate} 
                        onChange={(e) => handleDistributionFormChange('releasedDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Suggested Transportation Method</label>
                      <select className="form-select" value={distributionForm.transportMethod} onChange={(e) => handleDistributionFormChange('transportMethod', e.target.value)}>
                        <option value="">Select Method</option>
                        <option value="Air Transport">Air Transport</option>
                        <option value="Ground Transport">Ground Transport</option>
                        <option value="Water Transport">Water Transport</option>
                        <option value="Helicopter">Helicopter</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Priority Level</label>
                      <select className="form-select" value={distributionForm.priorityLevel} onChange={(e) => handleDistributionFormChange('priorityLevel', e.target.value)}>
                        <option value="standard">Standard</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Section 2: Contact Information */}
                <div className="distribution-section">
                  <h4>Contact Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>DMC Officer Name</label>
                      <input type="text" className="form-input" value={selectedDistribution.reportedBy} readOnly />
                    </div>
                    <div className="form-group">
                      <label>DMC Officer Contact</label>
                      <input type="tel" className="form-input" value={selectedDistribution.contactPhone} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Allocation Officer Contact</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={distributionForm.allocationOfficerContact || '+91 98765 12345'} 
                        onChange={(e) => handleDistributionFormChange('allocationOfficerContact', e.target.value)}
                        placeholder="Enter allocation officer contact details..."
                      />
                    </div>
                  </div>
                </div>
                
                {/* Section 3: Special Instructions */}
                <div className="distribution-section">
                  <h4>Special Instructions</h4>
                  <div className="form-group full-width">
                    <textarea 
                      className="form-textarea" 
                      value={distributionForm.specialInstructions || (selectedDistribution.allocatedResources?.message || '')} 
                      onChange={(e) => handleDistributionFormChange('specialInstructions', e.target.value)} 
                      rows="4" 
                      placeholder="Enter any special handling requirements, access points, or delivery instructions..."
                    />
                  </div>
                </div>
                
                {/* Section 4: Allocated Resources */}
                <div className="distribution-section">
                  <h4>Allocated Resources</h4>
                  {selectedDistribution.allocatedResources && (
                    <div className="resources-list">
                      {Object.entries(selectedDistribution.allocatedResources.quantities).map(([resource, quantity]) => (
                        <div key={resource} className="resource-item">
                          <span className="resource-name">{resource}:</span>
                          <span className="resource-quantity">{quantity.toLocaleString()} units</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDistributionModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={confirmDistribution}
                disabled={!distributionForm.transportMethod}
              >
                Confirm Release to Distribution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}