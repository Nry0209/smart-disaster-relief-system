import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Package, MapPin, Phone, Mail, Building, Users, CheckCircle, AlertTriangle, Clock, ArrowRight, Search, Filter, Truck, Bell, Trash2, X, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader';
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

  const extractUsersArray = (payload) => {
    if (Array.isArray(payload?.data?.users)) return payload.data.users;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const extractPartnersArray = (payload) => {
    if (Array.isArray(payload?.data?.partners)) return payload.data.partners;
    if (Array.isArray(payload?.partners)) return payload.partners;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const mapStaffUser = (staffUser) => ({
    id: staffUser._id || staffUser.id,
    name: staffUser.fullName || staffUser.name || '',
    email: staffUser.email || '',
    role: staffUser.role || '',
    status: staffUser.status || 'inactive',
    phone: staffUser.phone || '',
    department: staffUser.department || '',
    createdAt: staffUser.createdAt,
    lastLogin: staffUser.lastLogin,
    profilePicture: staffUser.profilePicture,
    joinDate: staffUser.joinDate
  });

  const mapPartner = (partner) => ({
    id: partner._id || partner.id,
    name: partner.organizationName || partner.name || '',
    email: partner.email || '',
    phone: partner.phone || '',
    address: partner.address || '',
    contactPerson: partner.contactPerson || '',
    type: partner.type || '',
    services: Array.isArray(partner.services) ? partner.services : [],
    status: partner.status || 'inactive',
    createdAt: partner.createdAt,
    lastContact: partner.lastContact,
    profilePicture: partner.profilePicture
  });



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



  // Load users from API instead of mock data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/staff/all', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const transformedUsers = extractUsersArray(data).map(mapStaffUser);
          setUsers(transformedUsers);
        } else {
          console.error('Failed to fetch users:', response.statusText);
          // Fallback to empty array if API fails
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };

    const fetchPartners = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const response = await fetch('http://localhost:5000/api/partners', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const transformedPartners = extractPartnersArray(data).map(mapPartner);
          setPartners(transformedPartners);
        } else {
          console.error('Failed to fetch partners:', response.statusText);
          setPartners([]);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
        setPartners([]);
      }
    };

    // Fetch both users and partners
    fetchUsers();
    fetchPartners();
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



  const handleCreateUser = async (userData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      // Transform frontend data to backend format
      const backendUserData = {
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        phone: userData.phone || '',
        department: userData.department || '',
        status: userData.status || 'active',
        profilePicture: userData.profilePicture || null
      };

      const response = await fetch('http://localhost:5000/api/auth/staff/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendUserData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('User created successfully:', result);
        
        // Show success message with OTP if available (dev mode)
        let successMsg = result?.data?.emailSent 
          ? 'Staff member created successfully! OTP has been sent to their email.'
          : 'Staff member created successfully! ⚠️ Email not sent (check server logs for OTP).';
        
        if (result?.data?.otp) {
          successMsg += `\n\n🔐 DEV MODE OTP: ${result.data.otp}`;
        }

        if (result?.data?.setupLink) {
          successMsg += `\n\n🔗 DEV MODE SETUP LINK: ${result.data.setupLink}`;
        }
        
        alert(successMsg);
        
        // Refresh users list
        const fetchUsers = async () => {
          const usersResponse = await fetch('http://localhost:5000/api/auth/staff/all', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            const transformedUsers = extractUsersArray(usersData).map(mapStaffUser);
            setUsers(transformedUsers);
          }
        };
        
        await fetchUsers();
        setShowCreateForm(false);
      } else {
        const error = await response.json();
        console.error('Failed to create user:', error.message);
        alert('Failed to create user: ' + error.message);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + error.message);
    }
  };



  const handleCreatePartner = async (partnerData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      // Transform frontend data to backend format
      const backendPartnerData = {
        organizationName: partnerData.name,
        email: partnerData.email,
        phone: partnerData.phone || '',
        address: partnerData.address || '',
        contactPerson: partnerData.contactPerson || '',
        type: partnerData.type || 'NGO',
        services: partnerData.services || [],
        status: partnerData.status || 'active'
      };

      const response = await fetch('http://localhost:5000/api/partners', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendPartnerData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Partner created successfully:', result);
        
        // Refresh partners list
        const fetchPartners = async () => {
          const partnersResponse = await fetch('http://localhost:5000/api/partners', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (partnersResponse.ok) {
            const partnersData = await partnersResponse.json();
            const transformedPartners = extractPartnersArray(partnersData).map(mapPartner);
            setPartners(transformedPartners);
          }
        };
        
        await fetchPartners();
        setShowPartnerForm(false);
      } else {
        const error = await response.json();
        console.error('Failed to create partner:', error.message);
        alert('Failed to create partner: ' + error.message);
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      alert('Error creating partner: ' + error.message);
    }
  };

  const handleUpdateUser = (userId, updates) => {

    setUsers(users.map(user => 

      user.id === userId ? { ...user, ...updates } : user

    ));

    setEditingUser(null);

  };



  const handleDeleteUser = async (userId) => {

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user');
      }

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      alert(result.message || 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
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



  const handleDeletePartner = async (partnerId) => {

    if (!window.confirm('Are you sure you want to delete this NGO partner?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/partners/${partnerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete partner');
      }

      setPartners((prevPartners) => prevPartners.filter((partner) => partner.id !== partnerId));
      alert(result.message || 'Partner deleted successfully');
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Error deleting partner: ' + error.message);
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

      fullName: user?.name || '',

      email: user?.email || '',

      role: user?.role || 'charity_staff',

      phone: user?.phone || '',

      department: user?.department || '',

      status: user?.status || 'active',

      profilePicture: user?.profilePicture || null

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

      if (!formData.fullName || !formData.email || !formData.role) {
        alert('Full name, email, and role are required');
        return;
      }

      if (user) {

        handleUpdateUser(user.id, formData);

      } else {

        handleCreateUser(formData);

      }

    };



    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">{user ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
            <button 
              className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              onClick={onCancel}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg border-2 border-blue-200">
                    {formData.profilePicture ? (
                      <img 
                        src={formData.profilePicture} 
                        alt="Profile" 
                        className="h-18 w-18 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-semibold text-2xl">{formData.fullName.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profile-upload"
                    />
                    <label
                      htmlFor="profile-upload"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </label>
                    {formData.profilePicture && (
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, profilePicture: null})}
                        className="ml-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="dmc_officer">DMC Officer</option>
                    <option value="inventory_officer">Inventory Officer</option>
                    <option value="allocation_officer">Allocation Officer</option>
                    <option value="tracking_officer">Tracking Officer</option>
                    <option value="charity_staff">Charity Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> When this staff member logs in for the first time, they will receive an OTP via email for secure verification. They will then be asked to set their own password.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                {user ? 'Update Staff' : 'Create & Send OTP'}
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">{partner ? 'Edit NGO Partner' : 'Add New NGO Partner'}</h2>
            <button 
              className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              onClick={onCancel}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Organization Logo</label>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-lg border-2 border-emerald-200">
                    {formData.profilePicture ? (
                      <img 
                        src={formData.profilePicture} 
                        alt="Organization Logo" 
                        className="h-18 w-18 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-emerald-600 font-semibold text-2xl">{formData.name.charAt(0).toUpperCase() || 'N'}</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="partner-logo-upload"
                    />
                    <label
                      htmlFor="partner-logo-upload"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Logo
                    </label>
                    {formData.profilePicture && (
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, profilePicture: null})}
                        className="ml-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter complete address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Specialization *</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="Emergency Relief">Emergency Relief</option>
                    <option value="Food Distribution">Food Distribution</option>
                    <option value="Medical Aid">Medical Aid</option>
                    <option value="Shelter Management">Shelter Management</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Logistics">Logistics</option>
                    <option value="General Relief">General Relief</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Partnership Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.partnershipDate}
                    onChange={(e) => setFormData({...formData, partnershipDate: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Required Documents</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Organization Profile (PDF)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                    {formData.organizationProfile ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{getDocumentName(formData.organizationProfile)}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument('organizationProfile')}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleDocumentUpload('organizationProfile')}
                          className="hidden"
                          id="org-profile"
                        />
                        <label
                          htmlFor="org-profile"
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Organization Profile
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Registration Certificate (PDF)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                    {formData.registrationCertificate ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{getDocumentName(formData.registrationCertificate)}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument('registrationCertificate')}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleDocumentUpload('registrationCertificate')}
                          className="hidden"
                          id="reg-cert"
                        />
                        <label
                          htmlFor="reg-cert"
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Registration Certificate
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Verification Document (PDF)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                    {formData.verificationDocument ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{getDocumentName(formData.verificationDocument)}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument('verificationDocument')}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleDocumentUpload('verificationDocument')}
                          className="hidden"
                          id="verify-doc"
                        />
                        <label
                          htmlFor="verify-doc"
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Verification Document
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                {partner ? 'Update Partner' : 'Create Partner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="user-management">
      <PageHeader 
        role="Admin / User & Partner Management"
        title="User Management"
        description="Manage system users and NGO partner organizations"
      />



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
                <div className="toolbar-actions">
                  <button
                    className="btn-primary btn-create"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Create Staff</span>
                  </button>
                </div>
              )}

            </div>



            <div className="records-container">
              {filteredUsers.length === 0 ? (
                <div className="no-records">
                  <p>No staff members found</p>
                </div>
              ) : (
                <div className="requests-table-container">
                  <table className="requests-table">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Joined</th>
                        {canEditUsers && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs overflow-hidden">
                                {user.profilePicture ? (
                                  <img
                                    src={user.profilePicture}
                                    alt={user.name || 'Staff'}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span>{(user.name || 'U').charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <span className="font-medium text-slate-900">{user.name || '-'}</span>
                            </div>
                          </td>
                          <td>{user.email || '-'}</td>
                          <td>
                            <span className="urgency-badge" style={{ color: '#334155', background: '#e2e8f0' }}>
                              {(user.role || '-').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                color: user.status === 'active' ? '#166534' : '#475569',
                                background: user.status === 'active' ? '#dcfce7' : '#e2e8f0'
                              }}
                            >
                              {user.status || 'inactive'}
                            </span>
                          </td>
                          <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                          <td>{new Date(user.joinDate || user.createdAt).toLocaleDateString()}</td>
                          {canEditUsers && (
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    user.status === 'active'
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                  onClick={() => handleToggleUserStatus(user.id)}
                                >
                                  {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-200 transition-colors"
                                  onClick={() => setEditingUser(user)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="toolbar-actions">
                  <button
                    className="btn-primary btn-create"
                    onClick={() => setShowPartnerForm(true)}
                  >
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Create Partner</span>
                  </button>
                </div>
              )}

            </div>



            <div className="records-container">

              {filteredPartners.length === 0 ? (

                <div className="no-records">

                  <p>No NGO partners found</p>

                </div>

              ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPartners.map(partner => (
                    <div key={partner.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-lg border-2 border-emerald-200">
                            {partner.profilePicture ? (
                              <img 
                                src={partner.profilePicture} 
                                alt={partner.name} 
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-emerald-600 font-semibold">{partner.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">{partner.name}</h3>
                            <p className="text-sm text-slate-600 mb-2">{partner.contactPerson}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-slate-100 text-slate-600">
                                <Building className="w-3 h-3" />
                                {partner.specialization}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-slate-100 text-slate-600">
                                <Calendar className="w-3 h-3" />
                                {new Date(partner.partnershipDate).toLocaleDateString()}
                              </span>
                            </div>
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
                      
                      <div className="border-t border-slate-200 pt-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Email:</span>
                            <p className="font-medium text-slate-900 truncate">{partner.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Phone:</span>
                            <p className="font-medium text-slate-900">{partner.phone}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span className="text-slate-500">Address:</span>
                            <p className="font-medium text-slate-900 text-xs leading-tight">{partner.address}</p>
                          </div>
                        </div>
                      </div>
                      
                      {canEditPartners && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                          <div className="flex gap-2">
                            <button 
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                partner.status === 'active' 
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              onClick={() => handleTogglePartnerStatus(partner.id)}
                            >
                              {partner.status === 'active' ? '⏸ Deactivate' : '▶ Activate'}
                            </button>
                            <button 
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-200 transition-colors"
                              onClick={() => setEditingPartner(partner)}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="inline-flex items-center gap-2 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
                              onClick={() => handleDeletePartner(partner.id)}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      )}
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

