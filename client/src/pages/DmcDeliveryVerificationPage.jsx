import React, { useState, useEffect } from "react";
import { CheckCircle, Package, MapPin, Calendar, Users, AlertTriangle, Search, Filter, Eye, CheckSquare } from "lucide-react";
import './Pages.css';

const DmcDeliveryVerificationPage = () => {
  const [dispatchRecords, setDispatchRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [verificationModal, setVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState({
    receivedItems: [],
    missingItems: [],
    damagedItems: [],
    notes: "",
    verifiedBy: "",
    verifiedAt: ""
  });

  useEffect(() => {
    // Load dispatch records from localStorage
    const storedRecords = localStorage.getItem('dispatchRecords');
    if (storedRecords) {
      const records = JSON.parse(storedRecords);
      setDispatchRecords(records.filter(record => 
        record.status === 'delivered' || record.status === 'in_transit'
      ));
    }
  }, []);

  useEffect(() => {
    // Listen for real-time updates
    const handleStorageChange = (e) => {
      if (e.key === 'dispatchRecords') {
        const records = JSON.parse(e.newValue || '[]');
        setDispatchRecords(records.filter(record => 
          record.status === 'delivered' || record.status === 'in_transit'
        ));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredRecords = dispatchRecords.filter(record => {
    const matchesSearch = record.allocationRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.transportDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.currentLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'in_transit': return { color: '#f59e0b', bg: '#fef3c7', label: 'In Transit' };
      case 'delivered': return { color: '#10b981', bg: '#dcfce7', label: 'Delivered' };
      case 'verified': return { color: '#059669', bg: '#d1fae5', label: 'Verified & Confirmed' };
      default: return { color: '#6b7280', bg: '#f3f4f6', label: status };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVerification = (record) => {
    setSelectedRecord(record);
    setVerificationData({
      receivedItems: [],
      missingItems: [],
      damagedItems: [],
      notes: "",
      verifiedBy: "DMC Officer",
      verifiedAt: new Date().toISOString()
    });
    setVerificationModal(true);
  };

  const submitVerification = () => {
    if (!selectedRecord) return;

    // Update the record status to 'verified' (which maps to 'delivered' in tracking)
    const updatedRecords = dispatchRecords.map(record => {
      if (record.id === selectedRecord.id) {
        return {
          ...record,
          status: 'verified',
          verificationData: verificationData,
          updatedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        };
      }
      return record;
    });

    // Save to localStorage
    const allRecords = JSON.parse(localStorage.getItem('dispatchRecords') || '[]');
    const finalRecords = allRecords.map(record => {
      if (record.id === selectedRecord.id) {
        return {
          ...record,
          status: 'verified',
          verificationData: verificationData,
          updatedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        };
      }
      return record;
    });

    localStorage.setItem('dispatchRecords', JSON.stringify(finalRecords));
    setDispatchRecords(updatedRecords);

    // Close modal
    setVerificationModal(false);
    setSelectedRecord(null);

    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'dispatchRecords',
      newValue: JSON.stringify(finalRecords)
    }));
  };

  const viewDispatchDetails = (record) => {
    // View detailed dispatch information
    alert(`Dispatch Details:\n\nAllocation: ${record.allocationRef}\nTransport: ${record.transportDetails}\nLocation: ${record.currentLocation}\nStatus: ${getStatusColor(record.status).label}\n\nItems: ${record.items ? record.items.map(item => item.name).join(', ') : 'No items listed'}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      {/* Header */}
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            DMC Officer / Delivery Verification
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Smart Disaster Relief System - Delivery Verification
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Verify and confirm receipt of delivered disaster relief supplies
          </p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">In Transit</p>
            <strong className="text-xl font-semibold text-slate-900">
              {dispatchRecords.filter(r => r.status === 'in_transit').length}
            </strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Delivered</p>
            <strong className="text-xl font-semibold text-slate-900">
              {dispatchRecords.filter(r => r.status === 'delivered').length}
            </strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <CheckSquare size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Verified</p>
            <strong className="text-xl font-semibold text-slate-900">
              {dispatchRecords.filter(r => r.status === 'verified').length}
            </strong>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Verification</p>
            <strong className="text-xl font-semibold text-slate-900">
              {dispatchRecords.filter(r => r.status === 'delivered').length}
            </strong>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by allocation reference, transport details, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      </section>

      {/* Records List */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Records</h2>
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No delivery records found</p>
              <p className="text-sm">No deliveries are currently in transit or delivered</p>
            </div>
          ) : (
            filteredRecords.map(record => {
              const statusStyle = getStatusColor(record.status);
              
              return (
                <div key={record.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{record.allocationRef}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{record.currentLocation}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{formatDate(record.dispatchDate)}</span>
                        </div>
                      </div>
                      
                      <p className="text-slate-700 mb-3">{record.transportDetails}</p>
                      
                      {record.verificationData && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-green-800">
                            ✅ Verified by {record.verificationData.verifiedBy} on {formatDate(record.verificationData.verifiedAt)}
                          </p>
                          {record.verificationData.notes && (
                            <p className="text-sm text-green-700 mt-1">Notes: {record.verificationData.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    <button 
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
                      onClick={() => viewDispatchDetails(record)}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                    
                    {record.status === 'delivered' && (
                      <button 
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(16,185,129,0.2)] transition hover:-translate-y-0.5"
                        onClick={() => handleVerification(record)}
                      >
                        <CheckSquare size={16} />
                        Verify Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Verification Modal */}
      {verificationModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Verify Delivery Receipt</h3>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">Dispatch Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Allocation Reference:</span>
                  <p className="font-medium text-slate-900">{selectedRecord.allocationRef}</p>
                </div>
                <div>
                  <span className="text-slate-600">Transport Details:</span>
                  <p className="font-medium text-slate-900">{selectedRecord.transportDetails}</p>
                </div>
                <div>
                  <span className="text-slate-600">Current Location:</span>
                  <p className="font-medium text-slate-900">{selectedRecord.currentLocation}</p>
                </div>
                <div>
                  <span className="text-slate-600">Dispatch Date:</span>
                  <p className="font-medium text-slate-900">{formatDate(selectedRecord.dispatchDate)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verification Notes</label>
                <textarea
                  value={verificationData.notes}
                  onChange={(e) => setVerificationData({...verificationData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter any notes about the delivery verification (missing items, damages, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verified By</label>
                <input
                  type="text"
                  value={verificationData.verifiedBy}
                  onChange={(e) => setVerificationData({...verificationData, verifiedBy: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DMC Officer Name"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
                onClick={() => setVerificationModal(false)}
              >
                Cancel
              </button>
              <button 
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(16,185,129,0.2)] transition hover:-translate-y-0.5"
                onClick={submitVerification}
              >
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DmcDeliveryVerificationPage;
