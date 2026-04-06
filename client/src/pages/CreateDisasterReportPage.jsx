import { useMemo, useState } from "react";
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

function CreateDisasterReportPage() {
  const [formData, setFormData] = useState({
    disasterType: "",
    location: "",
    severity: "high",
    affectedPopulation: 0,
    eventDate: "",
    priority: "critical",
    description: "",
    immediateNeeds: [],
    resourceRequirements: [],
    reportedBy: "DMC Officer",
    contactPhone: "",
    contactEmail: "",
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

  const normalizeNeedsList = (needs) =>
    [...new Set(needs.map((item) => String(item).trim()).filter(Boolean))];

  const syncResourceRequirements = (needs, existingRequirements = []) =>
    needs.map((need) => {
      const existing = existingRequirements.find((item) => item.name === need);
      const quantity = Number(existing?.quantity);

      return {
        name: need,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 0,
      };
    });

  const handleNeedsChange = (value) => {
    setLastEditedAt(new Date());
    const needs = normalizeNeedsList(value.split(","));
    setFormData((prev) => ({
      ...prev,
      immediateNeeds: needs,
      resourceRequirements: syncResourceRequirements(needs, prev.resourceRequirements),
    }));
  };

  const handleQuickNeedToggle = (need) => {
    setLastEditedAt(new Date());
    setFormData((prev) => {
      const hasNeed = prev.immediateNeeds.includes(need);
      const immediateNeeds = hasNeed
        ? prev.immediateNeeds.filter((item) => item !== need)
        : [...prev.immediateNeeds, need];
      const normalizedNeeds = normalizeNeedsList(immediateNeeds);

      return {
        ...prev,
        immediateNeeds: normalizedNeeds,
        resourceRequirements: syncResourceRequirements(normalizedNeeds, prev.resourceRequirements),
      };
    });
  };

  const handleNeedQuantityChange = (needName, value) => {
    const parsedQuantity = Number(value);
    const nextQuantity =
      Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.round(parsedQuantity) : 0;

    setLastEditedAt(new Date());
    setFormData((prev) => ({
      ...prev,
      resourceRequirements: prev.resourceRequirements.map((item) =>
        item.name === needName ? { ...item, quantity: nextQuantity } : item
      ),
    }));
  };

  const impactSummary = useMemo(() => {
    const population = Number(formData.affectedPopulation) || 0;
    return {
      familiesDisplaced: Math.max(1, Math.round(population / 4)),
      sheltersOpened: Math.max(1, Math.round(population / 1300)),
      roadAccess: Math.max(20, Math.min(90, 80 - Math.round(population / 3000))),
      medicalAlerts: Math.max(10, Math.round(population / 120)),
    };
  }, [formData.affectedPopulation]);

  const getNeedQuantity = (needName) =>
    formData.resourceRequirements.find((item) => item.name === needName)?.quantity ?? 0;

  const totalRequestedUnits = useMemo(
    () =>
      formData.resourceRequirements.reduce(
        (sum, item) => sum + (Number(item.quantity) > 0 ? Number(item.quantity) : 0),
        0
      ),
    [formData.resourceRequirements]
  );

  const hasRequiredResourceCounts = useMemo(() => {
    if (formData.immediateNeeds.length === 0) {
      return false;
    }

    const requirementMap = new Map(
      formData.resourceRequirements.map((item) => [item.name, Number(item.quantity) || 0])
    );

    return formData.immediateNeeds.every((need) => (requirementMap.get(need) || 0) > 0);
  }, [formData.immediateNeeds, formData.resourceRequirements]);

  const isEmailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isPhoneValid = (value) => /^[0-9+()\-\s]{7,20}$/.test(value);

  const completion = useMemo(() => {
    const checks = [
      Boolean(formData.disasterType?.trim()),
      Boolean(formData.location?.trim()),
      Boolean(formData.eventDate),
      Number(formData.affectedPopulation) > 0,
      Boolean(formData.description?.trim()),
      Boolean(formData.reportedBy?.trim()),
      Boolean(formData.contactPhone?.trim()) && isPhoneValid(formData.contactPhone.trim()),
      Boolean(formData.contactEmail?.trim()) && isEmailValid(formData.contactEmail.trim()),
      hasRequiredResourceCounts,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [formData, hasRequiredResourceCounts]);

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
    "DMC contact details",
    "Resource request",
    "Submit report",
  ];

  const readinessLabel = useMemo(() => {
    if (completion === 100 && hasRequiredResourceCounts) {
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
  }, [completion, hasRequiredResourceCounts]);

  const fieldErrors = useMemo(
    () => ({
      disasterType: !formData.disasterType.trim(),
      location: !formData.location.trim(),
      eventDate: !formData.eventDate,
      affectedPopulation: Number(formData.affectedPopulation) <= 0,
      description: !formData.description.trim(),
      reportedBy: !formData.reportedBy.trim(),
      contactPhone:
        !formData.contactPhone.trim() || !isPhoneValid(String(formData.contactPhone).trim()),
      contactEmail:
        !formData.contactEmail.trim() || !isEmailValid(String(formData.contactEmail).trim()),
    }),
    [formData]
  );

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

    const resourceRequirements = syncResourceRequirements(
      formData.immediateNeeds,
      formData.resourceRequirements
    );
    const normalizedReportedBy = formData.reportedBy.trim();
    const normalizedPhone = formData.contactPhone.trim();
    const normalizedEmail = formData.contactEmail.trim().toLowerCase();

    if (!formData.disasterType || !formData.location || !formData.eventDate) {
      setFormError("Please fill disaster type, location, and reported date/time.");
      return;
    }

    if (Number(formData.affectedPopulation) <= 0) {
      setFormError("Affected population must be greater than 0.");
      return;
    }

    if (!normalizedReportedBy) {
      setFormError("Please enter DMC officer name.");
      return;
    }

    if (!normalizedPhone || !isPhoneValid(normalizedPhone)) {
      setFormError("Please enter a valid DMC contact number.");
      return;
    }

    if (!normalizedEmail || !isEmailValid(normalizedEmail)) {
      setFormError("Please enter a valid DMC email address.");
      return;
    }

    if (resourceRequirements.length === 0) {
      setFormError("Please add at least one required resource.");
      return;
    }

    if (resourceRequirements.some((item) => Number(item.quantity) <= 0)) {
      setFormError("Please enter request count for each required resource.");
      return;
    }

    setSubmitAction(actionType);
    setIsSubmitting(true);

    try {
      await createDisasterReport({
        ...formData,
        immediateNeeds: resourceRequirements.map((item) => item.name),
        resourceRequirements,
        reportedBy: normalizedReportedBy,
        contactPhone: normalizedPhone,
        contactEmail: normalizedEmail,
        status,
      });

      setFormSuccess(successMessage);
      setFormData({
        disasterType: "",
        location: "",
        severity: "high",
        affectedPopulation: 0,
        eventDate: "",
        priority: "critical",
        description: "",
        immediateNeeds: [],
        resourceRequirements: [],
        reportedBy: "DMC Officer",
        contactPhone: "",
        contactEmail: "",
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
                    type="number"
                    placeholder="18500"
                    value={formData.affectedPopulation}
                    onChange={(e) => handleInputChange("affectedPopulation", Number(e.target.value))}
                  />
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

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  DMC officer name
                  <input
                    className={getFieldClass(fieldErrors.reportedBy)}
                    type="text"
                    placeholder="Nuwan Perera"
                    value={formData.reportedBy}
                    onChange={(e) => handleInputChange("reportedBy", e.target.value)}
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  DMC contact number
                  <input
                    className={getFieldClass(fieldErrors.contactPhone)}
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                  />
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                  DMC email
                  <input
                    className={getFieldClass(fieldErrors.contactEmail)}
                    type="email"
                    placeholder="officer@dmc.gov.lk"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                  />
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
                  />
                </label>

                <label className="block space-y-1 text-xs font-semibold text-slate-600">
                  Required resources (comma-separated names)
                  <textarea
                    className={`${inputBaseClass} min-h-20 resize-y`}
                    rows={2}
                    placeholder="Bottled water, dry rations, blankets, tents..."
                    value={formData.immediateNeeds.join(", ")}
                    onChange={(e) => handleNeedsChange(e.target.value)}
                  />
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

                {formData.immediateNeeds.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">Request count for each resource</p>
                      <p className="text-xs font-semibold text-slate-500">
                        Total units: {formatNumber(totalRequestedUnits)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {formData.immediateNeeds.map((need) => {
                        const hasError = getNeedQuantity(need) <= 0;
                        return (
                          <label key={need} className="space-y-1 text-xs font-semibold text-slate-600">
                            {need}
                            <input
                              className={`${inputBaseClass} ${
                                hasError
                                  ? "border-rose-300 bg-rose-50/40 focus:border-rose-400 focus:ring-rose-100"
                                  : ""
                              }`}
                              type="number"
                              min={1}
                              step={1}
                              required
                              placeholder="Enter request count"
                              value={getNeedQuantity(need) || ""}
                              onChange={(e) => handleNeedQuantityChange(need, e.target.value)}
                            />
                          </label>
                        );
                      })}
                    </div>
                    {!hasRequiredResourceCounts && (
                      <p className="mt-2 text-[11px] font-semibold text-rose-600">
                        Request count is required for all selected resources.
                      </p>
                    )}
                  </div>
                )}
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
                  Live impact indicators and request overview.
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

              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Requested units</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatNumber(totalRequestedUnits)}
                  </p>
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
          </div>
        </section>
      </div>
    </div>
  );
}

export default CreateDisasterReportPage;
