import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import {
  createTrackingRecord,
  fetchAllocations,
  fetchTrackingRecords,
  updateTrackingRecordById,
} from "../services/workflowService";
import "./Pages.css";

const STATUS_SEQUENCE = ["prepared", "dispatched", "in_transit", "delivered"];

function getAllocationId(allocation) {
  return String(allocation?._id || allocation?.id || "");
}

export default function DistributionTracking() {
  const [allocations, setAllocations] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    allocationId: "",
    disasterId: "",
    transportDetails: "",
    driverName: "",
    vehicleNumber: "",
    currentLocation: "Warehouse",
  });

  async function loadData() {
    try {
      setLoading(true);
      const [confirmedAllocationsResult, recordsResult] = await Promise.allSettled([
        fetchAllocations({ status: "confirmed" }),
        fetchTrackingRecords(),
      ]);

      const confirmedAllocations =
        confirmedAllocationsResult.status === "fulfilled" ? confirmedAllocationsResult.value : [];
      const records = recordsResult.status === "fulfilled" ? recordsResult.value : [];

      setAllocations(Array.isArray(confirmedAllocations) ? confirmedAllocations : []);
      setTrackingRecords(Array.isArray(records) ? records : []);
      if (confirmedAllocationsResult.status === "rejected" || recordsResult.status === "rejected") {
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
    if (!form.allocationId && untrackedAllocations.length > 0) {
      handleAllocationSelect(getAllocationId(untrackedAllocations[0]));
    }
  }, [form.allocationId, untrackedAllocations]);

  const untrackedAllocations = useMemo(() => {
    const trackedIds = new Set(trackingRecords.map((record) => String(record.allocationId?._id || record.allocationId)));
    return allocations.filter((allocation) => !trackedIds.has(getAllocationId(allocation)));
  }, [allocations, trackingRecords]);

  function handleAllocationSelect(value) {
    const allocation = allocations.find((item) => getAllocationId(item) === String(value));
    setForm((prev) => ({
      ...prev,
      allocationId: value,
      disasterId: allocation?.disasterId?._id || "",
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.allocationId || !form.disasterId) {
      setError("Select a confirmed allocation to start tracking.");
      return;
    }

    try {
      setSubmitting(true);
      await createTrackingRecord({
        allocationId: form.allocationId,
        disasterId: form.disasterId,
        dispatchDate: new Date().toISOString(),
        transportDetails: form.transportDetails,
        driverName: form.driverName,
        vehicleNumber: form.vehicleNumber,
        currentLocation: form.currentLocation,
      });

      setNotice("Tracking record created.");
      setForm({
        allocationId: "",
        disasterId: "",
        transportDetails: "",
        driverName: "",
        vehicleNumber: "",
        currentLocation: "Warehouse",
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
          description="Create dispatch tracking from confirmed allocations and update delivery status up to delivered."
        />

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        <section className="professional-form-shell mt-6 rounded-3xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Dispatch Tracking</h2>
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
              <span>Confirmed Allocation</span>
              <select value={form.allocationId} onChange={(e) => handleAllocationSelect(e.target.value)} required>
                <option value="">Select allocation</option>
                {untrackedAllocations.map((allocation) => (
                  <option key={getAllocationId(allocation)} value={getAllocationId(allocation)}>
                    {allocation.disasterId?.disasterType} - {allocation.disasterId?.location} ({getAllocationId(allocation)})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span>Transport Details</span>
              <input value={form.transportDetails} onChange={(e) => setForm((p) => ({ ...p, transportDetails: e.target.value }))} />
            </label>

            <label className="form-group">
              <span>Current Location</span>
              <input value={form.currentLocation} onChange={(e) => setForm((p) => ({ ...p, currentLocation: e.target.value }))} />
            </label>

            <label className="form-group">
              <span>Driver Name</span>
              <input value={form.driverName} onChange={(e) => setForm((p) => ({ ...p, driverName: e.target.value }))} />
            </label>

            <label className="form-group">
              <span>Vehicle Number</span>
              <input value={form.vehicleNumber} onChange={(e) => setForm((p) => ({ ...p, vehicleNumber: e.target.value }))} />
            </label>

            <button type="submit" className="btn-primary md:col-span-2" disabled={submitting || loading}>
              {submitting ? "Creating..." : "Create Tracking Record"}
            </button>
          </form>
        </section>

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
                          {record.status !== "delivered" && record.status !== "confirmed_delivered" ? (
                            <button className="btn-primary" disabled={submitting} onClick={() => advanceStatus(record)}>
                              Advance Status
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Awaiting DMC confirmation</span>
                          )}
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
