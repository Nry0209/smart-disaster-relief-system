import React, { useState } from "react";
import { AlertTriangle, MapPin, Users, Calendar, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";
import './Pages.css';

const DisasterEventPage = () => {
  const [disasterEvents, setDisasterEvents] = useState([
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
      status: "monitoring",
      priority: "medium",
      lastUpdated: "2026-03-26T16:45:00Z"
    }
  ]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return { color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle };
      case 'high': return { color: "#ea580c", bg: "#ffedd5", icon: AlertTriangle };
      case 'medium': return { color: "#d97706", bg: "#fef3c7", icon: AlertCircle };
      case 'low': return { color: "#16a34a", bg: "#dcfce7", icon: CheckCircle };
      default: return { color: "#6b7280", bg: "#f3f4f6", icon: AlertCircle };
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return { color: "#16a34a", bg: "#dcfce7" };
      case 'monitoring': return { color: "#d97706", bg: "#fef3c7" };
      case 'resolved': return { color: "#2563eb", bg: "#dbeafe" };
      default: return { color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return { color: "#dc2626", bg: "#fee2e2" };
      case 'high': return { color: "#ea580c", bg: "#ffedd5" };
      case 'medium': return { color: "#d97706", bg: "#fef3c7" };
      case 'low': return { color: "#16a34a", bg: "#dcfce7" };
      default: return { color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const filteredEvents = disasterEvents.filter(event => {
    const matchesSearch = event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.disasterType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.reportedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || event.status === filterStatus;
    const matchesPriority = filterPriority === "all" || event.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    totalEvents: disasterEvents.length,
    activeEvents: disasterEvents.filter(e => e.status === "active").length,
    criticalEvents: disasterEvents.filter(e => e.priority === "critical").length,
    totalAffected: disasterEvents.reduce((sum, e) => sum + e.affectedPopulation, 0)
  };

  const formatPopulation = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="disaster-event-page">

      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <AlertTriangle size={32} color="#dc2626" />
          </div>
          <div>
            <h1>Disaster Events</h1>
            <p>Monitor and manage disaster events reported by DMC officers</p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff" }}>
            <FileText size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <h3>Total Events</h3>
            <p>{stats.totalEvents}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7" }}>
            <CheckCircle size={24} color="#16a34a" />
          </div>
          <div className="stat-content">
            <h3>Active Events</h3>
            <p>{stats.activeEvents}</p>
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
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7" }}>
            <Users size={24} color="#d97706" />
          </div>
          <div className="stat-content">
            <h3>Total Affected</h3>
            <p>{formatPopulation(stats.totalAffected)}</p>
          </div>
        </div>
      </div>

      {/* FILTERS AND SEARCH */}
      <div className="filters-section">
        <div className="search-bar">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="Search by location, disaster type, or reporting officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <select 
            className="filter-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
          <select 
            className="filter-select" 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* DISASTER EVENTS GRID */}
      <div className="events-grid">
        {filteredEvents.length === 0 ? (
          <div className="no-events">
            <AlertTriangle size={48} color="#94a3b8" />
            <h3>No events found</h3>
            <p>No disaster events match your current filters.</p>
          </div>
        ) : (
          filteredEvents.map(event => {
            const severityStyle = getSeverityColor(event.severity);
            const statusStyle = getStatusColor(event.status);
            const priorityStyle = getPriorityColor(event.priority);
            const SeverityIcon = severityStyle.icon;
            
            return (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <div className="event-title">
                    <h3>{event.disasterType}</h3>
                    <span className="event-id">{event.id}</span>
                  </div>
                  <div className="event-badges">
                    <span 
                      className="severity-badge" 
                      style={{ color: severityStyle.color, background: severityStyle.bg }}
                    >
                      <SeverityIcon size={12} />
                      {event.severity.toUpperCase()}
                    </span>
                    <span 
                      className="priority-badge"
                      style={{ color: priorityStyle.color, background: priorityStyle.bg }}
                    >
                      {event.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="event-location">
                  <MapPin size={16} />
                  <span>{event.location}</span>
                </div>

                <div className="event-details">
                  <div className="detail-item">
                    <Users size={16} />
                    <span>{formatPopulation(event.affectedPopulation)} affected</span>
                  </div>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span>Est. {event.estimatedDuration}</span>
                  </div>
                </div>

                <div className="event-description">
                  <p>{event.description}</p>
                </div>

                <div className="event-needs">
                  <h4>Immediate Needs:</h4>
                  <div className="needs-tags">
                    {event.immediateNeeds.map((need, index) => (
                      <span key={index} className="need-tag">{need}</span>
                    ))}
                  </div>
                </div>

                <div className="event-footer">
                  <div className="event-contact">
                    <div className="contact-info">
                      <span className="contact-name">{event.reportedBy}</span>
                      <span className="contact-designation">{event.designation}</span>
                    </div>
                    <div className="contact-details">
                      <span className="contact-phone">{event.contactPhone}</span>
                      <span className="contact-email">{event.contactEmail}</span>
                    </div>
                  </div>
                  <div className="event-status">
                    <span 
                      className="status-badge"
                      style={{ color: statusStyle.color, background: statusStyle.bg }}
                    >
                      {event.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DisasterEventPage;
