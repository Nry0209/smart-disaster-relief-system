import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle, HandCoins, Heart, Package, UserRound } from "lucide-react";
import { createPublicDonation } from "../services/workflowService";
import "./Pages.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;
const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 50;

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

export default function PublicDonationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
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

  function validateStep(step) {
    const donorName = form.donorName.trim();
    const organizationName = form.organizationName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const itemType = form.itemType.trim();
    const quantity = Number(form.quantity);
    const amount = Number(form.amount);
    const expectedDeliveryDate = form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate) : null;

    if (step === 1) {
      if (!donorName) {
        return "Donor name is required.";
      }

      if (donorName.length < MIN_TEXT_LENGTH || donorName.length > MAX_TEXT_LENGTH) {
        return `Donor name must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
      }

      if (form.donorType === "organization" && !organizationName) {
        return "Organization name is required for organization donations.";
      }

      if (form.donorType === "organization" && (organizationName.length < MIN_TEXT_LENGTH || organizationName.length > MAX_TEXT_LENGTH)) {
        return `Organization name must be between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters.`;
      }

      if (email && !EMAIL_PATTERN.test(email)) {
        return "Enter a valid email address.";
      }

      const phoneError = validatePhone(phone);
      if (phoneError) {
        return phoneError;
      }
    }

    if (step === 2) {
      if (form.donationType === "inventory" && (!itemType || itemType.length < MIN_TEXT_LENGTH || itemType.length > MAX_TEXT_LENGTH || !Number.isInteger(quantity) || quantity < 0)) {
        return "For inventory donations, item type and a valid quantity are required. Invalid count values are not allowed.";
      }

      if (form.donationType === "inventory" && quantity === 0) {
        return "For inventory donations, quantity must be greater than zero.";
      }

      if (form.donationType === "inventory" && form.category.trim().length > MAX_CATEGORY_LENGTH) {
        return `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters.`;
      }

      if (form.donationType === "monetary" && (!Number.isFinite(amount) || amount <= 0)) {
        return "For monetary donations, a valid amount is required.";
      }

      if (form.donationType === "inventory" && form.expectedDeliveryDate) {
        if (!expectedDeliveryDate || Number.isNaN(expectedDeliveryDate.getTime())) {
          return "Expected delivery date must be valid.";
        }

        const today = new Date(getTodayDateLocal());
        if (expectedDeliveryDate.getTime() < today.getTime()) {
          return "Expected delivery date cannot be in the past.";
        }
      }
    }

    return "";
  }

  function handleNextStep() {
    const stepError = validateStep(currentStep);
    if (stepError) {
      setError(stepError);
      return;
    }

    setError("");
    setCurrentStep((prev) => Math.min(3, prev + 1));
  }

  function handlePrevStep() {
    setError("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const stepOneError = validateStep(1);
    const stepTwoError = validateStep(2);
    if (stepOneError || stepTwoError) {
      setError(stepOneError || stepTwoError);
      return;
    }

    const quantity = Number(form.quantity);
    const amount = Number(form.amount);
    const donorName = form.donorName.trim();
    const organizationName = form.organizationName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const itemType = form.itemType.trim();

    if (form.email && !EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    try {
      setSubmitting(true);
      const donation = await createPublicDonation({
        donorType: form.donorType,
        donationType: form.donationType,
        donorName,
        organizationName: form.donorType === "organization" ? organizationName : "",
        email,
        phone,
        amount: form.donationType === "monetary" ? amount : 0,
        itemType: form.donationType === "inventory" ? itemType : "",
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
      setCurrentStep(1);
    } catch (submitError) {
      setError(submitError.message || "Failed to submit donation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="public-donation-v2 min-h-screen px-6 py-7 text-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <section className="professional-form-shell rounded-3xl p-6">
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
          <div className="shared-stepper mt-4">
            <div className={`step-chip ${currentStep >= 1 ? "active" : ""}`}>
              <span>1</span>
              <p>Donor Profile</p>
            </div>
            <div className={`step-chip ${currentStep >= 2 ? "active" : ""}`}>
              <span>2</span>
              <p>Donation Details</p>
            </div>
            <div className={`step-chip ${currentStep >= 3 ? "active" : ""}`}>
              <span>3</span>
              <p>Review & Submit</p>
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

        <form onSubmit={handleSubmit} className="professional-form-shell mt-6 rounded-3xl p-6">
        {currentStep === 1 && (
          <>
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
            </div>

            <div className="public-donation-v2-body mt-6 grid gap-4 md:grid-cols-2">
              <label className="form-group">
                <span>{form.donorType === "organization" ? "Contact Person *" : "Donor Name *"}</span>
                <input
                  value={form.donorName}
                  onChange={(e) => updateField("donorName", e.target.value)}
                  required
                  minLength={MIN_TEXT_LENGTH}
                  maxLength={MAX_TEXT_LENGTH}
                />
              </label>

              {form.donorType === "organization" && (
                <label className="form-group">
                  <span>Organization Name *</span>
                  <input
                    value={form.organizationName}
                    onChange={(e) => updateField("organizationName", e.target.value)}
                    required
                    minLength={MIN_TEXT_LENGTH}
                    maxLength={MAX_TEXT_LENGTH}
                  />
                </label>
              )}

              <label className="form-group">
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} autoComplete="email" />
              </label>

              <label className="form-group">
                <span>Phone</span>
                <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} type="tel" inputMode="tel" placeholder="+94..." />
              </label>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="public-donation-v2-selectors">
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
                      minLength={MIN_TEXT_LENGTH}
                      maxLength={MAX_TEXT_LENGTH}
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
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(e) => updateField("quantity", e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-group">
                    <span>Expected Delivery Date</span>
                    <input
                      type="date"
                      min={getTodayDateLocal()}
                      value={form.expectedDeliveryDate}
                      onChange={(e) => updateField("expectedDeliveryDate", e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Review your donation</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Donor:</strong> {form.donorName || "-"}</p>
              <p><strong>Donor Type:</strong> {form.donorType}</p>
              {form.donorType === "organization" && <p><strong>Organization:</strong> {form.organizationName || "-"}</p>}
              <p><strong>Email:</strong> {form.email || "-"}</p>
              <p><strong>Phone:</strong> {form.phone || "-"}</p>
              <p><strong>Donation Type:</strong> {form.donationType}</p>
              {form.donationType === "monetary" ? (
                <p><strong>Amount:</strong> {form.amount ? `LKR ${form.amount}` : "-"}</p>
              ) : (
                <>
                  <p><strong>Item Type:</strong> {form.itemType || "-"}</p>
                  <p><strong>Category:</strong> {form.category || "-"}</p>
                  <p><strong>Quantity:</strong> {form.quantity || "-"}</p>
                  <p><strong>Expected Delivery:</strong> {form.expectedDeliveryDate || "-"}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {currentStep > 1 && (
            <button type="button" className="btn-secondary" onClick={handlePrevStep}>
              Back
            </button>
          )}

          {currentStep < 3 ? (
            <button type="button" className="btn-primary" onClick={handleNextStep}>
              Next Step
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Donation"}
            </button>
          )}
        </div>
        </form>
      </div>
    </div>
  );
}
