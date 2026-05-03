import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDisasterReport } from "../services/disasterReportService";
import { fetchInventoryItems } from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import { ITEM_CATEGORIES, ITEM_MAPPING } from "../utils/constants";

const DEFAULT_REQUIRED_ITEM = {
  inventoryItemId: "",
  category: "",
  itemName: "",
  requiredQuantity: "",
};

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
const DIGIT_PATTERN = /\d/;

// Disaster types for dropdown
const DISASTER_TYPES = [
  "Flood",
  "Landslide", 
  "Cyclone",
  "Drought",
  "Tsunami",
  "Other",
];

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

function preventNumericKey(event) {
  if (/\d/.test(event.key)) {
    event.preventDefault();
  }
}

function CreateDisasterReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reportedByName = user?.fullName || user?.email || "DMC Officer";
  const [formData, setFormData] = useState({
    disasterType: "",
    disasterTypeOther: "",
    location: "",
    severity: "high",
    affectedPopulation: "",
    eventDate: "",
    priority: "critical",
    description: "",
    immediateNeeds: [],
    requiredItems: [{ ...DEFAULT_REQUIRED_ITEM }],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState("save");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [lastEditedAt, setLastEditedAt] = useState(new Date());
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [touched, setTouched] = useState({
    disasterType: false,
    disasterTypeOther: false,
    location: false,
    eventDate: false,
    affectedPopulation: false,
    description: false,
    requiredItems: {},
  });

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      try {
        setInventoryLoading(true);
        const items = await fetchInventoryItems();
        if (!active) return;

        const normalized = Array.isArray(items)
          ? items
              .filter((item) => item?.id && item?.name && item?.category)
              .map((item) => ({
                id: String(item.id),
                name: String(item.name),
                category: String(item.category),
              }))
          : [];

        setInventoryItems(normalized);
      } catch {
        if (active) setInventoryItems([]);
      } finally {
        if (active) setInventoryLoading(false);
      }
    }

    loadInventory();

    return () => {
      active = false;
    };
  }, []);

  const handleInputChange = (field, value) => {
    const normalizedValue = field === "location" ? String(value || "").replace(/\d/g, "") : value;
    setLastEditedAt(new Date());
    setFormData((prev) => ({ ...prev, [field]: normalizedValue }));
    // Mark field as touched on change
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleRequiredItemTouched = (index) => {
    setTouched((prev) => ({
      ...prev,
      requiredItems: { ...prev.requiredItems, [index]: true },
    }));
  };

  const handleAffectedPopulationChange = (value) => {
    const sanitizedPopulation = sanitizePopulationInput(value);
    handleInputChange("affectedPopulation", sanitizedPopulation);
  };

  const categoryOptions = useMemo(
    () => Object.values(ITEM_CATEGORIES),
    []
  );

  const getItemsByCategory = (category) =>
    ITEM_MAPPING[category] || [];

  const updateRequiredItem = (index, field, value) => {
    setLastEditedAt(new Date());
    setFormData((prev) => {
      const next = [...(Array.isArray(prev.requiredItems) ? prev.requiredItems : [])];
      const current = { ...(next[index] || DEFAULT_REQUIRED_ITEM) };

      if (field === "category") {
        current.category = value;
        current.inventoryItemId = "";
        current.itemName = "";
      } else if (field === "itemName") {
        current.itemName = value;
        // Find the actual inventory item by name and category to get its ID
        const matchedItem = inventoryItems.find(
          (inv) =>
            String(inv.name).toLowerCase() === String(value).toLowerCase() &&
            String(inv.category) === String(current.category)
        );
        current.inventoryItemId = matchedItem ? String(matchedItem.id) : String(value);
      } else {
        current[field] = value;
      }

      next[index] = current;
      const immediateNeeds = normalizeImmediateNeeds(next.map((item) => item.itemName));
      return { ...prev, requiredItems: next, immediateNeeds };
    });
  };

  const addRequiredItem = () => {
    setLastEditedAt(new Date());
    setFormData((prev) => ({
      ...prev,
      requiredItems: [...(Array.isArray(prev.requiredItems) ? prev.requiredItems : []), { ...DEFAULT_REQUIRED_ITEM }],
    }));
  };

  const removeRequiredItem = (index) => {
    setLastEditedAt(new Date());
    setFormData((prev) => {
      const existing = Array.isArray(prev.requiredItems) ? prev.requiredItems : [];
      const next = existing.filter((_, idx) => idx !== index);
      const requiredItems = next.length ? next : [{ ...DEFAULT_REQUIRED_ITEM }];
      const immediateNeeds = normalizeImmediateNeeds(requiredItems.map((item) => item.itemName));
      return {
        ...prev,
        requiredItems,
        immediateNeeds,
      };
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
    const disasterTypeRaw = formData.disasterType === "Other" ? String(formData.disasterTypeOther || "") : String(formData.disasterType || "");
    const disasterType = disasterTypeRaw.trim();
    const location = formData.location.trim();
    const affectedPopulation = Number(formData.affectedPopulation);
    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);
    const parsedEventDate = formData.eventDate ? new Date(formData.eventDate) : null;
    const requiredItems = Array.isArray(formData.requiredItems) ? formData.requiredItems : [];

    return {
      disasterType:
        !disasterType ||
        disasterType.length < MIN_DISASTER_TYPE_LENGTH ||
        disasterType.length > MAX_DISASTER_TYPE_LENGTH,
      location:
        !location ||
        DIGIT_PATTERN.test(location) ||
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
      requiredItems: requiredItems.map((item) => ({
        hasError: 
          !String(item.category || "").trim() ||
          !String(item.itemName || "").trim() ||
          !Number.isInteger(Number(item.requiredQuantity)) ||
          Number(item.requiredQuantity) < 1,
        categoryError: !String(item.category || "").trim() ? "Category is required." : "",
        itemNameError: !String(item.itemName || "").trim() ? "Item name is required." : "",
        quantityError: !Number.isInteger(Number(item.requiredQuantity)) || Number(item.requiredQuantity) < 1 ? "Quantity must be at least 1." : "",
      })),
    };
  }, [formData]);

  const validateBeforeSubmit = (actionType) => {
    const disasterTypeRaw = formData.disasterType === "Other" ? String(formData.disasterTypeOther || "") : String(formData.disasterType || "");
    const disasterType = disasterTypeRaw.trim();
    const location = formData.location.trim();
    const description = formData.description.trim();
    const affectedPopulation = Number(formData.affectedPopulation);
    const normalizedNeeds = normalizeImmediateNeeds(formData.immediateNeeds);
    const requiredItems = Array.isArray(formData.requiredItems) ? formData.requiredItems : [];
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

    if (DIGIT_PATTERN.test(location)) {
      return "Location/area cannot contain numbers.";
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

    if (requiredItems.length > MAX_IMMEDIATE_NEEDS) {
      return `You can select up to ${MAX_IMMEDIATE_NEEDS} required resources.`;
    }

    const hasInvalidRequiredItem = requiredItems.some(
      (item) =>
        !String(item.itemName || "").trim() ||
        !String(item.category || "").trim() ||
        !Number.isInteger(Number(item.requiredQuantity)) ||
        Number(item.requiredQuantity) <= 0
    );

    if (actionType !== "draft" && hasInvalidRequiredItem) {
      return "Each required resource must include category, item name, and quantity greater than zero.";
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

    const normalizedRequiredItems = (Array.isArray(formData.requiredItems) ? formData.requiredItems : [])
      .map((item) => ({
        inventoryItemId: String(item.inventoryItemId || item.itemName || "").trim(),
        itemName: String(item.itemName || "").trim(),
        category: String(item.category || "").trim(),
        requiredQuantity: Number(item.requiredQuantity),
      }))
      .filter(
        (item) =>
          item.inventoryItemId &&
          item.itemName &&
          item.category &&
          Number.isInteger(item.requiredQuantity) &&
          item.requiredQuantity > 0
      );

    const normalizedNeeds = normalizeImmediateNeeds(
      normalizedRequiredItems.map((item) => item.itemName)
    );

    setSubmitAction(actionType);
    setIsSubmitting(true);

    try {
      const finalDisasterType = formData.disasterType === "Other" ? String(formData.disasterTypeOther || "").trim() : String(formData.disasterType || "").trim();

      await createDisasterReport({
        ...formData,
        disasterType: finalDisasterType,
        location: formData.location.trim(),
        affectedPopulation: Number(formData.affectedPopulation),
        description: formData.description.trim(),
        immediateNeeds: normalizedNeeds,
        requiredItems: normalizedRequiredItems,
        status,
        reportedBy: reportedByName,
      });

      if (actionType === "save" || actionType === "allocation") {
        navigate("/disaster-events");
        return;
      }

      setFormSuccess(successMessage);
      setFormData({
        disasterType: "",
        disasterTypeOther: "",
        location: "",
        severity: "high",
        affectedPopulation: "",
        eventDate: "",
        priority: "critical",
        description: "",
        immediateNeeds: [],
        requiredItems: [{ ...DEFAULT_REQUIRED_ITEM }],
      });
      setLastEditedAt(new Date());
    } catch (error) {
      setFormError(error.message || "Failed to create disaster report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          role="DMC Officer / Incident Reporting"
          title="Disaster Event Report"
          description="Capture incident details, assess population impact, and request immediate resource needs for coordinated response."
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Report ID</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{reportId}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Completion</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{completion}%</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Readiness</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{readinessLabel.text}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last edited</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(lastEditedAt)}</p>
          </div>
        </div>

        {formError && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>}
        {formSuccess && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{formSuccess}</div>}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  <select
                    className={getFieldClass(fieldErrors.disasterType)}
                    value={formData.disasterType}
                    onChange={(e) => handleInputChange("disasterType", e.target.value)}
                    onBlur={() => handleFieldBlur("disasterType")}
                  >
                    <option value="">Select disaster type</option>
                    {DISASTER_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                    {formData.disasterType === "Other" && (
                      <>
                        <input
                          className={getFieldClass(fieldErrors.disasterType)}
                          type="text"
                          placeholder="Specify disaster type"
                          value={formData.disasterTypeOther}
                          onChange={(e) => handleInputChange("disasterTypeOther", e.target.value)}
                          onBlur={() => handleFieldBlur("disasterTypeOther")}
                          maxLength={MAX_DISASTER_TYPE_LENGTH}
                        />
                        {touched.disasterTypeOther && fieldErrors.disasterType && (
                          <p className="text-[11px] font-medium text-rose-600">Please specify disaster type.</p>
                        )}
                      </>
                    )}
                    {touched.disasterType && fieldErrors.disasterType && (
                      <p className="text-[11px] font-medium text-rose-600">
                        Disaster type is required.
                      </p>
                    )}
                  <p className="text-[11px] font-medium text-slate-500">
                    Select the type of disaster event
                  </p>
                </label>

                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  District / Location
                  <input
                    className={getFieldClass(fieldErrors.location)}
                    type="text"
                    placeholder="Gampaha / Biyagama"
                    value={formData.location}
                    onKeyDown={preventNumericKey}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    onBlur={() => handleFieldBlur("location")}
                    maxLength={MAX_LOCATION_LENGTH}
                  />
                  {touched.location && fieldErrors.location && (
                    <p className="text-[11px] font-medium text-rose-600">
                      Location must be 3-120 characters and cannot include numbers.
                    </p>
                  )}
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
                    onBlur={() => handleFieldBlur("affectedPopulation")}
                  />
                  {touched.affectedPopulation && fieldErrors.affectedPopulation && (
                    <p className="text-[11px] font-medium text-rose-600">
                      Must be a whole number between {MIN_AFFECTED_POPULATION} and {MAX_AFFECTED_POPULATION}.
                    </p>
                  )}
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
                    onBlur={() => handleFieldBlur("eventDate")}
                  />
                  {touched.eventDate && fieldErrors.eventDate && (
                    <p className="text-[11px] font-medium text-rose-600">
                      Date and time is required and cannot be in the future.
                    </p>
                  )}
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

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    onBlur={() => handleFieldBlur("description")}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                  {touched.description && fieldErrors.description && (
                    <p className="text-[11px] font-medium text-rose-600">
                      Summary is required and must not exceed {MAX_DESCRIPTION_LENGTH} characters.
                    </p>
                  )}
                  <p className="text-[11px] font-medium text-slate-500">
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH} characters
                  </p>
                </label>

                <div className="block space-y-2 text-xs font-semibold text-slate-600">
                  <p>Initial required resources (from inventory)</p>

                  {inventoryLoading && (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Loading inventory catalog...
                    </p>
                  )}

                  {(Array.isArray(formData.requiredItems) ? formData.requiredItems : []).map((resource, index) => {
                    const itemOptions = getItemsByCategory(resource.category);
                    const itemError = fieldErrors.requiredItems[index];
                    const showItemError = touched.requiredItems[index] && itemError?.hasError;

                    return (
                      <div key={`required-item-${index}`} className={`grid gap-2 rounded-xl border p-3 md:grid-cols-12 ${showItemError ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-slate-50'}`}>
                        <label className="space-y-1 md:col-span-4">
                          <span className="text-[11px]">Category</span>
                          <select
                            className={touched.requiredItems[index] && itemError?.categoryError ? "border border-rose-300 bg-rose-50/60 w-full rounded-xl px-3 py-2 text-sm outline-none" : inputBaseClass}
                            value={resource.category}
                            onChange={(e) => {
                              updateRequiredItem(index, "category", e.target.value);
                              handleRequiredItemTouched(index);
                            }}
                            onBlur={() => handleRequiredItemTouched(index)}
                          >
                            <option value="">Select category</option>
                            {categoryOptions.map((category) => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                          {touched.requiredItems[index] && itemError?.categoryError && (
                            <p className="text-[11px] font-medium text-rose-600">{itemError.categoryError}</p>
                          )}
                        </label>

                        <label className="space-y-1 md:col-span-5">
                          <span className="text-[11px]">Item name</span>
                          <select
                            className={touched.requiredItems[index] && itemError?.itemNameError ? "border border-rose-300 bg-rose-50/60 w-full rounded-xl px-3 py-2 text-sm outline-none" : inputBaseClass}
                            value={resource.itemName}
                            onChange={(e) => {
                              updateRequiredItem(index, "itemName", e.target.value);
                              handleRequiredItemTouched(index);
                            }}
                            onBlur={() => handleRequiredItemTouched(index)}
                            disabled={!resource.category}
                          >
                            <option value="">Select item</option>
                            {itemOptions.map((itemName) => (
                              <option key={itemName} value={itemName}>{itemName}</option>
                            ))}
                          </select>
                          {touched.requiredItems[index] && itemError?.itemNameError && (
                            <p className="text-[11px] font-medium text-rose-600">{itemError.itemNameError}</p>
                          )}
                        </label>

                        <label className="space-y-1 md:col-span-2">
                          <span className="text-[11px]">Quantity</span>
                          <input
                            className={itemError?.quantityError ? "border border-rose-300 bg-rose-50/60 w-full rounded-xl px-3 py-2 text-sm outline-none" : inputBaseClass}
                            type="number"
                            min="1"
                            step="1"
                            value={resource.requiredQuantity}
                            onChange={(e) => updateRequiredItem(index, "requiredQuantity", e.target.value)}
                          />
                          {touched.requiredItems[index] && itemError?.quantityError && (
                            <p className="text-[11px] font-medium text-rose-600">{itemError.quantityError}</p>
                          )}
                        </label>

                        <div className="md:col-span-1 flex items-end">
                          <button
                            type="button"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => removeRequiredItem(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={addRequiredItem}
                  >
                    Add resource item
                  </button>
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

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Operations snapshot</h2>
                <p className="text-xs text-slate-500">
                  Live impact indicators and AI-assisted demand estimation.
                </p>
              </div>

              <div className="relative mb-4 h-52 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
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

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
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
