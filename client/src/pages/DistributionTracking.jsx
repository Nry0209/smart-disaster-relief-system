import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { RefreshCw } from "lucide-react";
import { fetchDisasterReports } from "../services/disasterReportService";
import {
  createTrackingRecord as createTrackingRecordRequest,
  deleteTrackingRecordById,
  fetchTrackingRecords,
  fetchTransportAssets,
} from "../services/workflowService";
import "./Pages.css";

const TRACKING_RECORDS_UPDATED_EVENT = "tracking-records-updated";

// Warehouse options
const WAREHOUSES = [
  "Colombo Central Warehouse",
  "Kandy Regional Warehouse"
];

function getPlanId(report) {
  return String(report?.id || report?._id || "");
}

function getTrackedPlanId(record) {
  return String(record?.disasterId?._id || record?.disasterId || "");
}

function isFinalizedTrackingRecord(record) {
  return String(record?.status || "") === "confirmed_delivered";
}

export default function DistributionTracking() {
  const [plans, setPlans] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [transportAssets, setTransportAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    planId: "",
    transportAssetId: "",
    currentLocation: "",
    dispatchDate: new Date().toISOString().split("T")[0],
  });

  const selectedTransportAsset = useMemo(
    () => transportAssets.find((asset) => String(asset._id) === String(form.transportAssetId)) || null,
    [form.transportAssetId, transportAssets]
  );

  async function loadData() {
    try {
      setLoading(true);

      // Load allocation plans (allocated status)
      const [reportsResult, recordsResult, assetsResult] = await Promise.all([
        fetchDisasterReports({ status: "allocated" }),
        fetchTrackingRecords({ limit: 1000 }),
        fetchTransportAssets({ dispatchDate: form.dispatchDate }),
      ]);
      const allocatedPlans = reportsResult?.filter((report) => report?.allocatedResources?.lineItems?.length > 0) || [];
      const records = recordsResult || [];

      setPlans(Array.isArray(allocatedPlans) ? allocatedPlans : []);
      setTrackingRecords(Array.isArray(records) ? records : []);
      setTransportAssets(Array.isArray(assetsResult) ? assetsResult : []);

      if (reportsResult && recordsResult) {
        setError("");
      } else {
        setError("Some tracking data could not be loaded. You can still work with available data.");
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load tracking data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showDispatchForm) return;

    let cancelled = false;
    async function refreshTransportAssets() {
      try {
        const assetsResult = await fetchTransportAssets({ dispatchDate: form.dispatchDate });
        if (!cancelled) {
          setTransportAssets(Array.isArray(assetsResult) ? assetsResult : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Failed to load transport assets.");
        }
      }
    }

    refreshTransportAssets();
    return () => {
      cancelled = true;
    };
  }, [showDispatchForm, form.dispatchDate]);

  useEffect(() => {
    function handleTrackingRecordsUpdated() {
      loadData();
    }

    window.addEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
    return () => window.removeEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
  }, []);

  const latestTrackingRecordByPlanId = useMemo(() => {
    const recordsByPlanId = new Map();

    trackingRecords.forEach((record) => {
      const planId = getTrackedPlanId(record);
      if (!planId) return;

      const existing = recordsByPlanId.get(planId);
      const existingTime = existing ? new Date(existing.createdAt || 0).getTime() : -1;
      const currentTime = new Date(record.createdAt || 0).getTime();

      if (!existing || currentTime >= existingTime) {
        recordsByPlanId.set(planId, record);
      }
    });

    return recordsByPlanId;
  }, [trackingRecords]);

  const readyTrackingPlans = useMemo(() => {
    const finalizedPlanIds = new Set(
      trackingRecords.filter(isFinalizedTrackingRecord).map((record) => getTrackedPlanId(record))
    );

    return plans.filter((plan) => !finalizedPlanIds.has(getPlanId(plan)));
  }, [plans, trackingRecords]);

  const dispatchablePlans = useMemo(() => {
    const trackedPlanIds = new Set(trackingRecords.map((record) => getTrackedPlanId(record)));
    return plans.filter((plan) => !trackedPlanIds.has(getPlanId(plan)));
  }, [plans, trackingRecords]);

  const finalizedTrackingRecords = useMemo(
    () => trackingRecords.filter((record) => isFinalizedTrackingRecord(record)),
    [trackingRecords]
  );

  const selectedPlan = useMemo(
    () => dispatchablePlans.find((plan) => getPlanId(plan) === form.planId) || null,
    [form.planId, dispatchablePlans]
  );

  useEffect(() => {
    if (showDispatchForm && !selectedPlan) {
      if (dispatchablePlans.length > 0) {
        setForm((prev) => ({ ...prev, planId: getPlanId(dispatchablePlans[0]) }));
      } else {
        setShowDispatchForm(false);
      }
    }
  }, [selectedPlan, showDispatchForm, dispatchablePlans]);

  function handlePlanSelect(value) {
    setForm((prev) => ({
      ...prev,
      planId: value,
    }));
    setFieldErrors((prev) => ({ ...prev, planId: "" }));
  }

  function handleCreateDispatchClick(planId) {
    setForm((prev) => ({
      ...prev,
      planId,
      transportAssetId: "",
      currentLocation: "",
    }));
    setFieldErrors({});
    setShowDispatchForm(true);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});

    const nextFieldErrors = {};

    if (!form.planId) {
      nextFieldErrors.planId = "Allocation is required.";
    }
    if (!form.dispatchDate) {
      nextFieldErrors.dispatchDate = "Dispatch date is required.";
    }
    if (!form.transportAssetId) {
      nextFieldErrors.transportAssetId = "Transport asset is required.";
    }
    if (!form.currentLocation) {
      nextFieldErrors.currentLocation = "Starting warehouse is required.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    if (!selectedPlan) {
      setError("Select an allocated plan to start dispatch tracking.");
      return;
    }

    try {
      setSubmitting(true);
      await createTrackingRecordRequest({
        disasterId: getPlanId(selectedPlan),
        dispatchDate: form.dispatchDate ? new Date(form.dispatchDate).toISOString() : new Date().toISOString(),
        transportAssetId: form.transportAssetId,
        currentLocation: form.currentLocation,
      });

      setNotice("Tracking record created.");
      window.dispatchEvent(new Event(TRACKING_RECORDS_UPDATED_EVENT));
      setShowDispatchForm(false);
      setForm({
        planId: "",
        transportAssetId: "",
        currentLocation: "",
        dispatchDate: new Date().toISOString().split("T")[0],
      });
      await loadData();
    } catch (createError) {
      setError(createError.message || "Failed to create tracking record.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveTracking(recordId) {
    if (!recordId) return;

    const accepted = window.confirm("Remove this tracking record?");
    if (!accepted) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await deleteTrackingRecordById(recordId);
      setNotice("Tracking record removed.");
      await loadData();
    } catch (removeError) {
      setError(removeError.message || "Failed to remove tracking record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="distribution-tracking-page min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          role="Tracking Officer / Dispatch"
          title="Distribution Tracking"
          description="Create dispatch tracking from allocated plans and update delivery status up to delivered."
        />

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        <div className="flex justify-end mb-4">
          <button
            className="btn-refresh"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spinning" : ""} />
            Refresh Data
          </button>
        </div>

        <section className="professional-form-shell mt-6 rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Allocation Plans Ready for Tracking</h2>
          <div className="overflow-x-auto">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Disaster Type</th>
                  <th>Location</th>
                  <th>Allocated Items</th>
                  <th>Allocation Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {readyTrackingPlans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500">No allocation plans ready for tracking</td>
                  </tr>
                ) : (
                  readyTrackingPlans.map((plan) => {
                    const planId = getPlanId(plan);
                    const latestRecord = latestTrackingRecordByPlanId.get(planId);
                    const waitingForConfirmation = Boolean(latestRecord) && !isFinalizedTrackingRecord(latestRecord);

                    return (
                    <tr key={planId}>
                      <td>{plan.disasterType || "-"}</td>
                      <td>{plan.location || "-"}</td>
                      <td>
                        {plan.allocatedResources?.lineItems?.length ? (
                          plan.allocatedResources.lineItems.map((item) => (
                            <div key={`${item.itemId}-${item.itemName}`} className="text-sm">
                              {item.itemName}: {item.quantity}
                            </div>
                          ))
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {(() => {
                          // Try multiple possible date fields
                          const dateFields = [
                            plan.allocatedResources?.allocatedDate,
                            plan.allocatedResources?.allocatedAt,
                            plan.allocatedResources?.createdAt,
                            plan.createdAt,
                            plan.updatedAt
                          ];
                          
                          for (const dateField of dateFields) {
                            if (dateField) {
                              try {
                                const date = new Date(dateField);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                }
                              } catch (error) {
                                continue;
                              }
                            }
                          }
                          return "-";
                        })()}
                      </td>
                      <td>
                        {waitingForConfirmation ? (
                          <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full">WAITING DMC CONFIRMATION</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">READY FOR TRACKING</span>
                        )}
                      </td>
                      <td>
                        {waitingForConfirmation ? (
                          <button className="btn-secondary btn-sm" type="button" disabled>
                            Dispatch In Progress
                          </button>
                        ) : (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => handleCreateDispatchClick(planId)}
                          >
                            Create Dispatch
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showDispatchForm && form.planId && (
          <section className="professional-form-shell mt-6 rounded-3xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Create Dispatch Tracking Record</h2>
            <div className="shared-stepper mb-4">
              <div className="step-chip active">
                <span>1</span>
                <p>Allocation</p>
              </div>
              <div className="step-chip active">
                <span>2</span>
                <p>Transport Asset</p>
              </div>
              <div className="step-chip active">
                <span>3</span>
                <p>Create Record</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <label className="form-group md:col-span-2">
                <span>Selected Allocation</span>
                <select
                  className={fieldErrors.planId ? "border border-rose-300 bg-rose-50/50" : ""}
                  value={form.planId}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  required
                >
                  <option value="">Select allocation</option>
                  {dispatchablePlans.map((plan) => (
                    <option key={getPlanId(plan)} value={getPlanId(plan)}>
                      {plan.disasterType} - {plan.location}
                    </option>
                  ))}
                </select>
                {fieldErrors.planId && <p className="mt-1 text-xs text-rose-600">{fieldErrors.planId}</p>}
              </label>

              <label className="form-group">
                <span>Dispatch Date</span>
                <input
                  className={fieldErrors.dispatchDate ? "border border-rose-300 bg-rose-50/50" : ""}
                  type="date"
                  value={form.dispatchDate}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, dispatchDate: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, dispatchDate: "" }));
                  }}
                  required
                />
                {fieldErrors.dispatchDate && <p className="mt-1 text-xs text-rose-600">{fieldErrors.dispatchDate}</p>}
              </label>

              <label className="form-group">
                <span>Transport Asset</span>
                <select
                  className={fieldErrors.transportAssetId ? "border border-rose-300 bg-rose-50/50" : ""}
                  value={form.transportAssetId}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, transportAssetId: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, transportAssetId: "" }));
                  }}
                  required
                >
                  <option value="">Select transport asset</option>
                  {transportAssets.map((asset) => (
                    <option key={asset._id} value={asset._id} disabled={!asset.isAvailable}>
                      {asset.driverName} - {asset.transportType} - {asset.vehicleNumber}
                      {asset.isAvailable ? "" : " (In use)"}
                    </option>
                  ))}
                </select>
                {fieldErrors.transportAssetId && <p className="mt-1 text-xs text-rose-600">{fieldErrors.transportAssetId}</p>}
              </label>

              <label className="form-group">
                <span>Starting Warehouse</span>
                <select
                  className={fieldErrors.currentLocation ? "border border-rose-300 bg-rose-50/50" : ""}
                  value={form.currentLocation}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, currentLocation: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, currentLocation: "" }));
                  }}
                  required
                >
                  <option value="">Select warehouse</option>
                  {WAREHOUSES.map((warehouse) => (
                    <option key={warehouse} value={warehouse}>{warehouse}</option>
                  ))}
                </select>
                {fieldErrors.currentLocation && <p className="mt-1 text-xs text-rose-600">{fieldErrors.currentLocation}</p>}
              </label>

              {selectedPlan && (
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <strong className="block text-slate-900">
                    {selectedPlan.disasterType} - {selectedPlan.location}
                  </strong>
                  {selectedPlan.allocatedResources?.lineItems?.map((item) => (
                    <div key={`${item.itemId}-${item.itemName}`}>
                      {item.itemName}: {item.quantity}
                    </div>
                  ))}
                </div>
              )}

              {selectedTransportAsset && (
                <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                  <strong className="block text-slate-900">Selected Transport Asset</strong>
                  <div>Driver: {selectedTransportAsset.driverName}</div>
                  <div>Transport Type: {selectedTransportAsset.transportType}</div>
                  <div>Vehicle Number: {selectedTransportAsset.vehicleNumber}</div>
                </div>
              )}

              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn-primary" disabled={submitting || loading}>
                  {submitting ? "Creating..." : "Create Tracking Record"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    {
                      setShowDispatchForm(false);
                      setForm({
                        planId: "",
                        transportAssetId: "",
                        currentLocation: "",
                        dispatchDate: new Date().toISOString().split("T")[0],
                      });
                      setFieldErrors({});
                    }
                  }
                >
                  Clear Form
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="professional-form-shell mt-6 rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Tracking Records</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading tracking records...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Disaster</th>
                    <th>Allocation</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Transport Asset</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!finalizedTrackingRecords.length ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500">No finalized tracking records yet.</td>
                    </tr>
                  ) : (
                    finalizedTrackingRecords.map((record) => (
                      <tr key={record._id}>
                        <td>
                          {record.disasterId?.disasterType} - {record.disasterId?.location}
                        </td>
                        <td>{record.allocationId?._id || record.allocationId}</td>
                        <td>{record.status}</td>
                        <td>{record.currentLocation || "-"}</td>
                        <td>
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">
                              {record.transportAssetId?.driverName || record.driverName || "-"}
                            </div>
                            <div className="text-slate-600">
                              {record.transportAssetId?.transportType || record.transportDetails || "-"}
                            </div>
                            <div className="text-slate-500">
                              {record.transportAssetId?.vehicleNumber || record.vehicleNumber || "-"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold text-emerald-600">Confirmation completed</span>
                            <span className="text-xs font-semibold text-emerald-600">
                              Confirmed by {record.confirmedBy?.fullName || record.receivedByName || "DMC Officer"}
                            </span>
                            {record.confirmationNotes && (
                              <span className="text-xs text-slate-500">{record.confirmationNotes}</span>
                            )}
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleRemoveTracking(record._id)}
                              disabled={submitting}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
