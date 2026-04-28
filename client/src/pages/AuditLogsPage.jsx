import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Download, Calendar, User, Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText, Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { fetchAuditLogs } from '../services/auditLogService';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('7days');
  const [expandedLog, setExpandedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock users
  const defaultUsers = [
    { id: 'user1', name: 'Admin User', role: 'Administrator' },
    { id: 'user2', name: 'DMC Officer', role: 'DMC Officer' },
    { id: 'user3', name: 'NGO Manager', role: 'NGO Manager' },
    { id: 'user4', name: 'System Admin', role: 'System Admin' }
  ];

  // Mock audit logs
  const mockLogs = [
    {
      id: 1,
      timestamp: '2026-03-31T10:30:00Z',
      user: 'user1',
      userName: 'Admin User',
      action: 'LOGIN',
      resource: 'System',
      details: 'Successful login to admin dashboard',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'success',
      severity: 'low',
      category: 'Authentication'
    },
    {
      id: 2,
      timestamp: '2026-03-31T10:25:00Z',
      user: 'user2',
      userName: 'DMC Officer',
      action: 'RESOURCE_ALLOCATE',
      resource: 'Medical Supplies',
      details: 'Allocated 50 units of medical supplies to DIS-001',
      resourceId: 'MED-001',
      quantity: 50,
      location: 'Chennai, Tamil Nadu',
      ipAddress: '192.168.1.101',
      status: 'success',
      severity: 'medium',
      category: 'Resource Management'
    },
    {
      id: 3,
      timestamp: '2026-03-31T10:20:00Z',
      user: 'user3',
      userName: 'NGO Manager',
      action: 'DISASTER_REPORT',
      resource: 'Flood Response',
      details: 'Submitted flood damage assessment report',
      reportId: 'RPT-2026-001',
      affectedArea: 'Coastal Region',
      severity: 'high',
      ipAddress: '192.168.1.102',
      status: 'success',
      category: 'Reporting'
    },
    {
      id: 4,
      timestamp: '2026-03-31T10:15:00Z',
      user: 'user1',
      userName: 'Admin User',
      action: 'USER_CREATE',
      resource: 'User Account',
      details: 'Created new user account for DMC Officer',
      newUserId: 'user5',
      role: 'DMC Officer',
      ipAddress: '192.168.1.100',
      status: 'success',
      severity: 'medium',
      category: 'User Management'
    },
    {
      id: 5,
      timestamp: '2026-03-31T10:10:00Z',
      user: 'user4',
      userName: 'System Admin',
      action: 'SYSTEM_BACKUP',
      resource: 'Database',
      details: 'Performed automated system backup',
      backupSize: '2.4GB',
      backupLocation: 'Cloud Storage',
      ipAddress: '192.168.1.103',
      status: 'success',
      severity: 'low',
      category: 'System'
    },
    {
      id: 6,
      timestamp: '2026-03-31T10:05:00Z',
      user: 'user2',
      userName: 'DMC Officer',
      action: 'LOGIN_FAILED',
      resource: 'System',
      details: 'Failed login attempt - invalid credentials',
      failureReason: 'Invalid password',
      ipAddress: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'failure',
      severity: 'high',
      category: 'Authentication'
    },
    {
      id: 7,
      timestamp: '2026-03-31T10:00:00Z',
      user: 'user3',
      userName: 'NGO Manager',
      action: 'RESOURCE_REQUEST',
      resource: 'Emergency Supplies',
      details: 'Requested emergency supplies for disaster response',
      requestId: 'REQ-2026-001',
      urgency: 'high',
      ipAddress: '192.168.1.102',
      status: 'success',
      severity: 'medium',
      category: 'Resource Management'
    },
    {
      id: 8,
      timestamp: '2026-03-31T09:55:00Z',
      user: 'user1',
      userName: 'Admin User',
      action: 'PERMISSION_UPDATE',
      resource: 'User Permissions',
      details: 'Updated permissions for DMC Officer role',
      modifiedUserId: 'user2',
      oldPermissions: ['read', 'write'],
      newPermissions: ['read', 'write', 'delete'],
      ipAddress: '192.168.1.100',
      status: 'success',
      severity: 'high',
      category: 'User Management'
    }
  ];

  const users = useMemo(() => {
    const derivedUsers = new Map();

    logs.forEach((log) => {
      if (!log?.user) {
        return;
      }

      derivedUsers.set(String(log.user), {
        id: String(log.user),
        name: log.userName || String(log.user),
        role: log.userRole || "System",
      });
    });

    return derivedUsers.size ? Array.from(derivedUsers.values()) : defaultUsers;
  }, [logs]);

  async function loadLogs() {
    try {
      setIsLoading(true);

      const auditLogs = await fetchAuditLogs({ limit: 200 });
      const normalizedLogs = Array.isArray(auditLogs)
        ? auditLogs.map((entry, index) => ({
            id: String(entry.id || entry._id || `audit-${index}`),
            timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
            user: String(entry.user || ""),
            userName: entry.userName || entry.userEmail || "System",
            userRole: entry.userRole || "System",
            action: entry.action || "UNKNOWN",
            resource: entry.resource || entry.category || "System",
            details: entry.details || entry.rawDescription || "Activity recorded",
            ipAddress: entry.ipAddress || "-",
            userAgent: entry.userAgent || "N/A",
            status: entry.status || "success",
            severity: entry.severity || "low",
            category: entry.category || entry.resource || "System",
          }))
        : [];

      setLogs(normalizedLogs);
      setFilteredLogs(normalizedLogs);
    } catch (loadError) {
      console.error("Failed to load audit logs:", loadError);
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, selectedAction, selectedUser, selectedDateRange, logs]);

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by action
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filter by user
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.user === selectedUser);
    }

    // Filter by date range
    const now = new Date();
    const filterDate = new Date();
    switch (selectedDateRange) {
      case '1day':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        break;
    }
    filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'READ':
        return <Eye size={16} />;
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <FileText size={16} />;
      case 'PERFORMANCE':
        return <Clock size={16} />;
      case 'SUSPICIOUS_REQUEST':
        return <AlertTriangle size={16} />;
      case 'LOGIN':
      case 'LOGIN_FAILED':
        return <User size={16} />;
      case 'RESOURCE_ALLOCATE':
      case 'RESOURCE_REQUEST':
        return <FileText size={16} />;
      case 'DISASTER_REPORT':
        return <AlertTriangle size={16} />;
      case 'USER_CREATE':
      case 'USER_UPDATE':
      case 'PERMISSION_UPDATE':
        return <Shield size={16} />;
      case 'SYSTEM_BACKUP':
        return <RefreshCw size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} color="#16a34a" />;
      case 'failure':
        return <XCircle size={16} color="#dc2626" />;
      default:
        return <Clock size={16} color="#64748b" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#16a34a';
      default:
        return '#64748b';
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const exportLogs = (format) => {
    if (!filteredLogs.length) {
      return;
    }

    if (format === 'CSV') {
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Status', 'Severity', 'Details'];
      const rows = filteredLogs.map((log) => [
        formatDate(log.timestamp),
        log.userName,
        log.userRole || '',
        log.action,
        log.resource,
        log.status,
        log.severity,
        String(log.details || '').replace(/"/g, '""'),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((value) => `"${String(value ?? '')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-logs.csv';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Audit Logs</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Audit Logs</h1>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Resource</th><th>Status</th><th>Severity</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map((log) => `
                <tr>
                  <td>${formatDate(log.timestamp)}</td>
                  <td>${log.userName}</td>
                  <td>${log.userRole || ''}</td>
                  <td>${log.action}</td>
                  <td>${log.resource}</td>
                  <td>${log.status}</td>
                  <td>${log.severity}</td>
                  <td>${String(log.details || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const refreshLogs = async () => {
    await loadLogs();
  };

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'READ', label: 'Read' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'PERFORMANCE', label: 'Performance' },
    { value: 'SUSPICIOUS_REQUEST', label: 'Security Alert' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGIN_FAILED', label: 'Failed Login' },
    { value: 'RESOURCE_ALLOCATE', label: 'Resource Allocation' },
    { value: 'RESOURCE_REQUEST', label: 'Resource Request' },
    { value: 'DISASTER_REPORT', label: 'Disaster Report' },
    { value: 'USER_CREATE', label: 'User Creation' },
    { value: 'PERMISSION_UPDATE', label: 'Permission Update' },
    { value: 'SYSTEM_BACKUP', label: 'System Backup' }
  ];

  const dateRanges = [
    { value: '1day', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' }
  ];

  return (
    <div className="audit-logs-page">
      {/* Header */}
      <div className="audit-header">
        <div className="header-content">
          <div className="header-icon">
            <Shield size={32} color="#2563eb" />
          </div>
          <div>
            <h1>Audit Logs</h1>
            <p>System activity and security monitoring</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={refreshLogs}>
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            Refresh
          </button>
          <div className="export-dropdown">
            <button className="btn-export">
              <Download size={16} />
              Export
            </button>
            <div className="export-menu">
              <button className="export-option" onClick={() => exportLogs('CSV')}>
                Export as CSV
              </button>
              <button className="export-option" onClick={() => exportLogs('PDF')}>
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="filter-group">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <select 
            value={selectedAction} 
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={selectedUser} 
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={selectedDateRange} 
            onChange={(e) => setSelectedDateRange(e.target.value)}
          >
            {dateRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <button className="filter-btn">
            <Filter size={16} />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Logs Summary */}
      <div className="logs-summary">
        <div className="summary-card">
          <div className="summary-icon success">
            <CheckCircle size={20} />
          </div>
          <div className="summary-content">
            <h3>Successful Actions</h3>
            <p>{filteredLogs.filter(log => log.status === 'success').length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon failure">
            <XCircle size={20} />
          </div>
          <div className="summary-content">
            <h3>Failed Actions</h3>
            <p>{filteredLogs.filter(log => log.status === 'failure').length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon high">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-content">
            <h3>High Severity</h3>
            <p>{filteredLogs.filter(log => log.severity === 'high').length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon total">
            <FileText size={20} />
          </div>
          <div className="summary-content">
            <h3>Total Logs</h3>
            <p>{filteredLogs.length}</p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="no-logs">
                  No audit logs found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className={`log-row ${log.status}`}>
                    <td className="timestamp">
                      <Clock size={14} />
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="user">
                      <div className="user-info">
                        <User size={14} />
                        <div>
                          <div className="user-name">{log.userName}</div>
                          <div className="user-role">{users.find(u => u.id === log.user)?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="action">
                      <div className="action-cell">
                        {getActionIcon(log.action)}
                        <span>{log.action.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="resource">{log.resource}</td>
                    <td className="details">
                      <div className="details-text">
                        {log.details.length > 50 
                          ? `${log.details.substring(0, 50)}...` 
                          : log.details}
                      </div>
                    </td>
                    <td className="status">
                      <div className="status-cell">
                        {getStatusIcon(log.status)}
                        <span className={`status-badge ${log.status}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="severity">
                      <span 
                        className="severity-badge"
                        style={{ color: getSeverityColor(log.severity) }}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="action-btn"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        <Eye size={14} />
                        {expandedLog === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="expanded-details">
                      <td colSpan={8}>
                        <div className="log-details">
                          <div className="details-grid">
                            <div className="detail-item">
                              <label>Full Details:</label>
                              <p>{log.details}</p>
                            </div>
                            <div className="detail-item">
                              <label>IP Address:</label>
                              <p>{log.ipAddress}</p>
                            </div>
                            <div className="detail-item">
                              <label>User Agent:</label>
                              <p>{log.userAgent || 'N/A'}</p>
                            </div>
                            <div className="detail-item">
                              <label>Category:</label>
                              <p>{log.category}</p>
                            </div>
                            {log.resourceId && (
                              <div className="detail-item">
                                <label>Resource ID:</label>
                                <p>{log.resourceId}</p>
                              </div>
                            )}
                            {log.quantity && (
                              <div className="detail-item">
                                <label>Quantity:</label>
                                <p>{log.quantity}</p>
                              </div>
                            )}
                            {log.location && (
                              <div className="detail-item">
                                <label>Location:</label>
                                <p>{log.location}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogsPage;
