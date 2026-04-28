import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import { fetchTrackingRecords } from "../services/workflowService";
import "./Pages.css";

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

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_IMMEDIATE_NEEDS = 12;
const MAX_IMMEDIATE_NEED_LENGTH = 60;
const MIN_AFFECTED_POPULATION = 1;
const MAX_AFFECTED_POPULATION = 10000000;
const MAX_AFFECTED_POPULATION_DIGITS = String(MAX_AFFECTED_POPULATION).length;

function parseImmediateNeedsFromText(rawText) {
  const seen = new Set();

  return String(rawText || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function sanitizePopulationInput(value) {
  const digitsOnly = String(value ?? "").replace(/\D/g, "");
  if (!digitsOnly) {
    return "";
  }

  const parsed = Number(digitsOnly);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return String(Math.min(parsed, MAX_AFFECTED_POPULATION));
}

function preventInvalidPopulationKey(event) {
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
    event.preventDefault();
  }
}

const DisasterEventPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const canCreateReport = user?.role === "dmc_officer";

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
    const populationValue = Number(event.affectedPopulation || 0);

    setErrorMessage("");
    setActionMessage("");
    setEditingId(event.id);
    setFormData({
      disasterType: event.disasterType || "",
      location: event.location || "",
      severity: event.severity || "high",
      affectedPopulation:
        Number.isInteger(populationValue) && populationValue >= MIN_AFFECTED_POPULATION
          ? String(Math.min(populationValue, MAX_AFFECTED_POPULATION))
          : "",
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
      const [reports, tracking] = await Promise.allSettled([
        fetchDisasterReports(),
        fetchTrackingRecords(),
      ]);

      const safeReports = reports.status === "fulfilled" ? reports.value : [];
      const safeTracking = tracking.status === "fulfilled" ? tracking.value : [];

      setDisasterEvents(Array.isArray(safeReports) ? safeReports : []);
      setTrackingRecords(Array.isArray(safeTracking) ? safeTracking : []);
      
      // Check for new delivery confirmations
      if (trackingRecords.length > 0) {
        const newConfirmations = safeTracking.filter(record => 
          record.status === 'confirmed_delivered' && 
          !trackingRecords.some(prevRecord => 
            prevRecord._id === record._id && prevRecord.status === 'confirmed_delivered'
          )
        );
        
        if (newConfirmations.length > 0) {
          setActionMessage(`Delivery confirmed for ${newConfirmations.length} disaster event(s). Resources have been successfully delivered.`);
        }
      }
    } catch (error) {
      setDisasterEvents([]);
      setTrackingRecords([]);
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

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));

  const paginatedEvents = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredEvents, totalPages]);

  const latestTrackingByDisasterId = useMemo(() => {
    const map = new Map();

    trackingRecords.forEach((record) => {
      const disasterId = String(record.disasterId?._id || record.disasterId || "");
      if (!disasterId) return;

      const existing = map.get(disasterId);
      const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : 0;
      const currentTime = new Date(record.updatedAt || record.createdAt || 0).getTime();

      if (!existing || currentTime >= existingTime) {
        map.set(disasterId, record);
      }
    });

    return map;
  }, [trackingRecords]);

  const stats = useMemo(
    () => ({
      totalEvents: disasterEvents.length,
      activeEvents: disasterEvents.filter((e) => e.status === "active").length,
      criticalEvents: disasterEvents.filter((e) => e.priority === "critical").length,
      resolvedEvents: disasterEvents.filter((e) => e.status === "resolved").length,
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
      case "allocated":
        return { color: "#166534", bg: "#dcfce7" };
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
    const nextValue = field === "affectedPopulation" ? sanitizePopulationInput(value) : value;
    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const validateReportForm = () => {
    const disasterType = formData.disasterType.trim();
    const location = formData.location.trim();
    const description = formData.description.trim();
    const immediateNeeds = parseImmediateNeedsFromText(formData.immediateNeedsText);
    const affectedPopulation = Number(formData.affectedPopulation);
    const eventDate = new Date(formData.eventDate);

    if (!disasterType || disasterType.length < 3) {
      return "Disaster type must be at least 3 characters.";
    }

    if (disasterType.length > 80) {
      return "Disaster type cannot exceed 80 characters.";
    }

    if (!location || location.length < 3) {
      return "Location must be at least 3 characters.";
    }

    if (location.length > 120) {
      return "Location cannot exceed 120 characters.";
    }

    if (
      !Number.isInteger(affectedPopulation) ||
      affectedPopulation < MIN_AFFECTED_POPULATION ||
      affectedPopulation > MAX_AFFECTED_POPULATION
    ) {
      return `Affected population must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`;
    }

    if (Number.isNaN(eventDate.getTime())) {
      return "Event date and time is invalid.";
    }

    if (eventDate.getTime() > Date.now() + 60000) {
      return "Event date cannot be in the future.";
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
    }

    if (immediateNeeds.length > MAX_IMMEDIATE_NEEDS) {
      return `Immediate needs cannot exceed ${MAX_IMMEDIATE_NEEDS} items.`;
    }

    const longNeed = immediateNeeds.find((item) => item.length > MAX_IMMEDIATE_NEED_LENGTH);
    if (longNeed) {
      return `Each immediate need must be ${MAX_IMMEDIATE_NEED_LENGTH} characters or less.`;
    }

    if (["pending_inventory", "allocated"].includes(formData.status) && immediateNeeds.length === 0) {
      return "Add at least one immediate need before setting Pending Inventory or Allocated status.";
    }

    return "";
  };

  const getPayloadFromForm = () => {
    const affectedPopulation = Number(formData.affectedPopulation);
    const immediateNeeds = parseImmediateNeedsFromText(formData.immediateNeedsText);

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

    const validationError = validateReportForm();
    if (validationError) {
      setErrorMessage(validationError);
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
      // Handle permission errors silently
      if (error.isPermissionError) {
        console.log('Permission denied for disaster report update - handled silently');
        closeModal();
        return;
      }
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
      // Handle permission errors silently
      if (error.isPermissionError) {
        console.log('Permission denied for disaster report deletion - handled silently');
        setActiveActionId("");
        return;
      }
      setErrorMessage(error.message || "Failed to delete disaster report.");
    } finally {
      setActiveActionId("");
    }
  };

  const handleSummaryFilter = (nextStatus, nextPriority) => {
    setFilterStatus(nextStatus ?? "all");
    setFilterPriority(nextPriority ?? "all");
    setCurrentPage(1);
  };

  const handleSendToAllocation = async (id) => {
    const report = disasterEvents.find((event) => event.id === id);
    if (!report) {
      setErrorMessage("Disaster report not found.");
      return;
    }

    if (["pending_inventory", "allocated", "monitoring", "resolved"].includes(report.status)) {
      setErrorMessage("This report cannot be sent to allocation from its current status.");
      return;
    }

    const immediateNeeds = Array.isArray(report.immediateNeeds)
      ? report.immediateNeeds.map((item) => String(item).trim()).filter(Boolean)
      : [];

    if (!immediateNeeds.length) {
      setErrorMessage("Add at least one immediate need before sending to allocation.");
      return;
    }

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
      // Handle permission errors silently
      if (error.isPermissionError) {
        console.log('Permission denied for sending report to allocation - handled silently');
        setActiveAllocationId("");
        return;
      }
      setErrorMessage(error.message || "Failed to send report to allocation.");
    } finally {
      setActiveAllocationId("");
    }
  };

  return (
    <div className="disaster-event-page">
      <div className="disaster-page-header">
        <div>
          <p className="disaster-page-kicker">Admin / Disaster Management</p>
          <h1>Disaster Reports</h1>
          <p>Track incidents, prioritize response actions, and keep allocation teams synchronized.</p>
        </div>
        <div className="disaster-page-actions">
          {canCreateReport && (
            <button className="btn-primary" type="button" onClick={() => navigate("/disaster-report/create")}>
              <Plus size={14} /> Create Report
            </button>
          )}
          <button className="btn-secondary" type="button" onClick={loadReports}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

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

      <div className="disaster-stats-grid">
        <button type="button" className={`disaster-stat-card ${filterStatus === "all" && filterPriority === "all" ? "is-active" : ""}`} onClick={() => handleSummaryFilter("all", "all") }>
          <div className="disaster-stat-icon" style={{ background: "#eff6ff" }}>
            <Activity size={24} color="#2563eb" />
          </div>
          <div className="disaster-stat-content">
            <h3>Total Reports</h3>
            <p>{stats.totalEvents}</p>
          </div>
        </button>

        <button type="button" className={`disaster-stat-card ${filterStatus === "active" ? "is-active" : ""}`} onClick={() => handleSummaryFilter("active", "all") }>
          <div className="disaster-stat-icon" style={{ background: "#dcfce7" }}>
            <CheckCircle2 size={24} color="#16a34a" />
          </div>
          <div className="disaster-stat-content">
            <h3>Active</h3>
            <p>{stats.activeEvents}</p>
          </div>
        </button>

        <button type="button" className={`disaster-stat-card ${filterPriority === "critical" ? "is-active" : ""}`} onClick={() => handleSummaryFilter("all", "critical") }>
          <div className="disaster-stat-icon" style={{ background: "#fee2e2" }}>
            <AlertTriangle size={24} color="#dc2626" />
          </div>
          <div className="disaster-stat-content">
            <h3>Critical</h3>
            <p>{stats.criticalEvents}</p>
          </div>
        </button>

        <button type="button" className={`disaster-stat-card ${filterStatus === "resolved" ? "is-active" : ""}`} onClick={() => handleSummaryFilter("resolved", "all") }>
          <div className="disaster-stat-icon" style={{ background: "#fef3c7" }}>
            <Users size={24} color="#d97706" />
          </div>
          <div className="disaster-stat-content">
            <h3>Resolved</h3>
            <p>{stats.resolvedEvents}</p>
          </div>
        </button>
      </div>

      <div className="disaster-filter-shell">
        <div className="disaster-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by location, type, or officer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="disaster-filter-buttons">
          <select
            className="disaster-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="pending_inventory">Pending Inventory</option>
            <option value="allocated">Allocated</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            className="disaster-select"
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              setCurrentPage(1);
            }}
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
            <h3>No disaster reports available</h3>
            <p>
              {canCreateReport
                ? 'Click "Create Report" to add a new incident.'
                : "No disaster reports are currently available to view."}
            </p>
          </div>
        ) : (
          <div className="disaster-report-table-shell">
            <div className="disaster-report-cards-grid">
              {paginatedEvents.map((event) => {
                const severityStyle = getSeverityStyle(event.severity);
                const statusStyle = getStatusStyle(event.status);
                const priorityStyle = getPriorityStyle(event.priority);
                const SeverityIcon = severityStyle.icon;
                const immediateNeeds = Array.isArray(event.immediateNeeds)
                  ? event.immediateNeeds
                  : [];
                const trackingRecord = latestTrackingByDisasterId.get(String(event.id));
                const needsPreview = immediateNeeds.slice(0, 4);
                const hasMoreNeeds = immediateNeeds.length > needsPreview.length;
                const isDeleting = activeActionId === event.id;
                const isSending = activeAllocationId === event.id;

                return (
                  <article key={event.id} className="disaster-report-card-pro">
                    <div className="card-pro-header">
                      <div>
                        <p className="card-pro-id">{event.id}</p>
                        <h3>{event.disasterType || "Unknown disaster"}</h3>
                      </div>
                      <span className="card-severity-chip" style={{ color: severityStyle.color, background: severityStyle.bg }}>
                        <SeverityIcon size={13} />
                        {String(event.severity || "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="card-pro-meta-row card-pro-meta-primary">
                      <div className="card-pro-meta-item">
                        <MapPin size={14} />
                        <span>{event.location || "Location not specified"}</span>
                      </div>
                      <div className="card-pro-meta-item">
                        <Calendar size={14} />
                        <span>{formatDate(event.eventDate)}</span>
                      </div>
                      <div className="card-pro-meta-item">
                        <Users size={14} />
                        <span>{formatPopulation(event.affectedPopulation || 0)} affected</span>
                      </div>
                    </div>

                    <div className="card-pro-meta-grid">
                      <div className="card-pro-meta-box">
                        <span className="meta-box-label">Reported by</span>
                        <strong>{event.reportedBy || "DMC Officer"}</strong>
                      </div>
                      <div className="card-pro-meta-box">
                        <span className="meta-box-label">Last updated</span>
                        <strong>{formatDate(event.updatedAt || event.eventDate)}</strong>
                      </div>
                    </div>

                    <div className="card-pro-badge-row">
                      <span className="table-badge" style={{ color: priorityStyle.color, background: priorityStyle.bg }}>
                        PRIORITY: {String(event.priority || "unknown").toUpperCase()}
                      </span>
                      <span className="table-badge" style={{ color: statusStyle.color, background: statusStyle.bg }}>
                        {String(event.status || "unknown").toUpperCase()}
                      </span>
                      {event.status === "allocated" && !trackingRecord && (
                        <span
                          className="table-badge ready-for-tracking"
                          style={{
                            color: "#059669",
                            background: "#d1fae5",
                            fontWeight: "600",
                            border: "2px solid #10b981",
                            animation: "pulse 2s infinite",
                          }}
                        >
                          READY FOR TRACKING
                        </span>
                      )}
                      {trackingRecord && (
                        <span
                          className={`table-badge ${trackingRecord.status === "confirmed_delivered" ? "delivery-confirmed" : ""}`}
                          style={{
                            color: trackingRecord.status === "confirmed_delivered" ? "#166534" : "#1d4ed8",
                            background: trackingRecord.status === "confirmed_delivered" ? "#dcfce7" : "#dbeafe",
                            fontWeight: trackingRecord.status === "confirmed_delivered" ? "600" : "normal",
                            border: trackingRecord.status === "confirmed_delivered" ? "2px solid #16a34a" : "none",
                          }}
                        >
                          {trackingRecord.status === "confirmed_delivered" ? "" : ""}
                          TRACKING: {String(trackingRecord.status || "unknown").replaceAll("_", " ").toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="card-pro-description">
                      {event.description
                        ? String(event.description).slice(0, 180)
                        : "No description provided for this report."}
                      {event.description && String(event.description).length > 180 ? "..." : ""}
                    </p>

                    <div className="card-pro-needs">
                      {needsPreview.length === 0 ? (
                        <span className="needs-empty">No immediate needs listed</span>
                      ) : (
                        needsPreview.map((need, index) => (
                          <span key={`${event.id}-need-${index}`} className="need-chip">
                            {need}
                          </span>
                        ))
                      )}
                      {hasMoreNeeds && (
                        <span className="need-chip more">+{immediateNeeds.length - needsPreview.length} more</span>
                      )}
                    </div>

                    <div className="card-pro-actions">
                      <button type="button" className="card-action-btn" onClick={() => openEditModal(event)} aria-label="View report">
                        <Eye size={14} /> View / Edit
                      </button>
                      <button
                        type="button"
                        className="card-action-btn danger"
                        onClick={() => handleDelete(event.id)}
                        disabled={isDeleting}
                        aria-label="Delete report"
                      >
                        <Trash2 size={14} /> {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        className="card-action-btn send-allocation-btn"
                        onClick={() => handleSendToAllocation(event.id)}
                        disabled={isSending}
                      >
                        <Pencil size={14} /> {isSending ? "Sending..." : "Send to Allocation"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pagination-shell">
              <button type="button" className="pagination-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={14} /> Previous
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`pagination-page ${currentPage === pageNumber ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button type="button" className="pagination-btn" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="professional-form-shell w-full max-w-2xl rounded-2xl p-5 shadow-2xl">
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

            <div className="shared-stepper mb-4">
              <div className="step-chip active">
                <span>1</span>
                <p>Incident Data</p>
              </div>
              <div className="step-chip active">
                <span>2</span>
                <p>Operational Status</p>
              </div>
              <div className="step-chip active">
                <span>3</span>
                <p>Update Record</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Disaster type
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.disasterType}
                  onChange={(e) => handleFormInput("disasterType", e.target.value)}
                  maxLength={80}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                Location
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.location}
                  onChange={(e) => handleFormInput("location", e.target.value)}
                  maxLength={120}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={MAX_AFFECTED_POPULATION_DIGITS}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.affectedPopulation}
                  onKeyDown={preventInvalidPopulationKey}
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
                  <option value="allocated">Allocated</option>
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
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Immediate needs (comma-separated)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={formData.immediateNeedsText}
                  onChange={(e) => handleFormInput("immediateNeedsText", e.target.value)}
                  placeholder="Water, Meal Packs, Medical Kits"
                  maxLength={500}
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
