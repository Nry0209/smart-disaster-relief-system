import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import './Pages.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_ADDRESS_LENGTH = 10;
const MAX_ADDRESS_LENGTH = 200;

function validatePhoneNumber(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, '');
  if (!normalized) return '';

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length !== 10 || !PHONE_PATTERN.test(digitsOnly)) {
    return 'Phone number must start with 0 and contain exactly 10 digits.';
  }

  return '';
}

const PartnerDirectory = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);

  // Check if user is inventory officer (read-only access)
  const isInventoryOfficer = user?.role === 'inventory_officer';
  const canEdit = user?.role === 'admin';

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockPartners = [
      {
        id: 1,
        name: "Red Cross Sri Lanka",
        contactPerson: "Dr. Ananda Perera",
        email: "ananda.perera@redcross.lk",
        phone: "+94 11 269 3456",
        address: "No. 123, Colombo 07, Sri Lanka",
        specialization: "Emergency Relief",
        status: "active",
        createdAt: "2024-01-10T10:30:00Z",
        lastContact: "2024-03-25T14:20:00Z"
      },
      {
        id: 2,
        name: "UNICEF Sri Lanka",
        contactPerson: "Ms. Nimali Fernando",
        email: "nfernando@unicef.org",
        phone: "+94 11 258 9123",
        address: "No. 45, Bauddhaloka Mawatha, Colombo 07",
        specialization: "Child Welfare & Education",
        status: "active",
        createdAt: "2024-01-15T09:15:00Z",
        lastContact: "2024-03-24T11:45:00Z"
      },
      {
        id: 3,
        name: "Save the Children",
        contactPerson: "Mr. Rajitha Kumarasiri",
        email: "rajitha.k@savethechildren.lk",
        phone: "+94 11 285 6732",
        address: "No. 78, Horton Place, Colombo 07",
        specialization: "Children's Rights",
        status: "inactive",
        createdAt: "2024-02-01T13:45:00Z",
        lastContact: "2024-03-15T16:30:00Z"
      },
      {
        id: 4,
        name: "Habitat for Humanity",
        contactPerson: "Ms. Priyanthi Silva",
        email: "priyanthi.s@habitat.lk",
        phone: "+94 11 274 8901",
        address: "No. 234, Rajagiriya, Sri Lanka",
        specialization: "Shelter & Housing",
        status: "active",
        createdAt: "2024-02-10T11:20:00Z",
        lastContact: "2024-03-26T10:15:00Z"
      }
    ];
    setPartners(mockPartners);
  }, []);

  const statusOptions = [
    { value: 'all', label: 'All Partners' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const specializationOptions = [
    'Emergency Relief',
    'Child Welfare & Education',
    "Children's Rights",
    'Shelter & Housing',
    'Food Security',
    'Healthcare',
    'Water & Sanitation',
    'Logistics & Transport'
  ];

  const filteredPartners = partners.filter(partner => {
    if (filterStatus === 'all') return true;
    return partner.status === filterStatus;
  });

  const handleCreatePartner = (partnerData) => {
    if (!canEdit) return;
    
    const newPartner = {
      id: partners.length + 1,
      ...partnerData,
      status: partnerData.status || 'active',
      createdAt: new Date().toISOString(),
      lastContact: null,
      profilePicture: partnerData.profilePicture || null
    };
    setPartners([...partners, newPartner]);
    setShowCreateForm(false);
  };

  const handleUpdatePartner = (partnerId, updates) => {
    if (!canEdit) return;
    
    setPartners(partners.map(partner => 
      partner.id === partnerId ? { ...partner, ...updates } : partner
    ));
    setEditingPartner(null);
  };

  const handleDeletePartner = (partnerId) => {
    if (!canEdit) return;
    
    if (window.confirm('Are you sure you want to delete this NGO partner?')) {
      setPartners(partners.filter(partner => partner.id !== partnerId));
    }
  };

  const handleToggleStatus = (partnerId) => {
    if (!canEdit) return;
    
    setPartners(partners.map(partner => 
      partner.id === partnerId 
        ? { ...partner, status: partner.status === 'active' ? 'inactive' : 'active' }
        : partner
    ));
  };

  const PartnerForm = ({ partner, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: partner?.name || '',
      contactPerson: partner?.contactPerson || '',
      email: partner?.email || '',
      phone: partner?.phone || '',
      address: partner?.address || '',
      specialization: partner?.specialization || 'Emergency Relief',
      status: partner?.status || 'active',
      profilePicture: partner?.profilePicture || null
    });

    const [fieldErrors, setFieldErrors] = useState({});

    const getInputClass = (field) =>
      `w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
        fieldErrors[field]
          ? 'border-rose-300 bg-rose-50 focus:ring-rose-200'
          : 'border-slate-200 focus:ring-emerald-500'
      }`;

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({...formData, profilePicture: reader.result});
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      const nextFieldErrors = {};
      const name = String(formData.name || '').trim();
      const contactPerson = String(formData.contactPerson || '').trim();
      const email = String(formData.email || '').trim();
      const phone = String(formData.phone || '').trim();
      const address = String(formData.address || '').trim();
      const specialization = String(formData.specialization || '').trim();

      if (!name || name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        nextFieldErrors.name = `Organization name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
      }

      if (!contactPerson || contactPerson.length < MIN_NAME_LENGTH || contactPerson.length > MAX_NAME_LENGTH) {
        nextFieldErrors.contactPerson = `Contact person must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
      }

      if (!email || !EMAIL_PATTERN.test(email)) {
        nextFieldErrors.email = 'Enter a valid email address.';
      }

      const phoneError = validatePhoneNumber(phone);
      if (phoneError) {
        nextFieldErrors.phone = phoneError;
      }

      if (!address || address.length < MIN_ADDRESS_LENGTH || address.length > MAX_ADDRESS_LENGTH) {
        nextFieldErrors.address = `Address must be between ${MIN_ADDRESS_LENGTH} and ${MAX_ADDRESS_LENGTH} characters.`;
      }

      if (!specialization) {
        nextFieldErrors.specialization = 'Specialization is required.';
      }

      if (!formData.status) {
        nextFieldErrors.status = 'Status is required.';
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }

      setFieldErrors({});

      if (partner) {
        handleUpdatePartner(partner.id, { ...formData, name, contactPerson, email, phone, address, specialization });
      } else {
        handleCreatePartner({ ...formData, name, contactPerson, email, phone, address, specialization });
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{partner ? 'Edit NGO Partner' : 'Add New NGO Partner'}</h2>
            <button className="close-btn" onClick={onCancel}>×</button>
          </div>
          <form className="dispatch-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organization Logo</label>
              <div className="profile-upload-compact">
                <div className="logo-preview-small">
                  {formData.profilePicture ? (
                    <img 
                      src={formData.profilePicture} 
                      alt="Logo" 
                      className="logo-image-small"
                    />
                  ) : (
                    <div className="logo-placeholder-small">
                      <span>🏢</span>
                    </div>
                  )}
                </div>
                <div className="logo-upload-controls">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="profile-upload-input"
                    id="logo-upload"
                  />
                  <button 
                    type="button" 
                    className="btn-compact"
                    onClick={() => document.getElementById('logo-upload').click()}
                  >
                    {formData.profilePicture ? 'Change' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Organization Name</label>
              <input
                type="text"
                value={formData.name}
                  onChange={(e) => {
                    setFormData({...formData, name: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={getInputClass('name')}
                required
              />
                {fieldErrors.name && <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                  onChange={(e) => {
                    setFormData({...formData, contactPerson: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                  }}
                  className={getInputClass('contactPerson')}
                required
              />
                {fieldErrors.contactPerson && <p className="mt-1 text-xs text-rose-600">{fieldErrors.contactPerson}</p>}
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  className={getInputClass('email')}
                required
              />
                {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                  onChange={(e) => {
                    setFormData({...formData, phone: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={getInputClass('phone')}
                required
              />
                {fieldErrors.phone && <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>}
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  className={getInputClass('address')}
                required
                rows={3}
              />
                {fieldErrors.address && <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>}
            </div>
            <div className="form-group">
              <label>Specialization</label>
              <select
                value={formData.specialization}
                  onChange={(e) => {
                    setFormData({...formData, specialization: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, specialization: '' }));
                  }}
                  className={getInputClass('specialization')}
                required
              >
                {specializationOptions.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
                {fieldErrors.specialization && <p className="mt-1 text-xs text-rose-600">{fieldErrors.specialization}</p>}
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                  onChange={(e) => {
                    setFormData({...formData, status: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, status: '' }));
                  }}
                  className={getInputClass('status')}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
                {fieldErrors.status && <p className="mt-1 text-xs text-rose-600">{fieldErrors.status}</p>}
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {partner ? 'Update Partner' : 'Add Partner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      <PageHeader 
        role={isInventoryOfficer ? 'Inventory Officer / NGO Directory' : 'Admin / Partner Management'}
        title="Partner Directory"
        description={isInventoryOfficer 
            ? "View and search NGO partners and their contact information" 
          : "Manage NGO partner organizations and their contact details"}
        showReadOnlyBadge={isInventoryOfficer}
      />

      {/* Partner Directory Content */}
      {canEdit && (
        <div className="flex flex-wrap gap-3">
          <button 
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
            onClick={() => setShowCreateForm(true)}
          >
            Add New Partner
          </button>
        </div>
      )}

      {/* Filters */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
            <select 
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Partners List */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          NGO Partners ({filteredPartners.length})
        </h2>
        
        {filteredPartners.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-2xl">🏢</span>
            </div>
            <p className="text-lg font-medium">No NGO partners found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPartners.map(partner => (
              <div key={partner.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                      {partner.profilePicture ? (
                        <img 
                          src={partner.profilePicture} 
                          alt={partner.name} 
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-lg">{partner.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{partner.name}</h3>
                      <p className="text-sm text-slate-600">{partner.contactPerson}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium mt-2 ${
                        partner.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          partner.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}></span>
                        {partner.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-900">{partner.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-900">{partner.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Specialization:</span>
                    <span className="text-slate-900">{partner.specialization}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="text-slate-500">Address:</span>
                    <span className="text-slate-900">{partner.address}</span>
                  </div>
                </div>

                {/* Action buttons - only for admin */}
                {canEdit && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button 
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
                      onClick={() => setEditingPartner(partner)}
                    >
                      Edit
                    </button>
                    <button 
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                        partner.status === 'active' 
                          ? 'border border-amber-200 bg-amber-50 text-amber-700' 
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                      onClick={() => handleToggleStatus(partner.id)}
                    >
                      {partner.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:-translate-y-0.5"
                      onClick={() => handleDeletePartner(partner.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Forms - only for admin */}
      {canEdit && showCreateForm && (
        <PartnerForm 
          onSubmit={handleCreatePartner}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {canEdit && editingPartner && (
        <PartnerForm 
          partner={editingPartner}
          onSubmit={handleUpdatePartner}
          onCancel={() => setEditingPartner(null)}
        />
      )}
    </div>
  );
};

export default PartnerDirectory;
