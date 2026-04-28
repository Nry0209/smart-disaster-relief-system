import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus, Send, Trash2, Building2, Package, HandCoins } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { fetchDisasterReports } from "../services/disasterReportService";
import {
  checkStockAvailability,
  createResourceRequest,
  fetchPartners,
} from "../services/workflowService";
import { fetchInventoryItems } from "../services/inventoryService";
import { ITEM_CATEGORIES, ITEM_MAPPING } from "../utils/constants";
import "./Pages.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 80;
const MAX_NOTE_LENGTH = 500;
const MAX_ADDRESS_LENGTH = 200;
const MIN_ADDRESS_LENGTH = 10;
const MAX_ITEM_NAME_LENGTH = 80;
const MIN_ITEM_NAME_LENGTH = 2;
const MAX_REQUEST_QUANTITY = 999999;
const DEFAULT_REQUEST_ITEM = {
  inventoryItemId: "",
  category: "",
  itemName: "",
  quantity: "",
};

// Warehouse options
const WAREHOUSES = [
  "Colombo Central Warehouse",
  "Kandy Regional Warehouse"
];

// System name
const SYSTEM_NAME = "ReliefLanka";

function getTodayDateLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function validatePhone(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15 || !PHONE_PATTERN.test(normalized)) {
    return "Enter a valid phone number, including country code if needed.";
  }

  return "";
}

function validateEmail(value) {
  if (!value) return "";
  if (!EMAIL_PATTERN.test(value)) {
    return "Please enter a valid email address.";
  }
  return "";
}

