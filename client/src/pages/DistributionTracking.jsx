import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import { Package, Calendar, MapPin, Truck, Users, AlertCircle, CheckCircle, Clock, ArrowRight, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { ROLES } from '../utils/constants';

import PageHeader from '../components/PageHeader';

import './Pages.css';



const DistributionTracking = () => {

  const { user } = useAuth();

  const [dispatchRecords, setDispatchRecords] = useState([]);

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');

  const [viewModal, setViewModal] = useState({ show: false, type: null, content: null, title: null });

  

  // State for dispatch form

  const [formData, setFormData] = useState({

    allocationRef: '',

    dispatchDate: new Date().toISOString().split('T')[0],

    transportDetails: '',

    currentLocation: '',

    allocatedItems: []

  });

  

  // State for finalized allocation plans

  const [readyAllocations, setReadyAllocations] = useState([]);



  // Role-based permissions - SWAPPED: Tracking Officer has full access, Admin has read-only

  const canCreateDispatch = user?.role === ROLES.TRACKING_OFFICER;

  const canEditDispatch = user?.role === ROLES.TRACKING_OFFICER;

  const isReadOnly = !canCreateDispatch && !canEditDispatch;



  // Debug: Show current role and permissions

  console.log('DistributionTracking Debug:', {

    userRole: user?.role,

    canCreateDispatch,

    canEditDispatch,

    trackingOfficerRole: ROLES.TRACKING_OFFICER

  });



  // Fetch data from localStorage

  useEffect(() => {

    // Fetch dispatch records

    const savedDispatchRecords = localStorage.getItem('dispatchRecords');

    if (savedDispatchRecords) {

      setDispatchRecords(JSON.parse(savedDispatchRecords));

    }



    // Fetch finalized allocation plans

    const savedAllocationPlans = localStorage.getItem('allocationPlans');

    if (savedAllocationPlans) {

      const plans = JSON.parse(savedAllocationPlans);

      // Filter for finalized plans that are ready for dispatch (not yet dispatched)

      const readyPlans = plans.filter(plan => 

        plan.status === 'finalized' && !plan.dispatchCreated

      );

      setReadyAllocations(readyPlans);

    }

  }, []);



  const statusOptions = [

    { value: 'prepared', label: 'Prepared', color: '#2563eb' },

    { value: 'dispatched', label: 'Dispatched', color: '#7c3aed' },

    { value: 'in_transit', label: 'In Transit', color: '#f59e0b' },

    { value: 'delivered', label: 'Delivered', color: '#10b981' },

    { value: 'verified', label: 'Verified & Confirmed', color: '#059669' }

  ];





  const getStatusColor = (status) => {

    const statusOption = statusOptions.find(option => option.value === status);

    return statusOption ? statusOption.color : '#6b7280';

  };



  const getStatusLabel = (status) => {

    const statusOption = statusOptions.find(option => option.value === status);

    return statusOption ? statusOption.label : status;

  };



  const filteredRecords = filterStatus === 'all' 

    ? dispatchRecords 

    : dispatchRecords.filter(record => record.status === filterStatus);



  const handleCreateDispatchFromAllocation = (allocation) => {

    const dispatchRecord = {

      allocationRef: allocation.allocationRef,

      dispatchDate: new Date().toISOString().split('T')[0],

      transportDetails: allocation.transportDetails || 'Standard Transport - Assigned to Tracking Officer',

      currentLocation: allocation.eventLocation || 'Distribution Center',

      status: 'prepared',

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

      allocatedItems: allocation.allocatedItems || []

    };

    

    const newDispatchRecords = [...dispatchRecords, dispatchRecord];

    setDispatchRecords(newDispatchRecords);

    localStorage.setItem('dispatchRecords', JSON.stringify(newDispatchRecords));

    

    // Update allocation plan to mark as dispatched

    const existingPlans = JSON.parse(localStorage.getItem('allocationPlans') || '[]');

    const updatedPlans = existingPlans.map(plan => 

      plan.id === allocation.id 

        ? { ...plan, status: 'dispatched', dispatchCreated: true }

        : plan

    );

    localStorage.setItem('allocationPlans', JSON.stringify(updatedPlans));

    

    // Optional: Show success message

    alert(`Dispatch record created successfully from allocation plan ${allocation.allocationRef}!`);

  };



  const handleCreateRecord = (newRecord) => {

    const record = {

      ...newRecord,

      id: Date.now(),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

      status: 'prepared'

    };

    

    const updatedRecords = [...dispatchRecords, record];

    setDispatchRecords(updatedRecords);

    localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));

    setShowCreateForm(false);

  };



  const handleFormChange = (field, value) => {

    setFormData(prev => ({

      ...prev,

      [field]: value

    }));

  };



  const handleFormSubmit = (e) => {

    e.preventDefault();

    

    if (!formData.allocationRef || !formData.transportDetails || !formData.currentLocation) {

      alert('Please fill in all required fields');

      return;

    }



    const dispatchRecord = {

      ...formData,

      id: Date.now(),

      status: 'prepared',

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

      createdBy: user?.name || 'Tracking Officer'

    };



    const updatedRecords = [...dispatchRecords, dispatchRecord];

    setDispatchRecords(updatedRecords);

    localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));

    

    // Reset form

    setFormData({

      allocationRef: '',

      dispatchDate: new Date().toISOString().split('T')[0],

      transportDetails: '',

      currentLocation: '',

      allocatedItems: []

    });

    setShowCreateForm(false);

    

    alert('Dispatch record created successfully!');

  };



  const handleFormCancel = () => {

    setFormData({

      allocationRef: '',

      dispatchDate: new Date().toISOString().split('T')[0],

      transportDetails: '',

      currentLocation: '',

      allocatedItems: []

    });

    setShowCreateForm(false);

  };



  const handleUpdateStatus = (recordId, newStatus) => {

    const updatedRecords = dispatchRecords.map(record => 

      record.id === recordId 

        ? { 

            ...record, 

            status: newStatus, 

            updatedAt: new Date().toISOString(),

            currentLocation: newStatus === 'dispatched' ? 'In Transit' : 

                           newStatus === 'in_transit' ? 'En Route to DMC Office' :

                           newStatus === 'delivered' ? 'DMC Office' : record.currentLocation

          }

        : record

    );

    setDispatchRecords(updatedRecords);

    localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));

    

    // Trigger storage event for real-time sync

    window.dispatchEvent(new StorageEvent('storage', {

      key: 'dispatchRecords',

      newValue: JSON.stringify(updatedRecords)

    }));

  };



  const handleDeleteRecord = (recordId) => {

    if (window.confirm('Are you sure you want to delete this dispatch record?')) {

      const updatedRecords = dispatchRecords.filter(record => record.id !== recordId);

      setDispatchRecords(updatedRecords);

      localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));

    }

  };



  const handleEditRecord = (record) => {

    setEditingRecord(record);

    setShowCreateForm(true);

  };



  const handleUpdateRecord = (updatedRecord) => {

    const updatedRecords = dispatchRecords.map(record => 

      record.id === updatedRecord.id 

        ? { ...updatedRecord, updatedAt: new Date().toISOString() }

        : record

    );

    

    setDispatchRecords(updatedRecords);

    localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));

    setShowCreateForm(false);

    setEditingRecord(null);

  };



  // View Functions for Distribution Tracking

  const viewDispatchSummary = (record) => {

    const content = `

DISPATCH SUMMARY

================

Allocation Reference: ${record.allocationRef}

Dispatch Date: ${new Date(record.dispatchDate).toLocaleDateString()}

Transport Details: ${record.transportDetails}

Current Location: ${record.currentLocation}

Status: ${record.status}

Created: ${new Date(record.createdAt).toLocaleString()}

Last Updated: ${new Date(record.updatedAt).toLocaleString()}



This summary provides an overview of the dispatch record including

current status, location, and transport information.

    `.trim();



    setViewModal({

      show: true,

      type: 'dispatch-summary',

      content: content,

      title: `Dispatch Summary - ${record.allocationRef}`

    });

  };



  const viewDispatchReport = (record) => {

    const content = `

DISPATCH REPORT

===============

Allocation Reference: ${record.allocationRef}

Dispatch Date: ${new Date(record.dispatchDate).toLocaleDateString()}

Transport Details: ${record.transportDetails}

Current Location: ${record.currentLocation}

Status: ${record.status}

Created: ${new Date(record.createdAt).toLocaleString()}

Last Updated: ${new Date(record.updatedAt).toLocaleString()}



REPORT DETAILS:

- Initial dispatch preparation completed

- Transport vehicle assigned and loaded

- Driver information verified

- Current tracking status: ${record.status}

- Estimated delivery timeline: Based on current location



This report contains detailed information about the dispatch operation,

including transport logistics and current tracking status.

    `.trim();



    setViewModal({

      show: true,

      type: 'dispatch-report',

      content: content,

      title: `Dispatch Report - ${record.allocationRef}`

    });

  };



  const viewDeliveryConfirmation = (record) => {

    const content = `

DELIVERY CONFIRMATION

=====================

Allocation Reference: ${record.allocationRef}

Dispatch Date: ${new Date(record.dispatchDate).toLocaleDateString()}

Transport Details: ${record.transportDetails}

Current Location: ${record.currentLocation}

Status: ${record.status}

Created: ${new Date(record.createdAt).toLocaleString()}

Last Updated: ${new Date(record.updatedAt).toLocaleString()}



DELIVERY DETAILS:

${record.status === 'delivered' ? 

  '✓ Delivery completed successfully' : 

  '○ Delivery in progress or pending'}



${record.status === 'delivered' ? 

  `Confirmation: Goods have been delivered to the intended destination.

Delivery Date: ${new Date(record.updatedAt).toLocaleDateString()}

Recipient: Disaster Management Authority

Status: Confirmed and Received` : 

  'Confirmation: Delivery pending completion. Track status for updates.'}



This confirmation document verifies the delivery status and provides

official confirmation of receipt when delivery is completed.

    `.trim();



    setViewModal({

      show: true,

      type: 'delivery-confirmation',

      content: content,

      title: `Delivery Confirmation - ${record.allocationRef}`

    });

  };



  const viewExportSummary = (record) => {

    const content = `

EXPORT SUMMARY - CSV DATA

==========================

Allocation Reference,${record.allocationRef}

Dispatch Date,${new Date(record.dispatchDate).toLocaleDateString()}

Transport Details,"${record.transportDetails}"

Current Location,${record.currentLocation}

Status,${record.status}

Created,${new Date(record.createdAt).toLocaleString()}

Last Updated,${new Date(record.updatedAt).toLocaleString()}



CSV FORMAT:

allocationRef,dispatchDate,transportDetails,currentLocation,status,createdAt,updatedAt

"${record.allocationRef}","${new Date(record.dispatchDate).toLocaleDateString()}","${record.transportDetails}","${record.currentLocation}","${record.status}","${new Date(record.createdAt).toLocaleString()}","${new Date(record.updatedAt).toLocaleString()}"



This export summary provides CSV-formatted data for the dispatch record,

suitable for download and import into spreadsheet applications.

    `.trim();



    setViewModal({

      show: true,

      type: 'export-summary',

      content: content,

      title: `Export Summary - ${record.allocationRef}`

    });

  };



  return (

    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">

      <PageHeader 

        role={user?.role === ROLES.TRACKING_OFFICER ? 'Tracking Officer / Dispatch Management' : 

             user?.role === ROLES.CHARITY ? 'Charity Staff / Delivery Tracking' :

             user?.role === ROLES.ADMIN ? 'Admin / Dispatch Management' :

             'Delivery Tracking'}

        title="Distribution Tracking"

        description={canCreateDispatch ? 'Manage and monitor relief supply dispatch records with partner and event integration' :

             'View and track relief supply dispatch records and delivery status'}

      />



      {/* Filter Section */}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">

        <div className="flex flex-wrap gap-4 items-center justify-between">

          <div className="flex gap-3 items-center">

            <label className="text-sm font-medium text-slate-700" htmlFor="status-filter">Filter by Status:</label>

            <select

              id="status-filter"

              value={filterStatus}

              onChange={(e) => setFilterStatus(e.target.value)}

              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"

            >

              <option value="all">All Records</option>

              {statusOptions.map(option => (

                <option key={option.value} value={option.value}>

                  {option.label}

                </option>

              ))}

            </select>

          </div>

          <div className="flex items-center gap-4">

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700">

              <span className="w-2 h-2 rounded-full bg-blue-500"></span>

              {filteredRecords.length} total records

            </span>

          </div>

        </div>

      </section>


      {/* Finalized Allocation Plans Section - Always visible for debugging */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">📋 Finalized Allocation Plans</h2>
              <p className="text-sm text-slate-600">Allocation plans ready for dispatch. Create dispatch records to begin tracking.</p>
              {/* Debug Info */}
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                DEBUG: Role={user?.role} | CanCreate={canCreateDispatch ? 'YES' : 'NO'} | ReadyPlans={readyAllocations.length} | TrackingOfficerRole={ROLES.TRACKING_OFFICER}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {readyAllocations.length} ready for dispatch
              </span>
              {/* ALWAYS VISIBLE BUTTON */}
              <button 
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
                onClick={() => setShowCreateForm(true)}
              >
                <Truck className="w-4 h-4" />
                Create New Dispatch
              </button>
            </div>
          </div>

          {/* Permission Status */}
          {canCreateDispatch ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✅ You have permission to create dispatch records</p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">❌ You don't have permission to create dispatch records</p>
              <p className="text-red-600 text-sm">Your role: {user?.role} | Required: {ROLES.TRACKING_OFFICER}</p>
            </div>
          )}

          {readyAllocations.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No finalized allocation plans ready for dispatch yet</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Allocation officers need to finalize allocation plans before they can be dispatched. 
                Check the Allocation Planning page to create and finalize plans.
              </p>
              <button 
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 mt-4"
                onClick={() => window.location.href = '/allocation'}
              >
                Go to Allocation Planning
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {readyAllocations.map(allocation => (
                <div key={allocation.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg border-2 border-blue-200">
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{allocation.eventTitle}</h3>
                          <p className="text-sm text-slate-600">{allocation.eventLocation}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-amber-100 text-amber-700">
                              <Calendar className="w-3 h-3" />
                              {new Date(allocation.eventDate).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-slate-100 text-slate-600">
                              <MapPin className="w-3 h-3" />
                              {allocation.eventLocation}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">Allocated Resources</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {allocation.allocatedItems.map((item, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <Package className="w-6 h-6 text-slate-600" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                  <p className="text-xs text-slate-600">Quantity: {item.quantity}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-slate-500">
                        Priority: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          {allocation.priority}
                        </span>
                      </div>
                      <button 
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
                        onClick={() => handleCreateDispatchFromAllocation(allocation)}
                      >
                        <Truck className="w-4 h-4" />
                        Create Dispatch Record
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>



      {/* Records List */}

      <div className="mt-6">

        <div className="flex items-center justify-between mb-4">

          <h2 className="text-xl font-semibold text-slate-900">🚚 Dispatch Records</h2>

          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700">

            <span className="w-2 h-2 rounded-full bg-blue-500"></span>

            {filteredRecords.length} records

          </span>

        </div>

        {filteredRecords.length === 0 ? (

          <div className="text-center py-12 border border-slate-200 rounded-2xl bg-white">

            <Truck className="w-16 h-16 mx-auto mb-4 text-slate-400" />

            <h3 className="text-lg font-semibold text-slate-900 mb-2">No dispatch records found</h3>

            <p className="text-slate-600 max-w-md mx-auto">

              {canCreateDispatch ? 

                'Create dispatch records from finalized allocation plans to begin tracking deliveries.' :

                'No dispatch records are available at this time.'

              }

            </p>

          </div>

        ) : (

          /* Enhanced Table View for Admin */

          user?.role === ROLES.ADMIN ? (

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-50 border-b border-slate-200">

                    <tr>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transport</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>

                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-200">

                    {filteredRecords.map(record => (

                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm font-medium text-slate-900">{record.allocationRef}</div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-slate-600">{new Date(record.dispatchDate).toLocaleDateString()}</div>

                        </td>

                        <td className="px-6 py-4">

                          <div className="text-sm text-slate-600 max-w-xs truncate" title={record.transportDetails}>

                            {record.transportDetails}

                          </div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-slate-600">{record.currentLocation}</div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <span 

                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"

                            style={{

                              backgroundColor: `${getStatusColor(record.status)}15`,

                              color: getStatusColor(record.status)

                            }}

                          >

                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(record.status) }}></span>

                            {getStatusLabel(record.status)}

                          </span>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="text-sm text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="flex gap-2">

                            <button 

                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"

                              onClick={() => viewDispatchSummary(record)}

                            >

                              View

                            </button>

                            <span className="text-slate-300">|</span>

                            <button 

                              className="text-emerald-600 hover:text-emerald-800 text-sm font-medium"

                              onClick={() => viewDispatchReport(record)}

                            >

                              Report

                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          ) : (

            /* Card View for Tracking Officers */

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {filteredRecords.map(record => (

                <div key={record.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">

                  <div className="flex items-start justify-between mb-4">

                    <div className="flex items-start gap-3">

                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">

                        <Truck className="w-5 h-5 text-blue-600" />

                      </div>

                      <div>

                        <h3 className="font-semibold text-slate-900">{record.allocationRef}</h3>

                        <p className="text-sm text-slate-500">Dispatch ID: {record.id}</p>

                      </div>

                    </div>

                    <span 

                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"

                      style={{

                        backgroundColor: `${getStatusColor(record.status)}15`,

                        color: getStatusColor(record.status)

                      }}

                    >

                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(record.status) }}></span>

                      {getStatusLabel(record.status)}

                    </span>

                  </div>

                  

                  <div className="space-y-3">

                    <div className="flex items-center gap-2 text-sm text-slate-600">

                      <Calendar className="w-4 h-4" />

                      <span>Dispatch: {new Date(record.dispatchDate).toLocaleDateString()}</span>

                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">

                      <MapPin className="w-4 h-4" />

                      <span className="truncate">{record.currentLocation}</span>

                    </div>

                    <div className="text-sm text-slate-600">

                      <p className="font-medium mb-1">Transport Details:</p>

                      <p className="text-slate-500 line-clamp-2">{record.transportDetails}</p>

                    </div>

                  </div>

                  

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">

                    <button 

                      className="flex-1 text-blue-600 hover:text-blue-800 text-sm font-medium py-2"

                      onClick={() => viewDispatchSummary(record)}

                    >

                      View Details

                    </button>

                    {canEditDispatch && (

                      <>

                        <button 

                          className="flex-1 text-emerald-600 hover:text-emerald-800 text-sm font-medium py-2"

                          onClick={() => handleEditRecord(record)}

                        >

                          Edit

                        </button>

                        <button 

                          className="flex-1 text-red-600 hover:text-red-800 text-sm font-medium py-2"

                          onClick={() => handleDeleteRecord(record.id)}

                        >

                          Delete

                        </button>

                      </>

                    )}

                  </div>

                </div>

              ))}

            </div>

          )

        )}

      </div>



      {/* View Modal */}

      {viewModal.show && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b border-slate-200">

              <h2 className="text-xl font-bold text-slate-900">{viewModal.title}</h2>

              <button 

                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"

                onClick={() => setViewModal({ show: false, type: null, content: null, title: null })}

              >

                ×

              </button>

            </div>

            <div className="p-6">

              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-lg">

                {viewModal.content}

              </pre>

            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">

              {viewModal.type === 'export-summary' && (

                <button 

                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"

                  onClick={() => {

                    const blob = new Blob([viewModal.content], { type: 'text/csv' });

                    const url = window.URL.createObjectURL(blob);

                    const a = document.createElement('a');

                    a.href = url;

                    a.download = `${viewModal.title.replace(new RegExp('\\s+', 'g'), '_')}.csv`;

                    a.click();

                    window.URL.revokeObjectURL(url);

                  }}

                >

                  Download CSV

                </button>

              )}

              <button 

                className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"

                onClick={() => setViewModal({ show: false, type: null, content: null, title: null })}

              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Dispatch Form Modal */}

      {showCreateForm && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">

                  <Truck className="w-5 h-5 text-white" />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-slate-900">

                    {editingRecord ? 'Edit Dispatch Record' : 'Create New Dispatch Record'}

                  </h2>

                  <p className="text-sm text-slate-600">

                    {editingRecord ? 'Update dispatch information' : 'Create a new dispatch record for resource delivery'}

                  </p>

                </div>

              </div>

              <button 

                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"

                onClick={handleFormCancel}

              >

                <X className="w-5 h-5" />

              </button>

            </div>

            

            <form onSubmit={handleFormSubmit} className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    Allocation Reference *

                  </label>

                  <input

                    type="text"

                    value={formData.allocationRef}

                    onChange={(e) => handleFormChange('allocationRef', e.target.value)}

                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    placeholder="e.g., ALLOC-DIS-001"

                    required

                  />

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    Dispatch Date *

                  </label>

                  <input

                    type="date"

                    value={formData.dispatchDate}

                    onChange={(e) => handleFormChange('dispatchDate', e.target.value)}

                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    required

                  />

                </div>



                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    Transport Details *

                  </label>

                  <textarea

                    value={formData.transportDetails}

                    onChange={(e) => handleFormChange('transportDetails', e.target.value)}

                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    rows={3}

                    placeholder="e.g., Truck #123 - Driver: John Doe - Contact: +1234567890 - Vehicle Type: Heavy Duty Truck"

                    required

                  />

                </div>



                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    Current Location *

                  </label>

                  <input

                    type="text"

                    value={formData.currentLocation}

                    onChange={(e) => handleFormChange('currentLocation', e.target.value)}

                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    placeholder="e.g., Distribution Center, Mumbai, Maharashtra"

                    required

                  />

                </div>



                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-slate-700 mb-2">

                    Allocated Items (Optional)

                  </label>

                  <textarea

                    value={formData.allocatedItems.join('\n')}

                    onChange={(e) => handleFormChange('allocatedItems', e.target.value.split('\n').filter(item => item.trim()))}

                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                    rows={4}

                    placeholder="Enter items (one per line)&#10;e.g.,&#10;Water Bottles (500 units)&#10;Food Packages (100 kits)&#10;Medical Kits (50 boxes)&#10;Blankets (200 pieces)"

                  />

                </div>

              </div>



              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">

                <button

                  type="button"

                  onClick={handleFormCancel}

                  className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"

                >

                  <Truck className="w-4 h-4" />

                  {editingRecord ? 'Update Dispatch' : 'Create Dispatch'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};



export default DistributionTracking;

