import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle, HandCoins, Heart, Package, UserRound } from "lucide-react";
import { createPublicDonation } from "../services/workflowService";
import "./Pages.css";

export default function PublicDonationPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    donorType: "individual",
    donationType: "inventory",
    donorName: "",
    organizationName: "",
    email: "",
    phone: "",
    amount: "",
    itemType: "",
    category: "",
    quantity: "",
    expectedDeliveryDate: "",
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);
    const amount = Number(form.amount);
    const donorName = form.donorName.trim();
    const organizationName = form.organizationName.trim();

    if (!donorName) {
      setError("Donor name is required.");
      return;
    }

    if (form.donorType === "organization" && !organizationName) {
      setError("Organization name is required for organization donations.");
      return;
    }

    if (form.donationType === "inventory" && (!form.itemType.trim() || !Number.isFinite(quantity) || quantity <= 0)) {
      setError("For inventory donations, item type and a valid quantity are required.");
      return;
    }

    if (form.donationType === "monetary" && (!Number.isFinite(amount) || amount <= 0)) {
      setError("For monetary donations, a valid amount is required.");
      return;
    }

    try {
      setSubmitting(true);
      const donation = await createPublicDonation({
        donorType: form.donorType,
        donationType: form.donationType,
        donorName,
        organizationName: form.donorType === "organization" ? organizationName : "",
        email: form.email.trim(),
        phone: form.phone.trim(),
        amount: form.donationType === "monetary" ? amount : 0,
        itemType: form.donationType === "inventory" ? form.itemType.trim() : "",
        category: form.donationType === "inventory" ? form.category.trim() : "",
        quantity: form.donationType === "inventory" ? quantity : 0,
        expectedDeliveryDate: form.donationType === "inventory" ? form.expectedDeliveryDate || null : null,
      });

      setSuccess(donation);
      setForm({
        donorType: "individual",
        donationType: "inventory",
        donorName: "",
        organizationName: "",
        email: "",
        phone: "",
        amount: "",
        itemType: "",
        category: "",
        quantity: "",
        expectedDeliveryDate: "",
      });
    } catch (submitError) {
      setError(submitError.message || "Failed to submit donation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="public-donation-v2 min-h-screen px-6 py-7 text-slate-900">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600" onClick={() => navigate("/")}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <Heart size={20} className="text-rose-600" />
          <h1 className="text-2xl font-bold">Public Donation Form</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Public donations are collected here and held for validation by inventory officers before use.
        </p>
        <div className="public-donation-v2-progress mt-4">
          <div className="progress-step active">
            <span>1</span>
            <p>Donor & Donation Type</p>
          </div>
          <div className="progress-step active">
            <span>2</span>
            <p>Donation Details</p>
          </div>
          <div className="progress-step active">
            <span>3</span>
            <p>Submit for Verification</p>
          </div>
        </div>
      </section>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle size={18} /> Donation submitted
          </div>
          <p className="mt-1">Reference: {success._id}</p>
          <p>Status: pending_verification</p>
          <p>Type: {success.donationType}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="public-donation-v2-selectors">
          <div>
            <h2>Who are you donating as?</h2>
            <div className="selector-grid mt-3">
              <button
                type="button"
                className={`selector-card ${form.donorType === "individual" ? "selected" : ""}`}
                onClick={() => updateField("donorType", "individual")}
              >
                <UserRound size={18} />
                <div>
                  <strong>Individual</strong>
                  <p>Personal donation</p>
                </div>
              </button>
              <button
                type="button"
                className={`selector-card ${form.donorType === "organization" ? "selected" : ""}`}
                onClick={() => updateField("donorType", "organization")}
              >
                <Building2 size={18} />
                <div>
                  <strong>Organization</strong>
                  <p>Company or group donation</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h2>What are you donating?</h2>
            <div className="selector-grid mt-3">
              <button
                type="button"
                className={`selector-card ${form.donationType === "monetary" ? "selected" : ""}`}
                onClick={() => updateField("donationType", "monetary")}
              >
                <HandCoins size={18} />
                <div>
                  <strong>Monetary</strong>
                  <p>Cash contribution (LKR)</p>
                </div>
              </button>
              <button
                type="button"
                className={`selector-card ${form.donationType === "inventory" ? "selected" : ""}`}
                onClick={() => updateField("donationType", "inventory")}
              >
                <Package size={18} />
                <div>
                  <strong>Inventory Items</strong>
                  <p>Physical goods and supplies</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="public-donation-v2-body mt-6 grid gap-4 md:grid-cols-2">
          <label className="form-group">
            <span>{form.donorType === "organization" ? "Contact Person *" : "Donor Name *"}</span>
            <input value={form.donorName} onChange={(e) => updateField("donorName", e.target.value)} required />
          </label>

          {form.donorType === "organization" && (
            <label className="form-group">
              <span>Organization Name *</span>
              <input
                value={form.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
                required
              />
            </label>
          )}

          <label className="form-group">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          </label>

          <label className="form-group">
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
          </label>

          {form.donationType === "monetary" ? (
            <label className="form-group md:col-span-2">
              <span>Amount (LKR) *</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                placeholder="e.g., 5000"
                required
              />
            </label>
          ) : (
            <>
              <label className="form-group">
                <span>Item Type *</span>
                <input
                  value={form.itemType}
                  onChange={(e) => updateField("itemType", e.target.value)}
                  placeholder="e.g., Water Bottles"
                  required
                />
              </label>

              <label className="form-group">
                <span>Category</span>
                <input value={form.category} onChange={(e) => updateField("category", e.target.value)} />
              </label>

              <label className="form-group">
                <span>Quantity *</span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  required
                />
              </label>

              <label className="form-group">
                <span>Expected Delivery Date</span>
                <input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => updateField("expectedDeliveryDate", e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <button type="submit" className="btn-primary mt-4" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Donation"}
        </button>
      </form>
    </div>
  );
}
