import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin } from 'lucide-react';
import './Pages.css';

const DistributionTracking = () => {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewModal, setViewModal] = useState({ show: false, type: null, content: null, title: null });
  
  // State for finalized allocation plans
  const [readyAllocations, setReadyAllocations] = useState([]);

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
      // Filter for finalized plans that are ready for dispatch
      const readyPlans = plans.filter(plan => 
        plan.status === 'finalized' && 
        (!plan.distributionInfo || Object.keys(plan.distributionInfo).length === 0)
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
      updatedAt: new Date().toISOString()
    };
    
    const newDispatchRecords = [...dispatchRecords, dispatchRecord];
    setDispatchRecords(newDispatchRecords);
    setShowCreateForm(false);
    
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

    setDispatchRecords([...dispatchRecords, record]);
    setShowCreateForm(false);
  };

  const handleUpdateStatus = (recordId, newStatus) => {
    setDispatchRecords(dispatchRecords.map(record => 
      record.id === recordId 
        ? { ...record, status: newStatus, updatedAt: new Date().toISOString() }
        : record
    ));
  };

  const handleDeleteRecord = (recordId) => {
    if (window.confirm('Are you sure you want to delete this dispatch record?')) {
      setDispatchRecords(dispatchRecords.filter(record => record.id !== recordId));
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowCreateForm(true);
  };

  const handleUpdateRecord = (updatedRecord) => {
    setDispatchRecords(dispatchRecords.map(record => 
      record.id === updatedRecord.id 
        ? { ...updatedRecord, updatedAt: new Date().toISOString() }
        : record

    ));

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
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <div>
          <span className="text-xs font-semibold text-slate-500">Dispatch Management / Distribution Tracking</span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Distribution Tracking</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage and monitor relief supply dispatch records with partner and event integration.</p>
        </div>

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
          <button 
            className="btn-primary"
            onClick={() => {
              setEditingRecord(null);
              setShowCreateForm(true);
            }}
          >
            + Create Dispatch Record

          </button>
        </div>
      </section>

      {/* Finalized Allocation Plans Section */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Finalized Allocation Plans</h2>
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
            {readyAllocations.map(allocation => {
              return (
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
              )
            }
          )
        }
      </div>
    )}
          </section>

        {/* Records List */}
      <div className="records-container">
        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <p>No dispatch records found</p>
          </div>
        ) : (
          <div className="records-grid">
            {filteredRecords.map(record => (
              <div key={record.id} className="record-card">
                <div className="record-header">
                  <h3>{record.allocationRef}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(record.status) }}
                  >
                    {getStatusLabel(record.status)}
                  </span>
                </div>

                <div className="record-details">
                  <div className="detail-row">
                    <span className="label">Dispatch Date:</span>
                    <span className="value">{new Date(record.dispatchDate).toLocaleDateString()}</span>
                  </div>

                  <div className="detail-row">
                    <span className="label">Transport:</span>
                    <span className="value">{record.transportDetails}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Location:</span>
                    <span className="value">{record.currentLocation}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Last Updated:</span>
                    <span className="value">
                      {new Date(record.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="record-actions">
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => viewDispatchReport(record)}
                      title="View dispatch report"
                    >
                      📄 Dispatch
                    </button>
                    {record.status === 'delivered' && (
                      <>
                        <button 
                          className="btn-view"
                          onClick={() => viewDeliveryConfirmation(record)}
                          title="View delivery confirmation"
                        >
                          ✅ Delivery
                        </button>
                        <button 
                          className="btn-view"
                          onClick={() => viewExportSummary(record)}
                          title="View CSV export data"
                        >
                          📊 Export Summary
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="action-buttons secondary">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditRecord(record)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteRecord(record.id)}
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

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <DispatchRecordForm 
          record={editingRecord}
          onSave={editingRecord ? handleUpdateRecord : handleCreateRecord}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingRecord(null);
          }}
        />
      )}
      {/* View Modal */}
      {viewModal.show && (
        <div className="modal-overlay view-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{viewModal.title}</h2>
              <button 
                className="modal-close"
                onClick={() => setViewModal({ show: false, type: null, content: null, title: null })}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="document-content">
                {viewModal.content}
              </div>
            </div>
            <div className="modal-footer">
              {viewModal.type === 'export-summary' && (
                <button 
                  className="btn-primary"
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
                className="btn-secondary"
                onClick={() => setViewModal({ show: false, type: null, content: null, title: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dispatch Record Form Component
const DispatchRecordForm = ({ record, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    allocationRef: record?.allocationRef || '',
    dispatchDate: record?.dispatchDate || new Date().toISOString().split('T')[0],
    transportDetails: record?.transportDetails || '',
    currentLocation: record?.currentLocation || 'Warehouse'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (record) {
      onSave({ ...record, ...formData });
    } else {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{record ? 'Edit Dispatch Record' : 'Create Dispatch Record'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
       </div>
        <form onSubmit={handleSubmit} className="dispatch-form">
          <div className="form-group">
            <label htmlFor="allocationRef">Allocation Reference *</label>
            <input
              type="text"
              id="allocationRef"
              name="allocationRef"
              value={formData.allocationRef}
              onChange={handleChange}
              required
              placeholder="e.g., ALLOC-2024-001"
            />
          </div>
          <div className="form-group">
            <label htmlFor="dispatchDate">Dispatch Date *</label>
            <input
              type="date"
              id="dispatchDate"
              name="dispatchDate"
              value={formData.dispatchDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="transportDetails">Transport Details *</label>
            <textarea
              id="transportDetails"
              name="transportDetails"
              value={formData.transportDetails}
              onChange={handleChange}
              required
              placeholder="e.g., Vehicle #123 - Driver: John Silva"
              rows="3"
           />
          </div>
          <div className="form-group">
            <label htmlFor="currentLocation">Current Location</label>
            <input
              type="text"
              id="currentLocation"
              name="currentLocation"
              value={formData.currentLocation}
              onChange={handleChange}
              placeholder="e.g., Colombo Warehouse"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {record ? 'Update Record' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistributionTracking;

