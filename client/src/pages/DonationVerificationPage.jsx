import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { deleteDonationById, fetchDonations, verifyDonationById } from "../services/workflowService";
import "./Pages.css";

export default function DonationVerificationPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadData() {
    try {
      setLoading(true);
      const donationList = await fetchDonations();

      setDonations(Array.isArray(donationList) ? donationList : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load donations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") {
      return donations;
    }

    return donations.filter((donation) => donation.status === statusFilter);
  }, [donations, statusFilter]);

  async function handleVerify(donation, status) {
    setNotice("");
    setError("");

    try {
      setActionLoading(true);

      const payload = {
        status,
        verificationNotes:
          status === "verified"
            ? "Verified after physical inspection."
            : "Rejected after physical inspection.",
      };

      await verifyDonationById(donation._id, payload);
      setNotice(`Donation ${status} successfully.`);
      await loadData();
    } catch (actionError) {
      setError(actionError.message || "Failed to process donation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveDonation(donation) {
    setNotice("");
    setError("");

    if (!window.confirm("Remove this donation? This cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(donation._id);
      await deleteDonationById(donation._id);
      setNotice("Donation removed successfully.");
      await loadData();
    } catch (removeError) {
      setError(removeError.message || "Failed to remove donation.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <PageHeader
        role="Inventory Officer / Donation Verification"
        title="Donation Verification"
        description="Review pending donations and update inventory only after manual verification."
      />

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Donations</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending_verification">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading donations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Donor Type</th>
                  <th>Donation Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500">No donations found.</td>
                  </tr>
                ) : (
                  filtered.map((donation) => (
                    <tr key={donation._id}>
                      <td>
                        <div className="font-medium">{donation.donorName}</div>
                        {donation.organizationName ? (
                          <div className="text-xs text-slate-500">{donation.organizationName}</div>
                        ) : null}
                      </td>
                      <td>{donation.donorType || "individual"}</td>
                      <td>{donation.donationType || "inventory"}</td>
                      <td>
                        {donation.donationType === "monetary"
                          ? `LKR ${Number(donation.amount || 0).toLocaleString()}`
                          : Array.isArray(donation.items) && donation.items.length > 0
                            ? donation.items
                                .map((item) => `${item.itemName || "-"} (${item.category || "-"}) x ${Number(item.quantity || 0).toLocaleString()}`)
                                .join(", ")
                            : `${donation.itemType || "-"} x ${Number(donation.quantity || 0).toLocaleString()}`}
                      </td>
                      <td>{donation.status}</td>
                      <td>{new Date(donation.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {donation.status === "pending_verification" ? (
                            <>
                              <button
                                className="btn-primary"
                                disabled={actionLoading || deletingId === donation._id}
                                onClick={() => handleVerify(donation, "verified")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-secondary"
                                disabled={actionLoading || deletingId === donation._id}
                                onClick={() => handleVerify(donation, "rejected")}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">Processed</span>
                          )}
                          {donation.status === "pending_verification" && (
                            <button
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              disabled={actionLoading || deletingId === donation._id}
                              onClick={() => handleRemoveDonation(donation)}
                            >
                              Remove
                            </button>
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
      </div>
    </div>
  );
}
