import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import {
  createTrackingRecord,
  fetchTrackingRecords,
  updateTrackingRecordById,
} from "../services/workflowService";
import { fetchDisasterReports } from "../services/disasterReportService";
import "./Pages.css";

const STATUS_SEQUENCE = ["prepared", "dispatched", "in_transit", "delivered"];

function getAllocationId(allocation) {
  return String(allocation?._id || allocation?.id || "");
}

function getPlanId(plan) {
  return String(plan?.id || plan?._id || "");
}

export default function DistributionTracking() {
  const [allocations, setAllocations] = useState([]);
  const [trackingRecords, setTrackingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previousAllocationCount, setPreviousAllocationCount] = useState(0);
  const [form, setForm] = useState({
    allocationId: "",
    disasterId: "",
    transportDetails: "",
    driverName: "",
    vehicleNumber: "",
    currentLocation: "Warehouse",
  });

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  async function loadData() {
    try {
      setLoading(true);
      const [allocatedReportsResult, recordsResult] = await Promise.allSettled([
        fetchDisasterReports({ status: "allocated" }),
        fetchTrackingRecords(),
      ]);

      const allocatedReports =
        allocatedReportsResult.status === "fulfilled" ? allocatedReportsResult.value : [];
      const records = recordsResult.status === "fulfilled" ? recordsResult.value : [];

      const normalizedPlans = (Array.isArray(allocatedReports) ? allocatedReports : []).map((report) => {
        const resources = report.allocatedResources || {};
        const lineItems = Array.isArray(resources.lineItems) ? resources.lineItems : [];
        const quantities =
          resources.quantities && typeof resources.quantities === "object" ? resources.quantities : {};

        const mappedFromQuantities = Object.entries(quantities).map(([itemName, quantity]) => ({
          itemId: itemName,
          itemName,
          quantityAllocated: Number(quantity || 0),
          unit: "units",
        }));

        const mergedItems = lineItems.length
          ? lineItems.map((item) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              quantityAllocated: Number(item.quantity || 0),
              unit: "units",
            }))
          : mappedFromQuantities;

        return {
          id: report.id,
          disasterId: {
            _id: report.id,
            disasterType: report.disasterType,
            location: report.location,
            severity: report.severity,
          },
          items: mergedItems.filter((item) => Number(item.quantityAllocated) > 0),
          notes: resources.message || "",
          status: "confirmed",
          createdAt: resources.allocatedDate || report.updatedAt || report.createdAt,
        };
      });

      const currentAllocationCount = normalizedPlans.length;
      
      // Check for new allocations
      if (previousAllocationCount > 0 && currentAllocationCount > previousAllocationCount) {
        const newAllocationsCount = currentAllocationCount - previousAllocationCount;
        setNotice(`${newAllocationsCount} new allocation(s) ready for tracking!`);
        setTimeout(() => setNotice(""), 5000); // Auto-clear after 5 seconds
      }
      
      setAllocations(normalizedPlans);
      setTrackingRecords(Array.isArray(records) ? records : []);
      setPreviousAllocationCount(currentAllocationCount);
      
      if (allocatedReportsResult.status === "rejected" || recordsResult.status === "rejected") {
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
    
    // Set up auto-refresh every 30 seconds to check for new allocations
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const untrackedAllocations = useMemo(() => {
    const trackedDisasterIds = new Set(
      trackingRecords.map((record) => String(record.disasterId?._id || record.disasterId || ""))
    );
    return allocations.filter((allocation) => !trackedDisasterIds.has(String(allocation.disasterId?._id || "")));
  }, [allocations, trackingRecords]);

  const selectedAllocation = useMemo(
    () => allocations.find((allocation) => getAllocationId(allocation) === String(form.allocationId)),
    [allocations, form.allocationId]
  );

  function handleAllocationSelect(value) {
    const allocation = allocations.find((item) => getPlanId(item) === String(value));
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

    if (!form.disasterId) {
      setError("Select a confirmed allocation to start tracking.");
      return;
    }

    try {
      setSubmitting(true);
      const selectedPlan = allocations.find((item) => getPlanId(item) === String(form.allocationId));

      await createTrackingRecord({
        allocationId: selectedPlan?._id || undefined,
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
        <div className="flex justify-between items-start mb-6">
          <PageHeader
            role="Tracking Officer / Dispatch"
            title="Distribution Tracking"
            description="Create dispatch tracking from confirmed allocations and update delivery status up to delivered."
          />
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={loadData}
            disabled={loading}
            title="Refresh allocations and tracking records"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

        <section className="professional-form-shell mt-6 rounded-3xl p-6">
          <h2 className="mb-1 text-lg font-semibold">Allocated Plans Ready for Tracking</h2>
          <p className="mb-4 text-sm text-slate-600">
            Review the confirmed allocation plan below, then start a tracking record for dispatch.
          </p>

          <div className="overflow-x-auto">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Allocation ID</th>
                  <th>Disaster</th>
                  <th>Allocated Items</th>
                  <th>Notes</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!untrackedAllocations.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500">
                      No confirmed allocations pending tracking.
                    </td>
                  </tr>
                ) : (
                  untrackedAllocations.map((allocation) => {
                    const allocationId = getAllocationId(allocation);
                    const items = Array.isArray(allocation.items) ? allocation.items : [];
                    const itemsPreview = items.slice(0, 2);
                    const hasMoreItems = items.length > itemsPreview.length;

                    return (
                      <tr key={allocationId}>
                        <td>{allocationId}</td>
                        <td>
                          {allocation.disasterId?.disasterType || "-"} - {allocation.disasterId?.location || "-"}
                        </td>
                        <td>
                          {itemsPreview.length ? (
                            <div className="flex flex-col gap-1">
                              {itemsPreview.map((item, index) => (
                                <span key={`${allocationId}-item-${index}`}>
                                  {item.itemName} ({item.quantityAllocated} {item.unit || "units"})
                                </span>
                              ))}
                              {hasMoreItems && <span className="text-xs text-slate-500">+{items.length - itemsPreview.length} more items</span>}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{allocation.notes || "-"}</td>
                        <td>{formatDateTime(allocation.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleAllocationSelect(allocationId)}
                            disabled={submitting || loading}
                          >
                            Start Tracking
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {form.allocationId && (
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

            {selectedAllocation && (
              <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-800">Selected Allocation Plan Details</h3>
                  <p className="text-xs text-slate-600">
                    {selectedAllocation.disasterId?.disasterType || "-"} - {selectedAllocation.disasterId?.location || "-"}
                  </p>
                </div>
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedAllocation.items || []).map((item, index) => (
                      <tr key={`${getAllocationId(selectedAllocation)}-detail-${index}`}>
                        <td>{item.itemName || "-"}</td>
                        <td>{item.quantityAllocated ?? "-"}</td>
                        <td>{item.unit || "units"}</td>
                      </tr>
                    ))}
                    {!(selectedAllocation.items || []).length && (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500">No allocated items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <label className="form-group md:col-span-2">
                <span>Confirmed Allocation</span>
                <select value={form.allocationId} onChange={(e) => handleAllocationSelect(e.target.value)} required>
                  <option value="">Select allocation</option>
                  {untrackedAllocations.map((allocation) => (
                    <option key={getPlanId(allocation)} value={getPlanId(allocation)}>
                      {allocation.disasterId?.disasterType} - {allocation.disasterId?.location} ({getPlanId(allocation)})
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
