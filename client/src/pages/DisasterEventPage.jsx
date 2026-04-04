import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  deleteDisasterReport,
  fetchDisasterReports,
  updateDisasterReport,
} from "../services/disasterReportService";

const INITIAL_FORM = {
  disasterType: "",
  location: "",
  severity: "high",
  affectedPopulation: "",
  eventDate: "",
  priority: "high",
  status: "active",
  description: "",
  immediateNeedsText: "",
};

const DisasterEventPage = () => {
  const navigate = useNavigate();
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [activeActionId, setActiveActionId] = useState("");
  const [activeAllocationId, setActiveAllocationId] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);

  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const normalizeNeedsText = (value) =>
    (Array.isArray(value) ? value : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId("");
    setFormData(INITIAL_FORM);
  };

  const openEditModal = (event) => {
    setErrorMessage("");
    setActionMessage("");
    setEditingId(event.id);
    setFormData({
      disasterType: event.disasterType || "",
      location: event.location || "",
      severity: event.severity || "high",
      affectedPopulation: String(Number(event.affectedPopulation || 0)),
      eventDate: toDateTimeLocal(event.eventDate),
      priority: event.priority || "high",
      status: event.status || "active",
      description: event.description || "",
      immediateNeedsText: normalizeNeedsText(event.immediateNeeds),
    });
    setIsModalOpen(true);
  };

  const loadReports = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const reports = await fetchDisasterReports();
      setDisasterEvents(Array.isArray(reports) ? reports : []);
    } catch (error) {
      setDisasterEvents([]);
      setErrorMessage(error.message || "Failed to load disaster reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return disasterEvents.filter((event) => {
      const matchesSearch =
        !query ||
        event.location?.toLowerCase().includes(query) ||
        event.disasterType?.toLowerCase().includes(query) ||
        event.reportedBy?.toLowerCase().includes(query);

      const matchesStatus = filterStatus === "all" || event.status === filterStatus;
      const matchesPriority =
        filterPriority === "all" || event.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [disasterEvents, filterPriority, filterStatus, searchTerm]);

  const stats = useMemo(
    () => ({
      totalEvents: disasterEvents.length,
      activeEvents: disasterEvents.filter((e) => e.status === "active").length,
      criticalEvents: disasterEvents.filter((e) => e.priority === "critical").length,
      totalAffected: disasterEvents.reduce(
        (sum, e) => sum + Number(e.affectedPopulation || 0),
        0
      ),
    }),
    [disasterEvents]
  );

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "critical":
        return { color: "#be123c", bg: "#ffe4e6", icon: ShieldAlert };
      case "high":
        return { color: "#c2410c", bg: "#ffedd5", icon: AlertTriangle };
      case "medium":
        return { color: "#b45309", bg: "#fef3c7", icon: AlertTriangle };
      case "low":
        return { color: "#047857", bg: "#d1fae5", icon: CheckCircle2 };
      default:
        return { color: "#334155", bg: "#e2e8f0", icon: Activity };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "draft":
        return { color: "#334155", bg: "#e2e8f0" };
      case "active":
        return { color: "#047857", bg: "#d1fae5" };
      case "pending_inventory":
        return { color: "#4338ca", bg: "#e0e7ff" };
      case "monitoring":
        return { color: "#b45309", bg: "#fef3c7" };
      case "resolved":
        return { color: "#0c4a6e", bg: "#e0f2fe" };
      default:
        return { color: "#334155", bg: "#e2e8f0" };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "critical":
        return { color: "#be123c", bg: "#ffe4e6" };
      case "high":
        return { color: "#c2410c", bg: "#ffedd5" };
      case "medium":
        return { color: "#b45309", bg: "#fef3c7" };
      case "low":
        return { color: "#047857", bg: "#d1fae5" };
      default:
        return { color: "#334155", bg: "#e2e8f0" };
    }
  };

  const formatPopulation = (num = 0) => new Intl.NumberFormat("en-IN").format(num);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleFormInput = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getPayloadFromForm = () => {
    const affectedPopulation = Number(formData.affectedPopulation);
    const immediateNeeds = formData.immediateNeedsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      disasterType: formData.disasterType.trim(),
      location: formData.location.trim(),
      severity: formData.severity,
      affectedPopulation,
      eventDate: formData.eventDate,
      priority: formData.priority,
      status: formData.status,
      description: formData.description.trim(),
      immediateNeeds,
      reportedBy: "DMC Officer",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setActionMessage("");

    if (!formData.disasterType.trim() || !formData.location.trim() || !formData.eventDate) {
      setErrorMessage("Disaster type, location, and event date are required.");
      return;
    }

    const affectedPopulation = Number(formData.affectedPopulation);
    if (!Number.isFinite(affectedPopulation) || affectedPopulation <= 0) {
      setErrorMessage("Affected population must be greater than 0.");
      return;
    }

    const payload = getPayloadFromForm();
    setIsSubmitting(true);

    try {
      const updated = await updateDisasterReport(editingId, payload);
      setDisasterEvents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setActionMessage("Disaster report updated successfully.");

      closeModal();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save disaster report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this disaster report?"
    );
    if (!shouldDelete) return;

    setErrorMessage("");
    setActionMessage("");
    setActiveActionId(id);

    try {
      await deleteDisasterReport(id);
      setDisasterEvents((prev) => prev.filter((item) => item.id !== id));
      setActionMessage("Disaster report deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete disaster report.");
    } finally {
      setActiveActionId("");
    }
  };

  const handleSendToAllocation = async (id) => {
    setErrorMessage("");
    setActionMessage("");
    setActiveAllocationId(id);

    try {
      const updated = await updateDisasterReport(id, {
        status: "pending_inventory",
      });

      setDisasterEvents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );

      setActionMessage("Report sent to allocation queue. Allocation officer will process it.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to send report to allocation.");
    } finally {
      setActiveAllocationId("");
    }
  };

  return (
    <div className="disaster-event-page">
      {actionMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ marginBottom: 16 }} className="no-events">
          <AlertTriangle size={28} color="#dc2626" />
          <h3>Could not complete action</h3>
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" type="button" onClick={() => navigate("/disaster-report/create")}>
          <Plus size={14} /> Create Report
        </button>
        <button className="btn-light" type="button" onClick={loadReports}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff" }}>
            <Activity size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <h3>Total Events</h3>
            <p>{stats.totalEvents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#dcfce7" }}>
            <CheckCircle2 size={24} color="#16a34a" />
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

      <div className="filters-section">
        <div className="search-bar">
          <Search size={18} />
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
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="pending_inventory">Pending Inventory</option>
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

      <div className="events-grid">
        {isLoading ? (
          <div className="no-events">
            <Activity size={48} color="#94a3b8" />
            <h3>Loading reports...</h3>
            <p>Please wait while we fetch disaster events.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="no-events">
            <AlertTriangle size={48} color="#94a3b8" />
            <h3>No events found</h3>
            <p>No disaster events match your current filters.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const severityStyle = getSeverityStyle(event.severity);
            const statusStyle = getStatusStyle(event.status);
            const priorityStyle = getPriorityStyle(event.priority);
            const SeverityIcon = severityStyle.icon;
            const immediateNeeds = Array.isArray(event.immediateNeeds)
              ? event.immediateNeeds
              : [];

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
                      {String(event.severity || "unknown").toUpperCase()}
                    </span>
                    <span
                      className="priority-badge"
                      style={{ color: priorityStyle.color, background: priorityStyle.bg }}
                    >
                      {String(event.priority || "unknown").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="event-location">
                  <MapPin size={16} />
                  <span>{event.location || "Location not specified"}</span>
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
                </div>

                <div className="event-description">
                  <p>{event.description || "No description provided."}</p>
                </div>

                <div className="event-needs">
                  <h4>Immediate Needs:</h4>
                  <div className="needs-tags">
                    {immediateNeeds.length === 0 ? (
                      <span className="need-tag">No needs listed</span>
                    ) : (
                      immediateNeeds.map((need, index) => (
                        <span key={`${event.id}-need-${index}`} className="need-tag">
                          {need}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="event-footer">
                  <div className="event-contact">
                    <div className="contact-info">
                      <span className="contact-name">{event.reportedBy || "DMC Officer"}</span>
                    </div>
                  </div>
                  <div className="event-status">
                    <span
                      className="status-badge"
                      style={{ color: statusStyle.color, background: statusStyle.bg }}
                    >
                      {String(event.status || "unknown").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="event-actions">
                  {event.status === "pending_inventory" ? (
                    <button
                      type="button"
                      className="event-action-btn allocate"
                      disabled
                    >
                      Sent to Allocation
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="event-action-btn allocate"
                      onClick={() => handleSendToAllocation(event.id)}
                      disabled={activeAllocationId === event.id || event.status === "resolved"}
                    >
                      {activeAllocationId === event.id ? "Sending..." : "Send to Allocation"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="event-action-btn edit"
                    onClick={() => openEditModal(event)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    className="event-action-btn delete"
                    onClick={() => handleDelete(event.id)}
                    disabled={activeActionId === event.id}
                  >
                    <Trash2 size={12} />
                    {activeActionId === event.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Edit Disaster Report</h2>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={closeModal}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Disaster type
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.disasterType}
                  onChange={(e) => handleFormInput("disasterType", e.target.value)}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Location
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.location}
                  onChange={(e) => handleFormInput("location", e.target.value)}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Severity
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.severity}
                  onChange={(e) => handleFormInput("severity", e.target.value)}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Priority
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.priority}
                  onChange={(e) => handleFormInput("priority", e.target.value)}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Affected population
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.affectedPopulation}
                  onChange={(e) => handleFormInput("affectedPopulation", e.target.value)}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Event date and time
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.eventDate}
                  onChange={(e) => handleFormInput("eventDate", e.target.value)}
                  required
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.status}
                  onChange={(e) => handleFormInput("status", e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="pending_inventory">Pending Inventory</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Description
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.description}
                  onChange={(e) => handleFormInput("description", e.target.value)}
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Immediate needs (comma-separated)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.immediateNeedsText}
                  onChange={(e) => handleFormInput("immediateNeedsText", e.target.value)}
                  placeholder="Water, Meal Packs, Medical Kits"
                />
              </label>

              <div className="mt-2 flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Update Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisasterEventPage;
