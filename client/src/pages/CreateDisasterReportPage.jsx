import { useMemo, useState } from "react";
import { createDisasterReport } from "../services/disasterReportService";
import "./Pages.css";

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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState("save");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNeedsChange = (value) => {
    const needs = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, immediateNeeds: needs }));
  };

  const predictiveEstimates = useMemo(() => {
    const baseItems = [
      { name: "Water (L)", base: 3 },
      { name: "Meal Packs", base: 2 },
      { name: "Medical Kits", base: 0.3 },
      { name: "Blankets", base: 0.6 },
    ];

    return baseItems.map((item) => ({
      ...item,
      estimate: Math.max(1, Math.round((item.base || 1) * (formData.affectedPopulation / 1000))),
    }));
  }, [formData.affectedPopulation]);

  const impactSummary = useMemo(() => {
    const population = Number(formData.affectedPopulation) || 0;
    return {
      familiesDisplaced: Math.max(1, Math.round(population / 4)),
      sheltersOpened: Math.max(1, Math.round(population / 1300)),
      roadAccess: Math.max(20, Math.min(90, 80 - Math.round(population / 3000))),
      medicalAlerts: Math.max(10, Math.round(population / 120)),
    };
  }, [formData.affectedPopulation]);

  const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value);

  const handleCreateReport = async (status, successMessage, actionType) => {
    setFormError("");
    setFormSuccess("");

    if (!formData.disasterType || !formData.location || !formData.eventDate) {
      setFormError("Please fill disaster type, location, and reported date/time.");
      return;
    }

    if (Number(formData.affectedPopulation) <= 0) {
      setFormError("Affected population must be greater than 0.");
      return;
    }

    setSubmitAction(actionType);
    setIsSubmitting(true);

    try {
      await createDisasterReport({
        ...formData,
        status,
        reportedBy: "DMC Officer",
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
      });
    } catch (error) {
      setFormError(error.message || "Failed to create disaster report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="disaster-report-page">
      <div className="report-header">
        <div>
          <span className="header-breadcrumb">DMC Officer / Create Disaster Report</span>
          <h1>Create Disaster Report</h1>
          <p>
            Used by the DMC officer to register a new disaster, specify urgency,
            identify impact, and define the initial resource requirement list.
          </p>
        </div>
        <span className="step-pill">Step 1</span>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <div className="card-head">
            <div>
              <h2>Incident details form</h2>
              <p>Capture core incident details for accurate planning and coordination.</p>
            </div>
            <span className="auto-id">Auto ID: DF-2026-014</span>
          </div>

          <div className="report-form">
            <label>
              Disaster type
              <input
                type="text"
                placeholder="Flood"
                value={formData.disasterType}
                onChange={(e) => handleInputChange("disasterType", e.target.value)}
              />
            </label>
            <label>
              District / Locations
              <input
                type="text"
                placeholder="Gampaha / Biyagama"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </label>
            <label>
              Severity level
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange("severity", e.target.value)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Affected population
              <input
                type="number"
                placeholder="18,500 people"
                value={formData.affectedPopulation}
                onChange={(e) => handleInputChange("affectedPopulation", Number(e.target.value))}
              />
            </label>
            <label>
              Reported date & time
              <input
                type="datetime-local"
                value={formData.eventDate}
                onChange={(e) => handleInputChange("eventDate", e.target.value)}
              />
            </label>
            <label>
              Response priority
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
              >
                <option value="critical">Immediate</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="span-two">
              Situation summary
              <textarea
                rows={3}
                placeholder="Floodwater has entered low-lying residential zones..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </label>
            <label className="span-two">
              Initial required resources
              <textarea
                rows={2}
                placeholder="Bottled water, dry rations, blankets, tents..."
                value={formData.immediateNeeds.join(", ")}
                onChange={(e) => handleNeedsChange(e.target.value)}
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              className="btn-base btn-primary"
              onClick={() =>
                handleCreateReport(
                  "active",
                  "Disaster report created successfully.",
                  "save"
                )
              }
              disabled={isSubmitting}
            >
              {isSubmitting && submitAction === "save" ? "Saving..." : "Save report"}
            </button>
            <button
              className="btn-base btn-light"
              type="button"
              onClick={() =>
                handleCreateReport(
                  "pending_inventory",
                  "Report submitted and sent to inventory queue.",
                  "inventory"
                )
              }
              disabled={isSubmitting}
            >
              {isSubmitting && submitAction === "inventory"
                ? "Sending..."
                : "Send to inventory"}
            </button>
            <button
              className="btn-base btn-light"
              type="button"
              onClick={() =>
                handleCreateReport(
                  "draft",
                  "Report saved as draft.",
                  "draft"
                )
              }
              disabled={isSubmitting}
            >
              {isSubmitting && submitAction === "draft" ? "Saving draft..." : "Draft only"}
            </button>
          </div>

          {formError && <p className="form-feedback error">{formError}</p>}
          {formSuccess && <p className="form-feedback success">{formSuccess}</p>}
        </div>

        <div className="report-card">
          <div className="card-head">
            <div>
              <h2>Impact map and summary</h2>
              <p>Visual overview of the incident zone and key impact metrics.</p>
            </div>
          </div>
          <div className="impact-map">
            <div className="map-dot dot-one" />
            <div className="map-dot dot-two" />
            <div className="map-dot dot-three" />
            <div className="map-dot dot-four" />
            <div className="map-legend">
              <span><i className="legend-marker incident" />Incident zone</span>
              <span><i className="legend-marker shelter" />Shelter point</span>
              <span><i className="legend-marker blocked" />Blocked route</span>
              <span><i className="legend-marker risk" />Medical risk</span>
            </div>
          </div>
          <div className="summary-grid">
            <div className="summary-card">
              <span>Families displaced</span>
              <strong>{formatNumber(impactSummary.familiesDisplaced)}</strong>
            </div>
            <div className="summary-card">
              <span>Shelters opened</span>
              <strong>{formatNumber(impactSummary.sheltersOpened)}</strong>
            </div>
            <div className="summary-card">
              <span>Road access</span>
              <strong>{impactSummary.roadAccess}%</strong>
            </div>
            <div className="summary-card">
              <span>Medical alerts</span>
              <strong>{formatNumber(impactSummary.medicalAlerts)}</strong>
            </div>
          </div>

          <div className="predictive-card">
            <h3>Predictive resource estimate</h3>
            <p>Estimated quantities based on affected population.</p>
            <div className="predictive-grid">
              {predictiveEstimates.map((item) => (
                <div key={item.name} className="predictive-item">
                  <span>{item.name}</span>
                  <strong>{formatNumber(item.estimate)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateDisasterReportPage;
