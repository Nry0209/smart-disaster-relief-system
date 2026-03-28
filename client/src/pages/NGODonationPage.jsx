import React, { useState } from "react";
import { Package, Users, Mail, Calendar, MapPin, Phone, CheckCircle, AlertCircle, Send } from "lucide-react";
import './Pages.css';

const NGODonationPage = () => {
  const [formData, setFormData] = useState({
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    donationItems: [
      { category: "water", itemName: "", quantity: "", description: "" },
      { category: "food", itemName: "", quantity: "", description: "" },
      { category: "medical", itemName: "", quantity: "", description: "" },
      { category: "shelter", itemName: "", quantity: "", description: "" },
      { category: "clothing", itemName: "", quantity: "", description: "" }
    ],
    expectedDeliveryDate: "",
    specialInstructions: "",
    agreeToTerms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: "water", label: "Water & Beverages", icon: "💧" },
    { value: "food", label: "Food & Nutrition", icon: "🍎" },
    { value: "medical", label: "Medical Supplies", icon: "🏥" },
    { value: "shelter", label: "Shelter Items", icon: "🏠" },
    { value: "clothing", label: "Clothing", icon: "👕" }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.donationItems];
    updatedItems[index][field] = value;
    setFormData(prev => ({ ...prev, donationItems: updatedItems }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
    }
    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = "Contact person is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.expectedDeliveryDate) {
      newErrors.expectedDeliveryDate = "Expected delivery date is required";
    }
    
    const hasValidItems = formData.donationItems.some(item => 
      item.itemName.trim() && item.quantity.trim()
    );
    
    if (!hasValidItems) {
      newErrors.donationItems = "Please add at least one donation item";
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call to create donation record with "Pending Verification" status
    try {
      const donationData = {
        ...formData,
        status: "Pending Verification",
        submissionDate: new Date().toISOString(),
        donationId: `NGO-${Date.now()}`
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("NGO Donation Submitted:", donationData);
      setSubmitted(true);
      
    } catch (error) {
      console.error("Error submitting donation:", error);
      alert("Error submitting donation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      organizationName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      donationItems: [
        { category: "water", itemName: "", quantity: "", description: "" },
        { category: "food", itemName: "", quantity: "", description: "" },
        { category: "medical", itemName: "", quantity: "", description: "" },
        { category: "shelter", itemName: "", quantity: "", description: "" },
        { category: "clothing", itemName: "", quantity: "", description: "" }
      ],
      expectedDeliveryDate: "",
      specialInstructions: "",
      agreeToTerms: false
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="ngo-donation-page">
        <div className="ngo-success-container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={64} color="#16a34a" />
            </div>
            <h1>Donation Submitted Successfully!</h1>
            <p>Thank you for your generous donation. Your submission has been received and is pending verification by our inventory team.</p>
            
            <div className="success-details">
              <h3>Submission Details</h3>
              <div className="detail-item">
                <span>Organization:</span>
                <span>{formData.organizationName}</span>
              </div>
              <div className="detail-item">
                <span>Contact Person:</span>
                <span>{formData.contactPerson}</span>
              </div>
              <div className="detail-item">
                <span>Email:</span>
                <span>{formData.email}</span>
              </div>
              <div className="detail-item">
                <span>Expected Delivery:</span>
                <span>{formData.expectedDeliveryDate}</span>
              </div>
              <div className="detail-item">
                <span>Status:</span>
                <span className="status-badge pending">Pending Verification</span>
              </div>
              <div className="detail-item">
                <span>Donation ID:</span>
                <span className="donation-id">{`NGO-${Date.now()}`}</span>
              </div>
            </div>

            <div className="next-steps">
              <h3>What Happens Next?</h3>
              <ul>
                <li>Our inventory team will review your submission</li>
                <li>You'll receive an email confirmation with your donation ID</li>
                <li>Once verified, your donation will update our inventory levels</li>
                <li>These resources will be allocated to disaster relief efforts</li>
              </ul>
            </div>

            <div className="success-actions">
              <button className="btn-primary" onClick={resetForm}>
                Submit Another Donation
              </button>
              <button className="btn-secondary" onClick={() => window.location.href = "/"}>
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ngo-donation-page">

      {/* HEADER */}
      <div className="ngo-header">
        <div className="ngo-hero">
          <div className="ngo-hero-content">
            <h1>NGO Donation Portal</h1>
            <p>Partner with us to provide essential disaster relief supplies. Your generosity helps communities in crisis.</p>
            <div className="ngo-stats">
              <div className="stat-item">
                <Package size={24} color="#2563eb" />
                <div>
                  <strong>500+</strong>
                  <span>Partner NGOs</span>
                </div>
              </div>
              <div className="stat-item">
                <Users size={24} color="#16a34a" />
                <div>
                  <strong>10,000+</strong>
                  <span>Lives Helped</span>
                </div>
              </div>
              <div className="stat-item">
                <Mail size={24} color="#f59e0b" />
                <div>
                  <strong>24hrs</strong>
                  <span>Verification Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="ngo-form-container">
        <div className="ngo-form-card">
          <div className="form-header">
            <h2>Donation Submission Form</h2>
            <p>Please complete all required fields to submit your donation</p>
          </div>

          <form onSubmit={handleSubmit} className="ngo-form">
            
            {/* ORGANIZATION INFORMATION */}
            <div className="form-section">
              <h3>Organization Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Organization Name *</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    placeholder="e.g., Red Cross, UNICEF"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="Full name of contact person"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@organization.org"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address, building number"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City name"
                  />
                </div>
                <div className="form-group">
                  <label>State/Province</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State or province"
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* DONATION ITEMS */}
            <div className="form-section">
              <h3>Donation Items</h3>
              <p>Please specify the items you are donating</p>
              
              {formData.donationItems.map((item, index) => (
                <div key={index} className="donation-item-row">
                  <div className="item-category">
                    <span className="category-icon">
                      {categories.find(c => c.value === item.category)?.icon}
                    </span>
                    <select 
                      value={item.category} 
                      onChange={(e) => handleItemChange(index, "category", e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="item-details">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Item Name *</label>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                          placeholder="e.g., Water Bottles, Food Packages"
                        />
                      </div>
                      <div className="form-group">
                        <label>Quantity *</label>
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          placeholder="e.g., 100, 500"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Size, condition, expiry dates, etc."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DELIVERY INFORMATION */}
            <div className="form-section">
              <h3>Delivery Information</h3>
              <div className="form-group">
                <label>Expected Delivery Date *</label>
                <input
                  type="date"
                  name="expectedDeliveryDate"
                  value={formData.expectedDeliveryDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label>Special Instructions</label>
                <textarea
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleInputChange}
                  placeholder="Any special handling instructions, delivery preferences, or additional notes..."
                  rows={4}
                />
              </div>
            </div>

            {/* TERMS AND SUBMIT */}
            <div className="form-section">
              <div className="form-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    required
                  />
                  <span>I agree to the terms and conditions and confirm that all provided information is accurate</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Clear Form
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="spinner"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Donation <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="ngo-info-section">
        <div className="info-card">
          <h3>Important Information</h3>
          <div className="info-content">
            <div className="info-item">
              <AlertCircle size={20} color="#f59e0b" />
              <div>
                <strong>Verification Process:</strong>
                <p>All donations are manually verified by our inventory team before being added to our system. This ensures accuracy and quality control.</p>
              </div>
            </div>
            <div className="info-item">
              <Calendar size={20} color="#2563eb" />
              <div>
                <strong>Delivery Timeline:</strong>
                <p>Please ensure items are delivered on the specified date. Late deliveries may impact disaster response efforts.</p>
              </div>
            </div>
            <div className="info-item">
              <Package size={20} color="#16a34a" />
              <div>
                <strong>Quality Standards:</strong>
                <p>All items should be new or in excellent condition. Expired or damaged items cannot be accepted.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NGODonationPage;
