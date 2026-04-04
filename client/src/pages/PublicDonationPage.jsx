import React, { useState } from 'react';
import { Heart, Package, Users, DollarSign, CheckCircle, AlertCircle, CreditCard, Smartphone, Building, User, ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Pages.css';

const PublicDonationPage = () => {
  const navigate = useNavigate();
  const [donorType, setDonorType] = useState('person');
  const [donationType, setDonationType] = useState('money');
  const [donationAmount, setDonationAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [donorInfo, setDonorInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    anonymous: false,
    organizationName: '',
    registrationNumber: '',
    website: '',
    contactPerson: '',
    contactPosition: ''
  });
  const [itemDonation, setItemDonation] = useState({
    category: '',
    items: '',
    quantity: '',
    condition: '',
    pickupAddress: '',
    pickupDate: '',
    pickupTime: '',
    contactPerson: '',
    contactPhone: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const predefinedAmounts = [500, 1000, 2500, 5000, 10000];

  const itemCategories = [
    'Food & Water',
    'Medical Supplies',
    'Clothing & Blankets',
    'Hygiene Products',
    'Shelter Materials',
    'Baby Supplies',
    'Educational Materials',
    'Other'
  ];

  const handleAmountSelect = (amount) => {
    setDonationAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (e) => {
    setCustomAmount(e.target.value);
    setDonationAmount('');
  };

  const handleDonorInfoChange = (field, value) => {
    setDonorInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemDonationChange = (field, value) => {
    setItemDonation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep1 = () => {
    return donorType; // Must select either person or organization
  };

  const validateStep2 = () => {
    if (donationType === 'money') {
      const amount = customAmount || donationAmount;
      return amount && parseFloat(amount) > 0;
    } else {
      return itemDonation.category && itemDonation.items && itemDonation.quantity;
    }
  };

  const validateStep3 = () => {
    if (!donorInfo.anonymous) {
      if (donorType === 'organization') {
        return donorInfo.organizationName && donorInfo.email && donorInfo.phone && donorInfo.contactPerson;
      } else {
        return donorInfo.name && donorInfo.email && donorInfo.phone;
      }
    }
    return true;
  };

  const validateStep4 = () => {
    if (donationType === 'money') {
      return paymentMethod;
    } else {
      return itemDonation.pickupAddress && itemDonation.pickupDate && itemDonation.contactPerson;
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep === 4 && !validateStep4()) return;
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 2000);
  };

  const resetForm = () => {
    setDonorType('person');
    setDonationType('money');
    setDonationAmount('');
    setCustomAmount('');
    setPaymentMethod('card');
    setDonorInfo({
      name: '',
      email: '',
      phone: '',
      address: '',
      anonymous: false,
      organizationName: '',
      registrationNumber: '',
      website: '',
      contactPerson: '',
      contactPosition: ''
    });
    setItemDonation({
      category: '',
      items: '',
      quantity: '',
      condition: '',
      pickupAddress: '',
      pickupDate: '',
      pickupTime: '',
      contactPerson: '',
      contactPhone: ''
    });
    setCurrentStep(1);
    setShowSuccess(false);
  };

  if (showSuccess) {
    return (
      <div className="public-donation-page">
        <div className="donation-success-container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircle size={64} color="#10b981" />
            </div>
            <h2>Thank You for Your Donation!</h2>
            <p>Your generosity will make a real difference in the lives of those affected by disasters.</p>
            
            <div className="donation-summary">
              <h3>Donation Summary</h3>
              <div className="summary-item">
                <span>Donor Type:</span>
                <span>{donorType === 'organization' ? 'Organization' : 'Individual'}</span>
              </div>
              <div className="summary-item">
                <span>Donation Type:</span>
                <span>{donationType === 'money' ? 'Monetary Donation' : 'Item Donation'}</span>
              </div>
              {donationType === 'money' ? (
                <div className="summary-item">
                  <span>Amount:</span>
                  <span>LKR {customAmount || donationAmount}</span>
                </div>
              ) : (
                <>
                  <div className="summary-item">
                    <span>Items:</span>
                    <span>{itemDonation.items}</span>
                  </div>
                  <div className="summary-item">
                    <span>Quantity:</span>
                    <span>{itemDonation.quantity}</span>
                  </div>
                </>
              )}
              <div className="summary-item">
                <span>Donor:</span>
                <span>{donorInfo.anonymous ? 'Anonymous' : (donorType === 'organization' ? donorInfo.organizationName : donorInfo.name)}</span>
              </div>
            </div>
            
            <div className="success-actions">
              <button className="btn-primary" onClick={resetForm}>
                Make Another Donation
              </button>
              <button className="btn-secondary" onClick={() => navigate('/')}>
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-donation-page">
      <div className="donation-header">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={() => navigate('/')}
            title="Back to Home"
          >
            <ArrowLeft size={20} color="#64748b" />
          </button>
          <div className="header-icon">
            <Heart size={24} color="#dc2626" />
          </div>
          <div>
            <h1>Make a Difference Today</h1>
            <p>Your donation helps provide immediate relief to disaster-affected communities across Sri Lanka</p>
          </div>
        </div>
      </div>

      <div className="donation-container">
        <div className="donation-progress">
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Donor Type</div>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Donation Type</div>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Your Information</div>
            </div>
            <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
              <div className="step-number">4</div>
              <div className="step-label">Details</div>
            </div>
            <div className={`step ${currentStep >= 5 ? 'active' : ''}`}>
              <div className="step-number">5</div>
              <div className="step-label">Review & Confirm</div>
            </div>
          </div>
        </div>

        <div className="donation-form-container">
          <form onSubmit={handleSubmit} className="donation-form">
            {/* Step 1: Donor Type */}
            {currentStep === 1 && (
              <div className="form-step">
                <h2>Are you donating as an individual or organization?</h2>
                
                <div className="donation-type-selector">
                  <div 
                    className={`donation-type-card ${donorType === 'person' ? 'selected' : ''}`}
                    onClick={() => setDonorType('person')}
                  >
                    <div className="type-icon">
                      <User size={32} color="#2563eb" />
                    </div>
                    <h3>Individual</h3>
                    <p>Personal donation from an individual supporter</p>
                  </div>
                  
                  <div 
                    className={`donation-type-card ${donorType === 'organization' ? 'selected' : ''}`}
                    onClick={() => setDonorType('organization')}
                  >
                    <div className="type-icon">
                      <Building size={32} color="#2563eb" />
                    </div>
                    <h3>Organization</h3>
                    <p>Corporate donation, NGO, or institutional support</p>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-primary" onClick={nextStep}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Donation Type */}
            {currentStep === 2 && (
              <div className="form-step">
                <h2>Choose Your Donation Type</h2>
                
                <div className="donation-type-selector">
                  <div 
                    className={`donation-type-card ${donationType === 'money' ? 'selected' : ''}`}
                    onClick={() => setDonationType('money')}
                  >
                    <div className="type-icon">
                      <DollarSign size={32} color="#2563eb" />
                    </div>
                    <h3>Monetary Donation</h3>
                    <p>Quick and secure online payment to support emergency relief efforts</p>
                  </div>
                  
                  <div 
                    className={`donation-type-card ${donationType === 'items' ? 'selected' : ''}`}
                    onClick={() => setDonationType('items')}
                  >
                    <div className="type-icon">
                      <Package size={32} color="#2563eb" />
                    </div>
                    <h3>Item Donation</h3>
                    <p>Donate essential supplies and materials for disaster relief</p>
                  </div>
                </div>

                {donationType === 'money' && (
                  <div className="amount-selection">
                    <h3>Select Donation Amount (LKR)</h3>
                    <div className="amount-grid">
                      {predefinedAmounts.map(amount => (
                        <button
                          key={amount}
                          type="button"
                          className={`amount-btn ${donationAmount == amount ? 'selected' : ''}`}
                          onClick={() => handleAmountSelect(amount)}
                        >
                          {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <div className="custom-amount">
                      <input
                        type="number"
                        placeholder="Enter custom amount"
                        value={customAmount}
                        onChange={handleCustomAmount}
                        min="1"
                      />
                    </div>
                  </div>
                )}

                {donationType === 'items' && (
                  <div className="item-donation-details">
                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        value={itemDonation.category}
                        onChange={(e) => handleItemDonationChange('category', e.target.value)}
                        required
                      >
                        <option value="">Select category</option>
                        {itemCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Items *</label>
                      <input
                        type="text"
                        placeholder="e.g., Rice, Water bottles, Blankets"
                        value={itemDonation.items}
                        onChange={(e) => handleItemDonationChange('items', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="text"
                        placeholder="e.g., 10 bags, 5 boxes"
                        value={itemDonation.quantity}
                        onChange={(e) => handleItemDonationChange('quantity', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Condition</label>
                      <select
                        value={itemDonation.condition}
                        onChange={(e) => handleItemDonationChange('condition', e.target.value)}
                      >
                        <option value="">Select condition</option>
                        <option value="new">New</option>
                        <option value="like-new">Like New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn-primary" onClick={nextStep}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Donor Information */}
            {currentStep === 3 && (
              <div className="form-step">
                <h2>Your Information</h2>
                
                <div className="anonymous-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={donorInfo.anonymous}
                      onChange={(e) => handleDonorInfoChange('anonymous', e.target.checked)}
                    />
                    <span>I wish to remain anonymous</span>
                  </label>
                </div>

                {!donorInfo.anonymous && (
                  <div className="donor-info-form">
                    {donorType === 'organization' ? (
                      <>
                        <div className="form-group">
                          <label>Organization Name *</label>
                          <input
                            type="text"
                            value={donorInfo.organizationName}
                            onChange={(e) => handleDonorInfoChange('organizationName', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Registration Number</label>
                          <input
                            type="text"
                            value={donorInfo.registrationNumber}
                            onChange={(e) => handleDonorInfoChange('registrationNumber', e.target.value)}
                            placeholder="e.g., NGO/123/2024"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Website</label>
                          <input
                            type="url"
                            value={donorInfo.website}
                            onChange={(e) => handleDonorInfoChange('website', e.target.value)}
                            placeholder="https://www.example.com"
                          />
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Contact Person *</label>
                            <input
                              type="text"
                              value={donorInfo.contactPerson}
                              onChange={(e) => handleDonorInfoChange('contactPerson', e.target.value)}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Position</label>
                            <input
                              type="text"
                              value={donorInfo.contactPosition}
                              onChange={(e) => handleDonorInfoChange('contactPosition', e.target.value)}
                              placeholder="e.g., Director, Manager"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          value={donorInfo.name}
                          onChange={(e) => handleDonorInfoChange('name', e.target.value)}
                          required
                        />
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={donorInfo.email}
                        onChange={(e) => handleDonorInfoChange('email', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        value={donorInfo.phone}
                        onChange={(e) => handleDonorInfoChange('phone', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Address</label>
                      <textarea
                        value={donorInfo.address}
                        onChange={(e) => handleDonorInfoChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={prevStep}>
                    Back
                  </button>
                  <button type="button" className="btn-primary" onClick={nextStep}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Payment/Pickup Details */}
            {currentStep === 4 && (
              <div className="form-step">
                <h2>{donationType === 'money' ? 'Payment Method' : 'Pickup Details'}</h2>
                
                {donationType === 'money' ? (
                  <div className="payment-methods">
                    <div className="payment-options">
                      <label className="payment-option">
                        <input
                          type="radio"
                          name="payment"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className="payment-card">
                          <CreditCard size={24} color="#2563eb" />
                          <div>
                            <h4>Credit/Debit Card</h4>
                            <p>Secure online payment</p>
                          </div>
                        </div>
                      </label>
                      
                      <label className="payment-option">
                        <input
                          type="radio"
                          name="payment"
                          value="mobile"
                          checked={paymentMethod === 'mobile'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className="payment-card">
                          <Smartphone size={24} color="#2563eb" />
                          <div>
                            <h4>Mobile Banking</h4>
                            <p>Pay via mobile banking app</p>
                          </div>
                        </div>
                      </label>
                      
                      <label className="payment-option">
                        <input
                          type="radio"
                          name="payment"
                          value="bank"
                          checked={paymentMethod === 'bank'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <div className="payment-card">
                          <Building size={24} color="#2563eb" />
                          <div>
                            <h4>Bank Transfer</h4>
                            <p>Direct bank deposit</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="pickup-details">
                    <div className="form-group">
                      <label>Pickup Address *</label>
                      <textarea
                        value={itemDonation.pickupAddress}
                        onChange={(e) => handleItemDonationChange('pickupAddress', e.target.value)}
                        placeholder="Enter the address where items should be picked up"
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Pickup Date *</label>
                        <input
                          type="date"
                          value={itemDonation.pickupDate}
                          onChange={(e) => handleItemDonationChange('pickupDate', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Pickup Time</label>
                        <input
                          type="time"
                          value={itemDonation.pickupTime}
                          onChange={(e) => handleItemDonationChange('pickupTime', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Contact Person *</label>
                        <input
                          type="text"
                          value={itemDonation.contactPerson}
                          onChange={(e) => handleItemDonationChange('contactPerson', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Contact Phone *</label>
                        <input
                          type="tel"
                          value={itemDonation.contactPhone}
                          onChange={(e) => handleItemDonationChange('contactPhone', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={prevStep}>
                    Back
                  </button>
                  <button type="button" className="btn-primary" onClick={nextStep}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Confirm */}
            {currentStep === 5 && (
              <div className="form-step">
                <h2>Review & Confirm Your Donation</h2>
                
                <div className="donation-review">
                  <div className="review-section">
                    <h3>Donation Details</h3>
                    <div className="review-item">
                      <span>Donor Type:</span>
                      <span>{donorType === 'organization' ? 'Organization' : 'Individual'}</span>
                    </div>
                    <div className="review-item">
                      <span>Donation Type:</span>
                      <span>{donationType === 'money' ? 'Monetary Donation' : 'Item Donation'}</span>
                    </div>
                    
                    {donationType === 'money' ? (
                      <div className="review-item">
                        <span>Amount:</span>
                        <span className="amount-highlight">LKR {customAmount || donationAmount}</span>
                      </div>
                    ) : (
                      <>
                        <div className="review-item">
                          <span>Category:</span>
                          <span>{itemDonation.category}</span>
                        </div>
                        <div className="review-item">
                          <span>Items:</span>
                          <span>{itemDonation.items}</span>
                        </div>
                        <div className="review-item">
                          <span>Quantity:</span>
                          <span>{itemDonation.quantity}</span>
                        </div>
                        {itemDonation.condition && (
                          <div className="review-item">
                            <span>Condition:</span>
                            <span>{itemDonation.condition}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="review-section">
                    <h3>Donor Information</h3>
                    <div className="review-item">
                      <span>Name:</span>
                      <span>{donorInfo.anonymous ? 'Anonymous' : (donorType === 'organization' ? donorInfo.organizationName : donorInfo.name)}</span>
                    </div>
                    {!donorInfo.anonymous && (
                      <>
                        {donorType === 'organization' && (
                          <>
                            {donorInfo.registrationNumber && (
                              <div className="review-item">
                                <span>Registration:</span>
                                <span>{donorInfo.registrationNumber}</span>
                              </div>
                            )}
                            {donorInfo.contactPerson && (
                              <div className="review-item">
                                <span>Contact Person:</span>
                                <span>{donorInfo.contactPerson}</span>
                              </div>
                            )}
                            {donorInfo.contactPosition && (
                              <div className="review-item">
                                <span>Position:</span>
                                <span>{donorInfo.contactPosition}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="review-item">
                          <span>Email:</span>
                          <span>{donorInfo.email}</span>
                        </div>
                        <div className="review-item">
                          <span>Phone:</span>
                          <span>{donorInfo.phone}</span>
                        </div>
                        {donorInfo.address && (
                          <div className="review-item">
                            <span>Address:</span>
                            <span>{donorInfo.address}</span>
                          </div>
                        )}
                        {donorType === 'organization' && donorInfo.website && (
                          <div className="review-item">
                            <span>Website:</span>
                            <span>{donorInfo.website}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {donationType === 'money' ? (
                    <div className="review-section">
                      <h3>Payment Method</h3>
                      <div className="review-item">
                        <span>Method:</span>
                        <span>
                          {paymentMethod === 'card' && 'Credit/Debit Card'}
                          {paymentMethod === 'mobile' && 'Mobile Banking'}
                          {paymentMethod === 'bank' && 'Bank Transfer'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="review-section">
                      <h3>Pickup Details</h3>
                      <div className="review-item">
                        <span>Address:</span>
                        <span>{itemDonation.pickupAddress}</span>
                      </div>
                      <div className="review-item">
                        <span>Date:</span>
                        <span>{itemDonation.pickupDate}</span>
                      </div>
                      {itemDonation.pickupTime && (
                        <div className="review-item">
                          <span>Time:</span>
                          <span>{itemDonation.pickupTime}</span>
                        </div>
                      )}
                      <div className="review-item">
                        <span>Contact Person:</span>
                        <span>{itemDonation.contactPerson}</span>
                      </div>
                      <div className="review-item">
                        <span>Contact Phone:</span>
                        <span>{itemDonation.contactPhone}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="terms-section">
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span>I agree to the terms and conditions and understand that my donation will be used for disaster relief efforts</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={prevStep}>
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'Confirm Donation'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="donation-form-container">
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

export default PublicDonationPage;
