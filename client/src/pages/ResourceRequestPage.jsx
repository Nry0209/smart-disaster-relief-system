import React, { useMemo, useState } from "react";
import {
  Package,
  Send,
  CheckCircle,
  Plus,
  Trash2,
  AlertTriangle,
  MapPin,
  Calendar,
  Building2,
} from "lucide-react";
import { createResourceRequest } from "../services/reliefApi";
import "./Pages.css";

const EMPTY_ITEM = { name: "", quantity: "", category: "water" };

export default function ResourceRequestPage() {
  const [formData, setFormData] = useState({
    organization: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    disasterType: "",
    urgency: "high",
    location: "",
    deliveryDate: "",
    deliveryAddress: "",
    items: [EMPTY_ITEM],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [error, setError] = useState("");

  const categories = useMemo(() => ["water", "food", "medical", "shelter", "clothing", "other"], []);
  const disasters = useMemo(() => ["Flood", "Earthquake", "Hurricane", "Wildfire", "Landslide", "Other"], []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((previous) => {
      const items = [...previous.items];
      items[index] = { ...items[index], [field]: value };
      return { ...previous, items };
    });
  };

  const addItem = () => {
    setFormData((previous) => ({ ...previous, items: [...previous.items, EMPTY_ITEM] }));
  };

  const removeItem = (index) => {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setSubmittedRequest(null);
    setError("");
    setFormData({
      organization: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      disasterType: "",
      urgency: "high",
      location: "",
      deliveryDate: "",
      deliveryAddress: "",
      items: [EMPTY_ITEM],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        organization: formData.organization,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        disasterType: formData.disasterType,
        priority: formData.urgency,
        urgency: formData.urgency,
        location: formData.location,
        deliveryDate: formData.deliveryDate,
        deliveryAddress: formData.deliveryAddress,
        requestType: "NGO_Request",
        items: formData.items
          .filter((item) => item.name && item.quantity)
          .map((item) => ({
            itemName: item.name,
            quantityRequested: Number(item.quantity),
            category: item.category,
          })),
      };

      const response = await createResourceRequest(payload);
      setSubmittedRequest(response.data);
    } catch (err) {
      setError(err.message || "Failed to submit resource request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRequest) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: 24 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", backgroundColor: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", width: 80, height: 80, borderRadius: "50%", alignItems: "center", justifyContent: "center", backgroundColor: "#dcfce7", marginBottom: 24 }}>
              <CheckCircle size={40} style={{ color: "#16a34a" }} />
            </div>
            <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 700, color: "#1f2937" }}>Request Sent Successfully</h1>
            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
              Your resource request has been saved to the backend and is now available for approval and follow-up.
            </p>
          </div>

          <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "#1f2937" }}>Request Details</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Request Code</span><strong>{submittedRequest.requestCode}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Organization</span><strong>{submittedRequest.organization || "-"}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Disaster Type</span><strong>{submittedRequest.disasterType || "-"}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Location</span><strong>{submittedRequest.location || "-"}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Items Requested</span><strong>{submittedRequest.totalItemsRequested}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#6b7280" }}>Email</span><strong>{submittedRequest.requesterEmail || "-"}</strong></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={resetForm} style={{ backgroundColor: "#1f2937", color: "white", padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} />
              New Request
            </button>
            <button onClick={() => window.location.href = "/inventory"} style={{ backgroundColor: "white", color: "#374151", padding: "12px 24px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer" }}>
              Back to Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: 24 }}>
      <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Inventory Officer / Resource Management
          </span>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700, color: "#1f2937" }}>Resource Request Form</h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
          Send resource requests to partner NGOs when inventory is insufficient. This form now saves requests to the backend.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#dbeafe", padding: 8, borderRadius: 8 }}>
                <Building2 size={20} style={{ color: "#2563eb" }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1f2937" }}>Organization Details</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>NGO Organization *</label>
                <input name="organization" value={formData.organization} onChange={handleInputChange} placeholder="Organization name" required />
              </div>
              <div className="form-group">
                <label>Contact Name *</label>
                <input name="contactName" value={formData.contactName} onChange={handleInputChange} placeholder="Full name" required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label>Email *</label>
                <input name="contactEmail" type="email" value={formData.contactEmail} onChange={handleInputChange} placeholder="name@organization.org" required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="+1 234 567 8900" required />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#fee2e2", padding: 8, borderRadius: 8 }}>
                <AlertTriangle size={20} style={{ color: "#dc2626" }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1f2937" }}>Emergency Information</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>Disaster Type *</label>
                <select name="disasterType" value={formData.disasterType} onChange={handleInputChange} required>
                  <option value="">Select disaster type</option>
                  {disasters.map((disaster) => <option key={disaster} value={disaster}>{disaster}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Urgency Level *</label>
                <select name="urgency" value={formData.urgency} onChange={handleInputChange}>
                  <option value="critical">Critical - Life threatening</option>
                  <option value="high">High - Urgent need</option>
                  <option value="medium">Medium - Within 48 hours</option>
                  <option value="low">Low - Within 1 week</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label><MapPin size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />Location *</label>
              <input name="location" value={formData.location} onChange={handleInputChange} placeholder="City, State, Country" required />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#f0fdf4", padding: 8, borderRadius: 8 }}>
                <Package size={20} style={{ color: "#16a34a" }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1f2937" }}>Requested Items</h2>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 12, position: "relative" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={item.category} onChange={(event) => handleItemChange(index, "category", event.target.value)}>
                      {categories.map((category) => <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Item Name *</label>
                    <input value={item.name} onChange={(event) => handleItemChange(index, "name", event.target.value)} placeholder="e.g. Water Bottles" />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" min="1" value={item.quantity} onChange={(event) => handleItemChange(index, "quantity", event.target.value)} placeholder="0" />
                  </div>
                </div>

                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} style={{ position: "absolute", top: 12, right: 12, backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: 6, cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addItem} style={{ backgroundColor: "#f0f9ff", color: "#0284c7", border: "1px dashed #bae6fd", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "center" }}>
              <Plus size={16} />
              Add Another Item
            </button>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#fef3c7", padding: 8, borderRadius: 8 }}>
                <Calendar size={20} style={{ color: "#d97706" }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1f2937" }}>Delivery Information</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label><Calendar size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />Delivery Date *</label>
                <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} min={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="form-group">
                <label><MapPin size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />Delivery Address *</label>
                <input name="deliveryAddress" value={formData.deliveryAddress} onChange={handleInputChange} placeholder="Complete delivery address" required />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
            <button type="button" onClick={resetForm} style={{ backgroundColor: "white", color: "#374151", padding: "12px 24px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer" }}>
              Clear Form
            </button>
            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: isSubmitting ? "#9ca3af" : "#1f2937", color: "white", padding: "12px 24px", borderRadius: 8, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {isSubmitting ? "Sending Request..." : "Send Request to Backend"}
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}