export default function ResourceRequestPage() {
  const [disasters, setDisasters] = useState([]);
  const [partners, setPartners] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [form, setForm] = useState({
    ngoPartner: "",
    requestType: "inventory", // inventory or monetary
    amount: "",
    items: [{ ...DEFAULT_REQUEST_ITEM }],
    deliveryWarehouse: "",
    problemNote: "",
    expectedDeliveryDate: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [reports, partnerList, inventory] = await Promise.all([
          fetchDisasterReports({ status: "pending_inventory" }),
          fetchPartners({ status: "active" }),
          fetchInventoryItems(),
        ]);

        if (!active) return;

        setDisasters(Array.isArray(reports) ? reports : []);
        setPartners(Array.isArray(partnerList) ? partnerList : []);

        // Normalize inventory items
        const normalized = Array.isArray(inventory)
          ? inventory
              .filter((item) => item?.id && item?.name && item?.category)
              .map((item) => ({
                id: String(item.id),
                name: String(item.name),
                category: String(item.category),
              }))
          : [];

        setInventoryItems(normalized);
      } catch {
        if (!active) return;
        setDisasters([]);
        setPartners([]);
        setInventoryItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
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
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...DEFAULT_REQUEST_ITEM }] }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: nextItems.length ? nextItems : [{ ...DEFAULT_REQUEST_ITEM }] };
    });
  }

  // Validation functions
  function validateForm() {
    const errors = [];

    // Required fields validation (except resource request items)
    if (!form.ngoPartner.trim()) {
      errors.push("Please select an NGO/Partner.");
    }

    if (!form.deliveryWarehouse.trim()) {
      errors.push("Please select a delivery warehouse.");
    }

    if (!form.expectedDeliveryDate.trim()) {
      errors.push("Expected delivery date is required.");
    } else if (new Date(form.expectedDeliveryDate).getTime() < new Date(getTodayDateLocal()).getTime()) {
      errors.push("Delivery date cannot be in the past.");
    }

    // Monetary request validation if selected
    if (form.requestType === "monetary") {
      if (!form.amount.trim() || Number(form.amount) <= 0) {
        errors.push("Please enter a valid amount for monetary request.");
      }
    }

    // Inventory request validation if selected
    if (form.requestType === "inventory") {
      const validItems = form.items.filter(item => item.itemName.trim() && item.quantity.trim());
      if (validItems.length === 0) {
        errors.push("Please add at least one item for inventory request.");
      } else {
        const hasNegativeQuantity = validItems.some(item => Number(item.quantity) < 0);
        if (hasNegativeQuantity) {
          errors.push("Quantity cannot be negative.");
        }
      }
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ngoPartner: form.ngoPartner,
        requestType: form.requestType,
        deliveryWarehouse: form.deliveryWarehouse,
        problemNote: form.problemNote.trim(),
        expectedDeliveryDate: form.expectedDeliveryDate,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      if (form.requestType === "monetary") {
        payload.amount = Number(form.amount);
      } else {
        payload.items = form.items
          .filter(item => item.itemName.trim() && item.quantity.trim())
          .map(item => ({
            inventoryItemId: item.inventoryItemId,
            category: item.category,
            itemName: item.itemName.trim(),
            quantity: Number(item.quantity),
          }));
      }

      await createResourceRequest(payload);
      setSuccess("Resource request submitted successfully! We will review and process your request.");

      // Reset form
      setForm({
        ngoPartner: "",
        requestType: "inventory",
        amount: "",
        items: [{ ...DEFAULT_REQUEST_ITEM }],
        deliveryWarehouse: "",
        problemNote: "",
        expectedDeliveryDate: "",
      });

    } catch (err) {
      setError(err.message || "Failed to submit resource request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="resource-request-page min-h-screen bg-slate-50 px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          role={`${SYSTEM_NAME} / NGO/Partner Resource Requests`}
          title="Resource Request"
          description="Submit resource requests for disaster relief operations."
        />

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {success && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle size={18} /> Request submitted successfully
            </div>
            <p className="mt-1">We will review and process your request shortly.</p>
          </div>
        )}

        <div className="professional-form-shell mt-6 rounded-3xl p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading system...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="shared-stepper">
                <div className="step-chip active">
                  <span>1</span>
                  <p>Organization</p>
                </div>
                <div className="step-chip active">
                  <span>2</span>
                  <p>Request Type</p>
                </div>
                <div className="step-chip active">
                  <span>3</span>
                  <p>Details</p>
                </div>
              </div>

              {/* NGO/Partner Selection */}
              <label className="form-group">
                <span>NGO/Partner *</span>
                <select
                  value={form.ngoPartner}
                  onChange={(e) => updateField("ngoPartner", e.target.value)}
                  required
                >
                  <option value="">Select your organization</option>
                  {partners.map((partner) => (
                    <option key={partner._id} value={partner._id}>
                      {partner.organizationName || partner.contactPerson}
                    </option>
                  ))}
                </select>
              </label>

              {/* Request Type */}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="form-group">
                  <span>Request Type *</span>
                  <select
                    value={form.requestType}
                    onChange={(e) => updateField("requestType", e.target.value)}
                    required
                  >
                    <option value="inventory">Inventory Items</option>
                    <option value="monetary">Monetary Donation</option>
                  </select>
                </label>

                <label className="form-group">
                  <span>Expected Delivery Date *</span>
                  <input
                    type="date"
                    value={form.expectedDeliveryDate}
                    min={getTodayDateLocal()}
                    onChange={(e) => updateField("expectedDeliveryDate", e.target.value)}
                    required
                  />
                </label>
              </div>

              {/* Delivery Warehouse */}
              <label className="form-group">
                <span>Delivery Warehouse *</span>
                <select
                  value={form.deliveryWarehouse}
                  onChange={(e) => updateField("deliveryWarehouse", e.target.value)}
                  required
                >
                  <option value="">Select delivery warehouse</option>
                  {WAREHOUSES.map((warehouse) => (
                    <option key={warehouse} value={warehouse}>
                      {warehouse}
                    </option>
                  ))}
                </select>
              </label>

              {/* Problem Note */}
              <label className="form-group">
                <span>Problem Description *</span>
                <textarea
                  rows={3}
                  value={form.problemNote}
                  onChange={(e) => updateField("problemNote", e.target.value)}
                  placeholder="Please describe the problem or situation requiring these resources..."
                  required
                  maxLength={MAX_NOTE_LENGTH}
                />
              </label>

              {/* Monetary Request */}
              {form.requestType === "monetary" && (
                <label className="form-group">
                  <span>Requested Amount (LKR) *</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => updateField("amount", e.target.value)}
                    placeholder="Enter amount in Sri Lankan Rupees"
                    min="1"
                    required
                  />
                </label>
              )}

              {/* Inventory Request */}
              {form.requestType === "inventory" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Requested Items</h3>
                    <button type="button" className="btn-add" onClick={addItem}>
                      <Plus size={14} /> Add item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.items.map((item, index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
                        <select
                          className="resource-line-input"
                          value={item.category}
                          onChange={(e) => {
                            updateItem(index, "category", e.target.value);
                            updateItem(index, "itemName", ""); // Reset item when category changes
                          }}
                        >
                          <option value="">Select category</option>
                          {Object.values(ITEM_CATEGORIES).map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <select
                          className="resource-line-input"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, "itemName", e.target.value)}
                          disabled={!item.category}
                        >
                          <option value="">Select item</option>
                          {item.category && ITEM_MAPPING[item.category]?.map((itemName) => (
                            <option key={itemName} value={itemName}>
                              {itemName}
                            </option>
                          ))}
                        </select>
                        <input
                          className="resource-line-input"
                          type="number"
                          min="1"
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
              )}

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
