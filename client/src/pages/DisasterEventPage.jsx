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
      eventDate: "2026-03-25",
      reportedBy: "Mohan Raj",
      designation: "DMC Officer",
      contactPhone: "+91 98765 12345",
      contactEmail: "mohan.raj@dmc.gov.in",
      description: "Cyclonic storm causing heavy rainfall and strong winds. Coastal areas evacuated.",
      coordinates: { lat: 13.0827, lng: 80.2707 },
      estimatedDuration: "3-4 days",
      immediateNeeds: ["Emergency Supplies", "Food", "Water", "Medical Aid"],
      status: "monitoring",
      priority: "medium",
      lastUpdated: "2026-03-26T16:45:00Z"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

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
    activeEvents: disasterEvents.filter(e => e.status === 'active').length,
    criticalEvents: disasterEvents.filter(e => e.priority === 'critical').length,
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
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            Admin / Disaster Management
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Disaster Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monitor and manage disaster events reported by DMC officers
          </p>
        </div>
      </section>

      {/* STATS CARDS */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Events</p>
            <strong className="text-xl font-semibold text-slate-900">{stats.totalEvents}</strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Events</p>
            <strong className="text-xl font-semibold text-slate-900">{stats.activeEvents}</strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Critical Priority</p>
            <strong className="text-xl font-semibold text-slate-900">{stats.criticalEvents}</strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Affected</p>
            <strong className="text-xl font-semibold text-slate-900">{formatPopulation(stats.totalAffected)}</strong>
          </div>
        </div>
      </section>

      {/* FILTERS AND SEARCH */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by location, disaster type, or reporting officer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </section>

      {/* EVENTS LIST */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Disaster Events</h2>
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No disaster events found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredEvents.map(event => {
              const severityStyle = getSeverityColor(event.severity);
              const statusStyle = getStatusColor(event.status);
              const priorityStyle = getPriorityColor(event.priority);
              const SeverityIcon = severityStyle.icon;
              
              return (
                <div key={event.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{event.disasterType}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.color}`}>
                          {event.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                          {event.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{formatDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          <span>{formatPopulation(event.affectedPopulation)} affected</span>
                        </div>
                      </div>
                      <p className="text-slate-700 mb-3">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Reported by: {event.reportedBy} ({event.designation})</span>
                        <span>•</span>
                        <span>{event.contactPhone}</span>
                      </div>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${severityStyle.bg} ${severityStyle.color}`}>
                      <SeverityIcon size={24} />
                    </div>
                  </div>
                  
                  {event.immediateNeeds && (
                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Immediate Needs:</h4>
                      <div className="flex flex-wrap gap-2">
                        {event.immediateNeeds.map((need, index) => (
                          <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                            {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default DisasterEventPage;
