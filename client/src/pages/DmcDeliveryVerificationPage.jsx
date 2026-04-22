import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { confirmTrackingDelivery, fetchTrackingRecords } from "../services/workflowService";
import "./Pages.css";

const MAX_CONFIRMATION_NOTES_LENGTH = 500;

export default function DmcDeliveryVerificationPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notesById, setNotesById] = useState({});

  async function loadRecords() {
    try {
      setLoading(true);
      const tracking = await fetchTrackingRecords();
      setRecords(Array.isArray(tracking) ? tracking : []);
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

  const deliverableRecords = useMemo(
    () => records.filter((record) => ["delivered", "confirmed_delivered"].includes(record.status)),
    [records]
  );

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
        role="DMC Officer / Delivery Verification"
        title="Delivery Verification"
        description="Confirm delivered dispatches so the workflow can be closed in-system."
      />

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Delivered Dispatches</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading delivery records...</p>
        ) : (
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
                {!deliverableRecords.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500">No delivered records pending verification.</td>
                  </tr>
                ) : (
                  deliverableRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{record.disasterId?.disasterType} - {record.disasterId?.location}</td>
                      <td>{record.allocationId?._id || record.allocationId}</td>
                      <td>{record.status}</td>
                      <td>{record.currentLocation || "-"}</td>
                      <td>
                        <input
                          placeholder="Confirmation notes"
                          value={notesById[record._id] || ""}
                          onChange={(e) =>
                            setNotesById((prev) => ({ ...prev, [record._id]: e.target.value }))
                          }
                          disabled={record.status === "confirmed_delivered"}
                          maxLength={MAX_CONFIRMATION_NOTES_LENGTH}
                        />
                      </td>
                      <td>
                        {record.status === "confirmed_delivered" ? (
                          <span className="text-xs text-emerald-600">Confirmed</span>
                        ) : (
                          <button
                            className="btn-primary"
                            disabled={submitting}
                            onClick={() => handleConfirm(record)}
                          >
                            Confirm Delivery
                          </button>
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
  );
}
