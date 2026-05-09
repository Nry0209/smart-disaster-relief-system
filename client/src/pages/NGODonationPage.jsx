import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Package, CheckCircle, Heart, Loader, Warehouse } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { fetchInventoryItems } from "../services/inventoryService";
import { createNGODonation, fetchPartners, fetchResourceRequestById } from "../services/workflowService";
import "./Pages.css";

const MIN_MONETARY_AMOUNT = 1000;
const MIN_ITEM_QUANTITY = 1;

const BANK_TRANSFER_OPTIONS = [
  {
    code: "boc",
    name: "Bank of Ceylon (BOC)",
    accountNumber: "000000000000",
  },
  {
    code: "peoples",
    name: "People's Bank",
    accountNumber: "111111111111",
  },
];

const DEFAULT_DONATION_ITEM = {
  inventoryItemId: "",
  category: "",
  itemName: "",
  packageSize: "",
  unit: "",
  quantity: "",
};

function getTodayDateLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatInventoryLabel(item) {
  const packageSize = String(item?.packageSize || "").trim();
  const unit = String(item?.unit || "").trim();
  const labelParts = [packageSize, unit].filter(Boolean);
  return labelParts.length ? `${item.name} (${labelParts.join(" ")})` : item.name;
}

export default function NGODonationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const requestId = searchParams.get("requestId");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [currentNgo, setCurrentNgo] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [linkedRequest, setLinkedRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  
  const [form, setForm] = useState({
    donationType: "inventory",
    organizationName: "",
    email: "",
    phone: "",
    amount: "",
    selectedBank: "",
    items: [{ ...DEFAULT_DONATION_ITEM }],
    expectedDeliveryDate: "",
    notes: "",
  });

  const [errors, setErrors] = useState({
    amount: "",
    selectedBank: "",
    items: {},
    expectedDeliveryDate: "",
  });

  useEffect(() => {
    let active = true;

    async function loadCurrentNgo() {
      try {
        const partners = await fetchPartners({ status: "active" });
        if (!active) return;

        const partner = Array.isArray(partners) && partners.length ? partners[0] : null;
        const ngoDetails = {
          organizationName: partner?.organizationName || user?.organizationName || user?.fullName || "",
          email: partner?.email || user?.email || "",
          phone: partner?.phone || user?.phone || "",
          contactPerson: partner?.contactPerson || user?.fullName || "",
        };

        setCurrentNgo(ngoDetails);
        setForm((prev) => ({
          ...prev,
          organizationName: ngoDetails.organizationName,
          email: ngoDetails.email,
          phone: ngoDetails.phone,
        }));
      } catch {
        if (!active) return;

        const fallbackNgo = {
          organizationName: user?.organizationName || user?.fullName || "",
          email: user?.email || "",
          phone: user?.phone || "",
          contactPerson: user?.fullName || "",
        };

        setCurrentNgo(fallbackNgo);
        setForm((prev) => ({
          ...prev,
          organizationName: fallbackNgo.organizationName,
          email: fallbackNgo.email,
          phone: fallbackNgo.phone,
        }));
      }
    }

    if (isAuthenticated && user?.role === "ngo_partner") {
      loadCurrentNgo();
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  // Load inventory items on mount
  useEffect(() => {
    let active = true;

    async function loadInventoryItems() {
      try {
        setCatalogLoading(true);
        const items = await fetchInventoryItems();

        if (!active) return;

        const normalized = Array.isArray(items)
          ? items
              .filter((item) => item?.id && item?.name && item?.category && item?.isSelectable !== false)
              .map((item) => {
                const rawStock = item?.stock ?? item?.quantityAvailable ?? item?.quantity ?? 0;
                const parsedStock = Number(rawStock) || 0;
                return {
                  id: String(item.id),
                  name: String(item.name),
                  category: String(item.category),
                  packageSize: String(item.packageSize || ""),
                  unit: String(item.unit || "units"),
                  isSelectable: item?.isSelectable !== false,
                  stock: parsedStock,
                };
              })
          : [];

        setInventoryItems(normalized);
      } catch {
        if (!active) return;
        setInventoryItems([]);
      } finally {
        if (active) setCatalogLoading(false);
      }
    }

    loadInventoryItems();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRequest() {
      if (!requestId) {
        setLinkedRequest(null);
        return;
      }

      try {
        setRequestLoading(true);
        const request = await fetchResourceRequestById(requestId);

        if (!active) return;

        setLinkedRequest(request || null);

        if (request?.ngoPartner) {
          setForm((prev) => ({
            ...prev,
            organizationName: request.ngoPartner.organizationName || prev.organizationName,
            email: request.ngoPartner.email || prev.email,
            phone: request.ngoPartner.phone || prev.phone,
            donationType: request.requestType === "monetary" ? "monetary" : "inventory",
            amount:
              request.requestType === "monetary" ? String(Number(request.amount || 0)) : prev.amount,
            items:
              request.requestType === "inventory" && Array.isArray(request.items) && request.items.length
                ? request.items.map((item) => ({
                    inventoryItemId: item.resourceId || item.inventoryItemId || "",
                    category: item.category || "",
                    itemName: item.itemName || "",
                    unit: item.unit || "units",
                    quantity: String(item.quantity || ""),
                  }))
                : prev.items,
            notes: request.problemNote
              ? `Responding to resource request: ${request.problemNote}`
              : prev.notes,
          }));
        }
      } catch (requestError) {
        if (active) {
          setLinkedRequest(null);
          // Don't show "Linked NGO partner profile not found" error
          // Allow user to proceed with donation form anyway
          console.log("Resource request loading error:", requestError.message);
        }
      } finally {
        if (active) setRequestLoading(false);
      }
    }

    loadRequest();
    return () => {
      active = false;
    };
  }, [requestId]);

  const categoryOptions = useMemo(() => {
    return [...new Set(inventoryItems.filter((item) => item.isSelectable !== false).map((item) => item.category))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [inventoryItems]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  }

  function updateItemField(index, field, value) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: value,
      };
      return { ...prev, items };
    });

    setErrors((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [index]: "",
      },
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_DONATION_ITEM }],
    }));
  }

  function removeItem(index) {
    if (form.items.length === 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function validateForm() {
    const newErrors = { amount: "", selectedBank: "", items: {}, expectedDeliveryDate: "" };

    if (form.donationType === "monetary") {
      if (!form.selectedBank) {
        newErrors.selectedBank = "Please select a bank for the transfer.";
      }
      const amount = Number(form.amount);
      if (!form.amount) {
        newErrors.amount = "Amount is required.";
      } else if (amount <= 0) {
        newErrors.amount = "Please enter an amount greater than 0.";
      } else if (amount < MIN_MONETARY_AMOUNT) {
        newErrors.amount = `Minimum donation amount is LKR ${MIN_MONETARY_AMOUNT.toLocaleString()}.`;
      }
    }

    if (form.donationType === "inventory") {
      for (let i = 0; i < form.items.length; i++) {
        const item = form.items[i];
        if (!item.inventoryItemId) {
          newErrors.items[i] = "Please select an item.";
        } else {
          const qty = Number(item.quantity);
          if (!item.quantity || qty < MIN_ITEM_QUANTITY) {
            newErrors.items[i] = `Quantity must be at least ${MIN_ITEM_QUANTITY}.`;
          }
        }
      }
    }

    if (form.expectedDeliveryDate && new Date(form.expectedDeliveryDate) < new Date(getTodayDateLocal())) {
      newErrors.expectedDeliveryDate = "Expected delivery date cannot be in the past.";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((err) => err === "" || Object.keys(err).length === 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const payload = {
        donationType: form.donationType,
        ...(requestId && { sourceResourceRequestId: requestId }),
        ...(form.donationType === "monetary" && { selectedBank: form.selectedBank }),
        ...(form.donationType === "monetary" && { amount: Number(form.amount) }),
        ...(form.donationType === "inventory" && {
          items: form.items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: Number(item.quantity),
            unit: item.unit || "units",
          })),
        }),
        ...(form.expectedDeliveryDate && { expectedDeliveryDate: form.expectedDeliveryDate }),
        ...(form.notes && { notes: form.notes }),
      };

      const donation = await createNGODonation(payload);

      setSuccess({
        id: donation?.id,
        message: "Thank you! Your donation has been submitted successfully and is pending verification.",
      });

      setForm({
        donationType: "inventory",
        organizationName: currentNgo?.organizationName || "",
        email: currentNgo?.email || "",
        phone: currentNgo?.phone || "",
        amount: "",
        selectedBank: "",
        items: [{ ...DEFAULT_DONATION_ITEM }],
        expectedDeliveryDate: "",
        notes: "",
      });

      setTimeout(() => {
        navigate("/ngo-inbox");
      }, 3000);
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated || user?.role !== "ngo_partner") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">Only NGO partners can submit donations.</p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 text-slate-900">
      <PageHeader title="Submit Donation" subtitle="View available resources and submit your donation" />
      
      <div className="max-w-6xl mx-auto mt-8 grid gap-8 lg:grid-cols-3">
        {/* Inventory Catalog */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Warehouse className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">System Inventory</h2>
            </div>

            {catalogLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No inventory items available</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-slate-50">
                        <td className="py-3 text-slate-700">{item.category}</td>
                        <td className="py-3 font-medium text-slate-900">{formatInventoryLabel(item)}</td>
                        <td className="py-3 text-slate-700">{item.packageSize || item.unit || "units"}</td>
                        <td className="py-3 text-slate-700">{Number(item.stock || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Donation Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            {requestId && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-blue-900 font-semibold">
                  <Package className="w-4 h-4" /> Linked Resource Request
                </div>
                {requestLoading ? (
                  <p className="mt-2 text-sm text-blue-800">Loading request details...</p>
                ) : linkedRequest ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-medium">Warehouse:</span> {linkedRequest.deliveryWarehouse || "-"}</p>
                    <p><span className="font-medium">Status:</span> {linkedRequest.status || "-"}</p>
                    <p><span className="font-medium">Problem:</span> {linkedRequest.problemNote || "-"}</p>
                    {Array.isArray(linkedRequest.items) && linkedRequest.items.length > 0 && (
                      <p><span className="font-medium">Requested Items:</span> {linkedRequest.items.map((item) => `${item.itemName} x ${item.quantity}`).join(", ")}</p>
                    )}
                    {linkedRequest.amount ? (
                      <p><span className="font-medium">Requested Amount:</span> LKR {Number(linkedRequest.amount).toLocaleString()}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-rose-700">Unable to load the linked request.</p>
                )}
              </div>
            )}

            {success ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Donation Submitted</h2>
                <p className="text-slate-600 mb-2">{success.message}</p>
                {success.id && <p className="text-sm text-slate-500">Reference ID: {success.id}</p>}
                <p className="text-sm text-slate-500 mt-4">Redirecting to NGO inbox...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {/* Donation Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Donation Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["inventory", "monetary"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField("donationType", type)}
                        className={`p-4 rounded-lg border-2 transition text-center font-medium ${
                          form.donationType === type
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <Heart className="w-5 h-5 mx-auto mb-2" />
                        {type === "inventory" ? "Resources" : "Monetary"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current NGO Details */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">Current NGO Details</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Organization</p>
                      <p className="mt-1 font-medium text-slate-900">{currentNgo?.organizationName || form.organizationName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                      <p className="mt-1 font-medium text-slate-900">{currentNgo?.email || form.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                      <p className="mt-1 font-medium text-slate-900">{currentNgo?.phone || form.phone || currentNgo?.contactPerson || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expected Delivery Date</label>
                    <input type="date" value={form.expectedDeliveryDate} onChange={(e) => updateField("expectedDeliveryDate", e.target.value)} min={getTodayDateLocal()} className={`w-full px-4 py-2 rounded-lg border transition ${errors.expectedDeliveryDate ? "border-red-500" : "border-slate-300 focus:border-blue-500"} focus:outline-none`} />
                    {errors.expectedDeliveryDate && <p className="mt-1 text-sm text-red-600">{errors.expectedDeliveryDate}</p>}
                  </div>
                </div>

                {form.donationType === "inventory" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Donation Items *</label>
                    <div className="space-y-3">
                      {form.items.map((item, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-2">Category</label>
                              <select value={item.category} onChange={(e) => updateItemField(index, "category", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none">
                                <option value="">Select category</option>
                                {categoryOptions.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-2">Item</label>
                              <select value={item.inventoryItemId} onChange={(e) => { const sid = e.target.value; const si = inventoryItems.find((i) => i.id === sid); updateItemField(index, "inventoryItemId", sid); if (si) { updateItemField(index, "itemName", si.name); updateItemField(index, "packageSize", si.packageSize || ""); updateItemField(index, "unit", si.unit || "units"); }}} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none">
                                <option value="">Select item</option>
                                {inventoryItems.filter((i) => i.isSelectable !== false).filter((i) => !item.category || i.category === item.category).map((invItem) => (<option key={invItem.id} value={invItem.id}>{formatInventoryLabel(invItem)}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-2">Quantity</label>
                              <input type="number" min="1" value={item.quantity} onChange={(e) => updateItemField(index, "quantity", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none" placeholder="0" />
                            </div>
                          </div>
                          {errors.items[index] && <p className="text-sm text-red-600">{errors.items[index]}</p>}
                          {form.items.length > 1 && (<button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600 hover:text-red-700 font-medium">Remove Item</button>)}
                        </div>
                      ))}
                      <button type="button" onClick={addItem} className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition font-medium">+ Add Another Item</button>
                    </div>
                  </div>
                )}

                {form.donationType === "monetary" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Select Bank for Transfer *</label>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-4">
                      <p className="text-sm text-blue-800 font-semibold">Click a bank below to select it for your money transfer:</p>
                      {BANK_TRANSFER_OPTIONS.map((bank) => (
                        <div
                          key={bank.code}
                          onClick={() => updateField("selectedBank", bank.code)}
                          className={`rounded-xl border-2 bg-white p-4 space-y-2 cursor-pointer transition ${form.selectedBank === bank.code ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          <div className="flex items-center gap-2">
                            <input type="radio" checked={form.selectedBank === bank.code} readOnly className="accent-blue-600" />
                            <p className="text-sm font-bold text-slate-900">🏦 {bank.name}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm ml-6">
                            <div>
                              <span className="text-xs uppercase tracking-wide text-slate-500">Account Number</span>
                              <p className="font-mono font-semibold text-slate-800">{bank.accountNumber}</p>
                            </div>
                            <div>
                              <span className="text-xs uppercase tracking-wide text-slate-500">Beneficiary Name</span>
                              <p className="font-semibold text-slate-800">{currentNgo?.organizationName || form.organizationName || "\u2014"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.selectedBank && <p className="mt-1 text-sm text-red-600">{errors.selectedBank}</p>}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Transfer Amount (LKR) *</label>
                      <input type="number" min={MIN_MONETARY_AMOUNT} value={form.amount} onChange={(e) => updateField("amount", e.target.value)} className={`w-full px-4 py-2 rounded-lg border transition ${errors.amount ? "border-red-500" : "border-slate-300 focus:border-blue-500"} focus:outline-none`} placeholder="Enter amount (min 1,000)" />
                      {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                      <p className="mt-1 text-xs text-slate-500">Minimum donation: LKR {MIN_MONETARY_AMOUNT.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
                  <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none transition resize-none" placeholder="Any special instructions or details..." rows="4" />
                </div>

                <button type="submit" disabled={submitting} className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                  {submitting ? (<><Loader className="w-4 h-4 animate-spin" /> Submitting...</>) : (<><Heart className="w-4 h-4" /> Submit Donation</>)}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
