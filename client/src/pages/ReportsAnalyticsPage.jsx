import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, Search, FileText, Activity, Users, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPredictionLogs } from '../services/predictionService';

const ReportsAnalyticsPage = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [predictionLogs, setPredictionLogs] = useState([]);
  const [predictionLogsLoading, setPredictionLogsLoading] = useState(false);
  const [predictionLogsError, setPredictionLogsError] = useState('');

  // Mock data for analytics
  const [analytics, setAnalytics] = useState({
    overview: {
      totalRequests: 1247,
      totalAllocations: 892,
      totalValue: 2847500,
      activeDisasters: 12,
      responseRate: 71.5,
      avgResponseTime: 4.2
    },
    resources: {
      mostAllocated: [
        { name: 'Medical Supplies', count: 234, percentage: 28 },
        { name: 'Food Supplies', count: 189, percentage: 23 },
        { name: 'Water', count: 156, percentage: 19 },
        { name: 'Shelter Materials', count: 123, percentage: 15 },
        { name: 'Emergency Kits', count: 87, percentage: 10 }
      ],
      categoryDistribution: [
        { category: 'Medical', value: 45, color: '#3b82f6' },
        { category: 'Food', value: 25, color: '#10b981' },
        { category: 'Water', value: 15, color: '#06b6d4' },
        { category: 'Shelter', value: 10, color: '#f59e0b' },
        { category: 'Emergency', value: 5, color: '#ef4444' }
      ]
    },
    disasters: [
      { month: 'Jan', count: 12, severity: 'high' },
      { month: 'Feb', count: 8, severity: 'medium' },
      { month: 'Mar', count: 15, severity: 'high' },
      { month: 'Apr', count: 6, severity: 'low' },
      { month: 'May', count: 10, severity: 'medium' },
      { month: 'Jun', count: 9, severity: 'medium' }
    ],
    performance: {
      responseTime: [
        { period: 'Week 1', time: 3.2 },
        { period: 'Week 2', time: 4.1 },
        { period: 'Week 3', time: 3.8 },
        { period: 'Week 4', time: 4.5 }
      ],
      allocationRate: [
        { period: 'Week 1', rate: 68 },
        { period: 'Week 2', rate: 72 },
        { period: 'Week 3', rate: 75 },
        { period: 'Week 4', rate: 71 }
      ]
    }
  });

  const reportTypes = [
    { id: 'overview', name: 'Overview Report', icon: BarChart3, description: 'Comprehensive system overview' },
    { id: 'resources', name: 'Resource Analytics', icon: Package, description: 'Resource allocation and distribution' },
    { id: 'disasters', name: 'Disaster Trends', icon: AlertTriangle, description: 'Disaster patterns and trends' },
    { id: 'performance', name: 'Performance Metrics', icon: TrendingUp, description: 'System performance indicators' }
  ];

  const periods = [
    { id: 'week', name: 'Last Week' },
    { id: 'month', name: 'Last Month' },
    { id: 'quarter', name: 'Last Quarter' },
    { id: 'year', name: 'Last Year' }
  ];

  const exportFormats = ['PDF', 'Excel', 'CSV'];
  const canViewPredictionLogs = ['admin', 'inventory_officer'].includes(user?.role);

  const handleExport = (format) => {
    console.log(`Exporting ${selectedReport} report as ${format}`);
  };

  useEffect(() => {
    if (!canViewPredictionLogs) {
      setPredictionLogs([]);
      setPredictionLogsError('');
      return;
    }

    const loadPredictionLogs = async () => {
      try {
        setPredictionLogsLoading(true);
        setPredictionLogsError('');
        const response = await getPredictionLogs({ limit: 20 });
        setPredictionLogs(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        setPredictionLogs([]);
        setPredictionLogsError(error?.response?.data?.message || error.message || 'Failed to load prediction logs.');
      } finally {
        setPredictionLogsLoading(false);
      }
    };

    loadPredictionLogs();
  }, [canViewPredictionLogs]);

  const renderPredictionMonitoring = () => {
    if (!canViewPredictionLogs) {
      return null;
    }

    return (
      <div className="prediction-monitoring-panel">
        <div className="prediction-monitoring-header">
          <h2>Prediction Monitoring (Admin/Inventory)</h2>
          <p>Recent model runs generated from allocation workflow.</p>
        </div>

        {predictionLogsLoading ? (
          <p className="allocation-info-inline">Loading prediction logs...</p>
        ) : predictionLogsError ? (
          <p className="allocation-error-inline">{predictionLogsError}</p>
        ) : predictionLogs.length === 0 ? (
          <p className="allocation-info-inline">No prediction logs available yet.</p>
        ) : (
          <div className="prediction-monitoring-table-wrap">
            <table className="prediction-monitoring-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Disaster</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Affected</th>
                  <th>Food</th>
                  <th>Water</th>
                  <th>Medicine</th>
                  <th>Generated By</th>
                </tr>
              </thead>
              <tbody>
                {predictionLogs.map((log) => {
                  const food = Array.isArray(log.predictedResources)
                    ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'food')?.recommendedQuantity || 0)
                    : 0;
                  const water = Array.isArray(log.predictedResources)
                    ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'water')?.recommendedQuantity || 0)
                    : 0;
                  const medicine = Array.isArray(log.predictedResources)
                    ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'medicine')?.recommendedQuantity || 0)
                    : 0;

                  return (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.disasterType || '-'}</td>
                      <td>{log.location || '-'}</td>
                      <td>{String(log.severity || '-').toUpperCase()}</td>
                      <td>{Number(log.affectedPeople || 0).toLocaleString()}</td>
                      <td>{food.toLocaleString()}</td>
                      <td>{water.toLocaleString()}</td>
                      <td>{medicine.toLocaleString()}</td>
                      <td>{log.generatedBy?.fullName || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderOverviewStats = () => (
    <div className="analytics-stats-grid">
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#eff6ff' }}>
          <FileText size={24} color="#3b82f6" />
        </div>
        <div className="stat-content">
          <h3>Total Requests</h3>
          <p>{analytics.overview.totalRequests.toLocaleString()}</p>
          <span className="stat-change positive">+12.5%</span>
        </div>
      </div>
      
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#dcfce7' }}>
          <Package size={24} color="#16a34a" />
        </div>
        <div className="stat-content">
          <h3>Total Allocations</h3>
          <p>{analytics.overview.totalAllocations.toLocaleString()}</p>
          <span className="stat-change positive">+8.3%</span>
        </div>
      </div>
      
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#fef3c7' }}>
          <DollarSign size={24} color="#d97706" />
        </div>
        <div className="stat-content">
          <h3>Total Value</h3>
          <p>${(analytics.overview.totalValue / 1000).toFixed(0)}K</p>
          <span className="stat-change positive">+15.7%</span>
        </div>
      </div>
      
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#fee2e2' }}>
          <AlertTriangle size={24} color="#dc2626" />
        </div>
        <div className="stat-content">
          <h3>Active Disasters</h3>
          <p>{analytics.overview.activeDisasters}</p>
          <span className="stat-change negative">-2.1%</span>
        </div>
      </div>
      
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#e0e7ff' }}>
          <Activity size={24} color="#6366f1" />
        </div>
        <div className="stat-content">
          <h3>Response Rate</h3>
          <p>{analytics.overview.responseRate}%</p>
          <span className="stat-change positive">+3.2%</span>
        </div>
      </div>
      
      <div className="analytics-stat-card">
        <div className="stat-icon" style={{ background: '#f0fdf4' }}>
          <Users size={24} color="#16a34a" />
        </div>
        <div className="stat-content">
          <h3>Avg Response Time</h3>
          <p>{analytics.overview.avgResponseTime}h</p>
          <span className="stat-change positive">-0.8h</span>
        </div>
      </div>
    </div>
  );

  const renderResourceAnalytics = () => (
    <div className="resource-analytics-container">
      <div className="analytics-section">
        <h3>Most Allocated Resources</h3>
        <div className="resource-list">
          {analytics.resources.mostAllocated.map((resource, index) => (
            <div key={index} className="resource-item">
              <div className="resource-info">
                <h4>{resource.name}</h4>
                <p>{resource.count} allocations</p>
              </div>
              <div className="resource-bar">
                <div 
                  className="resource-fill" 
                  style={{ width: `${resource.percentage}%` }}
                ></div>
              </div>
              <span className="resource-percentage">{resource.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="analytics-section">
        <h3>Category Distribution</h3>
        <div className="category-chart">
          {analytics.resources.categoryDistribution.map((category, index) => (
            <div key={index} className="category-item">
              <div className="category-color" style={{ background: category.color }}></div>
              <span className="category-name">{category.category}</span>
              <span className="category-value">{category.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDisasterTrends = () => (
    <div className="disaster-trends-container">
      <div className="trends-chart">
        <h3>Monthly Disaster Trends</h3>
        <div className="chart-container">
          {analytics.disasters.map((disaster, index) => (
            <div key={index} className="chart-bar">
              <div 
                className={`bar-fill ${disaster.severity}`}
                style={{ height: `${(disaster.count / 15) * 100}%` }}
              ></div>
              <span className="bar-label">{disaster.month}</span>
              <span className="bar-value">{disaster.count}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="severity-legend">
        <div className="legend-item">
          <div className="legend-color high"></div>
          <span>High Severity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color medium"></div>
          <span>Medium Severity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color low"></div>
          <span>Low Severity</span>
        </div>
      </div>
    </div>
  );

  const renderPerformanceMetrics = () => (
    <div className="performance-container">
      <div className="metrics-section">
        <h3>Response Time Trends</h3>
        <div className="metrics-chart">
          {analytics.performance.responseTime.map((metric, index) => (
            <div key={index} className="metric-item">
              <span className="metric-period">{metric.period}</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ width: `${(metric.time / 5) * 100}%` }}
                ></div>
              </div>
              <span className="metric-value">{metric.time}h</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="metrics-section">
        <h3>Allocation Rate Trends</h3>
        <div className="metrics-chart">
          {analytics.performance.allocationRate.map((metric, index) => (
            <div key={index} className="metric-item">
              <span className="metric-period">{metric.period}</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill success"
                  style={{ width: `${metric.rate}%` }}
                ></div>
              </div>
              <span className="metric-value">{metric.rate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'overview':
        return renderOverviewStats();
      case 'resources':
        return renderResourceAnalytics();
      case 'disasters':
        return renderDisasterTrends();
      case 'performance':
        return renderPerformanceMetrics();
      default:
        return renderOverviewStats();
    }
  };

  return (
    <div className="reports-analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-icon">
            <BarChart3 size={32} color="#2563eb" />
          </div>
          <div>
            <h1>Reports & Analytics</h1>
            <p>Comprehensive insights and performance metrics</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="export-dropdown">
            <button className="btn-export">
              <Download size={16} />
              Export Report
            </button>
            <div className="export-menu">
              {exportFormats.map(format => (
                <button 
                  key={format}
                  className="export-option"
                  onClick={() => handleExport(format)}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="report-types-section">
        <div className="report-types-grid">
          {reportTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                className={`report-type-card ${selectedReport === type.id ? 'active' : ''}`}
                onClick={() => setSelectedReport(type.id)}
              >
                <div className="report-icon">
                  <Icon size={24} color={selectedReport === type.id ? '#2563eb' : '#64748b'} />
                </div>
                <h3>{type.name}</h3>
                <p>{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="analytics-controls">
        <div className="control-group">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="control-group">
          <div className="period-selector">
            <Calendar size={18} />
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="control-group">
          <button className="filter-btn">
            <Filter size={16} />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="analytics-content">
        {renderReportContent()}
      </div>

      {renderPredictionMonitoring()}
    </div>
  );
};

export default ReportsAnalyticsPage;
