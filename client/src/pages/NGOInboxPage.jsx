import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Clock3, ExternalLink, Inbox, Package, RefreshCcw, ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import ResourceRequestInlineForm from "../components/ResourceRequestInlineForm";
import { useAuth } from "../context/AuthContext";
import { deleteResourceRequestById, fetchResourceRequestById, fetchResourceRequests } from "../services/workflowService";
import "./Pages.css";

const STATUS_FILTERS = ["all", "approved", "fulfilled", "rejected"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

function getDonationBadge(donationSummary) {
  if (!donationSummary) {
    return {
      label: "No donation yet",
      tone: "bg-slate-200 text-slate-700",
      icon: AlertCircle,
    };
  }

  if (donationSummary.status === "verified") {
    return {
      label: "Donation verified",
      tone: "bg-emerald-100 text-emerald-700",
      icon: ShieldCheck,
    };
  }

  if (donationSummary.status === "pending_verification") {
    return {
      label: "Donation submitted",
      tone: "bg-amber-100 text-amber-800",
      icon: Clock3,
    };
  }

  return {
    label: "Donation rejected",
    tone: "bg-rose-100 text-rose-700",
    icon: AlertCircle,
  };
}

export default function NGOInboxPage() {
  const navigate = useNavigate();
  const { requestId: pathRequestId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingRequestId, setDeletingRequestId] = useState("");

  const focusedRequestId = String(pathRequestId || searchParams.get("requestId") || "").trim();

  function getRequestId(request) {
    return String(request?.id || request?._id || "").trim();
  }

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const [items, focusedRequest] = await Promise.all([
        fetchResourceRequests(),
        focusedRequestId ? fetchResourceRequestById(focusedRequestId).catch(() => null) : Promise.resolve(null),
      ]);

      const normalizedItems = Array.isArray(items) ? items : [];
      const requestedItem = focusedRequest?.resourceRequest || focusedRequest || null;

      if (requestedItem) {
        const requestedId = getRequestId(requestedItem);
        const existingIndex = normalizedItems.findIndex((request) => getRequestId(request) === requestedId);

        if (existingIndex >= 0) {
          normalizedItems[existingIndex] = requestedItem;
        } else {
          normalizedItems.unshift(requestedItem);
        }
      }

      setRequests(normalizedItems);
    } catch (loadError) {
      setRequests([]);
      setError(loadError.message || "Failed to load your request inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRequest(requestId) {
    if (!requestId) {
      return;
    }

    const confirmed = window.confirm("Remove this request from your inbox? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingRequestId(requestId);
      setError("");
      await deleteResourceRequestById(requestId);
      await loadRequests();
    } catch (removeError) {
      setError(removeError.message || "Failed to remove resource request.");
    } finally {
      setDeletingRequestId("");
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const filtered = statusFilter === "all"
      ? requests
      : requests.filter((request) => request.status === statusFilter);

    if (!focusedRequestId) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aMatch = getRequestId(a) === focusedRequestId ? 1 : 0;
      const bMatch = getRequestId(b) === focusedRequestId ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [requests, statusFilter, focusedRequestId]);

  const stats = useMemo(() => ({
    total: requests.length,
    approved: requests.filter((request) => request.status === "approved").length,
    fulfilled: requests.filter((request) => request.status === "fulfilled").length,
  }), [requests]);

  return (
    <div className="resource-request-page min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          role="NGO Partner / Inbox"
          title="NGO Inbox"
          description="Review approved resource requests in one place and send matching donations to inventory."
          actions={
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
              onClick={loadRequests}
            >
              <RefreshCcw size={14} /> Refresh
            </button>
          }
        />

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Requests</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.approved}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fulfilled</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">{stats.fulfilled}</p>
          </div>
        </div>

        <div className="mt-6">
          <ResourceRequestInlineForm onSubmitted={loadRequests} />
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your Requests</h2>
              <p className="text-sm text-slate-500">
                Signed in as {user?.organizationName || user?.email || "NGO partner"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading request inbox...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <Inbox className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No requests found</h3>
              <p className="mt-1 text-sm text-slate-500">
                There are no requests in this filter yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRequests.map((request, index) => {
                const requestId = getRequestId(request);
                const isFocusedRequest = Boolean(focusedRequestId) && requestId === focusedRequestId;

                return (
                <div
                  key={requestId || `${request.createdAt || "request"}-${index}`}
                  className={`rounded-2xl border p-5 shadow-sm ${isFocusedRequest ? "border-blue-400 bg-blue-50/50" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {String(request.status || "unknown").toUpperCase()}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          {request.requestType || "inventory"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Approved by Relief Team
                        </span>
                        {(() => {
                          const badge = getDonationBadge(request.donationSummary);
                          const BadgeIcon = badge.icon;
                          return (
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>
                              <BadgeIcon className="mr-1 h-3.5 w-3.5" /> {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {request.deliveryWarehouse || "Delivery warehouse not set"}
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm text-slate-600">
                          {request.problemNote || "No problem note provided."}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
                          <p className="mt-1 flex items-center gap-2 font-medium"><Clock3 size={14} /> {formatDate(request.createdAt)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Warehouse</p>
                          <p className="mt-1 font-medium">{request.deliveryWarehouse || "-"}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-slate-200">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Requested by</p>
                          <p className="mt-1 font-medium">{request.ngoPartner?.organizationName || request.ngoPartner?.contactPerson || "Your NGO"}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Request Details</p>
                        {request.requestType === "monetary" ? (
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            Requested Amount: {formatAmount(request.amount)}
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2 text-sm text-slate-700">
                            {(Array.isArray(request.items) ? request.items : []).map((item, index) => (
                              <div key={`${requestId}-${index}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2">
                                <div>
                                  <p className="font-medium text-slate-900">{item.itemName || "Unnamed item"}</p>
                                  <p className="text-xs text-slate-500">
                                    {item.category || "-"}
                                    {item.packageSize ? ` • ${item.packageSize}` : ""}
                                    {item.unit ? ` • ${item.unit}` : ""}
                                  </p>
                                </div>
                                <p className="font-semibold text-slate-900">x {Number(item.quantity || 0).toLocaleString()}</p>
                              </div>
                            ))}
                            {!Array.isArray(request.items) || request.items.length === 0 ? (
                              <p className="text-slate-500">No line items recorded.</p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {request.donationSummary ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                          <p className="font-semibold">Donation status</p>
                          <p className="mt-1">
                            {request.donationSummary.status === "verified"
                              ? "A donation has been verified for this request."
                              : request.donationSummary.status === "pending_verification"
                                ? "A donation has been submitted and is waiting for inventory verification."
                                : "A donation was submitted for this request but was rejected."}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                          No donation has been submitted for this request yet.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-56 lg:items-end">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                        onClick={() => navigate(`/ngo-donation?requestId=${requestId}`)}
                      >
                        Open Donation Form <ExternalLink size={14} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        onClick={() => handleRemoveRequest(requestId)}
                        disabled={deletingRequestId === requestId}
                      >
                        Remove Request
                      </button>
                      <p className="text-xs text-slate-500 text-right">
                        Respond directly from the linked donation page.
                      </p>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}