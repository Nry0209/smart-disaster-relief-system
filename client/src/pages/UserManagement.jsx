import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Phone, Mail, Building, Users, Search, Filter, X, Upload, MoreVertical, UserCog, Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './Pages.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MIN_DEPARTMENT_LENGTH = 2;
const MAX_DEPARTMENT_LENGTH = 100;
const MIN_ADDRESS_LENGTH = 10;
const MAX_ADDRESS_LENGTH = 200;
const MAX_PHONE_DIGITS = 10;

function validatePhoneNumber(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, '');
  if (!normalized) return '';

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length !== MAX_PHONE_DIGITS || !PHONE_PATTERN.test(digitsOnly)) {
    return 'Phone number must start with 0 and contain exactly 10 digits.';
  }

  return '';
}

const UserManagement = () => {

  const navigate = useNavigate();

  const { user } = useAuth();

  const [users, setUsers] = useState([]);

  const [partners, setPartners] = useState([]);

  const [activeTab, setActiveTab] = useState('partners');

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [showPartnerForm, setShowPartnerForm] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  const [editingPartner, setEditingPartner] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [staffFetchError, setStaffFetchError] = useState('');
  const [partnerFetchError, setPartnerFetchError] = useState('');

  const [staffSearch, setStaffSearch] = useState('');

  const [partnerSearch, setPartnerSearch] = useState('');

  const [selectedRoles, setSelectedRoles] = useState([]);

  const [selectedStaffStatuses, setSelectedStaffStatuses] = useState([]);

  const [joinedFrom, setJoinedFrom] = useState('');

  const [joinedTo, setJoinedTo] = useState('');

  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [staffViewMode, setStaffViewMode] = useState('cards');

  const [partnerViewMode, setPartnerViewMode] = useState('cards');

  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    actionType: '',
    payload: null,
  });

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
    services: Array.isArray(partner.preferredCategories) ? partner.preferredCategories : (Array.isArray(partner.services) ? partner.services : []),
    status: partner.status || 'inactive',
    createdAt: partner.createdAt,
    lastContact: partner.lastContact,
    profilePicture: partner.profilePicture
  });



  // Check user role for permissions

  const isInventoryOfficer = user?.role === 'inventory_officer';
  const canViewStaff = user?.role === 'admin';
  const canViewPartners = ['admin', 'inventory_officer'].includes(user?.role);

  const canEditUsers = user?.role === 'admin';

  const canEditPartners = user?.role === 'admin';



  // Keep users on tabs they are allowed to access.
  useEffect(() => {
    if (!canViewStaff) {
      setActiveTab('partners');
    }
  }, [canViewStaff]);



  // Load users from API instead of mock data
  useEffect(() => {
    const fetchUsers = async () => {
      if (!canViewStaff) {
        setUsers([]);
        setStaffFetchError('');
        return;
      }

      try {
        setStaffFetchError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setUsers([]);
          setStaffFetchError('Authentication token missing. Please log in again.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/staff/all`, {
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
          const payload = await response.json().catch(() => ({}));
          setUsers([]);
          setStaffFetchError(payload?.message || 'Failed to fetch staff users from database.');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        setStaffFetchError('Failed to fetch staff users from database.');
      }
    };

    const fetchPartners = async () => {
      if (!canViewPartners) {
        setPartners([]);
        setPartnerFetchError('');
        return;
      }

      try {
        setPartnerFetchError('');
        const token = localStorage.getItem('token');
        if (!token) {
          setPartners([]);
          setPartnerFetchError('Authentication token missing. Please log in again.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/partners`, {
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
          const payload = await response.json().catch(() => ({}));
          setPartners([]);
          setPartnerFetchError(payload?.message || 'Failed to fetch partner records from database.');
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
        setPartners([]);
        setPartnerFetchError('Failed to fetch partner records from database.');
      }
    };

    // Fetch both users and partners
    async function loadDirectory() {
      setIsLoadingUsers(true);
      await Promise.allSettled([fetchUsers(), fetchPartners()]);
      setIsLoadingUsers(false);
    }

    loadDirectory();
  }, [canViewPartners, canViewStaff]);

  useEffect(() => {
    if (!toast.message) return;
    const timeout = setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const openConfirmDialog = ({ title, message, actionType, payload }) => {
    setConfirmDialog({ show: true, title, message, actionType, payload });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ show: false, title: '', message: '', actionType: '', payload: null });
  };



  const roleOptions = [

    { value: 'all', label: 'All Roles' },

    { value: 'admin', label: 'Admin' },

    { value: 'dmc_officer', label: 'DMC Officer' },

    { value: 'inventory_officer', label: 'Inventory Officer' },

    { value: 'allocation_officer', label: 'Allocation Officer' },

    { value: 'tracking_officer', label: 'Tracking Officer' },

    { value: 'charity_staff', label: 'Charity Staff' },

    { value: 'ngo_partner', label: 'NGO Partner' }

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



  const filteredUsers = useMemo(() => {
    return users.filter((staffUser) => {
      const matchesSearch =
        !staffSearch.trim() ||
        String(staffUser.name || '').toLowerCase().includes(staffSearch.trim().toLowerCase()) ||
        String(staffUser.email || '').toLowerCase().includes(staffSearch.trim().toLowerCase()) ||
        String(staffUser.department || '').toLowerCase().includes(staffSearch.trim().toLowerCase());

      const matchesRole =
        selectedRoles.length === 0 || selectedRoles.includes(String(staffUser.role || ''));

      const matchesStatus =
        selectedStaffStatuses.length === 0 || selectedStaffStatuses.includes(String(staffUser.status || 'inactive'));

      const joinDate = staffUser.joinDate || staffUser.createdAt;
      const joinDateValue = joinDate ? new Date(joinDate).getTime() : null;
      const fromValue = joinedFrom ? new Date(joinedFrom).getTime() : null;
      const toValue = joinedTo ? new Date(joinedTo).getTime() : null;

      const matchesDateFrom = !fromValue || (joinDateValue !== null && joinDateValue >= fromValue);
      const matchesDateTo = !toValue || (joinDateValue !== null && joinDateValue <= toValue + 86399999);

      return matchesSearch && matchesRole && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [users, staffSearch, selectedRoles, selectedStaffStatuses, joinedFrom, joinedTo]);



  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesStatus = filterStatus === 'all' || partner.status === filterStatus;
      const query = partnerSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        String(partner.name || '').toLowerCase().includes(query) ||
        String(partner.email || '').toLowerCase().includes(query) ||
        String(partner.contactPerson || '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [partners, filterStatus, partnerSearch]);

  const selectedStaff = useMemo(() => {
    if (!filteredUsers.length) return null;
    return filteredUsers.find((staffUser) => staffUser.id === selectedStaffId) || filteredUsers[0];
  }, [filteredUsers, selectedStaffId]);

  useEffect(() => {
    if (!selectedStaff && filteredUsers.length > 0) {
      setSelectedStaffId(filteredUsers[0].id);
      return;
    }

    if (selectedStaff && selectedStaff.id !== selectedStaffId) {
      setSelectedStaffId(selectedStaff.id);
    }
  }, [filteredUsers, selectedStaff, selectedStaffId]);

  const selectedPartner = useMemo(() => {
    if (!filteredPartners.length) return null;
    return filteredPartners.find((partner) => partner.id === selectedPartnerId) || filteredPartners[0];
  }, [filteredPartners, selectedPartnerId]);

  useEffect(() => {
    if (!selectedPartner && filteredPartners.length > 0) {
      setSelectedPartnerId(filteredPartners[0].id);
      return;
    }

    if (selectedPartner && selectedPartner.id !== selectedPartnerId) {
      setSelectedPartnerId(selectedPartner.id);
    }
  }, [filteredPartners, selectedPartner, selectedPartnerId]);

  const directoryMetrics = useMemo(() => {
    const activeUsers = users.filter((staffUser) => staffUser.status === 'active').length;
    const inactiveUsers = users.length - activeUsers;
    return {
      totalStaff: users.length,
      activeUsers,
      inactiveUsers,
      partnersCount: partners.length,
    };
  }, [users, partners]);

  const rolePillClasses = {
    admin: 'bg-violet-50 text-violet-700 border-violet-200',
    dmc_officer: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    inventory_officer: 'bg-blue-50 text-blue-700 border-blue-200',
    allocation_officer: 'bg-amber-50 text-amber-700 border-amber-200',
    tracking_officer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    charity_staff: 'bg-slate-100 text-slate-700 border-slate-200',
    ngo_partner: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  const roleFilterOptions = roleOptions.filter((option) => option.value !== 'all');

  function toggleRoleFilterValue(roleValue) {
    setSelectedRoles((prev) =>
      prev.includes(roleValue) ? prev.filter((entry) => entry !== roleValue) : [...prev, roleValue]
    );
  }

  function toggleStatusFilterValue(statusValue) {
    setSelectedStaffStatuses((prev) =>
      prev.includes(statusValue) ? prev.filter((entry) => entry !== statusValue) : [...prev, statusValue]
    );
  }

  function formatRelativeTime(value) {
    if (!value) return 'Never logged in';
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'Unknown';
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }



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
        
        showToast(successMsg, 'success');
        
        // Refresh users list
        const fetchUsers = async () => {
          const usersResponse = await fetch(`${API_BASE_URL}/api/auth/staff/all`, {
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
        showToast('Failed to create user: ' + error.message, 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Error creating user: ' + error.message, 'error');
    }
  };



  const handleCreatePartner = async (partnerData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const backendPartnerData = new FormData();
      backendPartnerData.append('organizationName', partnerData.name || '');
      backendPartnerData.append('email', partnerData.email || '');
      backendPartnerData.append('phone', partnerData.phone || '');
      backendPartnerData.append('address', partnerData.address || '');
      backendPartnerData.append('contactPerson', partnerData.contactPerson || '');
      backendPartnerData.append('registrationNumber', partnerData.registrationNumber || '');
      backendPartnerData.append('preferredCategories', JSON.stringify(partnerData.services || []));
      backendPartnerData.append('status', partnerData.status || 'active');

      if (partnerData.organizationProfileDocument) {
        backendPartnerData.append('organizationProfileDocument', partnerData.organizationProfileDocument);
      }

      if (partnerData.registrationCertificate) {
        backendPartnerData.append('registrationCertificate', partnerData.registrationCertificate);
      }

      if (partnerData.verificationDocument) {
        backendPartnerData.append('verificationDocument', partnerData.verificationDocument);
      }

      const response = await fetch(`${API_BASE_URL}/api/partners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: backendPartnerData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Partner created successfully:', result);
        
        // Refresh partners list
        const fetchPartners = async () => {
          const partnersResponse = await fetch(`${API_BASE_URL}/api/partners`, {
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
        showToast('Failed to create partner: ' + error.message, 'error');
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      showToast('Error creating partner: ' + error.message, 'error');
    }
  };

  const handleUpdateUser = (userId, updates) => {

    setUsers(users.map(user => 

      user.id === userId ? { ...user, ...updates } : user

    ));

    showToast('Staff profile updated successfully.', 'success');

    setEditingUser(null);

  };



  const handleDeleteUser = async (userId) => {

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication token not found. Please login again.', 'error');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
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
      showToast(result.message || 'User deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error deleting user: ' + error.message, 'error');
    }

  };



  const handleToggleUserStatus = async (userId) => {

    const selected = users.find((entry) => entry.id === userId);
    if (!selected) return;

    const nextStatus = selected.status === 'active' ? 'inactive' : 'active';
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication token not found. Please login again.', 'error');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Failed to update staff status.');
      }

      const updatedUser = result?.data?.user;
      setUsers((prevUsers) =>
        prevUsers.map((entry) =>
          entry.id === userId
            ? {
                ...entry,
                status: updatedUser?.status || nextStatus,
                role: updatedUser?.role || entry.role,
                name: updatedUser?.fullName || entry.name,
                email: updatedUser?.email || entry.email,
                phone: updatedUser?.phone ?? entry.phone,
                department: updatedUser?.department ?? entry.department,
              }
            : entry
        )
      );

      showToast(`Staff ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, 'success');
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast(error.message || 'Failed to update staff status.', 'error');
    }

  };



  const handleUpdatePartner = (partnerId, updates) => {

    setPartners(partners.map(partner => 

      partner.id === partnerId ? { ...partner, ...updates } : partner

    ));

    setEditingPartner(null);

  };



  const handleDeletePartner = async (partnerId) => {

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication token not found. Please login again.', 'error');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/partners/${partnerId}`, {
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
      showToast(result.message || 'Partner deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting partner:', error);
      showToast('Error deleting partner: ' + error.message, 'error');
    }

  };



  const handleTogglePartnerStatus = (partnerId) => {

    setPartners(partners.map(partner => 

      partner.id === partnerId 

        ? { ...partner, status: partner.status === 'active' ? 'inactive' : 'active' }

        : partner

    ));

  };

  const handleConfirmDialogAction = async () => {
    const { actionType, payload } = confirmDialog;

    try {
      if (actionType === 'delete-user') {
        await handleDeleteUser(payload.userId);
      }

      if (actionType === 'toggle-user-status') {
        await handleToggleUserStatus(payload.userId);
      }

      if (actionType === 'delete-partner') {
        await handleDeletePartner(payload.partnerId);
      }
    } finally {
      closeConfirmDialog();
    }
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

File Path: ${partner.organizationProfileDocument || partner.organizationProfile || 'Not uploaded'}

Uploaded: ${partner.organizationProfileDocument || partner.organizationProfile ? 'Yes' : 'No'}



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

    const [formError, setFormError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const getInputClass = (field) =>
      `w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
        fieldErrors[field]
          ? 'border-rose-300 bg-rose-50 focus:ring-rose-200'
          : 'border-slate-200 focus:ring-blue-500'
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

      const fullName = String(formData.fullName || '').trim();
      const email = String(formData.email || '').trim();
      const phone = String(formData.phone || '').trim();
      const department = String(formData.department || '').trim();

      if (!fullName || fullName.length < MIN_NAME_LENGTH || fullName.length > MAX_NAME_LENGTH) {
        nextFieldErrors.fullName = `Full name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
      }

      if (!email || !EMAIL_PATTERN.test(email)) {
        nextFieldErrors.email = 'Enter a valid email address.';
      }

      if (!phone) {
        nextFieldErrors.phone = 'Phone number is required.';
      }

      const phoneError = validatePhoneNumber(phone);
      if (phoneError) {
        nextFieldErrors.phone = phoneError;
      }

      if (!department) {
        nextFieldErrors.department = 'Department is required.';
      } else if (department.length < MIN_DEPARTMENT_LENGTH || department.length > MAX_DEPARTMENT_LENGTH) {
        nextFieldErrors.department = `Department must be between ${MIN_DEPARTMENT_LENGTH} and ${MAX_DEPARTMENT_LENGTH} characters.`;
      }

      if (!formData.role) {
        nextFieldErrors.role = 'Role is required.';
      }

      if (!formData.status) {
        nextFieldErrors.status = 'Status is required.';
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        setFormError('Please fix highlighted fields.');
        return;
      }

      setFieldErrors({});
      setFormError('');

      if (user) {

        handleUpdateUser(user.id, {
          ...formData,
          fullName,
          email,
          phone,
          department,
        });

      } else {

        handleCreateUser({
          ...formData,
          fullName,
          email,
          phone,
          department,
        });

      }

    };



    return (
      <div className="management-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="management-modal-card bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">{user ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
            <button 
              className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              onClick={onCancel}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="management-form p-6 space-y-6">
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
                    onChange={(e) => {
                      setFormData({...formData, fullName: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    className={getInputClass('fullName')}
                    placeholder="Enter full name"
                    minLength={MIN_NAME_LENGTH}
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {fieldErrors.fullName && <p className="mt-1 text-xs text-rose-600">{fieldErrors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={getInputClass('email')}
                    placeholder="Enter email address"
                    autoComplete="email"
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    className={getInputClass('phone')}
                    placeholder="Enter phone number"
                    inputMode="tel"
                    maxLength={MAX_PHONE_DIGITS}
                  />
                  {fieldErrors.phone && <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => {
                      setFormData({...formData, department: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, department: '' }));
                    }}
                    className={getInputClass('department')}
                    placeholder="Enter department"
                    minLength={MIN_DEPARTMENT_LENGTH}
                    maxLength={MAX_DEPARTMENT_LENGTH}
                  />
                  {fieldErrors.department && <p className="mt-1 text-xs text-rose-600">{fieldErrors.department}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      setFormData({...formData, role: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, role: '' }));
                    }}
                    className={getInputClass('role')}
                  >
                    <option value="dmc_officer">DMC Officer</option>
                    <option value="inventory_officer">Inventory Officer</option>
                    <option value="allocation_officer">Allocation Officer</option>
                    <option value="tracking_officer">Tracking Officer</option>
                    <option value="charity_staff">Charity Staff</option>
                    <option value="ngo_partner">NGO Partner</option>
                  </select>
                  {fieldErrors.role && <p className="mt-1 text-xs text-rose-600">{fieldErrors.role}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      setFormData({...formData, status: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, status: '' }));
                    }}
                    className={getInputClass('status')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {fieldErrors.status && <p className="mt-1 text-xs text-rose-600">{fieldErrors.status}</p>}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> When this staff member logs in for the first time, they will receive an OTP via email for secure verification. They will then be asked to set their own password.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
              {formError && (
                <div className="mr-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="management-secondary-btn px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="management-primary-btn px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
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

      organizationProfileDocument: partner?.organizationProfileDocument || '',

      registrationCertificate: partner?.registrationCertificate || '',

      verificationDocument: partner?.verificationDocument || ''

    });

    const [formError, setFormError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const getInputClass = (field) =>
      `w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
        fieldErrors[field]
          ? 'border-rose-300 bg-rose-50 focus:ring-rose-200'
          : 'border-slate-200 focus:ring-emerald-500'
      }`;



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

      if (!file) {
        return;
      }

      if (file.type !== 'application/pdf') {
        setFieldErrors((prev) => ({ ...prev, [documentType]: 'Only PDF files are allowed.' }));
        return;
      }

      setFormData((prev) => ({ ...prev, [documentType]: file }));
      setFieldErrors((prev) => ({ ...prev, [documentType]: '' }));

    };



    const getDocumentName = (filePath) => {

      if (!filePath) return '';

      if (typeof filePath !== 'string') {
        return filePath.name || '';
      }

      return filePath.split('/').pop();

    };



    const removeDocument = (documentType) => {

      setFormData({...formData, [documentType]: ''});

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
      const partnershipDate = String(formData.partnershipDate || '').trim();

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

      if (!partnershipDate) {
        nextFieldErrors.partnershipDate = 'Partnership date is required.';
      } else if (Number.isNaN(new Date(partnershipDate).getTime())) {
        nextFieldErrors.partnershipDate = 'Enter a valid partnership date.';
      }

      if (!formData.organizationProfileDocument) {
        nextFieldErrors.organizationProfileDocument = 'Organization profile document is required.';
      }

      if (!formData.registrationCertificate) {
        nextFieldErrors.registrationCertificate = 'Registration certificate is required.';
      }

      if (!formData.verificationDocument) {
        nextFieldErrors.verificationDocument = 'Verification document is required.';
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        setFormError('Please fix highlighted fields.');
        return;
      }

      setFieldErrors({});
      setFormError('');

      if (partner) {

        handleUpdatePartner(partner.id, {
          ...formData,
          name,
          contactPerson,
          email,
          phone,
          address,
        });

      } else {

        handleCreatePartner({
          ...formData,
          name,
          contactPerson,
          email,
          phone,
          address,
        });

      }

    };



    return (
      <section className="management-modal mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]" style={{ width: "100%", maxWidth: "none" }}>
        <div className="management-modal-card w-full max-h-none overflow-visible" style={{ maxWidth: "none" }}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">{partner ? 'Edit NGO Partner' : 'Add New NGO Partner'}</h2>
            <button 
              className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
              onClick={onCancel}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="management-form p-6 space-y-6">
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
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    className={getInputClass('name')}
                    placeholder="Enter organization name"
                    minLength={MIN_NAME_LENGTH}
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {fieldErrors.name && <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => {
                      setFormData({...formData, contactPerson: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                    }}
                    className={getInputClass('contactPerson')}
                    placeholder="Enter contact person name"
                    minLength={MIN_NAME_LENGTH}
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {fieldErrors.contactPerson && <p className="mt-1 text-xs text-rose-600">{fieldErrors.contactPerson}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={getInputClass('email')}
                    placeholder="Enter email address"
                    autoComplete="email"
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    className={getInputClass('phone')}
                    placeholder="Enter phone number"
                    inputMode="tel"
                  />
                  {fieldErrors.phone && <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({...formData, address: e.target.value});
                    setFieldErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  className={getInputClass('address')}
                  placeholder="Enter complete address"
                    minLength={MIN_ADDRESS_LENGTH}
                    maxLength={MAX_ADDRESS_LENGTH}
                />
                {fieldErrors.address && <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Specialization *</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => {
                      setFormData({...formData, specialization: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, specialization: '' }));
                    }}
                    className={getInputClass('specialization')}
                  >
                    <option value="Emergency Relief">Emergency Relief</option>
                    <option value="Food Distribution">Food Distribution</option>
                    <option value="Medical Aid">Medical Aid</option>
                    <option value="Shelter Management">Shelter Management</option>
                    <option value="Water Supply">Water Supply</option>
                    <option value="Logistics">Logistics</option>
                    <option value="General Relief">General Relief</option>
                  </select>
                  {fieldErrors.specialization && <p className="mt-1 text-xs text-rose-600">{fieldErrors.specialization}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Partnership Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.partnershipDate}
                    onChange={(e) => {
                      setFormData({...formData, partnershipDate: e.target.value});
                      setFieldErrors((prev) => ({ ...prev, partnershipDate: '' }));
                    }}
                    className={getInputClass('partnershipDate')}
                  />
                  {fieldErrors.partnershipDate && <p className="mt-1 text-xs text-rose-600">{fieldErrors.partnershipDate}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Required Documents</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Organization Profile Document (PDF)</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
                    {formData.organizationProfileDocument ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{getDocumentName(formData.organizationProfileDocument)}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument('organizationProfileDocument')}
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
                          onChange={handleDocumentUpload('organizationProfileDocument')}
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
              {formError && (
                <div className="mr-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {formError}
                </div>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="management-secondary-btn px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="management-primary-btn px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
              >
                {partner ? 'Update Partner' : 'Create Partner'}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  };

  return (
    <div className="user-management">
      <PageHeader 
        role="Admin / User & Partner Management"
        title="User Management"
        description="Manage system users and NGO partner organizations"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Staff</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{directoryMetrics.totalStaff}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-emerald-700">Active Users</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{directoryMetrics.activeUsers}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-amber-700">Inactive Users</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{directoryMetrics.inactiveUsers}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-blue-700">Partners Count</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{directoryMetrics.partnersCount}</p>
        </article>
      </div>



      <div className="directory-tabs">

        {canViewStaff && (

          <button

            className={`tab-button ${activeTab === 'staff' ? 'active' : ''}`}

            onClick={() => setActiveTab('staff')}

          >

            <span className="tab-icon">👥</span>

            <span className="tab-label">Staff</span>

          </button>

        )}

        <button

          className={`tab-button ${activeTab === 'partners' ? 'active' : ''}`}

          onClick={() => setActiveTab('partners')}

        >

          <span className="tab-icon">🏢</span>

          <span className="tab-label">Partners</span>

        </button>

      </div>



      <div className="directory-content">

        {activeTab === 'staff' && (

          <div className="tracking-section space-y-4">
            <div className="tracking-actions">
              <div className="search-input max-w-md">
                <Search size={14} />
                <input
                  placeholder="Search staff by name, email, or department"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={`btn-secondary ${staffViewMode === 'cards' ? 'bg-slate-100' : ''}`}
                  onClick={() => setStaffViewMode('cards')}
                >
                  Cards View
                </button>
                <button
                  className={`btn-secondary ${staffViewMode === 'table' ? 'bg-slate-100' : ''}`}
                  onClick={() => setStaffViewMode('table')}
                >
                  Table View
                </button>
                {canEditUsers && (
                  <button
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + Create Staff
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[260px_1fr_330px]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Smart Filters</h3>
                <p className="mt-1 text-xs text-slate-500">Roles and status at a glance</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Roles</p>
                    <div className="space-y-2">
                      {roleFilterOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(option.value)}
                            onChange={() => toggleRoleFilterValue(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Status</p>
                    <div className="space-y-2">
                      {['active', 'inactive'].map((statusValue) => (
                        <label key={statusValue} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedStaffStatuses.includes(statusValue)}
                            onChange={() => toggleStatusFilterValue(statusValue)}
                          />
                          <span className="capitalize">{statusValue}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {isLoadingUsers ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((skeleton) => (
                      <div key={skeleton} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                    ))}
                  </div>
                ) : staffFetchError ? (
                  <div className="no-records">
                    <p>{staffFetchError}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="no-records">
                    <p>No staff members found for the selected filters.</p>
                  </div>
                ) : staffViewMode === 'cards' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredUsers.map((staffUser) => (
                      <article
                        key={staffUser.id}
                        className={`rounded-xl border p-4 transition ${selectedStaff?.id === staffUser.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        onClick={() => setSelectedStaffId(staffUser.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold">
                              {staffUser.profilePicture ? (
                                <img src={staffUser.profilePicture} alt={staffUser.name || 'Staff'} className="h-11 w-11 object-cover" />
                              ) : (
                                <span>{(staffUser.name || 'U').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{staffUser.name || '-'}</p>
                              <p className="text-xs text-slate-500">{staffUser.email || '-'}</p>
                            </div>
                          </div>
                          <details className="relative">
                            <summary className="cursor-pointer list-none rounded-md p-1 text-slate-500 hover:bg-slate-100">
                              <MoreVertical size={14} />
                            </summary>
                            <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                              <button className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100" onClick={() => setEditingUser(staffUser)}>Edit</button>
                              <button
                                className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                onClick={() =>
                                  openConfirmDialog({
                                    title: `${staffUser.status === 'active' ? 'Deactivate' : 'Activate'} Staff`,
                                    message: `${staffUser.status === 'active' ? 'Deactivate' : 'Activate'} ${staffUser.name}?`,
                                    actionType: 'toggle-user-status',
                                    payload: { userId: staffUser.id },
                                  })
                                }
                              >
                                {staffUser.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                className="w-full rounded-md px-2 py-1 text-left text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() =>
                                  openConfirmDialog({
                                    title: 'Delete Staff User',
                                    message: `Are you sure you want to delete ${staffUser.name}? This action cannot be undone.`,
                                    actionType: 'delete-user',
                                    payload: { userId: staffUser.id },
                                  })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </details>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${rolePillClasses[staffUser.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {String(staffUser.role || '-').replaceAll('_', ' ')}
                          </span>

                          <label className="inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={staffUser.status === 'active'}
                              onChange={() => handleToggleUserStatus(staffUser.id)}
                            />
                            <span className="h-5 w-10 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500" />
                          </label>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">Last login: {formatRelativeTime(staffUser.lastLogin)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="requests-table-container">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((staffUser) => (
                          <tr key={staffUser.id} onClick={() => setSelectedStaffId(staffUser.id)} className="cursor-pointer">
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-full bg-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center">
                                  {(staffUser.name || 'U').charAt(0).toUpperCase()}
                                </span>
                                <span>{staffUser.name}</span>
                              </div>
                            </td>
                            <td>{String(staffUser.role || '-').replaceAll('_', ' ')}</td>
                            <td>{staffUser.status}</td>
                            <td>{formatRelativeTime(staffUser.lastLogin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {!selectedStaff ? (
                  <p className="text-sm text-slate-500">Select a staff card to view details.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Staff Details</h3>
                      <p className="text-xs text-slate-500">Master-detail quick panel</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <UserCog size={16} className="text-slate-500" />
                        <p className="text-sm font-semibold text-slate-900">{selectedStaff.name || '-'}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{selectedStaff.email || '-'}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <p><strong>Role:</strong> {String(selectedStaff.role || '-').replaceAll('_', ' ')}</p>
                      <p><strong>Status:</strong> {selectedStaff.status}</p>
                      <p><strong>Department:</strong> {selectedStaff.department || '-'}</p>
                      <p><strong>Phone:</strong> {selectedStaff.phone || '-'}</p>
                      <p><strong>Joined:</strong> {selectedStaff.joinDate || selectedStaff.createdAt ? new Date(selectedStaff.joinDate || selectedStaff.createdAt).toLocaleDateString() : '-'}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                        <Activity size={14} /> Activity Snapshot
                      </div>
                      <p className="text-xs text-slate-600">Last login: {formatRelativeTime(selectedStaff.lastLogin)}</p>
                    </div>

                    {canEditUsers && (
                      <div className="flex gap-2">
                        <button className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800" onClick={() => setEditingUser(selectedStaff)}>
                          Edit Profile
                        </button>
                        <button
                          className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800"
                          onClick={() =>
                            openConfirmDialog({
                              title: `${selectedStaff.status === 'active' ? 'Deactivate' : 'Activate'} Staff`,
                              message: `${selectedStaff.status === 'active' ? 'Deactivate' : 'Activate'} ${selectedStaff.name}?`,
                              actionType: 'toggle-user-status',
                              payload: { userId: selectedStaff.id },
                            })
                          }
                        >
                          {selectedStaff.status === 'active' ? 'Deactivate' : 'Activate'} User
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </div>

        )}



        {activeTab === 'partners' && (

          <div className="tracking-section space-y-4">

            <div className="tracking-actions">
              <div className="search-input max-w-md">
                <Search size={14} />
                <input
                  placeholder="Search partners by name, contact, or email"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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

                <button
                  className={`btn-secondary ${partnerViewMode === 'cards' ? 'bg-slate-100' : ''}`}
                  onClick={() => setPartnerViewMode('cards')}
                >
                  Cards View
                </button>
                <button
                  className={`btn-secondary ${partnerViewMode === 'table' ? 'bg-slate-100' : ''}`}
                  onClick={() => setPartnerViewMode('table')}
                >
                  Table View
                </button>

                {canEditPartners && (
                  <button
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
                    onClick={() => navigate('/users/partners/new')}
                  >
                    + Create Partner
                  </button>
                )}
              </div>

            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {isLoadingUsers ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((skeleton) => (
                      <div key={skeleton} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                    ))}
                  </div>
                ) : partnerFetchError ? (
                  <div className="no-records">
                    <p>{partnerFetchError}</p>
                  </div>
                ) : filteredPartners.length === 0 ? (
                  <div className="no-records">
                    <p>No NGO partners found</p>
                  </div>
                ) : partnerViewMode === 'cards' ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredPartners.map(partner => (
                      <article
                        key={partner.id}
                        className={`rounded-xl border p-4 transition ${selectedPartner?.id === partner.id ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        onClick={() => setSelectedPartnerId(partner.id)}
                      >
                        <div className="mb-4 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 text-base font-semibold text-emerald-600">
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
                              <h3 className="mb-1 text-base font-semibold text-slate-900">{partner.name}</h3>
                              <p className="mb-2 text-sm text-slate-600">{partner.contactPerson || 'N/A'}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                                  <Calendar className="h-3 w-3" />
                                  {partner.createdAt ? new Date(partner.createdAt).toLocaleDateString() : 'Date unavailable'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <details className="relative">
                            <summary className="cursor-pointer list-none rounded-md p-1 text-slate-500 hover:bg-slate-100">
                              <MoreVertical size={14} />
                            </summary>
                            <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                              <button className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100" onClick={() => navigate(`/users/partners/${partner.id}/edit`)}>Edit</button>
                              <button className="w-full rounded-md px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100" onClick={() => handleTogglePartnerStatus(partner.id)}>{partner.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                              <button
                                className="w-full rounded-md px-2 py-1 text-left text-xs text-rose-600 hover:bg-rose-50"
                                onClick={() =>
                                  openConfirmDialog({
                                    title: 'Delete NGO Partner',
                                    message: `Are you sure you want to delete ${partner.name}? This action cannot be undone.`,
                                    actionType: 'delete-partner',
                                    payload: { partnerId: partner.id },
                                  })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </details>
                        </div>

                        <div className="border-t border-slate-200 pt-3">
                          <div className="space-y-2.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-500">Email:</span>
                              <p className="truncate font-medium text-slate-900">{partner.email || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-500">Phone:</span>
                              <p className="font-medium text-slate-900">{partner.phone || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="requests-table-container">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Partner</th>
                          <th>Contact</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPartners.map((partner) => (
                          <tr key={partner.id} onClick={() => setSelectedPartnerId(partner.id)} className="cursor-pointer">
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 flex items-center justify-center">
                                  {(partner.name || 'P').charAt(0).toUpperCase()}
                                </span>
                                <span>{partner.name || '-'}</span>
                              </div>
                            </td>
                            <td>{partner.contactPerson || '-'}</td>
                            <td>{partner.status || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {!selectedPartner ? (
                  <p className="text-sm text-slate-500">Select a partner card to view details.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Partner Details</h3>
                      <p className="text-xs text-slate-500">Master-detail quick panel</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{selectedPartner.name || '-'}</p>
                      <p className="mt-1 text-xs text-slate-600">{selectedPartner.email || '-'}</p>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <p><strong>Contact:</strong> {selectedPartner.contactPerson || '-'}</p>
                      <p><strong>Status:</strong> {selectedPartner.status || '-'}</p>
                      <p><strong>Phone:</strong> {selectedPartner.phone || '-'}</p>
                      <p><strong>Address:</strong> {selectedPartner.address || '-'}</p>
                      <p><strong>Joined:</strong> {selectedPartner.createdAt ? new Date(selectedPartner.createdAt).toLocaleDateString() : '-'}</p>
                    </div>

                    {selectedPartner.services?.length > 0 && (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Services</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPartner.services.map((service, index) => (
                            <span key={`${selectedPartner.id}-service-${index}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {canEditPartners && (
                      <div className="flex gap-2">
                        <button className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800" onClick={() => navigate(`/users/partners/${selectedPartner.id}/edit`)}>
                          Edit Partner
                        </button>
                        <button className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800" onClick={() => handleTogglePartnerStatus(selectedPartner.id)}>
                          {selectedPartner.status === 'active' ? 'Deactivate' : 'Activate'} Partner
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>

          </div>

        )}

      </div>

      {toast.message && (
        <div
          className={`fixed bottom-6 left-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {confirmDialog.show && (
        <div className="management-modal fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="management-modal-card bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{confirmDialog.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{confirmDialog.message}</p>
            </div>
            <div className="p-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="management-secondary-btn px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDialogAction}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}



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

