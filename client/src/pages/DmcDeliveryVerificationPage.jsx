import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { RefreshCw } from "lucide-react";
import { confirmTrackingDelivery, fetchTrackingRecords } from "../services/workflowService";
import "./Pages.css";

const MAX_CONFIRMATION_NOTES_LENGTH = 500;
const TRACKING_RECORDS_UPDATED_EVENT = "tracking-records-updated";

export default function DmcDeliveryVerificationPage() {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [confirmedRecords, setConfirmedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notesById, setNotesById] = useState({});

  async function loadRecords() {
    try {
      setLoading(true);
      const [pendingResult, confirmedResult] = await Promise.allSettled([
        fetchTrackingRecords({ status: "pending_confirmation" }),
        fetchTrackingRecords({ status: "confirmed_delivered" }),
      ]);

      setPendingRecords(pendingResult.status === "fulfilled" ? pendingResult.value : []);
      setConfirmedRecords(confirmedResult.status === "fulfilled" ? confirmedResult.value : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load delivery records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    function handleTrackingRecordsUpdated() {
      loadRecords();
    }

    window.addEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
    return () => window.removeEventListener(TRACKING_RECORDS_UPDATED_EVENT, handleTrackingRecordsUpdated);
  }, []);

  const hasAnyPendingDelivery = pendingRecords.length > 0;

  async function handleConfirm(record) {
    const notes = String(notesById[record._id] || "").trim();

    if (notes.length > MAX_CONFIRMATION_NOTES_LENGTH) {
      setError(`Confirmation notes cannot exceed ${MAX_CONFIRMATION_NOTES_LENGTH} characters.`);
      return;
    }

    try {
      setSubmitting(true);
      await confirmTrackingDelivery(record._id, {
        status: "confirmed_delivered",
        confirmationNotes: notes,
        receivedByName: "DMC Officer",
      });
      window.dispatchEvent(new Event(TRACKING_RECORDS_UPDATED_EVENT));
      setNotice("Delivery confirmed successfully.");
      await loadRecords();
    } catch (confirmError) {
      setError(confirmError.message || "Failed to confirm delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <PageHeader
        role="DMC Officer / Goods Receipt"
        title="Goods Receipt Confirmation"
        description="Confirm delivered tracking records so the reporting cycle is closed in the system."
      />

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      <div className="flex justify-end mb-4">
        <button
          className="btn-refresh"
          onClick={loadRecords}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spinning" : ""} />
          Refresh Data
        </button>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">📦 Goods Received - Delivery Verification</h2>
        <p className="mb-6 text-sm text-slate-600">This page reads the live tracking queue directly. All unconfirmed tracking records appear here for DMC verification, and confirmed records stay visible below for audit history.</p>

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-amber-900">Pending confirmation</h3>
            <span className="text-xs font-medium text-amber-700">{pendingRecords.length} record{pendingRecords.length === 1 ? "" : "s"}</span>
          </div>

          {hasAnyPendingDelivery ? (
            <div className="overflow-x-auto">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Disaster</th>
                    <th>Allocation</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{record.disasterId?.disasterType} - {record.disasterId?.location}</td>
                      <td>{record.allocationId?._id || record.allocationId}</td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">{record.status}</span>
                      </td>
                      <td>{record.currentLocation || "-"}</td>
                      <td>
                        <input
                          placeholder="Goods verification notes (condition, quantity, etc.)"
                          value={notesById[record._id] || ""}
                          onChange={(e) =>
                            setNotesById((prev) => ({ ...prev, [record._id]: e.target.value }))
                          }
                          maxLength={MAX_CONFIRMATION_NOTES_LENGTH}
                          className="w-full"
                        />
                      </td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <button
                            className="btn-primary btn-sm"
                            disabled={submitting}
                            onClick={() => handleConfirm(record)}
                          >
                            📦 Confirm Goods Received
                          </button>
                          <span className="text-xs text-slate-500">After manual verification</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No pending tracking records are waiting for confirmation yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-emerald-900">Already confirmed</h3>
            <span className="text-xs font-medium text-emerald-700">{confirmedRecords.length} record{confirmedRecords.length === 1 ? "" : "s"}</span>
          </div>

          {confirmedRecords.length ? (
            <div className="overflow-x-auto">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Disaster</th>
                    <th>Allocation</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{record.disasterId?.disasterType} - {record.disasterId?.location}</td>
                      <td>{record.allocationId?._id || record.allocationId}</td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">{record.status}</span>
                      </td>
                      <td>{record.currentLocation || "-"}</td>
                      <td>
                        <div className="text-sm text-slate-600">
                          {record.confirmationNotes || "-"}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-emerald-600 font-semibold">✓ Confirmed</span>
                          <span className="text-xs text-slate-500">Goods received & verified</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No confirmed records yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
