import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Send, CheckCircle, Plus, Trash2, AlertTriangle } from "lucide-react";
import './Pages.css';

const ResourceRequestPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    disasterType: "",
    location: "",
    urgency: "high",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    deliveryDate: "",
    deliveryAddress: "",
    items: [
      { name: "", quantity: "", category: "water" }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = ["water", "food", "medical", "shelter", "clothing", "other"];
  const disasters = ["Flood", "Earthquake", "Hurricane", "Wildfire", "Other"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: "", category: "water" }]
    }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  const resetForm = () => {
    setFormData({
      disasterType: "",
      location: "",
      urgency: "high",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      deliveryDate: "",
      deliveryAddress: "",
      items: [{ name: "", quantity: "", category: "water" }]
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
        <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Inventory Officer / Resource Management
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Resource Request
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Request essential resources from partner NGOs when inventory is insufficient
            </p>
          </div>
        </section>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="text-center py-12">
            <div className="flex justify-center mb-6">
              <CheckCircle size={64} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Request Submitted!</h1>
            <p className="text-slate-600 mb-8">Your resource request has been sent to partner NGOs. You'll receive updates on the status.</p>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 max-w-md mx-auto">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Request ID:</span>
                  <strong className="text-slate-900">REQ-{Date.now()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Disaster:</span>
                  <strong className="text-slate-900">{formData.disasterType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Location:</span>
                  <strong className="text-slate-900">{formData.location}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Items:</span>
                  <strong className="text-slate-900">{formData.items.filter(item => item.name).length} requested</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button 
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
                onClick={resetForm}
              >
                New Request
              </button>
              <button 
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
                onClick={() => navigate("/inventory")}
              >
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            Inventory Officer / Resource Management
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Smart Disaster Relief System - Resource Request
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Request essential resources from partner NGOs when inventory is insufficient
          </p>
        </div>
      </section>

      {/* FORM */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <form onSubmit={handleSubmit} className="request-form">
          
          {/* EMERGENCY INFO */}
          <div className="form-section">
            <h2>Emergency Information</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Disaster Type *</label>
                <select name="disasterType" value={formData.disasterType} onChange={handleInputChange} required>
                  <option value="">Select disaster type</option>
                  {disasters.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Urgency *</label>
                <select name="urgency" value={formData.urgency} onChange={handleInputChange}>
                  <option value="critical">Critical - Life threatening</option>
                  <option value="high">High - Urgent need</option>
                  <option value="medium">Medium - Within 48 hours</option>
                  <option value="low">Low - Within 1 week</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State, Country"
                required
              />
            </div>
          </div>

          {/* CONTACT INFO */}
          <div className="form-section">
            <h2>Contact Information</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Your Name *</label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="your.email@organization.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>

          {/* REQUESTED ITEMS */}
          <div className="form-section">
            <h2>Requested Items</h2>
            
            {formData.items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-grid">
                  <div className="form-group">
                    <label>Category</label>
                    <select 
                      value={item.category} 
                      onChange={(e) => handleItemChange(index, "category", e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Item Name *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      placeholder="e.g., Water Bottles, Medical Kits"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {formData.items.length > 1 && (
                  <button 
                    type="button" 
                    className="btn-remove"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            
            <button type="button" className="btn-add" onClick={addItem}>
              <Plus size={16} /> Add Another Item
            </button>
          </div>

          {/* DELIVERY INFO */}
          <div className="form-section">
            <h2>Delivery Information</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Delivery Date *</label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Delivery Address *</label>
              <textarea
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleInputChange}
                placeholder="Complete delivery address"
                rows={3}
                required
              />
            </div>
          </div>

          {/* SUBMIT */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Clear Form
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"} <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceRequestPage;
