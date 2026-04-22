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
const MAX_NOTE_LENGTH = 300;
const MAX_ADDRESS_LENGTH = 200;
const MIN_ADDRESS_LENGTH = 10;
const MAX_ITEM_NAME_LENGTH = 80;
const MIN_ITEM_NAME_LENGTH = 2;
const MAX_REQUEST_QUANTITY = 999999;

function getTodayDateLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

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

    if (new Date(form.deliveryDate).getTime() < new Date(getTodayDateLocal()).getTime()) {
      setError("Delivery date cannot be in the past.");
      return;
    }

    const normalizedAddress = form.deliveryAddress.trim();
    if (normalizedAddress.length < MIN_ADDRESS_LENGTH || normalizedAddress.length > MAX_ADDRESS_LENGTH) {
      setError(`Delivery address must be between ${MIN_ADDRESS_LENGTH} and ${MAX_ADDRESS_LENGTH} characters.`);
      return;
    }

    const hasNegativeQuantity = form.items.some((item) => Number(item.quantity) < 0);
    if (hasNegativeQuantity) {
      setError("Invalid count. Quantity cannot be negative.");
      return;
    }

    const cleanedItems = form.items
      .map((item) => ({
        itemName: String(item.itemName || "").trim(),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.itemName && Number.isFinite(item.quantity) && item.quantity > 0);

    const duplicateItem = cleanedItems.find(
      (item, index) =>
        cleanedItems.findIndex((candidate) => candidate.itemName.toLowerCase() === item.itemName.toLowerCase()) !== index
    );

    if (duplicateItem) {
      setError(`Requested item names must be unique. Duplicate found: ${duplicateItem.itemName}.`);
      return;
    }

    if (cleanedItems.some((item) => item.itemName.length < MIN_ITEM_NAME_LENGTH || item.itemName.length > MAX_ITEM_NAME_LENGTH)) {
      setError(`Each item name must be between ${MIN_ITEM_NAME_LENGTH} and ${MAX_ITEM_NAME_LENGTH} characters.`);
      return;
    }

    if (cleanedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_REQUEST_QUANTITY)) {
      setError(`Each item quantity must be a whole number between 1 and ${MAX_REQUEST_QUANTITY}.`);
      return;
    }

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
        deliveryAddress: normalizedAddress,
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
    <div className="resource-request-page min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
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

        <div className="professional-form-shell mt-6 rounded-3xl p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading disasters and partners...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="shared-stepper">
              <div className="step-chip active">
                <span>1</span>
                <p>Context</p>
              </div>
              <div className="step-chip active">
                <span>2</span>
                <p>Logistics</p>
              </div>
              <div className="step-chip active">
                <span>3</span>
                <p>Items & Submit</p>
              </div>
            </div>

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
                  min={getTodayDateLocal()}
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
                minLength={MIN_ADDRESS_LENGTH}
                maxLength={MAX_ADDRESS_LENGTH}
              />
            </label>

            <label className="form-group">
              <span>Notes</span>
              <textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} maxLength={MAX_NOTE_LENGTH} />
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
                      className="resource-line-input"
                      type="text"
                      placeholder="Item name"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, "itemName", e.target.value)}
                      minLength={MIN_ITEM_NAME_LENGTH}
                      maxLength={MAX_ITEM_NAME_LENGTH}
                    />
                    <input
                      className="resource-line-input"
                      type="number"
                      min="0"
                      step="1"
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
    </div>
  );
}
