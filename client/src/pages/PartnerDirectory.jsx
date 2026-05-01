import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import './Pages.css';

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
      if (partner) {
        handleUpdatePartner(partner.id, formData);
      } else {
        handleCreatePartner(formData);
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Specialization</label>
              <select
                value={formData.specialization}
                onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                required
              >
                {specializationOptions.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
