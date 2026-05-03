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

function getDocumentLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.split('/').pop();
  }
  return value.name || '';
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

function validatePartnerField(field, value) {
  const textValue = String(value || "").trim();

  switch (field) {
    case "organizationName":
      if (!textValue) return "Organization name is required.";
      if (textValue.length < 2) return "Organization name must be at least 2 characters.";
      if (textValue.length > 100) return "Organization name cannot exceed 100 characters.";
      return "";
    case "contactPerson":
      if (!textValue) return "Contact person is required.";
      if (textValue.length < 2) return "Contact person must be at least 2 characters.";
      if (textValue.length > 100) return "Contact person cannot exceed 100 characters.";
      return "";
    case "email":
      if (!textValue || !EMAIL_PATTERN.test(textValue.toLowerCase())) return "Enter a valid email address.";
      return "";
    case "phone":
      if (!textValue) return "Phone number is required.";
      if (!PHONE_PATTERN.test(textValue.replace(/\s+/g, ""))) {
        return "Phone number must start with 0 and contain exactly 10 digits.";
      }
      return "";
    case "address":
      if (!textValue) return "Address is required.";
      if (textValue.length < 10) return "Address must be at least 10 characters.";
      if (textValue.length > 200) return "Address cannot exceed 200 characters.";
      return "";
    case "registrationNumber":
      return textValue ? "" : "Registration number is required.";
    case "preferredCategoriesText":
      return textValue ? "" : "Preferred categories are required.";
    case "organizationProfileDocument":
      return textValue ? "" : "Organization profile document is required.";
    case "registrationCertificate":
      return textValue ? "" : "Registration certificate is required.";
    case "verificationDocument":
      return textValue ? "" : "Verification document is required.";
    case "status":
      return textValue ? "" : "Status is required.";
    default:
      return "";
  }
}

