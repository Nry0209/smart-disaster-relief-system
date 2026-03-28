import React, { useState } from "react";
import { Package, Send, CheckCircle, Plus, Trash2, AlertTriangle } from "lucide-react";
import './Pages.css';

const ResourceRequestPage = () => {
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
      <div className="resource-request-page">
        <div className="success-container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h1>Request Submitted!</h1>
            <p>Your resource request has been sent to partner NGOs. You'll receive updates on the status.</p>
            
            <div className="success-summary">
              <div className="summary-item">
                <span>Request ID:</span>
                <strong>REQ-{Date.now()}</strong>
              </div>
              <div className="summary-item">
                <span>Disaster:</span>
                <strong>{formData.disasterType}</strong>
              </div>
              <div className="summary-item">
                <span>Location:</span>
                <strong>{formData.location}</strong>
              </div>
              <div className="summary-item">
                <span>Items:</span>
                <strong>{formData.items.filter(item => item.name).length} requested</strong>
              </div>
            </div>

            <div className="success-actions">
              <button className="btn-primary" onClick={resetForm}>
                New Request
              </button>
              <button className="btn-secondary" onClick={() => window.location.href = "/inventory"}>
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-request-page">
      
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">
            <Package size={32} color="#2563eb" />
          </div>
          <div>
            <h1>Resource Request</h1>
            <p>Request essential resources from partner NGOs when inventory is insufficient</p>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="form-container">
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
