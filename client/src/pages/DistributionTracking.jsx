import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { fetchDisasterReports } from "../services/disasterReportService";
import {
  createTrackingRecord as createTrackingRecordRequest,
  fetchTrackingRecords,
  updateTrackingRecordById,
} from "../services/workflowService";
import "./Pages.css";

const STATUS_SEQUENCE = ["prepared", "dispatched", "in_transit", "delivered"];
const TRACKING_RECORDS_UPDATED_EVENT = "tracking-records-updated";

function getPlanId(report) {
  return String(report?.id || report?._id || "");
}

function getTrackedPlanId(record) {
  return String(record?.disasterId?._id || record?.disasterId || "");
}

export default function DistributionTracking() {
  const [plans, setPlans] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [form, setForm] = useState({
    planId: "",
    transportDetails: "",
    driverName: "",
    vehicleNumber: "",
    currentLocation: "Warehouse",
    dispatchDate: new Date().toISOString().split("T")[0],
  });

  async function loadData() {
    try {
      setLoading(true);

      const [reportsResult, recordsResult] = await Promise.allSettled([
        fetchDisasterReports({ status: "allocated" }),
        fetchTrackingRecords(),
      ]);

      const allocatedPlans =
        reportsResult.status === "fulfilled"
          ? reportsResult.value.filter((report) => report?.allocatedResources?.lineItems?.length > 0)
          : [];
      const records = recordsResult.status === "fulfilled" ? recordsResult.value : [];

      setPlans(Array.isArray(allocatedPlans) ? allocatedPlans : []);
      setTrackingRecords(Array.isArray(records) ? records : []);

      if (reportsResult.status === "rejected" || recordsResult.status === "rejected") {
        setError("Some tracking data could not be loaded. You can still work with available data.");
      } else {
        setError("");
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
    function handleTrackingRecordsUpdated() {
      loadData();
    }

    window.addEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
    return () => window.removeEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
  }, []);

  const untrackedPlans = useMemo(() => {
    const trackedPlanIds = new Set(trackingRecords.map((record) => getTrackedPlanId(record)));
    return plans.filter((plan) => !trackedPlanIds.has(getPlanId(plan)));
  }, [plans, trackingRecords]);

  const selectedPlan = useMemo(
    () => untrackedPlans.find((plan) => getPlanId(plan) === form.planId) || null,
    [form.planId, untrackedPlans]
  );

  useEffect(() => {
    if (showDispatchForm && !selectedPlan) {
      if (untrackedPlans.length > 0) {
        setForm((prev) => ({ ...prev, planId: getPlanId(untrackedPlans[0]) }));
      } else {
        setShowDispatchForm(false);
      }
    }
  }, [selectedPlan, showDispatchForm, untrackedPlans]);

  function handlePlanSelect(value) {
    setForm((prev) => ({
      ...prev,
      planId: value,
    }));
  }

  function handleCreateDispatchClick(planId) {
    setForm((prev) => ({
      ...prev,
      planId,
    }));
    setShowDispatchForm(true);
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedPlan) {
      setError("Select an allocated plan to start dispatch tracking.");
      return;
    }

    try {
      setSubmitting(true);
      await createTrackingRecordRequest({
        disasterId: getPlanId(selectedPlan),
        dispatchDate: form.dispatchDate ? new Date(form.dispatchDate).toISOString() : new Date().toISOString(),
        transportDetails: form.transportDetails,
        driverName: form.driverName,
        vehicleNumber: form.vehicleNumber,
        currentLocation: form.currentLocation,
      });

      setNotice("Tracking record created.");
      window.dispatchEvent(new Event(TRACKING_RECORDS_UPDATED_EVENT));
      setShowDispatchForm(false);
      setForm({
        planId: "",
        transportDetails: "",
        driverName: "",
        vehicleNumber: "",
        currentLocation: "Warehouse",
        dispatchDate: new Date().toISOString().split("T")[0],
      });
      await loadData();
    } catch (createError) {
      setError(createError.message || "Failed to create tracking record.");
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceStatus(record) {
    const current = String(record.status || "prepared");
    const index = STATUS_SEQUENCE.indexOf(current);
    if (index < 0 || index >= STATUS_SEQUENCE.length - 1) {
      return;
    }

    const next = STATUS_SEQUENCE[index + 1];

    try {
      setSubmitting(true);
      await updateTrackingRecordById(record._id, {
        status: next,
        currentLocation:
          next === "in_transit"
            ? "En route"
            : next === "delivered"
              ? "DMC delivery point"
              : record.currentLocation,
      });
      window.dispatchEvent(new Event(TRACKING_RECORDS_UPDATED_EVENT));
      setNotice(`Tracking status updated to ${next}.`);
      await loadData();
    } catch (updateError) {
      setError(updateError.message || "Failed to update tracking status.");
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
                {untrackedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500">No allocation plans ready for tracking</td>
                  </tr>
                ) : (
                  untrackedPlans.map((plan) => (
                    <tr key={getPlanId(plan)}>
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
                      <td>{plan.allocatedResources?.allocatedDate ? new Date(plan.allocatedResources.allocatedDate).toLocaleDateString() : "-"}</td>
                      <td>
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">READY FOR TRACKING</span>
                      </td>
                      <td>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleCreateDispatchClick(getPlanId(plan))}
                        >
                          Create Dispatch
                        </button>
                      </td>
                    </tr>
                  ))
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
                <p>Transport Details</p>
              </div>
              <div className="step-chip active">
                <span>3</span>
                <p>Create Record</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <label className="form-group md:col-span-2">
                <span>Selected Allocation</span>
                <select value={form.planId} onChange={(e) => handlePlanSelect(e.target.value)} required>
                  <option value="">Select allocation</option>
                  {untrackedPlans.map((plan) => (
                    <option key={getPlanId(plan)} value={getPlanId(plan)}>
                      {plan.disasterType} - {plan.location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span>Dispatch Date</span>
                <input
                  type="date"
                  value={form.dispatchDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dispatchDate: e.target.value }))}
                  required
                />
              </label>

              <label className="form-group">
                <span>Transport Details</span>
                <input
                  type="text"
                  value={form.transportDetails}
                  onChange={(e) => setForm((prev) => ({ ...prev, transportDetails: e.target.value }))}
                  placeholder="e.g., Refrigerated truck, Emergency vehicle"
                />
              </label>

              <label className="form-group">
                <span>Driver Name</span>
                <input
                  type="text"
                  value={form.driverName}
                  onChange={(e) => setForm((prev) => ({ ...prev, driverName: e.target.value }))}
                  placeholder="Driver full name"
                />
              </label>

              <label className="form-group">
                <span>Vehicle Number</span>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                  placeholder="Vehicle registration number"
                />
              </label>

              <label className="form-group">
                <span>Current Location</span>
                <input
                  type="text"
                  value={form.currentLocation}
                  onChange={(e) => setForm((prev) => ({ ...prev, currentLocation: e.target.value }))}
                  placeholder="Starting location (e.g., Warehouse)"
                />
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
                        transportDetails: "",
                        driverName: "",
                        vehicleNumber: "",
                        currentLocation: "Warehouse",
                        dispatchDate: new Date().toISOString().split("T")[0],
                      });
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
                    <th>Driver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!trackingRecords.length ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500">No tracking records yet.</td>
                    </tr>
                  ) : (
                    trackingRecords.map((record) => (
                      <tr key={record._id}>
                        <td>
                          {record.disasterId?.disasterType} - {record.disasterId?.location}
                        </td>
                        <td>{record.allocationId?._id || record.allocationId}</td>
                        <td>{record.status}</td>
                        <td>{record.currentLocation || "-"}</td>
                        <td>{record.driverName || "-"}</td>
                        <td>
                          <div className="flex flex-col gap-2">
                            {record.status !== "delivered" && record.status !== "confirmed_delivered" ? (
                              <button className="btn-primary" disabled={submitting} onClick={() => advanceStatus(record)}>
                                Advance Status
                              </button>
                            ) : record.status === "confirmed_delivered" ? (
                              <span className="text-xs font-semibold text-emerald-600">Confirmation completed</span>
                            ) : (
                              <span className="text-xs text-slate-500">Awaiting DMC confirmation</span>
                            )}
                            {record.status === "confirmed_delivered" && (
                              <span className="text-xs font-semibold text-emerald-600">
                                Confirmed by {record.confirmedBy?.fullName || record.receivedByName || "DMC Officer"}
                              </span>
                            )}
                            {record.confirmationNotes && (
                              <span className="text-xs text-slate-500">{record.confirmationNotes}</span>
                            )}
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
