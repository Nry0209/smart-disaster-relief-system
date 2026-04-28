const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem("token");
  const headers = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchAuditLogs(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  const endpoint = query ? `${API_BASE_URL}/api/audit-logs?${query}` : `${API_BASE_URL}/api/audit-logs`;

  const response = await fetch(endpoint, {
    headers: getAuthHeaders(false),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch audit logs.");
  }

  return data?.data?.auditLogs || [];
}