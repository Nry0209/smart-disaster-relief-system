import React, { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, XCircle, Clock, AlertCircle, Package, Users, Calendar, TrendingUp } from "lucide-react";
import PageHeader from '../components/PageHeader';
import './Pages.css';
import { fetchDonations, fetchResourceRequests, verifyDonation, rejectDonation } from '../services/reliefApi';

const DonationVerificationPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDonations = async () => {
    try {
      setLoading(true);
      setError("");

      const [donationResponse, requestResponse] = await Promise.all([
        fetchDonations(),
        fetchResourceRequests(),
      ]);

      const donationRows = donationResponse.data || [];
      const requestRows = (requestResponse.data || []).map((request) => {
        const requestItems = Array.isArray(request.items) ? request.items : [];
        const normalizedStatus = String(request.status || "pending").toLowerCase();

        let status = "pending";
        if (["approved", "fulfilled", "partially_fulfilled"].includes(normalizedStatus)) {
          status = "verified";
        } else if (normalizedStatus === "rejected") {
          status = "rejected";
        }

        return {
          id: request.requestCode || request.id,
          donorName: request.organization || request.requesterName || "Resource Request",
          donorType: "Resource Request",
          items: requestItems.map((item) => `${item.itemName} (${item.quantityRequested})`),
          date: request.neededBy || "-",
          status,
          value: "N/A",
          contact: request.requesterPhone || "-",
          email: request.requesterEmail || "-",
          notes: request.description || "Submitted from Resource Request form.",
          source: "resource-request",
        };
      });

      setDonations([...donationRows, ...requestRows]);
    } catch (err) {
      setError(err.message || "Failed to load donations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const filteredDonations = useMemo(() => donations.filter(donation => {
    const matchesSearch = String(donation.donorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(donation.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(donation.donorType || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || donation.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }), [donations, searchTerm, selectedStatus]);

  const stats = {
    total: donations.length,
    pending: donations.filter(d => d.status === "pending").length,
    verified: donations.filter(d => d.status === "verified").length,
    rejected: donations.filter(d => d.status === "rejected").length
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return <CheckCircle size={16} color="#16a34a" />;
      case "rejected":
        return <XCircle size={16} color="#dc2626" />;
      case "pending":
      default:
        return <Clock size={16} color="#f59e0b" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      verified: "status-badge verified",
      rejected: "status-badge rejected", 
      pending: "status-badge pending"
    };
    return statusClasses[status] || "status-badge pending";
  };

  const handleVerify = async (donationId) => {
    await verifyDonation(donationId, { verifiedBy: null });
    await loadDonations();
  };

  const handleReject = async (donationId) => {
    await rejectDonation(donationId, { verifiedBy: null });
    await loadDonations();
  };

  return (
    <div className="donation-verification-page">

      <PageHeader 
        role="Charity Staff / Donation Verification"
        title="Donation Verification"
        description="Review and verify incoming donations from various sources"
      />

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* STATS */}
      <div className="donation-stats">
        {[
          { icon: <Package size={16} color="#2563eb"/>, bg:"#eff6ff", lbl:"Total Donations", val: stats.total },
          { icon: <Clock size={16} color="#f59e0b"/>, bg:"#fef3c7", lbl:"Pending Review", val: stats.pending },
          { icon: <CheckCircle size={16} color="#16a34a"/>, bg:"#f0fdf4", lbl:"Verified", val: stats.verified },
          { icon: <XCircle size={16} color="#dc2626"/>, bg:"#fef2f2", lbl:"Rejected", val: stats.rejected },
        ].map(s => (
          <div className="stat-card" key={s.lbl}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-content">
              <h3>{s.lbl}</h3>
              <p>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading donations...</div>
      ) : (
        <>

      {/* FILTERS AND SEARCH */}
      <div className="tracking-actions">
        <div className="filter-controls">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select 
            id="status-filter"
            className="filter-select"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="filter-controls">
          <div className="search-input">
            <Search size={14}/>
            <input
              placeholder="Search donations..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DONATIONS TABLE */}
      <div className="donation-table-container">
        <table className="donation-table">
          <thead>
            <tr>
              <th>Donation ID</th>
              <th>Donor Name</th>
              <th>Type</th>
              <th>Items</th>
              <th>Date</th>
              <th>Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDonations.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>
                  No donations found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredDonations.map(donation => (
                <tr key={donation.id}>
                  <td><span className="donation-id">{donation.id}</span></td>
                  <td>
                    <div className="donor-info">
                      <div className="donor-name">{donation.donorName}</div>
                      <div className="donor-contact">{donation.contact}</div>
                    </div>
                  </td>
                  <td><span className="donor-type">{donation.donorType}</span></td>
                  <td>
                    <div className="items-list">
                      {donation.items.map((item, index) => (
                        <div key={index} className="item-tag">{item}</div>
                      ))}
                    </div>
                  </td>
                  <td><span className="donation-date">{donation.date}</span></td>
                  <td><span className="donation-value">{donation.value}</span></td>
                  <td>
                    <span className={getStatusBadge(donation.status)}>
                      {getStatusIcon(donation.status)}
                      {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-view"
                        onClick={() => setSelectedDonation(donation)}
                      >
                        View
                      </button>
                      {donation.status === "pending" && donation.source !== "resource-request" && (
                        <>
                          <button 
                            className="btn-verify"
                            onClick={() => handleVerify(donation.id)}
                          >
                            Verify
                          </button>
                          <button 
                            className="btn-reject"
                            onClick={() => handleReject(donation.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selectedDonation && (
        <div className="donation-modal-overlay" onClick={() => setSelectedDonation(null)}>
          <div className="donation-modal" onClick={e => e.stopPropagation()}>
            <div className="donation-modal-header">
              <h2>Donation Details</h2>
              <button className="close-btn" onClick={() => setSelectedDonation(null)}>×</button>
            </div>
            <div className="donation-modal-body">
              <div className="donation-detail-grid">
                <div className="detail-section">
                  <h3>Donor Information</h3>
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedDonation.donorName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Type:</label>
                    <span>{selectedDonation.donorType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contact:</label>
                    <span>{selectedDonation.contact}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedDonation.email}</span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Donation Information</h3>
                  <div className="detail-item">
                    <label>ID:</label>
                    <span>{selectedDonation.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date:</label>
                    <span>{selectedDonation.date}</span>
                  </div>
                  <div className="detail-item">
                    <label>Value:</label>
                    <span>{selectedDonation.value}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={getStatusBadge(selectedDonation.status)}>
                      {getStatusIcon(selectedDonation.status)}
                      {selectedDonation.status.charAt(0).toUpperCase() + selectedDonation.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="detail-section full-width">
                <h3>Donated Items</h3>
                <div className="items-detail-list">
                  {selectedDonation.items.map((item, index) => (
                    <div key={index} className="item-detail">{item}</div>
                  ))}
                </div>
              </div>
              
              <div className="detail-section full-width">
                <h3>Notes</h3>
                <p className="donation-notes">{selectedDonation.notes}</p>
              </div>
            </div>
            
            <div className="donation-modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedDonation(null)}>Close</button>
              {selectedDonation.status === "pending" && selectedDonation.source !== "resource-request" && (
                <>
                  <button 
                    className="btn-verify"
                    onClick={() => {
                        handleVerify(selectedDonation.id);
                        setSelectedDonation(null);
                    }}
                  >
                    Verify Donation
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => {
                        handleReject(selectedDonation.id);
                        setSelectedDonation(null);
                    }}
                  >
                    Reject Donation
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default DonationVerificationPage;