function validatePartnerForm(form) {
  const nextErrors = {};

  [
    "organizationName",
    "contactPerson",
    "email",
    "phone",
    "address",
    "registrationNumber",
    "preferredCategoriesText",
    "organizationProfileDocument",
    "registrationCertificate",
    "verificationDocument",
    "status",
  ].forEach((field) => {
    const fieldError = validatePartnerField(field, form[field]);
    if (fieldError) {
      nextErrors[field] = fieldError;
    }
  });

  return nextErrors;
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
    const nextFieldErrors = validatePartnerForm({
      ...form,
      organizationName,
      contactPerson,
      email,
      phone,
      address,
      registrationNumber,
      preferredCategoriesText: String(form.preferredCategoriesText || "").trim(),
    });

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    const payload = new FormData();
    payload.append("organizationName", organizationName);
    payload.append("contactPerson", contactPerson);
    payload.append("email", email);
    payload.append("phone", phone);
    payload.append("address", address);
    payload.append("registrationNumber", registrationNumber);
    payload.append("preferredCategories", JSON.stringify(preferredCategories));
    payload.append("status", form.status || "active");

    if (form.organizationProfileDocument) {
      payload.append("organizationProfileDocument", form.organizationProfileDocument);
    }

    if (form.registrationCertificate) {
      payload.append("registrationCertificate", form.registrationCertificate);
    }

    if (form.verificationDocument) {
      payload.append("verificationDocument", form.verificationDocument);
    }

    setSaving(true);
    try {
      await requestJson(
        isEdit ? `${API_BASE_URL}/api/partners/${partnerId}` : `${API_BASE_URL}/api/partners`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: getAuthHeaders(false),
          body: payload,
        },
        isEdit ? "Failed to update partner." : "Failed to create partner."
      );

      navigate("/users", {
        replace: true,
        state: { 
          message: isEdit ? "NGO updated successfully" : "NGO created, OTP sent",
          type: "success"
        }
      });
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
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, organizationName: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, organizationName: validatePartnerField("organizationName", nextValue) }));
                  }}
                  onBlur={(event) => {
                    setFieldErrors((prev) => ({ ...prev, organizationName: validatePartnerField("organizationName", event.target.value) }));
                  }}
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
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, contactPerson: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, contactPerson: validatePartnerField("contactPerson", nextValue) }));
                  }}
                  onBlur={(event) => {
                    setFieldErrors((prev) => ({ ...prev, contactPerson: validatePartnerField("contactPerson", event.target.value) }));
                  }}
                  className={getInputClass("contactPerson")}
                  placeholder="Enter contact person"
                />
                {fieldErrors.contactPerson && <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPerson}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, email: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, email: validatePartnerField("email", nextValue) }));
                  }}
                  onBlur={(event) => {
                    setFieldErrors((prev) => ({ ...prev, email: validatePartnerField("email", event.target.value) }));
                  }}
                  className={getInputClass("email")}
                  placeholder="Enter email address"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, phone: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, phone: validatePartnerField("phone", nextValue) }));
                  }}
                  onBlur={(event) => {
                    setFieldErrors((prev) => ({ ...prev, phone: validatePartnerField("phone", event.target.value) }));
                  }}
                  className={getInputClass("phone")}
                  maxLength={10}
                  placeholder="Enter phone number"
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setForm((prev) => ({ ...prev, address: nextValue }));
                  setFieldErrors((prev) => ({ ...prev, address: validatePartnerField("address", nextValue) }));
                }}
                onBlur={(event) => {
                  setFieldErrors((prev) => ({ ...prev, address: validatePartnerField("address", event.target.value) }));
                }}
                className={getInputClass("address")}
                placeholder="Enter complete address"
              />
              {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, registrationNumber: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, registrationNumber: validatePartnerField("registrationNumber", nextValue) }));
                  }}
                  onBlur={(event) => {
                    setFieldErrors((prev) => ({ ...prev, registrationNumber: validatePartnerField("registrationNumber", event.target.value) }));
                  }}
                  className={getInputClass("registrationNumber")}
                  placeholder="Registration number"
                />
                {fieldErrors.registrationNumber && <p className="mt-1 text-xs text-red-600">{fieldErrors.registrationNumber}</p>}
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  className={getInputClass("status")}
                  value={form.status}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((prev) => ({ ...prev, status: nextValue }));
                    setFieldErrors((prev) => ({ ...prev, status: validatePartnerField("status", nextValue) }));
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status}</p>}
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Categories</label>
              <input
                type="text"
                value={form.preferredCategoriesText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setForm((prev) => ({ ...prev, preferredCategoriesText: nextValue }));
                  setFieldErrors((prev) => ({ ...prev, preferredCategoriesText: validatePartnerField("preferredCategoriesText", nextValue) }));
                }}
                onBlur={(event) => {
                  setFieldErrors((prev) => ({ ...prev, preferredCategoriesText: validatePartnerField("preferredCategoriesText", event.target.value) }));
                }}
                className={getInputClass("preferredCategoriesText")}
                placeholder="Comma-separated categories"
              />
              {fieldErrors.preferredCategoriesText && <p className="mt-1 text-xs text-red-600">{fieldErrors.preferredCategoriesText}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="form-group">
                <label>Organization Profile Document (PDF)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setForm((prev) => ({ ...prev, organizationProfileDocument: nextFile }));
                      setFieldErrors((prev) => ({ ...prev, organizationProfileDocument: validatePartnerField("organizationProfileDocument", nextFile) }));
                    }}
                    className={getInputClass("organizationProfileDocument")}
                  />
                  {form.organizationProfileDocument && (
                    <p className="text-xs text-slate-500">Selected: {getDocumentLabel(form.organizationProfileDocument)}</p>
                  )}
                </div>
                {fieldErrors.organizationProfileDocument && <p className="mt-1 text-xs text-red-600">{fieldErrors.organizationProfileDocument}</p>}
              </div>
              <div className="form-group">
                <label>Registration Certificate (PDF)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setForm((prev) => ({ ...prev, registrationCertificate: nextFile }));
                      setFieldErrors((prev) => ({ ...prev, registrationCertificate: validatePartnerField("registrationCertificate", nextFile) }));
                    }}
                    className={getInputClass("registrationCertificate")}
                  />
                  {form.registrationCertificate && (
                    <p className="text-xs text-slate-500">Selected: {getDocumentLabel(form.registrationCertificate)}</p>
                  )}
                </div>
                {fieldErrors.registrationCertificate && <p className="mt-1 text-xs text-red-600">{fieldErrors.registrationCertificate}</p>}
              </div>
              <div className="form-group">
                <label>Verification Document (PDF)</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setForm((prev) => ({ ...prev, verificationDocument: nextFile }));
                      setFieldErrors((prev) => ({ ...prev, verificationDocument: validatePartnerField("verificationDocument", nextFile) }));
                    }}
                    className={getInputClass("verificationDocument")}
                  />
                  {form.verificationDocument && (
                    <p className="text-xs text-slate-500">Selected: {getDocumentLabel(form.verificationDocument)}</p>
                  )}
                </div>
                {fieldErrors.verificationDocument && <p className="mt-1 text-xs text-red-600">{fieldErrors.verificationDocument}</p>}
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
