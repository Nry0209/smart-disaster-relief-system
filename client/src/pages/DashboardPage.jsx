import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Truck, Users, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { fetchTrackingRecords } from '../services/workflowService';
import { fetchDisasterReports } from '../services/disasterReportService';
import { fetchInventoryItems } from '../services/inventoryService';
import './Pages.css';

function DashboardPage() {
  const { user } = useAuth();
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [disasterReports, setDisasterReports] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load real data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [trackingData, reportsData, inventoryData] = await Promise.allSettled([
          fetchTrackingRecords(),
          fetchDisasterReports(),
          fetchInventoryItems()
        ]);

        if (trackingData.status === 'fulfilled') {
          setDeliveryRecords(Array.isArray(trackingData.value) ? trackingData.value : []);
        }

        if (reportsData.status === 'fulfilled') {
          setDisasterReports(Array.isArray(reportsData.value) ? reportsData.value : []);
        }

        if (inventoryData.status === 'fulfilled') {
          setInventoryItems(Array.isArray(inventoryData.value) ? inventoryData.value : []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = [
    { label: "Active Deliveries", value: deliveryRecords.filter(r => r.status === 'in_transit').length, icon: Truck, tone: "warning" },
    { label: "Delivered Today", value: deliveryRecords.filter(r => r.status === 'delivered').length, icon: Package, tone: "success" },
    { label: "Confirmed Deliveries", value: deliveryRecords.filter(r => r.status === 'confirmed_delivered').length, icon: CheckCircle, tone: "info" },
    { label: "Active Disasters", value: disasterReports.filter(r => r.status === 'active').length, icon: AlertTriangle, tone: "danger" },
    { label: "Total Inventory Items", value: inventoryItems.length, icon: Package, tone: "success" },
    { label: "Low Stock Items", value: inventoryItems.filter(item => item.stock < item.min).length, icon: AlertTriangle, tone: "warning" },
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
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            {getRoleTitle()} / Operations Overview
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Relief Operations Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monitor delivery progress, track relief operations, and stay updated on disaster response activities
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[item.tone]}`}
              >
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {item.label}
                </p>
                <strong className="text-xl font-semibold text-slate-900">
                  {item.value}
                </strong>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Delivery Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Real-time status of relief supply deliveries
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {deliveryRecords.length} total
            </span>
          </div>
          <div className="space-y-3">
            {recentDeliveries.length > 0 ? (
              recentDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    delivery.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                    delivery.status === 'in_transit' ? 'bg-amber-50 text-amber-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {delivery.status === 'delivered' ? <CheckCircle size={18} /> :
                     delivery.status === 'in_transit' ? <Truck size={18} /> :
                     <Package size={18} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {delivery.disasterType} - {delivery.location}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {delivery.allocationRef} • {delivery.transportDetails}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Status</p>
                    <span className={`text-xs font-semibold ${
                      delivery.status === 'delivered' ? 'text-emerald-600' :
                      delivery.status === 'in_transit' ? 'text-amber-600' :
                      'text-blue-600'
                    }`}>
                      {delivery.status === 'delivered' ? 'Delivered' :
                       delivery.status === 'in_transit' ? 'In Transit' :
                       delivery.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active deliveries</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500">
                Latest updates from relief operations
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={16} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Medical supplies dispatched to Colombo
                </h4>
                <p className="text-xs text-slate-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={16} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Flood relief supplies delivered to Galle
                </h4>
                <p className="text-xs text-slate-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Water shortage reported in Kandy region
                </h4>
                <p className="text-xs text-slate-500">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;