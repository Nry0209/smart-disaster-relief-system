import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
  X,
  Users,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import {
  deleteDisasterReport,
  fetchDisasterReports,
  updateDisasterReport,
} from "../services/disasterReportService";

const DisasterEventPage = () => {
  const [disasterEvents, setDisasterEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [activeActionId, setActiveActionId] = useState("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState("");
  const [editForm, setEditForm] = useState({
    disasterType: "",
    location: "",
    severity: "high",
    priority: "high",
    status: "active",
    affectedPopulation: 0,
    eventDate: "",
    description: "",
    immediateNeedsText: "",
  });

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const loadReports = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const reports = await fetchDisasterReports();
      setDisasterEvents(Array.isArray(reports) ? reports : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load disaster reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleRefresh = async () => {
    setActionMessage("");
    await loadReports();
  };

  const openEditModal = (event) => {
    setActionMessage("");
    setErrorMessage("");
    setEditingReportId(event.id);
    setEditForm({
      disasterType: event.disasterType || "",
      location: event.location || "",
      severity: event.severity || "high",
      priority: event.priority || "high",
      status: event.status || "active",
      affectedPopulation: Number(event.affectedPopulation) || 0,
      eventDate: toDateTimeLocal(event.eventDate),
      description: event.description || "",
      immediateNeedsText: normalizeNeedsText(event.immediateNeeds),
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingReportId("");
  };

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateReport = async () => {
    setErrorMessage("");
    setActionMessage("");

    if (!editingReportId) {
      return;
    }

    if (!editForm.disasterType.trim() || !editForm.location.trim() || !editForm.eventDate) {
      setErrorMessage("Disaster type, location, and event date are required.");
      return;
    }

    const affectedPopulation = Number(editForm.affectedPopulation);
    if (!Number.isFinite(affectedPopulation) || affectedPopulation <= 0) {
      setErrorMessage("Affected population must be greater than 0.");
      return;
    }

    const immediateNeeds = editForm.immediateNeedsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setActiveActionId(editingReportId);

    try {
      const updated = await updateDisasterReport(editingReportId, {
        disasterType: editForm.disasterType.trim(),
        location: editForm.location.trim(),
        severity: editForm.severity,
        priority: editForm.priority,
        status: editForm.status,
        affectedPopulation,
        eventDate: editForm.eventDate,
        description: editForm.description.trim(),
        immediateNeeds,
      });

      setDisasterEvents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setActionMessage("Disaster report updated successfully.");
      closeEditModal();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update disaster report.");
    } finally {
      setActiveActionId("");
    }
  };

  const handleDeleteReport = async (id) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this disaster report? This action cannot be undone."
    );

    if (!shouldDelete) {
      return;
    }

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

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "critical":
        return { className: "bg-rose-100 text-rose-700", icon: ShieldAlert };
      case "high":
        return { className: "bg-orange-100 text-orange-700", icon: AlertTriangle };
      case "medium":
        return { className: "bg-amber-100 text-amber-700", icon: AlertCircle };
      case "low":
        return { className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
      default:
        return { className: "bg-slate-100 text-slate-700", icon: AlertCircle };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700";
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "pending_inventory":
        return "bg-indigo-100 text-indigo-700";
      case "monitoring":
        return "bg-amber-100 text-amber-700";
      case "resolved":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-rose-100 text-rose-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "low":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const filteredEvents = useMemo(
    () =>
      disasterEvents.filter((event) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          event.location?.toLowerCase().includes(query) ||
          event.disasterType?.toLowerCase().includes(query) ||
          event.reportedBy?.toLowerCase().includes(query);
        const matchesStatus = filterStatus === "all" || event.status === filterStatus;
        const matchesPriority = filterPriority === "all" || event.priority === filterPriority;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [disasterEvents, filterPriority, filterStatus, searchTerm]
  );

  const stats = useMemo(
    () => ({
      totalEvents: disasterEvents.length,
      activeEvents: disasterEvents.filter((e) => e.status === "active").length,
      criticalEvents: disasterEvents.filter(
        (e) => e.priority === "critical" || e.severity === "critical"
      ).length,
      totalAffected: disasterEvents.reduce((sum, e) => sum + (Number(e.affectedPopulation) || 0), 0),
    }),
    [disasterEvents]
  );

  const formatPopulation = (num = 0) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEnumLabel = (value = "unknown") => {
    return String(value)
      .split("_")
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const statCards = [
    {
      label: "Total Events",
      value: stats.totalEvents,
      icon: Activity,
      iconClass: "bg-sky-100 text-sky-600",
    },
    {
      label: "Active Events",
      value: stats.activeEvents,
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Critical Events",
      value: stats.criticalEvents,
      icon: AlertTriangle,
      iconClass: "bg-rose-100 text-rose-600",
    },
    {
      label: "Total Affected",
      value: formatPopulation(stats.totalAffected),
      icon: Users,
      iconClass: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.1),transparent_40%)] px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto max-w-7xl">
        <section className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Disaster Events
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </section>

        <section>
          {actionMessage && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {actionMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${item.iconClass}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by location, disaster type, or reporting officer..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
        </section>

        <section className="mt-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
              <Clock3 size={38} className="mx-auto animate-pulse text-slate-400" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Loading disaster events</h3>
              <p className="mt-1 text-sm text-slate-500">Fetching latest records from the database.</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
              <AlertTriangle size={42} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900">No events found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {disasterEvents.length === 0
                  ? "No reports available yet. Create a disaster report to see live events here."
                  : "No disaster events match your current filters."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredEvents.map((event) => {
                const severityStyle = getSeverityStyle(event.severity);
                const statusStyle = getStatusStyle(event.status);
                const priorityStyle = getPriorityStyle(event.priority);
                const SeverityIcon = severityStyle.icon;
                const eventId = event.id ? String(event.id) : "N/A";

                return (
                  <article
                    key={event.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_22px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(15,23,42,0.09)]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 opacity-90" />

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {event.disasterType || "Unspecified Incident"}
                        </h3>
                        <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          ID: {eventId}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityStyle.className}`}
                        >
                          <SeverityIcon size={12} />
                          {formatEnumLabel(event.severity)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle}`}
                        >
                          {formatEnumLabel(event.priority)} Priority
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}
                        >
                          {formatEnumLabel(event.status)}
                        </span>

                        <button
                          type="button"
                          onClick={() => openEditModal(event)}
                          disabled={activeActionId === event.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Edit report"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(event.id)}
                          disabled={activeActionId === event.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Delete report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                      <MapPin size={16} className="text-sky-600" />
                      <span>{event.location || "Location not specified"}</span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Affected</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                          <Users size={14} className="text-amber-600" />
                          {formatPopulation(event.affectedPopulation)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Event Date</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                          <Calendar size={14} className="text-emerald-600" />
                          {formatDate(event.eventDate)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last Updated</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                          <Clock3 size={14} className="text-violet-600" />
                          {formatDate(event.updatedAt || event.createdAt)}
                        </p>
                      </div>
                    </div>

                    {event.description && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Situation Summary
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{event.description}</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Immediate needs
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {event.immediateNeeds?.length ? (
                          event.immediateNeeds.map((need, index) => (
                            <span
                              key={`${event.id}-${index}`}
                              className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800"
                            >
                              {need}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                            No specific needs listed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Reported by
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {event.reportedBy || "DMC Officer"}
                        </p>
                        <p className="text-xs text-slate-500">Created: {formatDateTime(event.createdAt)}</p>
                      </div>
                      <p className="text-xs text-slate-500">Ref: {eventId}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.25)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Edit Disaster Report</h3>
                  <p className="mt-1 text-sm text-slate-500">Update details and save changes to the database.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                  aria-label="Close edit dialog"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Disaster type
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.disasterType}
                    onChange={(e) => handleEditInputChange("disasterType", e.target.value)}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Location
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.location}
                    onChange={(e) => handleEditInputChange("location", e.target.value)}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Severity
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.severity}
                    onChange={(e) => handleEditInputChange("severity", e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Priority
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.priority}
                    onChange={(e) => handleEditInputChange("priority", e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Status
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.status}
                    onChange={(e) => handleEditInputChange("status", e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="pending_inventory">Pending Inventory</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-600">
                  Affected population
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.affectedPopulation}
                    onChange={(e) => handleEditInputChange("affectedPopulation", e.target.value)}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Event date and time
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.eventDate}
                    onChange={(e) => handleEditInputChange("eventDate", e.target.value)}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Description
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.description}
                    onChange={(e) => handleEditInputChange("description", e.target.value)}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Immediate needs (comma separated)
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    value={editForm.immediateNeedsText}
                    onChange={(e) => handleEditInputChange("immediateNeedsText", e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateReport}
                  disabled={activeActionId === editingReportId}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {activeActionId === editingReportId ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisasterEventPage;
