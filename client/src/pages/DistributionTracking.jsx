import React, { useState, useEffect } from 'react';
import './Pages.css';

const DistributionTracking = () => {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

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

                {/* Status Progress */}
                <div className="status-progress">
                  <div className="progress-steps">
                    {statusOptions.map((option, index) => {
                      const currentIndex = statusOptions.findIndex(opt => opt.value === record.status);
                      const isActive = index <= currentIndex;
                      return (
                        <div 
                          key={option.value}
                          className={`progress-step ${isActive ? 'active' : ''}`}
                          style={{ 
                            backgroundColor: isActive ? getStatusColor(record.status) : '#e5e7eb'
                          }}
                        >
                          <div className="step-dot"></div>
                          <span className="step-label">{option.label}</span>
                        </div>
                      );
                    })}
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
