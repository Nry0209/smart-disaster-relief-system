import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import "./Pages.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;

const DEFAULT_FORM = {
  organizationName: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  registrationNumber: "",
  preferredCategoriesText: "",
  status: "active",
  organizationProfileDocument: "",
  registrationCertificate: "",
  verificationDocument: "",
};

async function requestJson(url, options = {}, fallbackMessage = "Request failed.") {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem("token");
  const headers = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function mapPartnerToForm(partner) {
  return {
    organizationName: partner?.organizationName || "",
    contactPerson: partner?.contactPerson || "",
    email: partner?.email || "",
    phone: partner?.phone || "",
    address: partner?.address || "",
    registrationNumber: partner?.registrationNumber || "",
    preferredCategoriesText: Array.isArray(partner?.preferredCategories) ? partner.preferredCategories.join(", ") : "",
    status: partner?.status || "active",
    organizationProfileDocument: partner?.organizationProfileDocument || "",
    registrationCertificate: partner?.registrationCertificate || "",
    verificationDocument: partner?.verificationDocument || "",
  };
}

export default function PartnerFormPage({ mode = "create" }) {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const isEdit = mode === "edit";

  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(Boolean(isEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getInputClass = (field) =>
    `w-full px-4 py-2 rounded-lg border transition focus:outline-none ${
      fieldErrors[field]
        ? "border-rose-300 bg-rose-50 focus:border-rose-400"
        : "border-slate-300 focus:border-blue-500"
    }`;

  useEffect(() => {
    const loadPartner = async () => {
      if (!isEdit) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await requestJson(
          `${API_BASE_URL}/api/partners/${partnerId}`,
          { headers: getAuthHeaders(false) },
          "Failed to fetch partner."
        );

        const partner = data?.data?.partner || data?.partner || data;
        if (!partner) {
          throw new Error("Partner not found.");
        }

        setForm(mapPartnerToForm(partner));
      } catch (loadError) {
        setError(loadError.message || "Failed to load partner.");
      } finally {
        setLoading(false);
      }
    };

    loadPartner();
  }, [isEdit, partnerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const organizationName = String(form.organizationName || "").trim();
    const contactPerson = String(form.contactPerson || "").trim();
    const email = String(form.email || "").trim().toLowerCase();
    const phone = String(form.phone || "").trim().replace(/\s+/g, "");
    const address = String(form.address || "").trim();
    const registrationNumber = String(form.registrationNumber || "").trim();
    const preferredCategories = String(form.preferredCategoriesText || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const nextFieldErrors = {};

    if (!organizationName) {
      nextFieldErrors.organizationName = "Organization name is required.";
    }

    if (!contactPerson) {
      nextFieldErrors.contactPerson = "Contact person is required.";
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
      nextFieldErrors.email = "Enter a valid email address.";
    }

    if (!phone) {
      nextFieldErrors.phone = "Phone number is required.";
    } else if (!PHONE_PATTERN.test(phone)) {
      nextFieldErrors.phone = "Phone number must start with 0 and contain exactly 10 digits.";
    }

    if (!address) {
      nextFieldErrors.address = "Address is required.";
    }

    if (!registrationNumber) {
      nextFieldErrors.registrationNumber = "Registration number is required.";
    }

    if (!String(form.preferredCategoriesText || "").trim()) {
      nextFieldErrors.preferredCategoriesText = "Preferred categories are required.";
    }

    if (!String(form.organizationProfileDocument || "").trim()) {
      nextFieldErrors.organizationProfileDocument = "Organization profile document is required.";
    }

    if (!String(form.registrationCertificate || "").trim()) {
      nextFieldErrors.registrationCertificate = "Registration certificate is required.";
    }

    if (!String(form.verificationDocument || "").trim()) {
      nextFieldErrors.verificationDocument = "Verification document is required.";
    }

    if (!form.status) {
      nextFieldErrors.status = "Status is required.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    const payload = {
      organizationName,
      contactPerson,
      email,
      phone,
      address,
      registrationNumber,
      preferredCategories,
      status: form.status || "active",
      organizationProfileDocument: String(form.organizationProfileDocument || "").trim(),
      registrationCertificate: String(form.registrationCertificate || "").trim(),
      verificationDocument: String(form.verificationDocument || "").trim(),
    };

    setSaving(true);
    try {
      await requestJson(
        isEdit ? `${API_BASE_URL}/api/partners/${partnerId}` : `${API_BASE_URL}/api/partners`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        },
        isEdit ? "Failed to update partner." : "Failed to create partner."
      );

      navigate("/users", { replace: true });
    } catch (saveError) {
      setError(saveError.message || "Failed to save partner.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-page">
      <PageHeader
        role="Partner Management"
        title={isEdit ? "Edit NGO Partner" : "Add New NGO Partner"}
        description="Create and update partner records on a dedicated page."
      />

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        {loading ? (
          <p className="text-sm text-slate-500">Loading partner form...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="inventory-inline-alert error">{error}</div>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label>Organization Name</label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                  className={getInputClass("organizationName")}
                  placeholder="Enter organization name"
                />
                {fieldErrors.organizationName && <p className="mt-1 text-xs text-rose-600">{fieldErrors.organizationName}</p>}
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
                  className={getInputClass("contactPerson")}
                  placeholder="Enter contact person"
                />
                {fieldErrors.contactPerson && <p className="mt-1 text-xs text-rose-600">{fieldErrors.contactPerson}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className={getInputClass("email")}
                  placeholder="Enter email address"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className={getInputClass("phone")}
                  maxLength={10}
                  placeholder="Enter phone number"
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>}
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className={getInputClass("address")}
                placeholder="Enter complete address"
              />
              {fieldErrors.address && <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, registrationNumber: event.target.value }))}
                  className={getInputClass("registrationNumber")}
                  placeholder="Registration number"
                />
                {fieldErrors.registrationNumber && <p className="mt-1 text-xs text-rose-600">{fieldErrors.registrationNumber}</p>}
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className={getInputClass("status")} value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {fieldErrors.status && <p className="mt-1 text-xs text-rose-600">{fieldErrors.status}</p>}
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Categories</label>
              <input
                type="text"
                value={form.preferredCategoriesText}
                onChange={(event) => setForm((prev) => ({ ...prev, preferredCategoriesText: event.target.value }))}
                className={getInputClass("preferredCategoriesText")}
                placeholder="Comma-separated categories"
              />
              {fieldErrors.preferredCategoriesText && <p className="mt-1 text-xs text-rose-600">{fieldErrors.preferredCategoriesText}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="form-group">
                <label>Organization Profile Document</label>
                <input
                  type="text"
                  value={form.organizationProfileDocument}
                  onChange={(event) => setForm((prev) => ({ ...prev, organizationProfileDocument: event.target.value }))}
                  className={getInputClass("organizationProfileDocument")}
                  placeholder="Document path or URL"
                />
                {fieldErrors.organizationProfileDocument && <p className="mt-1 text-xs text-rose-600">{fieldErrors.organizationProfileDocument}</p>}
              </div>
              <div className="form-group">
                <label>Registration Certificate</label>
                <input
                  type="text"
                  value={form.registrationCertificate}
                  onChange={(event) => setForm((prev) => ({ ...prev, registrationCertificate: event.target.value }))}
                  className={getInputClass("registrationCertificate")}
                  placeholder="Document path or URL"
                />
                {fieldErrors.registrationCertificate && <p className="mt-1 text-xs text-rose-600">{fieldErrors.registrationCertificate}</p>}
              </div>
              <div className="form-group">
                <label>Verification Document</label>
                <input
                  type="text"
                  value={form.verificationDocument}
                  onChange={(event) => setForm((prev) => ({ ...prev, verificationDocument: event.target.value }))}
                  className={getInputClass("verificationDocument")}
                  placeholder="Document path or URL"
                />
                {fieldErrors.verificationDocument && <p className="mt-1 text-xs text-rose-600">{fieldErrors.verificationDocument}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="action-btn export" onClick={() => navigate("/users", { replace: true })} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="action-btn add" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update Partner" : "Create Partner"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
