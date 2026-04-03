import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Pages.css';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [activeTab, setActiveTab] = useState('staff');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewModal, setViewModal] = useState({ show: false, type: null, content: null, title: null });

  // Check user role for permissions
  const isInventoryOfficer = user?.role === 'inventory_officer';
  const canEditUsers = user?.role === 'admin';
  const canEditPartners = user?.role === 'admin';

  // Auto-show partners tab for inventory officers (they can't see staff)
  useEffect(() => {
    if (isInventoryOfficer) {
      setActiveTab('partners');
    }
  }, [isInventoryOfficer]);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockUsers = [
      {
        id: 1,
        name: 'John Smith',
        email: 'john.smith@disasterrelief.org',
        role: 'admin',
        status: 'active',
        createdAt: '2024-01-15T08:00:00Z',
        lastLogin: '2024-03-26T14:30:00Z',
        profilePicture: '/assets/profiles/users/user_1.jpg',
        joinDate: '2024-01-15'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah.j@disasterrelief.org',
        role: 'dmc_officer',
        status: 'active',
        createdAt: '2024-02-01T09:15:00Z',
        lastLogin: '2024-03-26T10:20:00Z',
        profilePicture: '/assets/profiles/users/user_2.jpg',
        joinDate: '2024-02-01'
      },
      {
        id: 3,
        name: 'Michael Chen',
        email: 'michael.chen@disasterrelief.org',
        role: 'inventory_officer',
        status: 'inactive',
        createdAt: '2024-01-20T11:30:00Z',
        lastLogin: '2024-03-20T16:45:00Z',
        profilePicture: '/assets/profiles/users/user_3.jpg',
        joinDate: '2024-01-20'
      },
      {
        id: 4,
        name: 'Emily Davis',
        email: 'emily.davis@disasterrelief.org',
        role: 'allocation_officer',
        status: 'active',
        createdAt: '2024-03-01T13:45:00Z',
        lastLogin: '2024-03-26T09:00:00Z',
        profilePicture: '/assets/profiles/users/user_4.jpg',
        joinDate: '2024-03-01'
      }
    ];

    const mockPartners = [
      {
        id: 1,
        name: 'Red Cross Society',
        contactPerson: 'Dr. James Wilson',
        email: 'jwilson@redcross.org',
        phone: '+1-555-0101',
        address: '123 Humanitarian Ave, Relief City, RC 12345',
        specialization: 'Emergency Relief',
        status: 'active',
        createdAt: '2024-01-10T08:00:00Z',
        lastContact: '2024-03-25T15:30:00Z',
        profilePicture: '/assets/profiles/partners/partner_1.jpg',
        partnershipDate: '2024-01-10',
        organizationProfile: '/assets/documents/partners/organization-profiles/red_cross_profile.pdf',
        registrationCertificate: '/assets/documents/partners/registration-certificates/red_cross_cert.pdf',
        verificationDocument: '/assets/documents/partners/verification-documents/red_cross_verification.pdf'
      },
      {
        id: 2,
        name: 'Global Food Initiative',
        contactPerson: 'Maria Rodriguez',
        email: 'maria.r@globalfood.org',
        phone: '+1-555-0102',
        address: '456 Nutrition Blvd, Food City, FC 67890',
        specialization: 'Food Distribution',
        status: 'active',
        createdAt: '2024-02-15T10:00:00Z',
        lastContact: '2024-03-24T11:20:00Z',
        profilePicture: '/assets/profiles/partners/partner_2.jpg',
        partnershipDate: '2024-02-15',
        organizationProfile: '/assets/documents/partners/organization-profiles/gfi_profile.pdf',
        registrationCertificate: '/assets/documents/partners/registration-certificates/gfi_cert.pdf',
        verificationDocument: '/assets/documents/partners/verification-documents/gfi_verification.pdf'
      },
      {
        id: 3,
        name: 'Medical Aid International',
        contactPerson: 'Dr. Robert Kim',
        email: 'rkim@medicalaid.org',
        phone: '+1-555-0103',
        address: '789 Health Center Dr, Medical City, MC 11223',
        specialization: 'Medical Support',
        status: 'inactive',
        createdAt: '2024-01-25T14:30:00Z',
        lastContact: '2024-03-18T09:45:00Z',
        profilePicture: '/assets/profiles/partners/partner_3.jpg',
        partnershipDate: '2024-01-25',
        organizationProfile: '/assets/documents/partners/organization-profiles/mai_profile.pdf',
        registrationCertificate: '/assets/documents/partners/registration-certificates/mai_cert.pdf',
        verificationDocument: '/assets/documents/partners/verification-documents/mai_verification.pdf'
      },
      {
        id: 4,
        name: 'Shelter Builders Alliance',
        contactPerson: 'Lisa Thompson',
        email: 'lisa.t@shelteralliance.org',
        phone: '+1-555-0104',
        address: '321 Construction Way, Build City, BC 44556',
        specialization: 'Shelter Management',
        status: 'active',
        createdAt: '2024-03-05T16:00:00Z',
        lastContact: '2024-03-26T13:15:00Z',
        profilePicture: '/assets/profiles/partners/partner_4.jpg',
        partnershipDate: '2024-03-05',
        organizationProfile: '/assets/documents/partners/organization-profiles/sba_profile.pdf',
        registrationCertificate: '/assets/documents/partners/registration-certificates/sba_cert.pdf',
        verificationDocument: '/assets/documents/partners/verification-documents/sba_verification.pdf'
      }
    ];

    setUsers(mockUsers);
    setPartners(mockPartners);
  }, []);

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'dmc_officer', label: 'DMC Officer' },
    { value: 'inventory_officer', label: 'Inventory Officer' },
    { value: 'allocation_officer', label: 'Allocation Officer' },
    { value: 'tracking_officer', label: 'Tracking Officer' },
    { value: 'charity_staff', label: 'Charity Staff' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
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

  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

  const filteredPartners = partners.filter(partner => {
    if (filterStatus === 'all') return true;
    return partner.status === filterStatus;
  });

  const handleCreateUser = (userData) => {
    const newUser = {
      id: users.length + 1,
      ...userData,
      status: userData.status || 'active',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      profilePicture: userData.profilePicture || null
    };
    setUsers([...users, newUser]);
    setShowCreateForm(false);
  };

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
    setShowPartnerForm(false);
  };

  const handleUpdateUser = (userId, updates) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ));
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleToggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
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

  const handleTogglePartnerStatus = (partnerId) => {
    setPartners(partners.map(partner => 
      partner.id === partnerId 
        ? { ...partner, status: partner.status === 'active' ? 'inactive' : 'active' }
        : partner
    ));
  };

  // View Functions for Partner Documents
  const viewPartnerDocument = (partner, documentType) => {
    let content = '';
    let title = '';

    switch (documentType) {
      case 'organizationProfile':
        content = `
ORGANIZATION PROFILE DOCUMENT
=============================
Partner Name: ${partner.name}
Contact Person: ${partner.contactPerson}
Email: ${partner.email}
Phone: ${partner.phone}
Address: ${partner.address}
Specialization: ${partner.specialization}
Status: ${partner.status}
Partnership Date: ${partner.partnershipDate}

Document Type: Organization Profile
File Path: ${partner.organizationProfile || 'Not uploaded'}
Uploaded: ${partner.organizationProfile ? 'Yes' : 'No'}

This document contains detailed information about the NGO organization,
including their mission, capabilities, and operational areas.
        `.trim();
        title = `Organization Profile - ${partner.name}`;
        break;
        
      case 'registrationCertificate':
        content = `
REGISTRATION CERTIFICATE
========================
Partner Name: ${partner.name}
Contact Person: ${partner.contactPerson}
Email: ${partner.email}
Phone: ${partner.phone}
Address: ${partner.address}
Specialization: ${partner.specialization}
Status: ${partner.status}
Registration Date: ${partner.partnershipDate}

Document Type: Registration Certificate
File Path: ${partner.registrationCertificate || 'Not uploaded'}
Uploaded: ${partner.registrationCertificate ? 'Yes' : 'No'}

This is the official registration certificate issued by the relevant
government authority, confirming the legal status of the organization.
        `.trim();
        title = `Registration Certificate - ${partner.name}`;
        break;
        
      case 'verificationDocument':
        content = `
VERIFICATION / APPROVAL DOCUMENT
=================================
Partner Name: ${partner.name}
Contact Person: ${partner.contactPerson}
Email: ${partner.email}
Phone: ${partner.phone}
Address: ${partner.address}
Specialization: ${partner.specialization}
Status: ${partner.status}
Verification Date: ${partner.partnershipDate}

Document Type: Verification / Approval Document
File Path: ${partner.verificationDocument || 'Not uploaded'}
Uploaded: ${partner.verificationDocument ? 'Yes' : 'No'}

This document contains verification and approval details from
disaster management authorities, confirming the organization's
eligibility for partnership in relief operations.
        `.trim();
        title = `Verification Document - ${partner.name}`;
        break;
        
      default:
        content = 'Document not found';
        title = 'Document View';
    }

    setViewModal({
      show: true,
      type: 'partner-document',
      content: content,
      title: title
    });
  };

  const UserForm = ({ user, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'admin',
      status: user?.status || 'active',
      profilePicture: user?.profilePicture || null,
      joinDate: user?.joinDate || new Date().toISOString().split('T')[0]
    });

    const formatDateForDisplay = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    };

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
      if (user) {
        handleUpdateUser(user.id, formData);
      } else {
        handleCreateUser(formData);
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{user ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
            <button className="close-btn" onClick={onCancel}>×</button>
          </div>
          <form className="dispatch-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Profile Picture</label>
              <div className="profile-upload-container">
                {formData.profilePicture ? (
                  <img 
                    src={formData.profilePicture} 
                    alt="Profile" 
                    className="profile-preview"
                  />
                ) : (
                  <div className="profile-placeholder">
                    <span className="profile-icon">👤</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="profile-upload-input"
                />
                <button 
                  type="button" 
                  className="btn-secondary upload-btn"
                  onClick={() => document.querySelector('.profile-upload-input').click()}
                >
                  {formData.profilePicture ? 'Change Photo' : 'Upload Photo'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
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
              <label>Join Date</label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                placeholder="DD/MM/YY"
                required
              />
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Format: DD/MM/YY (e.g., 26/03/24)
              </small>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
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
                {user ? 'Update Staff' : 'Create Staff'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
      profilePicture: partner?.profilePicture || null,
      partnershipDate: partner?.partnershipDate || new Date().toISOString().split('T')[0],
      organizationProfile: partner?.organizationProfile || null,
      registrationCertificate: partner?.registrationCertificate || null,
      verificationDocument: partner?.verificationDocument || null
    });

    const formatDateForDisplay = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    };

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

    const handleDocumentUpload = (documentType) => (e) => {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        // Generate unique filename
        const timestamp = new Date().getTime();
        const fileName = `${documentType}_${timestamp}.pdf`;
        
        // Determine folder path based on document type
        let folderPath;
        switch (documentType) {
          case 'organizationProfile':
            folderPath = '/assets/documents/partners/organization-profiles/';
            break;
          case 'registrationCertificate':
            folderPath = '/assets/documents/partners/registration-certificates/';
            break;
          case 'verificationDocument':
            folderPath = '/assets/documents/partners/verification-documents/';
            break;
          default:
            folderPath = '/assets/documents/partners/';
        }
        
        // Store file path instead of base64
        const filePath = folderPath + fileName;
        setFormData({...formData, [documentType]: filePath});
        
        // In a real application, you would upload the file to server here
        // For now, we'll just store the path
        console.log('Document would be saved to:', filePath);
      }
    };

    const getDocumentName = (filePath) => {
      if (!filePath) return '';
      return filePath.split('/').pop();
    };

    const removeDocument = (documentType) => {
      setFormData({...formData, [documentType]: null});
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
              <div className="profile-upload-container">
                {formData.profilePicture ? (
                  <img 
                    src={formData.profilePicture} 
                    alt="Organization Logo" 
                    className="profile-preview"
                  />
                ) : (
                  <div className="profile-placeholder">
                    <span className="profile-icon">🏢</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="profile-upload-input"
                />
                <button 
                  type="button" 
                  className="btn-secondary upload-btn"
                  onClick={() => document.querySelector('.profile-upload-input').click()}
                >
                  {formData.profilePicture ? 'Change Logo' : 'Upload Logo'}
                </button>
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
              <label>Partnership Date</label>
              <input
                type="date"
                value={formData.partnershipDate}
                onChange={(e) => setFormData({...formData, partnershipDate: e.target.value})}
                placeholder="DD/MM/YY"
                required
              />
              <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Format: DD/MM/YY (e.g., 26/03/24)
              </small>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
                rows={3}
              ></textarea>
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

            {/* Document Upload Fields */}
            <div className="form-group">
              <label>Organization Profile Document</label>
              <div className="document-upload-container">
                {formData.organizationProfile ? (
                  <div className="document-preview">
                    <span className="document-icon">📄</span>
                    <span className="document-name">{formData.organizationProfile.split('/').pop()}</span>
                    <div className="document-actions">
                      <button 
                        type="button" 
                        className="btn-primary"
                        onClick={() => viewPartnerDocument(formData, 'organizationProfile')}
                        title="View organization profile document"
                      >
                        View Document
                      </button>
                      <button 
                        type="button" 
                        className="btn-remove-document"
                        onClick={() => setFormData({...formData, organizationProfile: null})}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="document-upload-area">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleDocumentUpload('organizationProfile')}
                      className="document-input"
                      id="org-profile"
                    />
                    <label htmlFor="org-profile" className="document-upload-label">
                      <span className="upload-icon">📤</span>
                      <span>Upload Organization Profile (PDF)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Registration Certificate</label>
              <div className="document-upload-container">
                {formData.registrationCertificate ? (
                  <div className="document-preview">
                    <span className="document-icon">📄</span>
                    <span className="document-name">{formData.registrationCertificate.split('/').pop()}</span>
                    <div className="document-actions">
                      <button 
                        type="button" 
                        className="btn-primary"
                        onClick={() => viewPartnerDocument(formData, 'registrationCertificate')}
                        title="View registration certificate document"
                      >
                        View Document
                      </button>
                      <button 
                        type="button" 
                        className="btn-remove-document"
                        onClick={() => setFormData({...formData, registrationCertificate: null})}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="document-upload-area">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleDocumentUpload('registrationCertificate')}
                      className="document-input"
                      id="reg-certificate"
                    />
                    <label htmlFor="reg-certificate" className="document-upload-label">
                      <span className="upload-icon">📤</span>
                      <span>Upload Registration Certificate (PDF)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Verification / Approval Document</label>
              <div className="document-upload-container">
                {formData.verificationDocument ? (
                  <div className="document-preview">
                    <span className="document-icon">📄</span>
                    <span className="document-name">{formData.verificationDocument.split('/').pop()}</span>
                    <div className="document-actions">
                      <button 
                        type="button" 
                        className="btn-primary"
                        onClick={() => viewPartnerDocument(formData, 'verificationDocument')}
                        title="View verification document"
                      >
                        View Document
                      </button>
                      <button 
                        type="button" 
                        className="btn-remove-document"
                        onClick={() => setFormData({...formData, verificationDocument: null})}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="document-upload-area">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleDocumentUpload('verificationDocument')}
                      className="document-input"
                      id="verification-doc"
                    />
                    <label htmlFor="verification-doc" className="document-upload-label">
                      <span className="upload-icon">📤</span>
                      <span>Upload Verification Document (PDF)</span>
                    </label>
                  </div>
                )}
              </div>
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
    <div className="user-management">
      <div className="tracking-header">
        <h1>User Management</h1>
        <p>Manage system users and NGO partner organizations</p>
      </div>

      <div className="directory-tabs">
        {!isInventoryOfficer && (
          <button
            className={`tab-button ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <span className="tab-icon">👥</span>
            <span className="tab-label">Staff Directory</span>
          </button>
        )}
        <button
          className={`tab-button ${activeTab === 'partners' ? 'active' : ''}`}
          onClick={() => setActiveTab('partners')}
        >
          <span className="tab-icon">🏢</span>
          <span className="tab-label">Partner Directory</span>
        </button>
      </div>

      <div className="directory-content">
        {activeTab === 'staff' && (
          <div className="tracking-section">
            <div className="tracking-actions">
              <div className="filter-controls">
                <label>Filter by Role:</label>
                <select 
                  className="filter-select"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {canEditUsers && (
                <button 
                  className="btn-primary btn-create"
                  onClick={() => setShowCreateForm(true)}
                >
                  <span className="btn-icon">+</span>
                  <span className="btn-text">Create Staff</span>
                </button>
              )}
            </div>

            <div className="records-container">
              {filteredUsers.length === 0 ? (
                <div className="no-records">
                  <p>No staff members found</p>
                </div>
              ) : (
                <div className="records-grid">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-semibold text-lg border-2 border-slate-200">
                            {user.profilePicture ? (
                              <img 
                                src={user.profilePicture} 
                                alt={user.name} 
                                className="h-8 w-8 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="text-xl">{user.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                            <span className="text-sm text-slate-600">{user.email}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}></span>
                          {user.status}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Role:</span>
                          <span className="text-slate-900">{user.role.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Status:</span>
                          <span className="text-slate-900">{user.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Created:</span>
                          <span className="text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Last Login:</span>
                          <span className="text-slate-900">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </span>
                        </div>
                      </div>

                      <div className="record-actions">
                        <div className="status-actions">
                          <button 
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium ${
                              user.status === 'active' 
                                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            onClick={() => handleToggleUserStatus(user.id)}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                        {canEditUsers && (
                          <div className="flex gap-2">
                            <button 
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
                              onClick={() => setEditingUser(user)}
                            >
                              Edit
                            </button>
                            <button 
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-[0_10px_18px_rgba(239,68,68,0.2)] transition hover:-translate-y-0.5"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="tracking-section">
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
              {canEditPartners && (
                <button 
                  className="btn-primary btn-create"
                  onClick={() => setShowPartnerForm(true)}
                >
                  <span className="btn-icon">+</span>
                  <span className="btn-text">Create Partner</span>
                </button>
              )}
            </div>

            <div className="records-container">
              {filteredPartners.length === 0 ? (
                <div className="no-records">
                  <p>No NGO partners found</p>
                </div>
              ) : (
                <div className="records-grid">
                  {filteredPartners.map(partner => (
                    <div key={partner.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-semibold text-lg border-2 border-slate-200">
                            {partner.profilePicture ? (
                              <img 
                                src={partner.profilePicture} 
                                alt={partner.name} 
                                className="h-8 w-8 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="text-xl">{partner.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900">{partner.name}</h3>
                            <span className="text-sm text-slate-600">{partner.contactPerson}</span>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
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
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Email:</span>
                          <span className="text-slate-900">{partner.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Phone:</span>
                          <span className="text-slate-900">{partner.phone}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-slate-500">Specialization:</span>
                          <span className="text-slate-900">{partner.specialization}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-slate-500">Address:</span>
                          <span className="text-slate-900">{partner.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Created:</span>
                          <span className="text-slate-900">{new Date(partner.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Last Contact:</span>
                          <span className="text-slate-900">
                            {partner.lastContact ? new Date(partner.lastContact).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>

                      <div className="document-section">
                        <h4>Documents</h4>
                        <div className="document-list">
                          <div className="document-item">
                            <span className="document-label">Organization Profile:</span>
                            {partner.organizationProfile ? (
                              <div className="document-actions">
                                <button 
                                  className="btn-view"
                                  onClick={() => viewPartnerDocument(partner, 'organizationProfile')}
                                  title="View organization profile"
                                >
                                  View Profile
                                </button>
                              </div>
                            ) : (
                              <span className="no-document">Not uploaded</span>
                            )}
                          </div>
                          <div className="document-item">
                            <span className="document-label">Registration Certificate:</span>
                            {partner.registrationCertificate ? (
                              <div className="document-actions">
                                <button 
                                  className="btn-view"
                                  onClick={() => viewPartnerDocument(partner, 'registrationCertificate')}
                                  title="View registration certificate"
                                >
                                  View Certificate
                                </button>
                              </div>
                            ) : (
                              <span className="no-document">Not uploaded</span>
                            )}
                          </div>
                          <div className="document-item">
                            <span className="document-label">Verification Document:</span>
                            {partner.verificationDocument ? (
                              <div className="document-actions">
                                <button 
                                  className="btn-view"
                                  onClick={() => viewPartnerDocument(partner, 'verificationDocument')}
                                  title="View verification document"
                                >
                                  View Verification
                                </button>
                              </div>
                            ) : (
                              <span className="no-document">Not uploaded</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="record-actions">
                        <div className="status-actions">
                          <button 
                            className={`btn-secondary ${partner.status === 'active' ? 'btn-edit' : 'btn-delete'}`}
                            onClick={() => handleTogglePartnerStatus(partner.id)}
                          >
                            {partner.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                        {canEditPartners && (
                          <div className="action-buttons">
                            <button 
                              className="btn-edit"
                              onClick={() => setEditingPartner(partner)}
                            >
                              Edit Partner
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeletePartner(partner.id)}
                            >
                              Delete Partner
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <UserForm 
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingUser && (
        <UserForm 
          user={editingUser}
          onSubmit={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {showPartnerForm && (
        <PartnerForm 
          onSubmit={handleCreatePartner}
          onCancel={() => setShowPartnerForm(false)}
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

export default UserManagement;
