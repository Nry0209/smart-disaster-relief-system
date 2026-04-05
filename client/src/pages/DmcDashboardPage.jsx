import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  Activity,
  Truck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Package,
  CheckCircle,
  CheckSquare,
  TrendingUp,
} from "lucide-react";

function DmcDashboardPage() {
  const navigate = useNavigate();

  const stats = useMemo(
    () => [
      { label: "Active incidents", value: 4, icon: AlertTriangle, tone: "danger" },
      { label: "Reports filed", value: 32, icon: ClipboardList, tone: "info" },
      { label: "Deliveries pending", value: 12, icon: Truck, tone: "warning" },
      { label: "Resolved this week", value: 18, icon: CheckCircle2, tone: "success" },
    ],
    []
  );

  const recentReports = [
    {
      id: "DIS-014",
      location: "Gampaha / Biyagama",
      type: "Flood",
      severity: "High",
      status: "Active",
      time: "35 mins ago",
    },
    {
      id: "DIS-013",
      location: "Kalutara / Panadura",
      type: "Landslide",
      severity: "Critical",
      status: "Monitoring",
      time: "2 hours ago",
    },
    {
      id: "DIS-012",
      location: "Matara / Weligama",
      type: "Cyclone",
      severity: "Medium",
      status: "Active",
      time: "5 hours ago",
    },
  ];

  const predictiveSnapshot = [
    { label: "Water (L)", value: "4,800" },
    { label: "Meal packs", value: "3,400" },
    { label: "Medical kits", value: "620" },
    { label: "Shelter kits", value: "410" },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-blue-100 text-blue-700';
      case 'Monitoring': return 'bg-orange-100 text-orange-700';
      case 'Critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getIconColor = (tone) => {
    switch(tone) {
      case 'danger': return 'bg-red-50 text-red-600';
      case 'info': return 'bg-blue-50 text-blue-600';
      case 'warning': return 'bg-yellow-50 text-yellow-600';
      case 'success': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', padding: '24px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>
          DMC Officer / Command Center
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', margin: '0 0 8px 0' }}>
          Disaster Command Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Track disaster reports, confirm deliveries, and monitor predictive estimates in real time
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate("/disaster-report/create")}
          style={{
            backgroundColor: '#111827',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Create disaster report
        </button>
        <button
          onClick={() => navigate("/dmc-delivery-verification")}
          style={{
            backgroundColor: 'white',
            color: '#374151',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Verify Deliveries
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '6px',
                  ...getIconColor(item.tone)
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {item.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px' 
      }}>
        {/* Recent Disaster Reports */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                Recent disaster reports
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Newest incidents logged by field officers.
              </p>
            </div>
            <button
              onClick={() => navigate("/disaster-events")}
              style={{
                fontSize: '14px',
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '500'
              }}
            >
              View all
              <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentReports.map((report) => (
              <div
                key={report.id}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                      {report.type} - {report.location}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {report.id} · {report.severity} · {report.time}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '500',
                    ...getStatusColor(report.status)
                  }}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Resource Snapshot */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                Predictive resource snapshot
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Auto-generated estimates for the next 24 hours.
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <TrendingUp size={16} />
              +6% demand
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            {predictiveSnapshot.map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px dashed #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Forecast refreshes every 30 minutes based on historical disaster data.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DmcDashboardPage;
