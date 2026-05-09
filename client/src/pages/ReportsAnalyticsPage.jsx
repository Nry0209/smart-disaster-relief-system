import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, Search, FileText, Activity, Users, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deletePredictionLogById, getPredictionLogs } from '../services/predictionService';
import { fetchDisasterReports } from '../services/disasterReportService';

function getPredictionAllocatedDays(log) {
  const parsed = Number(log?.allocatedDays);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

function buildLinePath(points, width, height, padding) {
  if (!points.length) return '';

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return points
    .map((point, index) => {
      const x = padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - (point.value / maxValue) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildSeriesPath(values, width, height, padding, maxValue) {
  if (!values || values.length === 0) return '';
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const n = values.length;
  let path = '';
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      // break segment
      continue;
    }
    const x = padding.left + (n === 1 ? innerWidth / 2 : (i / (n - 1)) * innerWidth);
    const y = padding.top + innerHeight - (v / maxValue) * innerHeight;
    const cmd = path === '' || path.endsWith('Z') ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    // if previous values were null we should start a new M; check previous
    const prev = (() => {
      for (let j = i - 1; j >= 0; j--) if (values[j] !== null && values[j] !== undefined) return true; return false;
    })();
    if (!prev && path !== '') {
      // ensure separation
    }
    // If previous value was null, start a new subpath
    if (i > 0 && (values[i - 1] === null || values[i - 1] === undefined)) {
      path += ` ${cmd}`;
    } else {
      path += ` ${cmd}`;
    }
  }
  return path.trim();
}

const ReportsAnalyticsPage = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [predictionLogs, setPredictionLogs] = useState([]);
  const [predictionLogsLoading, setPredictionLogsLoading] = useState(false);
  const [predictionLogsError, setPredictionLogsError] = useState('');
  const [disasterTrends, setDisasterTrends] = useState([]);
  const [disasterTrendsLoading, setDisasterTrendsLoading] = useState(false);
  const [predictionDeleteLoadingId, setPredictionDeleteLoadingId] = useState('');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null); // { index, x, y }

  // Series visibility (persist to localStorage)
  const [showAllocated, setShowAllocated] = useState(() => {
    try { const v = localStorage.getItem('reports_trend_showAllocated'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });
  const [showFood, setShowFood] = useState(() => {
    try { const v = localStorage.getItem('reports_trend_showFood'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });
  const [showWater, setShowWater] = useState(() => {
    try { const v = localStorage.getItem('reports_trend_showWater'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });
  const [showMedicine, setShowMedicine] = useState(() => {
    try { const v = localStorage.getItem('reports_trend_showMedicine'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });

  const toggleSeries = (key) => {
    try {
      if (key === 'allocated') {
        const next = !showAllocated; setShowAllocated(next); localStorage.setItem('reports_trend_showAllocated', next ? '1' : '0');
      } else if (key === 'food') {
        const next = !showFood; setShowFood(next); localStorage.setItem('reports_trend_showFood', next ? '1' : '0');
      } else if (key === 'water') {
        const next = !showWater; setShowWater(next); localStorage.setItem('reports_trend_showWater', next ? '1' : '0');
      } else if (key === 'medicine') {
        const next = !showMedicine; setShowMedicine(next); localStorage.setItem('reports_trend_showMedicine', next ? '1' : '0');
      }
    } catch (e) {
      // ignore storage errors
    }
  };

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

  const recentLogs = predictionLogs.slice(0, 12).slice().reverse();
  // Build aligned arrays for each series (null when missing)
  const labels = recentLogs.map((log) => new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const seriesAllocated = recentLogs.map((log) => getPredictionAllocatedDays(log));
  const seriesFood = recentLogs.map((log) => {
    const v = Array.isArray(log.predictedResources)
      ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'food')?.quantity || log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'food')?.recommendedQuantity || 0)
      : Number(log.foodNeeded || 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const seriesWater = recentLogs.map((log) => {
    const v = Array.isArray(log.predictedResources)
      ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'water')?.quantity || log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'water')?.recommendedQuantity || 0)
      : Number(log.waterNeeded || 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const seriesMedicine = recentLogs.map((log) => {
    const v = Array.isArray(log.predictedResources)
      ? Number(log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'medicine')?.quantity || log.predictedResources.find((item) => String(item.itemName).toLowerCase() === 'medicine')?.recommendedQuantity || 0)
      : Number(log.medicineNeeded || 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  });

  const trendWidth = 860;
  const trendHeight = 240;
  const trendPadding = { top: 20, right: 20, bottom: 36, left: 44 };

  const allValues = [...seriesAllocated.filter(Boolean), ...seriesFood.filter(Boolean), ...seriesWater.filter(Boolean), ...seriesMedicine.filter(Boolean)];
  const trendMax = Math.max(...allValues, 1);
  const allocatedPath = buildSeriesPath(seriesAllocated, trendWidth, trendHeight, trendPadding, trendMax);
  const foodPath = buildSeriesPath(seriesFood, trendWidth, trendHeight, trendPadding, trendMax);
  const waterPath = buildSeriesPath(seriesWater, trendWidth, trendHeight, trendPadding, trendMax);
  const medicinePath = buildSeriesPath(seriesMedicine, trendWidth, trendHeight, trendPadding, trendMax);

  const handleExport = (format) => {
    console.log(`Exporting ${selectedReport} report as ${format}`);
  };

  const handleRemovePredictionLog = async (logId) => {
    if (!window.confirm('Remove this prediction log? This cannot be undone.')) {
      return;
    }

    try {
      setPredictionDeleteLoadingId(logId);
      await deletePredictionLogById(logId);
      await loadPredictionLogs();
    } catch (error) {
      setPredictionLogsError(error?.response?.data?.message || error.message || 'Failed to remove prediction log.');
    } finally {
      setPredictionDeleteLoadingId('');
    }
  };

  async function loadPredictionLogs() {
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
  }

  useEffect(() => {
    if (!canViewPredictionLogs) {
      setPredictionLogs([]);
      setPredictionLogsError('');
      return;
    }

    loadPredictionLogs();
  }, [canViewPredictionLogs]);

  useEffect(() => {
    // Load disaster reports to compute trends when the report view is shown
    const loadDisasterTrends = async () => {
      try {
        setDisasterTrendsLoading(true);
        // fetch recent disaster reports (no auth required for listing in this app)
        const resp = await fetchDisasterReports();
        const reports = Array.isArray(resp) ? resp : resp?.data || [];

        // compute monthly counts for the last 6 months
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString(undefined, { month: 'short' }) });
        }

        const counts = months.map((m) => ({ month: m.label, count: 0, severity: 'medium' }));

        reports.forEach((r) => {
          const d = new Date(r.createdAt || r.eventDate || r._id && undefined);
          if (isNaN(d)) return;
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          const idx = months.findIndex((mm) => mm.key === key);
          if (idx >= 0) {
            counts[idx].count += 1;
            // rough severity tally: prefer highest severity seen
            const sevOrder = { low: 0, medium: 1, high: 2, critical: 3 };
            const current = counts[idx].severity || 'medium';
            const picked = (sevOrder[r.severity] || sevOrder[r.priority] || 1) > (sevOrder[current] || 1) ? (r.severity || r.priority) : current;
            counts[idx].severity = picked;
          }
        });

        setDisasterTrends(counts);
      } catch (err) {
        setDisasterTrends([]);
      } finally {
        setDisasterTrendsLoading(false);
      }
    };

    loadDisasterTrends();
  }, []);

  const renderPredictionMonitoring = () => {
    if (!canViewPredictionLogs) {
      return null;
    }

    return (
      <div className="prediction-monitoring-panel">
        <div className="prediction-monitoring-header">
          <h2>Prediction Monitoring</h2>
          <p>Recent model runs generated from allocation workflow.</p>
        </div>

        {predictionLogsLoading ? (
          <p className="allocation-info-inline">Loading prediction logs...</p>
        ) : predictionLogsError ? (
          <p className="allocation-error-inline">{predictionLogsError}</p>
        ) : predictionLogs.length === 0 ? (
          <p className="allocation-info-inline">No prediction logs available yet.</p>
        ) : (
          <div className="prediction-monitoring-stack">
            <div className="prediction-trend-card">
              <div className="prediction-trend-header">
                <div>
                  <h3>Prediction Trend Analysis</h3>
                  <p>Allocated days over the most recent model runs.</p>
                </div>
                <div className="prediction-trend-legend">
                  <button type="button" className={`trend-legend-item ${showAllocated ? 'active' : 'inactive'}`} onClick={() => toggleSeries('allocated')}>
                    <span className="trend-legend-dot" style={{ background: 'linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)' }}></span>
                    <span>Allocated Days</span>
                  </button>
                  <button type="button" className={`trend-legend-item ${showFood ? 'active' : 'inactive'}`} onClick={() => toggleSeries('food')}>
                    <span className="trend-legend-dot" style={{ background: '#10b981' }}></span>
                    <span>Food</span>
                  </button>
                  <button type="button" className={`trend-legend-item ${showWater ? 'active' : 'inactive'}`} onClick={() => toggleSeries('water')}>
                    <span className="trend-legend-dot" style={{ background: '#06b6d4' }}></span>
                    <span>Water</span>
                  </button>
                  <button type="button" className={`trend-legend-item ${showMedicine ? 'active' : 'inactive'}`} onClick={() => toggleSeries('medicine')}>
                    <span className="trend-legend-dot" style={{ background: '#f97316' }}></span>
                    <span>Medicine</span>
                  </button>
                </div>
              </div>

              {allValues.length === 0 ? (
                <p className="allocation-info-inline">No prediction series data available yet.</p>
              ) : (
                <>
                  {seriesAllocated.filter(Boolean).length === 0 && (seriesFood.filter(Boolean).length > 0 || seriesWater.filter(Boolean).length > 0 || seriesMedicine.filter(Boolean).length > 0) && (
                    <p className="allocation-info-inline">Prediction logs exist but none include allocatedDays. Allocated-days will appear after predictions with a valid disasterId are recorded.</p>
                  )}
                  <div className="prediction-trend-chart-wrap" style={{ position: 'relative' }}>
                    <svg
                      className="prediction-trend-svg"
                      viewBox={`0 0 ${trendWidth} ${trendHeight}`}
                      role="img"
                      aria-label="Prediction trend line graph"
                      onMouseLeave={() => setHoveredTrendPoint(null)}
                    >
                      <defs>
                        <linearGradient id="trendLineGradient" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                      </defs>

                      <line x1={trendPadding.left} y1={trendPadding.top} x2={trendPadding.left} y2={trendHeight - trendPadding.bottom} className="trend-axis" />
                      <line x1={trendPadding.left} y1={trendHeight - trendPadding.bottom} x2={trendWidth - trendPadding.right} y2={trendHeight - trendPadding.bottom} className="trend-axis" />

                      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                        const y = trendPadding.top + (trendHeight - trendPadding.top - trendPadding.bottom) * (1 - fraction);
                        return (
                          <g key={fraction}>
                            <line x1={trendPadding.left} y1={y} x2={trendWidth - trendPadding.right} y2={y} className="trend-grid-line" />
                            <text x={trendPadding.left - 10} y={y + 4} textAnchor="end" className="trend-axis-label">
                              {Math.round(trendMax * fraction)}
                            </text>
                          </g>
                        );
                      })}

                      {showFood && foodPath ? <path d={foodPath} className="trend-line-food" /> : null}
                      {showWater && waterPath ? <path d={waterPath} className="trend-line-water" /> : null}
                      {showMedicine && medicinePath ? <path d={medicinePath} className="trend-line-medicine" /> : null}
                      {showAllocated && allocatedPath ? <path d={allocatedPath} className="trend-line" /> : null}

                      {/* Vertical crosshair guide on hover */}
                      {hoveredTrendPoint !== null && (() => {
                        const innerWidth = trendWidth - trendPadding.left - trendPadding.right;
                        const xGuide = trendPadding.left + (labels.length === 1 ? innerWidth / 2 : (hoveredTrendPoint / (labels.length - 1)) * innerWidth);
                        return (
                          <line
                            x1={xGuide} y1={trendPadding.top}
                            x2={xGuide} y2={trendHeight - trendPadding.bottom}
                            className="trend-crosshair"
                          />
                        );
                      })()}

                      {labels.map((label, index) => {
                        const innerWidth = trendWidth - trendPadding.left - trendPadding.right;
                        const innerHeight = trendHeight - trendPadding.top - trendPadding.bottom;
                        const x = trendPadding.left + (labels.length === 1 ? innerWidth / 2 : (index / (labels.length - 1)) * innerWidth);
                        const isHov = hoveredTrendPoint === index;
                        const yFor = (v) => (v == null ? null : trendPadding.top + innerHeight - (v / trendMax) * innerHeight);
                        const yAlloc = yFor(seriesAllocated[index]);
                        const yFood = yFor(seriesFood[index]);
                        const yWater = yFor(seriesWater[index]);
                        const yMed = yFor(seriesMedicine[index]);

                        const dots = [];
                        if (yFood !== null && showFood) dots.push(
                          <circle key={`food-${index}`} cx={x} cy={yFood} r={isHov ? 5.5 : 3.5} className={`trend-point-food${isHov ? ' trend-point-active' : ''}`} />
                        );
                        if (yWater !== null && showWater) dots.push(
                          <circle key={`water-${index}`} cx={x} cy={yWater} r={isHov ? 5.5 : 3.5} className={`trend-point-water${isHov ? ' trend-point-active' : ''}`} />
                        );
                        if (yMed !== null && showMedicine) dots.push(
                          <circle key={`med-${index}`} cx={x} cy={yMed} r={isHov ? 5.5 : 3.5} className={`trend-point-medicine${isHov ? ' trend-point-active' : ''}`} />
                        );
                        if (yAlloc !== null && showAllocated) dots.push(
                          <circle key={`alloc-${index}`} cx={x} cy={yAlloc} r={isHov ? 6.5 : 4.5} className={`trend-point${isHov ? ' trend-point-active' : ''}`} />
                        );

                        return (
                          <g key={`lbl-${index}`}>
                            {/* Invisible wide hit area for hover */}
                            <rect
                              x={x - (innerWidth / Math.max(labels.length - 1, 1)) / 2}
                              y={trendPadding.top}
                              width={innerWidth / Math.max(labels.length - 1, 1)}
                              height={innerHeight}
                              fill="transparent"
                              onMouseEnter={() => setHoveredTrendPoint(index)}
                              style={{ cursor: 'crosshair' }}
                            />
                            {dots}
                            <text x={x} y={trendHeight - 14} textAnchor="middle" className={`trend-x-label${isHov ? ' trend-x-label-active' : ''}`}>
                              {label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Floating HTML tooltip card */}
                    {hoveredTrendPoint !== null && (() => {
                      const idx = hoveredTrendPoint;
                      const innerWidth = trendWidth - trendPadding.left - trendPadding.right;
                      const xPct = trendPadding.left / trendWidth + (labels.length === 1 ? 0.5 : (idx / (labels.length - 1)) * (innerWidth / trendWidth));
                      const rows = [
                        showAllocated && seriesAllocated[idx] != null && { label: 'Allocated Days', value: seriesAllocated[idx], color: '#60a5fa' },
                        showFood      && seriesFood[idx]      != null && { label: 'Food',           value: seriesFood[idx],      color: '#10b981' },
                        showWater     && seriesWater[idx]     != null && { label: 'Water',          value: seriesWater[idx],     color: '#06b6d4' },
                        showMedicine  && seriesMedicine[idx]  != null && { label: 'Medicine',       value: seriesMedicine[idx],  color: '#f97316' },
                      ].filter(Boolean);
                      const leftPct = xPct * 100;
                      const alignRight = leftPct > 65;
                      return rows.length > 0 ? (
                        <div
                          className="trend-hover-tooltip"
                          style={{
                            left: alignRight ? 'auto' : `calc(${leftPct}% + 10px)`,
                            right: alignRight ? `calc(${100 - leftPct}% + 10px)` : 'auto',
                          }}
                        >
                          <div className="trend-hover-tooltip-date">{labels[idx]}</div>
                          {rows.map((row) => (
                            <div key={row.label} className="trend-hover-tooltip-row">
                              <span className="trend-hover-tooltip-dot" style={{ background: row.color }} />
                              <span className="trend-hover-tooltip-label">{row.label}</span>
                              <span className="trend-hover-tooltip-val">{Number(row.value).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
              )}
            </div>

            <div className="prediction-monitoring-table-wrap">
            <table className="prediction-monitoring-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Days</th>
                  <th>Disaster</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Affected</th>
                  <th>Food</th>
                  <th>Water</th>
                  <th>Medicine</th>
                  <th>Generated By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {predictionLogs.map((log) => {
                  const allocatedDays = getPredictionAllocatedDays(log);
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
                      <td>{allocatedDays ?? '-'}</td>
                      <td>{log.disasterType || '-'}</td>
                      <td>{log.location || '-'}</td>
                      <td>{String(log.severity || '-').toUpperCase()}</td>
                      <td>{Number(log.affectedPeople || 0).toLocaleString()}</td>
                      <td>{food.toLocaleString()}</td>
                      <td>{water.toLocaleString()}</td>
                      <td>{medicine.toLocaleString()}</td>
                      <td>{log.generatedBy?.fullName || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          onClick={() => handleRemovePredictionLog(log.id)}
                          disabled={predictionDeleteLoadingId === log.id}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

  const renderDisasterTrends = () => {
    const maxCount = Math.max(...(disasterTrends.length ? disasterTrends.map(d => d.count) : [1]), 1);
    const displayData = disasterTrendsLoading ? [] : disasterTrends;
    return (
      <div className="disaster-trends-container">
        {disasterTrendsLoading && (
          <p className="allocation-info-inline">Loading disaster trends...</p>
        )}
        <div className="trends-chart">
          <h3>Monthly Disaster Trends</h3>
          <div className="chart-container">
            {displayData.length === 0 && !disasterTrendsLoading && (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 'auto' }}>No disaster data available for the period.</p>
            )}
            {displayData.map((disaster, index) => {
              const heightPct = Math.max(4, Math.min(100, (disaster.count / maxCount) * 100));
              const sev = disaster.severity || 'medium';
              const sevLabel = sev.charAt(0).toUpperCase() + sev.slice(1);
              const isHovered = hoveredBar === index;
              return (
                <div
                  key={index}
                  className={`chart-bar${isHovered ? ' hovered' : ''}`}
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{ position: 'relative' }}
                >
                  {isHovered && (
                    <div className="bar-tooltip">
                      <div className="bar-tooltip-month">{disaster.month}</div>
                      <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">Disasters</span>
                        <span className="bar-tooltip-value">{disaster.count}</span>
                      </div>
                      <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">Severity</span>
                        <span className={`bar-tooltip-sev ${sev}`}>{sevLabel}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`bar-fill ${sev}${isHovered ? ' bar-fill-hovered' : ''}`}
                    style={{ height: `${heightPct}%` }}
                  ></div>
                  <span className="bar-label">{disaster.month}</span>
                  <span className="bar-value">{disaster.count}</span>
                </div>
              );
            })}
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
  };

  const renderPerformanceMetrics = () => (
    <div className="performance-container">
      <div className="metrics-section">
        <h3>Response Time Trends</h3>
        <div className="metrics-chart">
          {analytics.performance.responseTime.map((metric, index) => {
            const key = `rt-${index}`;
            const isHov = hoveredMetric === key;
            return (
              <div
                key={index}
                className={`metric-item${isHov ? ' metric-item-hovered' : ''}`}
                onMouseEnter={() => setHoveredMetric(key)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <span className="metric-period">{metric.period}</span>
                <div className="metric-bar">
                  <div
                    className={`metric-fill${isHov ? ' metric-fill-hovered' : ''}`}
                    style={{ width: `${(metric.time / 5) * 100}%` }}
                  >
                    {isHov && (
                      <span className="metric-bar-tooltip">{metric.time}h</span>
                    )}
                  </div>
                </div>
                <span className={`metric-value${isHov ? ' metric-value-hovered' : ''}`}>{metric.time}h</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="metrics-section">
        <h3>Allocation Rate Trends</h3>
        <div className="metrics-chart">
          {analytics.performance.allocationRate.map((metric, index) => {
            const key = `ar-${index}`;
            const isHov = hoveredMetric === key;
            return (
              <div
                key={index}
                className={`metric-item${isHov ? ' metric-item-hovered' : ''}`}
                onMouseEnter={() => setHoveredMetric(key)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <span className="metric-period">{metric.period}</span>
                <div className="metric-bar">
                  <div
                    className={`metric-fill success${isHov ? ' metric-fill-hovered' : ''}`}
                    style={{ width: `${metric.rate}%` }}
                  >
                    {isHov && (
                      <span className="metric-bar-tooltip">{metric.rate}%</span>
                    )}
                  </div>
                </div>
                <span className={`metric-value${isHov ? ' metric-value-hovered' : ''}`}>{metric.rate}%</span>
              </div>
            );
          })}
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
