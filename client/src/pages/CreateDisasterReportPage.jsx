import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDisasterReport } from "../services/disasterReportService";

const QUICK_NEEDS = [
  "Water",
  "Meal Packs",
  "Medical Kits",
  "Blankets",
  "Tents",
  "Rescue Boats",
  "Power Banks",
  "Baby Supplies",
];

const ALLOWED_SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const ALLOWED_PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const MIN_DISASTER_TYPE_LENGTH = 3;
const MAX_DISASTER_TYPE_LENGTH = 80;
const MIN_LOCATION_LENGTH = 3;
const MAX_LOCATION_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_IMMEDIATE_NEEDS = 12;
const MAX_IMMEDIATE_NEED_LENGTH = 60;
const MIN_AFFECTED_POPULATION = 1;
const MAX_AFFECTED_POPULATION = 10000000;
const MAX_AFFECTED_POPULATION_DIGITS = String(MAX_AFFECTED_POPULATION).length;

function normalizeImmediateNeeds(needs = []) {
  const seen = new Set();

  return needs
    .map((item) => String(item).trim())
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

function parseImmediateNeedsInput(value) {
  return normalizeImmediateNeeds(String(value || "").split(","));
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

function CreateDisasterReportPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    disasterType: "",
    location: "",
    severity: "high",
    affectedPopulation: "",
    eventDate: "",
    priority: "critical",
    description: "",
    immediateNeeds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState("save");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [lastEditedAt, setLastEditedAt] = useState(new Date());

  const handleInputChange = (field, value) => {
    setLastEditedAt(new Date());
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAffectedPopulationChange = (value) => {
    const sanitizedPopulation = sanitizePopulationInput(value);
    handleInputChange("affectedPopulation", sanitizedPopulation);
  };

  const handleNeedsChange = (value) => {
    setLastEditedAt(new Date());
    const needs = parseImmediateNeedsInput(value);
    setFormData((prev) => ({ ...prev, immediateNeeds: needs }));
  };

  const handleQuickNeedToggle = (need) => {
    setLastEditedAt(new Date());

    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);
    const hasNeed = normalizedNeeds.includes(need);

    if (!hasNeed && normalizedNeeds.length >= MAX_IMMEDIATE_NEEDS) {
      setFormError(`You can add up to ${MAX_IMMEDIATE_NEEDS} immediate needs.`);
      return;
    }

    setFormError("");

    setFormData((prev) => {
      const currentNeeds = normalizeImmediateNeeds(prev.immediateNeeds);
      const immediateNeeds = hasNeed
        ? currentNeeds.filter((item) => item !== need)
        : [...currentNeeds, need];
      return { ...prev, immediateNeeds };
    });
  };

  const predictiveEstimates = useMemo(() => {
    const severityMultiplier = {
      critical: 1.5,
      high: 1.25,
      medium: 1,
      low: 0.85,
    };

    const baseItems = [
      { name: "Water (L)", base: 3 },
      { name: "Meal Packs", base: 2 },
      { name: "Medical Kits", base: 0.3 },
      { name: "Blankets", base: 0.6 },
    ];

    const multiplier = severityMultiplier[formData.severity] || 1;

    return baseItems.map((item) => ({
      ...item,
      estimate: Math.max(
        1,
        Math.round((item.base || 1) * (formData.affectedPopulation / 1000) * multiplier)
      ),
    }));
  }, [formData.affectedPopulation, formData.severity]);

  const impactSummary = useMemo(() => {
    const population = Number(formData.affectedPopulation) || 0;
    return {
      familiesDisplaced: Math.max(1, Math.round(population / 4)),
      sheltersOpened: Math.max(1, Math.round(population / 1300)),
      roadAccess: Math.max(20, Math.min(90, 80 - Math.round(population / 3000))),
      medicalAlerts: Math.max(10, Math.round(population / 120)),
    };
  }, [formData.affectedPopulation]);

  const completion = useMemo(() => {
    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);

    const checks = [
      Boolean(formData.disasterType?.trim()),
      Boolean(formData.location?.trim()),
      Boolean(formData.eventDate),
      Number(formData.affectedPopulation) > 0,
      Boolean(formData.description?.trim()),
      normalizedNeeds.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [formData]);

  const riskBand = useMemo(() => {
    const population = Number(formData.affectedPopulation) || 0;
    if (formData.severity === "critical" || population >= 20000) {
      return "Critical";
    }
    if (formData.severity === "high" || population >= 9000) {
      return "High";
    }
    if (formData.severity === "medium" || population >= 3000) {
      return "Medium";
    }
    return "Low";
  }, [formData.affectedPopulation, formData.severity]);

  const reportId = useMemo(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `DR-${yy}${mm}${dd}`;
  }, []);

  const steps = [
    "Incident profile",
    "Situation assessment",
    "Prediction review",
    "Submit report",
  ];

  const readinessLabel = useMemo(() => {
    if (completion === 100 && formData.immediateNeeds.length > 0) {
      return {
        text: "Ready for submission",
        tone: "text-emerald-700 bg-emerald-100 border-emerald-200",
      };
    }
    if (completion >= 60) {
      return {
        text: "Almost ready",
        tone: "text-amber-700 bg-amber-100 border-amber-200",
      };
    }
    return {
      text: "Draft in progress",
      tone: "text-slate-700 bg-slate-100 border-slate-200",
    };
  }, [completion, formData.immediateNeeds.length]);

  const fieldErrors = useMemo(() => {
    const disasterType = formData.disasterType.trim();
    const location = formData.location.trim();
    const affectedPopulation = Number(formData.affectedPopulation);
    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);
    const parsedEventDate = formData.eventDate ? new Date(formData.eventDate) : null;

    return {
      disasterType:
        !disasterType ||
        disasterType.length < MIN_DISASTER_TYPE_LENGTH ||
        disasterType.length > MAX_DISASTER_TYPE_LENGTH,
      location:
        !location ||
        location.length < MIN_LOCATION_LENGTH ||
        location.length > MAX_LOCATION_LENGTH,
      eventDate:
        !formData.eventDate ||
        !parsedEventDate ||
        Number.isNaN(parsedEventDate.getTime()) ||
        parsedEventDate.getTime() > Date.now() + 60000,
      affectedPopulation:
        !Number.isInteger(affectedPopulation) ||
        affectedPopulation < MIN_AFFECTED_POPULATION ||
        affectedPopulation > MAX_AFFECTED_POPULATION,
      description:
        !formData.description.trim() ||
        formData.description.trim().length > MAX_DESCRIPTION_LENGTH,
      immediateNeeds:
        normalizedNeeds.length > MAX_IMMEDIATE_NEEDS ||
        normalizedNeeds.some((item) => item.length > MAX_IMMEDIATE_NEED_LENGTH),
    };
  }, [formData]);

  const validateBeforeSubmit = (actionType) => {
    const disasterType = formData.disasterType.trim();
    const location = formData.location.trim();
    const description = formData.description.trim();
    const affectedPopulation = Number(formData.affectedPopulation);
    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);
    const eventDate = formData.eventDate ? new Date(formData.eventDate) : null;

    if (!ALLOWED_SEVERITIES.has(formData.severity)) {
      return "Selected severity level is invalid.";
    }

    if (!ALLOWED_PRIORITIES.has(formData.priority)) {
      return "Selected priority level is invalid.";
    }

    if (!disasterType || disasterType.length < MIN_DISASTER_TYPE_LENGTH) {
      return `Disaster type must be at least ${MIN_DISASTER_TYPE_LENGTH} characters.`;
    }

    if (disasterType.length > MAX_DISASTER_TYPE_LENGTH) {
      return `Disaster type cannot exceed ${MAX_DISASTER_TYPE_LENGTH} characters.`;
    }

    if (!location || location.length < MIN_LOCATION_LENGTH) {
      return `Location must be at least ${MIN_LOCATION_LENGTH} characters.`;
    }

    if (location.length > MAX_LOCATION_LENGTH) {
      return `Location cannot exceed ${MAX_LOCATION_LENGTH} characters.`;
    }

    if (!eventDate || Number.isNaN(eventDate.getTime())) {
      return "Reported date/time is required and must be valid.";
    }

    if (eventDate.getTime() > Date.now() + 60000) {
      return "Reported date/time cannot be in the future.";
    }

    if (
      !Number.isInteger(affectedPopulation) ||
      affectedPopulation < MIN_AFFECTED_POPULATION ||
      affectedPopulation > MAX_AFFECTED_POPULATION
    ) {
      return `Affected population must be a whole number between ${MIN_AFFECTED_POPULATION} and ${MAX_AFFECTED_POPULATION}.`;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return `Situation summary cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
    }

    if (actionType !== "draft" && !description) {
      return "Please provide a situation summary before submission.";
    }

    if (normalizedNeeds.length > MAX_IMMEDIATE_NEEDS) {
      return `You can add up to ${MAX_IMMEDIATE_NEEDS} immediate needs.`;
    }

    if (normalizedNeeds.some((item) => item.length > MAX_IMMEDIATE_NEED_LENGTH)) {
      return `Each immediate need must be ${MAX_IMMEDIATE_NEED_LENGTH} characters or less.`;
    }

    if (actionType === "allocation" && normalizedNeeds.length === 0) {
      return "Add at least one immediate need before sending to allocation.";
    }

    return "";
  };

  const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value);
  const formatDateTime = (value) =>
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const handleSetReportedNow = () => {
    handleInputChange("eventDate", getCurrentDateTimeLocal());
  };

  const inputBaseClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

  const getFieldClass = (hasError) =>
    `${inputBaseClass} ${
      hasError
        ? "border-rose-300 bg-rose-50/40 focus:border-rose-400 focus:ring-rose-100"
        : ""
    }`;

  const handleCreateReport = async (status, successMessage, actionType) => {
    setFormError("");
    setFormSuccess("");

    const validationError = validateBeforeSubmit(actionType);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);

    setSubmitAction(actionType);
    setIsSubmitting(true);

    try {
      await createDisasterReport({
        ...formData,
        disasterType: formData.disasterType.trim(),
        location: formData.location.trim(),
        affectedPopulation: Number(formData.affectedPopulation),
        description: formData.description.trim(),
        immediateNeeds: normalizedNeeds,
        status,
        reportedBy: "DMC Officer",
      });

      if (actionType === "save" || actionType === "allocation") {
        navigate("/disaster-events");
        return;
      }

      setFormSuccess(successMessage);
      setFormData({
        disasterType: "",
        location: "",
        severity: "high",
        affectedPopulation: "",
        eventDate: "",
        priority: "critical",
        description: "",
        immediateNeeds: [],
      });
      setLastEditedAt(new Date());
    } catch (error) {
      setFormError(error.message || "Failed to create disaster report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_50%),radial-gradient(circle_at_90%_25%,rgba(56,189,248,0.12),transparent_45%)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                DMC Officer / Create Disaster Report
              </span>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Create Disaster Report
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Register incidents with verified field details to trigger inventory,
                allocation, and delivery workflows.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Completion</span>
                <span>{completion}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Report ID: {reportId}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Risk band: {riskBand}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Last edited: {formatDateTime(lastEditedAt)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${readinessLabel.tone}`}>
              {readinessLabel.text}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const active = completion >= (index + 1) * 25;
              return (
                <div
                  key={step}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    active
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {index + 1}. {step}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Incident profile</h2>
                  <p className="text-xs text-slate-500">
                    Capture core event details and risk level.
                  </p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {formData.priority.toUpperCase()} PRIORITY
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Disaster type
                  <input
                    className={getFieldClass(fieldErrors.disasterType)}
                    type="text"
                    placeholder="Flood"
                    value={formData.disasterType}
                    onChange={(e) => handleInputChange("disasterType", e.target.value)}
                    maxLength={MAX_DISASTER_TYPE_LENGTH}
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    Example: Flood, Landslide, Earthquake, Cyclone
                  </p>
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  District / Location
                  <input
                    className={getFieldClass(fieldErrors.location)}
                    type="text"
                    placeholder="Gampaha / Biyagama"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    maxLength={MAX_LOCATION_LENGTH}
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Severity level
                  <select
                    className={inputBaseClass}
                    value={formData.severity}
                    onChange={(e) => handleInputChange("severity", e.target.value)}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Affected population
                  <input
                    className={getFieldClass(fieldErrors.affectedPopulation)}
                    type="text"
                    placeholder="18500"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={MAX_AFFECTED_POPULATION_DIGITS}
                    value={formData.affectedPopulation}
                    onKeyDown={preventInvalidPopulationKey}
                    onChange={(e) => handleAffectedPopulationChange(e.target.value)}
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    Enter a whole number between {MIN_AFFECTED_POPULATION} and {MAX_AFFECTED_POPULATION}.
                  </p>
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  <span className="flex items-center justify-between gap-2">
                    <span>Reported date & time</span>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      onClick={handleSetReportedNow}
                    >
                      Set now
                    </button>
                  </span>
                  <input
                    className={getFieldClass(fieldErrors.eventDate)}
                    type="datetime-local"
                    value={formData.eventDate}
                    max={getCurrentDateTimeLocal()}
                    step={60}
                    onChange={(e) => handleInputChange("eventDate", e.target.value)}
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    Future date/time is disabled to keep reports audit-safe.
                  </p>
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Response priority
                  <select
                    className={inputBaseClass}
                    value={formData.priority}
                    onChange={(e) => handleInputChange("priority", e.target.value)}
                  >
                    <option value="critical">Immediate</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              <h2 className="text-lg font-semibold text-slate-900">Situation assessment</h2>
              <p className="mb-4 text-xs text-slate-500">
                Add incident context and required resources.
              </p>

              <div className="space-y-4">
                <label className="block space-y-1 text-xs font-semibold text-slate-600">
                  Situation summary
                  <textarea
                    className={`${getFieldClass(fieldErrors.description)} min-h-24 resize-y`}
                    rows={3}
                    placeholder="Floodwater has entered low-lying residential zones..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                </label>

                <label className="block space-y-1 text-xs font-semibold text-slate-600">
                  Initial required resources (manual notes)
                  <textarea
                    className={`${getFieldClass(fieldErrors.immediateNeeds)} min-h-20 resize-y`}
                    rows={2}
                    placeholder="Bottled water, dry rations, blankets, tents..."
                    value={formData.immediateNeeds.join(", ")}
                    onChange={(e) => handleNeedsChange(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    Up to {MAX_IMMEDIATE_NEEDS} needs, each max {MAX_IMMEDIATE_NEED_LENGTH} characters.
                  </p>
                </label>

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">Quick-select resource needs</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_NEEDS.map((need) => {
                      const active = formData.immediateNeeds.includes(need);
                      return (
                        <button
                          key={need}
                          type="button"
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "border-sky-300 bg-sky-100 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          onClick={() => handleQuickNeedToggle(need)}
                        >
                          {need}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() =>
                    handleCreateReport("active", "Disaster report created successfully.", "save")
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting && submitAction === "save" ? "Saving..." : "Save report"}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={() =>
                    handleCreateReport(
                      "pending_inventory",
                      "Report submitted and sent to allocation queue.",
                      "allocation"
                    )
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting && submitAction === "allocation" ? "Sending..." : "Send to allocation"}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={() => handleCreateReport("draft", "Report saved as draft.", "draft")}
                  disabled={isSubmitting}
                >
                  {isSubmitting && submitAction === "draft" ? "Saving draft..." : "Draft only"}
                </button>
              </div>

              {formError && (
                <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {formError}
                </p>
              )}
              {formSuccess && (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {formSuccess}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Operations snapshot</h2>
                <p className="text-xs text-slate-500">
                  Live impact indicators and AI-assisted demand estimation.
                </p>
              </div>

              <div className="relative mb-4 h-52 overflow-hidden rounded-2xl border border-dashed border-sky-200 bg-[radial-gradient(circle_at_18%_28%,rgba(56,189,248,0.32),transparent_45%),radial-gradient(circle_at_70%_38%,rgba(59,130,246,0.28),transparent_42%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.22),transparent_48%),#f0f9ff)]">
                <div className="absolute left-[20%] top-[24%] h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.18)]" />
                <div className="absolute left-[45%] top-[42%] h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.18)]" />
                <div className="absolute left-[62%] top-[55%] h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.18)]" />
                <div className="absolute left-[78%] top-[35%] h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.18)]" />
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-xl bg-white/85 px-3 py-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-blue-600" />Incident</span>
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Shelter</span>
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-500" />Blocked route</span>
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-500" />Medical risk</span>
                </div>
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Severity</p>
                  <p className="text-sm font-semibold text-slate-900">{formData.severity.toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Priority</p>
                  <p className="text-sm font-semibold text-slate-900">{formData.priority.toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Need items</p>
                  <p className="text-sm font-semibold text-slate-900">{formData.immediateNeeds.length}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Families displaced</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatNumber(impactSummary.familiesDisplaced)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Shelters opened</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatNumber(impactSummary.sheltersOpened)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Road access</p>
                  <p className="text-lg font-semibold text-slate-900">{impactSummary.roadAccess}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Medical alerts</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatNumber(impactSummary.medicalAlerts)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-sky-50/70 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900">Predictive resource estimate</h3>
                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  AI confidence 92%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Estimated quantities based on affected population and incident severity.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {predictiveEstimates.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{item.name}</span>
                    <strong className="text-sm font-semibold text-slate-900">
                      {formatNumber(item.estimate)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CreateDisasterReportPage;
