import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, MapPin, Truck, Users, AlertCircle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import './Pages.css';

const DistributionTracking = () => {
  const { user } = useAuth();
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewModal, setViewModal] = useState({ show: false, type: null, content: null, title: null });
  
  // State for finalized allocation plans
  const [readyAllocations, setReadyAllocations] = useState([]);

  // Role-based permissions
  const canCreateDispatch = user?.role === ROLES.TRACKING_OFFICER || user?.role === ROLES.ADMIN;
  const canEditDispatch = user?.role === ROLES.TRACKING_OFFICER || user?.role === ROLES.ADMIN;
  const isReadOnly = !canCreateDispatch && !canEditDispatch;

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
      status: 'prepared',
      currentLocation: 'Warehouse',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedRecords = [...dispatchRecords, record];
    setDispatchRecords(updatedRecords);
    localStorage.setItem('dispatchRecords', JSON.stringify(updatedRecords));
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
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            {user?.role === ROLES.TRACKING_OFFICER ? 'Tracking Officer / Dispatch Management' : 
             user?.role === ROLES.CHARITY ? 'Charity Staff / Delivery Tracking' :
             user?.role === ROLES.ADMIN ? 'Admin / Dispatch Management' :
             'Delivery Tracking'}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Distribution Tracking
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {canCreateDispatch ? 'Manage and monitor relief supply dispatch records with partner and event integration' :
             'View and track relief supply dispatch records and delivery status'}
          </p>
          {isReadOnly && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Read-Only Access
            </div>
          )}
        </div>
      </section>

      {/* Filter Section */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap gap-4 items-center">
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
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {filteredRecords.length} total records
            </span>
          </div>
        </div>
      </section>

      {/* Finalized Allocation Plans Section - Only for tracking officers */}
      {canCreateDispatch && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">📋 Finalized Allocation Plans</h2>
            <p className="text-sm text-slate-600">Allocation plans ready for dispatch. Create dispatch records to begin tracking.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {readyAllocations.length} ready for dispatch
            </span>
          </div>
        </div>
        
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
                      <span className="btn-icon">Truck</span>
                      <span className="btn-text">Create Dispatch Record</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Records List */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">🚚 Dispatch Records</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map(record => (
              <div key={record.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                      record.status === 'verified' ? 'bg-emerald-500' :
                      record.status === 'delivered' ? 'bg-green-500' :
                      record.status === 'in_transit' ? 'bg-amber-500' :
                      record.status === 'dispatched' ? 'bg-purple-500' :
                      'bg-blue-500'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{record.allocationRef}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    record.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    record.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    record.status === 'in_transit' ? 'bg-amber-100 text-amber-700' :
                    record.status === 'dispatched' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      record.status === 'verified' ? 'bg-emerald-500' :
                      record.status === 'delivered' ? 'bg-green-500' :
                      record.status === 'in_transit' ? 'bg-amber-500' :
                      record.status === 'dispatched' ? 'bg-purple-500' :
                      'bg-blue-500'
                    }`}></span>
                    {getStatusLabel(record.status)}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Dispatch:</span>
                    <span className="font-medium text-slate-900">{new Date(record.dispatchDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">Location:</span>
                    <span className="font-medium text-slate-900">{record.currentLocation}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-500">Transport:</span>
                    <span className="font-medium text-slate-900 text-xs leading-tight">{record.transportDetails}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-200 transition-colors"
                      onClick={() => viewDispatchReport(record)}
                      title="View dispatch report"
                    >
                      📄 Report
                    </button>
                    {record.status === 'delivered' && (
                      <button 
                        className="inline-flex items-center gap-1 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-xs font-medium hover:bg-green-100 transition-colors"
                        onClick={() => viewDeliveryConfirmation(record)}
                        title="View delivery confirmation"
                      >
                        ✅ Confirmation
                      </button>
                    )}
                    {record.status === 'delivered' && (
                      <button 
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 px-3 py-2 text-xs font-medium hover:bg-blue-100 transition-colors"
                        onClick={() => viewExportSummary(record)}
                        title="View CSV export data"
                      >
                        📊 Export
                      </button>
                    )}
                    
                    {/* Status Update Buttons - Only for tracking officers */}
                    {canEditDispatch && (
                      <>
                        {record.status === 'prepared' && (
                          <button 
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-50 text-purple-700 px-3 py-2 text-xs font-medium hover:bg-purple-100 transition-colors"
                            onClick={() => handleUpdateStatus(record.id, 'dispatched')}
                            title="Mark as dispatched"
                          >
                            🚚 Dispatch
                          </button>
                        )}
                        {record.status === 'dispatched' && (
                          <button 
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-700 px-3 py-2 text-xs font-medium hover:bg-amber-100 transition-colors"
                            onClick={() => handleUpdateStatus(record.id, 'in_transit')}
                            title="Mark as in transit"
                          >
                            🚛 In Transit
                          </button>
                        )}
                        {record.status === 'in_transit' && (
                          <button 
                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 text-green-700 px-3 py-2 text-xs font-medium hover:bg-green-100 transition-colors"
                            onClick={() => handleUpdateStatus(record.id, 'delivered')}
                            title="Mark as delivered"
                          >
                            📦 Delivered
                          </button>
                        )}
                      </>
                    )}
                    
                    {record.status === 'delivered' && (
                      <Link 
                        to="/dmc-delivery-verification"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        title="Go to DMC verification"
                      >
                        ✅ DMC Verify
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default DistributionTracking;
