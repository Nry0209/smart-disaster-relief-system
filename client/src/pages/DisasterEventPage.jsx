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
import PageHeader from "../components/PageHeader";
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

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));

  const paginatedEvents = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredEvents, totalPages]);

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
      setErrorMessage(error.message || "Failed to send report to allocation.");
    } finally {
      setActiveAllocationId("");
    }
  };

  return (
    <div className="disaster-event-page">
      <PageHeader
        role="Admin / Disaster Management"
        title="Disaster Reports"
        description="Track incidents, prioritize response actions, and keep allocation teams synchronized"
        actions={
          <>
            {canCreateReport && (
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2" type="button" onClick={() => navigate("/disaster-report/create")}>
                <Plus size={14} /> Create Report
              </button>
            )}
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2" type="button" onClick={loadReports}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </>
        }
      />

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button 
          type="button" 
          className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
            filterStatus === "all" && filterPriority === "all" 
              ? "bg-blue-50 border-blue-200 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`} 
          onClick={() => handleSummaryFilter("all", "all")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Activity size={20} color="#2563eb" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-slate-600">Total Reports</h3>
              <p className="text-2xl font-bold text-slate-900">{stats.totalEvents}</p>
            </div>
          </div>
        </button>

        <button 
          type="button" 
          className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
            filterStatus === "active" 
              ? "bg-emerald-50 border-emerald-200 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`} 
          onClick={() => handleSummaryFilter("active", "all")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 size={20} color="#16a34a" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-slate-600">Active</h3>
              <p className="text-2xl font-bold text-slate-900">{stats.activeEvents}</p>
            </div>
          </div>
        </button>

        <button 
          type="button" 
          className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
            filterPriority === "critical" 
              ? "bg-rose-50 border-rose-200 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`} 
          onClick={() => handleSummaryFilter("all", "critical")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-slate-600">Critical</h3>
              <p className="text-2xl font-bold text-slate-900">{stats.criticalEvents}</p>
            </div>
          </div>
        </button>

        <button 
          type="button" 
          className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
            filterStatus === "resolved" 
              ? "bg-amber-50 border-amber-200 shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`} 
          onClick={() => handleSummaryFilter("resolved", "all")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Users size={20} color="#d97706" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-medium text-slate-600">Resolved</h3>
              <p className="text-2xl font-bold text-slate-900">{stats.resolvedEvents}</p>
            </div>
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
  <>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Disaster Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Reported Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {paginatedEvents.map((event) => {
            const statusStyle = getStatusStyle(event.status);
            const priorityStyle = getPriorityStyle(event.priority);

            return (
              <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{event.disasterType || "-"}</div>
                    <div className="text-xs text-slate-500">{event.id}</div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-slate-700">{event.location || "Location not specified"}</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{ color: priorityStyle.color, background: priorityStyle.bg }}
                  >
                    {String(event.priority || "unknown").toUpperCase()}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{ color: statusStyle.color, background: statusStyle.bg }}
                  >
                    {String(event.status || "unknown").toUpperCase()}
                  </span>
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {formatDate(event.eventDate)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      onClick={() => openEditModal(event)}
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      onClick={() => openEditModal(event)}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded transition-colors"
                      onClick={() => handleDelete(event.id)}
                      disabled={activeActionId === event.id}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* PAGINATION */}
    <div className="pagination-shell">
      <button
        type="button"
        className="pagination-btn"
        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        disabled={currentPage === 1}
      >
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

      <button
        type="button"
        className="pagination-btn"
        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        disabled={currentPage === totalPages}
      >
        Next <ChevronRight size={14} />
      </button>
    </div>

    {/* MODAL (ONLY ONE — FIXED) */}
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
            <div className="step-chip active"><span>1</span><p>Incident Data</p></div>
            <div className="step-chip active"><span>2</span><p>Operational Status</p></div>
            <div className="step-chip active"><span>3</span><p>Update Record</p></div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            {/* Form content will continue here */}
          </form>
        </div>
      </div>
    )}
  </>
    )}
      </div>
    </div>
  );
};

export default DisasterEventPage;
