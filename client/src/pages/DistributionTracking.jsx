import React, { useState, useEffect } from 'react';
import './Pages.css';

const DistributionTracking = () => {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewModal, setViewModal] = useState({ show: false, type: null, content: null, title: null });

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockData = [
      {
        id: 1,
        allocationRef: 'ALLOC-2024-001',
        dispatchDate: '2024-03-25',
        transportDetails: 'Vehicle #123 - Driver: John Silva',
        currentLocation: 'Colombo Warehouse',
        status: 'prepared',
        createdAt: '2024-03-25T09:00:00',
        updatedAt: '2024-03-25T09:00:00'
      },

      {
        id: 2,
        allocationRef: 'ALLOC-2024-002',
        dispatchDate: '2024-03-24',
        transportDetails: 'Truck #456 - Driver: Priya Fernando',
        currentLocation: 'Galle District',
        status: 'in_transit',
        createdAt: '2024-03-24T14:30:00',
        updatedAt: '2024-03-25T08:15:00'
      },

      {
        id: 3,
        allocationRef: 'ALLOC-2024-003',
        dispatchDate: '2024-03-23',
        transportDetails: 'Van #789 - Driver: Kamal Perera',
        currentLocation: 'DMC Office - Matara',
        status: 'delivered',
        createdAt: '2024-03-23T11:00:00',
        updatedAt: '2024-03-25T16:45:00'
      }

    ];
    setDispatchRecords(mockData);
  }, []);

  const statusOptions = [
    { value: 'prepared', label: 'Prepared', color: '#2563eb' },
    { value: 'dispatched', label: 'Dispatched', color: '#7c3aed' },
    { value: 'in_transit', label: 'In Transit', color: '#f59e0b' },
    { value: 'delivered', label: 'Delivered', color: '#10b981' },
    { value: 'confirmed', label: 'Confirmed Delivered', color: '#059669' }
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
    setDispatchRecords(records.map(record => 
      record.id === recordId 
        ? { ...record, status: newStatus, updatedAt: new Date().toISOString() }
        : record
    ));
  };

  const handleDeleteRecord = (recordId) => {
    if (window.confirm('Are you sure you want to delete this dispatch record?')) {
      setDispatchRecords(records.filter(record => record.id !== recordId));
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowCreateForm(true);
  };

  const handleUpdateRecord = (updatedRecord) => {
    setDispatchRecords(records.map(record => 
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
    <div className="distribution-tracking">
      <div className="tracking-header">
        <h1>Distribution Tracking</h1>
        <p>Manage and monitor relief supply dispatch records</p>
          <div className="tracking-actions">
          <div className="filter-controls">
            <label htmlFor="status-filter">Filter by Status:</label>
            <select 
              id="status-filter"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"

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
      </div>

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
                  <div className="status-actions">
                    {record.status !== 'confirmed' && (
                      <select 
                        className="status-update-select"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleUpdateStatus(record.id, e.target.value);
                           e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Update Status</option>
                        {statusOptions
                          .filter(option => {

                            const currentIndex = statusOptions.findIndex(opt => opt.value === record.status);
                            const optionIndex = statusOptions.findIndex(opt => opt.value === option.value);
                            return optionIndex > currentIndex && optionIndex <= currentIndex + 1;
                          })
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              Mark as {option.label}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>

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
                    a.download = `${viewModal.title.replace(/\s+/g, '_')}.csv`;
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

