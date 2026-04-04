import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, Users, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import './Pages.css';

function DashboardPage() {
  const { user } = useAuth();
  const [deliveryRecords, setDeliveryRecords] = useState([]);

  // Load delivery records for tracking
  useEffect(() => {
    const distributionRecords = JSON.parse(localStorage.getItem('distributionTrackingRecords') || '[]');
    setDeliveryRecords(distributionRecords);
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const distributionRecords = JSON.parse(localStorage.getItem('distributionTrackingRecords') || '[]');
      setDeliveryRecords(distributionRecords);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const stats = [
    { label: "Active Deliveries", value: deliveryRecords.filter(r => r.status === 'in_transit').length, icon: Truck, tone: "warning" },
    { label: "Delivered Today", value: deliveryRecords.filter(r => r.status === 'delivered').length, icon: Package, tone: "success" },
    { label: "Confirmed Deliveries", value: deliveryRecords.filter(r => r.status === 'confirmed').length, icon: CheckCircle, tone: "info" },
    { label: "People Helped", value: "5,892", icon: Users, tone: "success" },
  ];

  const toneStyles = {
    danger: "bg-rose-50 text-rose-600",
    warning: "bg-amber-50 text-amber-600",
    info: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
  };

  const recentDeliveries = deliveryRecords
    .filter(r => r.status === 'in_transit' || r.status === 'delivered')
    .slice(0, 3);

  const getRoleTitle = () => {
    switch(user?.role) {
      case 'charity_staff': return 'Charity Staff Member';
      case 'admin': return 'System Administrator';
      case 'inventory_officer': return 'Inventory Officer';
      case 'allocation_officer': return 'Allocation Officer';
      case 'tracking_officer': return 'Tracking Officer';
      default: return 'Team Member';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <span className="dashboard-role">
            {getRoleTitle()} / Operations Overview
          </span>
          <h1 className="dashboard-title">
            Relief Operations Dashboard
          </h1>
          <p className="dashboard-description">
            Monitor delivery progress, track relief operations, and stay updated on disaster response activities
          </p>
        </div>
      </div>

      <div className="dashboard-stats">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="stat-card">
              <div className={`stat-icon ${toneStyles[item.tone]}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="stat-label">
                  {item.label}
                </p>
                <strong className="stat-value">
                  {item.value}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-content">
        <div className="delivery-tracking">
          <div className="section-header">
            <h2>Delivery Tracking</h2>
            <p>Real-time status of relief supply deliveries</p>
            <span className="delivery-count">
              {deliveryRecords.length} total
            </span>
          </div>
          <div className="delivery-list">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="delivery-item">
                  <div className={`delivery-status ${
                    delivery.status === 'delivered' ? 'delivered' :
                    delivery.status === 'in_transit' ? 'in-transit' :
                    'pending'
                  }`}>
                    {delivery.status === 'delivered' ? <CheckCircle size={18} /> :
                     delivery.status === 'in_transit' ? <Truck size={18} /> :
                     <Package size={18} />}
                  </div>
                  <div className="delivery-info">
                    <h4>
                      {delivery.disasterType} - {delivery.location}
                    </h4>
                    <p>
                      {delivery.allocationRef} • {delivery.transportDetails}
                    </p>
                  </div>
                  <div className="delivery-status-text">
                    <p>Status</p>
                    <span className={
                      delivery.status === 'delivered' ? 'delivered' :
                      delivery.status === 'in_transit' ? 'in-transit' :
                      'pending'
                    }>
                      {delivery.status === 'delivered' ? 'Delivered' :
                       delivery.status === 'in_transit' ? 'In Transit' :
                       delivery.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-deliveries">
                <Package size={32} />
                <p>No active deliveries</p>
              </div>
            )}
          </div>
        </div>

        <div className="recent-activity">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <p>Latest updates from relief operations</p>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon dispatched">
                <Package size={16} />
              </div>
              <div>
                <h4>Medical supplies dispatched to Colombo</h4>
                <p>2 hours ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon delivered">
                <CheckCircle size={16} />
              </div>
              <div>
                <h4>Flood relief supplies delivered to Galle</h4>
                <p>4 hours ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon warning">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4>Water shortage reported in Kandy region</h4>
                <p>6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
