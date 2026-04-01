import React, { useState, useEffect } from 'react';
import './Pages.css';

const PartnerDirectory = () => {
  const [partners, setPartners] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

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
    setPartners(partners.map(partner => 
      partner.id === partnerId ? { ...partner, ...updates } : partner
    ));
    setEditingPartner(null);
  };

  const handleDeletePartner = (partnerId) => {
    if (window.confirm('Are you sure you want to delete this NGO partner?')) {
      setPartners(partners.filter(partner => partner.id !== partnerId));
    }
  };

  const handleToggleStatus = (partnerId) => {
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
    <div className="partner-directory">
      <div className="tracking-header">
        <h1>Partner/NGO Directory</h1>
        <p>Manage NGO contacts and partner organizations for donation notifications</p>
      </div>

      <div className="tracking-actions">
        <div className="filter-controls">
          <label>Filter by Status:</label>
          <select 
            className="filter-select"
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
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Add New Partner
        </button>
      </div>

      <div className="records-container">
        {filteredPartners.length === 0 ? (
          <div className="no-records">
            <p>No NGO partners found</p>
          </div>
        ) : (
          <div className="records-grid">
            {filteredPartners.map(partner => (
              <div key={partner.id} className="record-card">
                <div className="record-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {partner.profilePicture ? (
                        <img 
                          src={partner.profilePicture} 
                          alt={partner.name} 
                          className="avatar-image"
                        />
                      ) : (
                        <span className="avatar-text">{partner.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <h3>{partner.name}</h3>
                      <span className="user-email">{partner.contactPerson}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${partner.status === 'active' ? 'active' : 'inactive'}`}>
                    {partner.status}
                  </span>
                </div>
                
                <div className="record-details">
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{partner.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{partner.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Specialization:</span>
                    <span className="value">{partner.specialization}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value">{partner.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">{new Date(partner.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Last Contact:</span>
                    <span className="value">
                      {partner.lastContact ? new Date(partner.lastContact).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="record-actions">
                  <div className="status-actions">
                    <button 
                      className={`btn-secondary ${partner.status === 'active' ? 'btn-edit' : 'btn-delete'}`}
                      onClick={() => handleToggleStatus(partner.id)}
                    >
                      {partner.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <div className="action-buttons">
                    <button 
                      className="btn-edit"
                      onClick={() => setEditingPartner(partner)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeletePartner(partner.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateForm && (
        <PartnerForm 
          onSubmit={handleCreatePartner}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingPartner && (
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
