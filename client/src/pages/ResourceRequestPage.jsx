import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus, Send, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { fetchDisasterReports } from "../services/disasterReportService";
import {
  checkStockAvailability,
  createResourceRequest,
  fetchPartners,
} from "../services/workflowService";
import "./Pages.css";

const DEFAULT_ITEM = { itemName: "", quantity: "" };

export default function ResourceRequestPage() {
  const [disasters, setDisasters] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    disasterId: "",
    ngoId: "",
    urgency: "high",
    deliveryDate: "",
    deliveryAddress: "",
    notes: "",
    items: [{ ...DEFAULT_ITEM }],
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [reports, partnerList] = await Promise.all([
          fetchDisasterReports({ status: "pending_inventory" }),
          fetchPartners({ status: "active" }),
        ]);

        setDisasters(Array.isArray(reports) ? reports : []);
        setPartners(Array.isArray(partnerList) ? partnerList : []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load request dependencies.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedDisaster = useMemo(
    () => disasters.find((d) => d.id === form.disasterId),
    [disasters, form.disasterId]
  );

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateItem(index, field, value) {
    setForm((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...DEFAULT_ITEM }] }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: nextItems.length ? nextItems : [{ ...DEFAULT_ITEM }] };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!form.disasterId || !form.ngoId || !form.deliveryDate || !form.deliveryAddress.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    const cleanedItems = form.items
      .map((item) => ({
        itemName: String(item.itemName || "").trim(),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.itemName && Number.isFinite(item.quantity) && item.quantity > 0);

    if (!cleanedItems.length) {
      setError("Add at least one valid requested item.");
      return;
    }

    try {
      setSubmitting(true);

      const stockChecks = await checkStockAvailability(cleanedItems);

      const requestedItems = cleanedItems.map((item) => {
        const check = stockChecks.find((entry) =>
          String(entry.itemName || "").toLowerCase() === item.itemName.toLowerCase()
        );

        return {
          itemName: item.itemName,
          quantity: item.quantity,
          resourceId: check?.inventoryItemId || null,
        };
      });

      const created = await createResourceRequest({
        ngoId: form.ngoId,
        disasterId: form.disasterId,
        urgency: form.urgency,
        requestedItems,
        deliveryDate: form.deliveryDate,
        deliveryAddress: form.deliveryAddress.trim(),
        notes: form.notes.trim(),
      });

      setSuccess(created);
      setForm({
        disasterId: "",
        ngoId: "",
        urgency: "high",
        deliveryDate: "",
        deliveryAddress: "",
        notes: "",
        items: [{ ...DEFAULT_ITEM }],
      });
    } catch (submitError) {
      setError(submitError.message || "Failed to submit resource request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <PageHeader
        role="Inventory Officer / Resource Requests"
        title="Resource Request"
        description="Create shortage-driven NGO requests directly from pending disaster reports."
      />

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle size={18} /> Request submitted successfully
          </div>
          <p className="mt-1">Request ID: {success._id}</p>
          <p>Email dispatch status: {success.emailSentAt ? "Sent" : "Pending / fallback mode"}</p>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading disasters and partners...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-group">
                <span>Disaster Report *</span>
                <select
                  value={form.disasterId}
                  onChange={(e) => updateField("disasterId", e.target.value)}
                  required
                >
                  <option value="">Select a pending disaster report</option>
                  {disasters.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.disasterType} - {report.location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span>NGO / Partner *</span>
                <select value={form.ngoId} onChange={(e) => updateField("ngoId", e.target.value)} required>
                  <option value="">Select partner from internal directory</option>
                  {partners.map((partner) => (
                    <option key={partner._id} value={partner._id}>
                      {partner.organizationName} ({partner.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedDisaster && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Severity: {selectedDisaster.severity} | Affected Population: {selectedDisaster.affectedPopulation}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-group">
                <span>Urgency *</span>
                <select value={form.urgency} onChange={(e) => updateField("urgency", e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="form-group">
                <span>Delivery Date *</span>
                <input
                  type="date"
                  value={form.deliveryDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => updateField("deliveryDate", e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="form-group">
              <span>Delivery Address *</span>
              <textarea
                rows={3}
                value={form.deliveryAddress}
                onChange={(e) => updateField("deliveryAddress", e.target.value)}
                required
              />
            </label>

            <label className="form-group">
              <span>Notes</span>
              <textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Requested Items</h3>
                <button type="button" className="btn-add" onClick={addItem}>
                  <Plus size={14} /> Add item
                </button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, "itemName", e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                    <button type="button" className="btn-remove" onClick={() => removeItem(index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"} <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
