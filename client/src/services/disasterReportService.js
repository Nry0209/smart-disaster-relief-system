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

export async function createDisasterReport(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/disaster-reports`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(`Server responded with invalid JSON: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`Network error: Unable to reach server at ${API_BASE_URL}. Make sure the server is running.`);
    }
    throw error;
  }
}

export async function fetchDisasterReports(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  const endpoint = query
    ? `${API_BASE_URL}/api/disaster-reports?${query}`
    : `${API_BASE_URL}/api/disaster-reports`;

  const response = await fetch(endpoint, {
    headers: getAuthHeaders(false),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch disaster reports.");
  }

  return data;
}

export async function fetchDisasterReportById(id) {
  const response = await fetch(`${API_BASE_URL}/api/disaster-reports/${id}`, {
    headers: getAuthHeaders(false),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch disaster report.");
  }

  return data;
}

export async function updateDisasterReport(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/disaster-reports/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update disaster report.");
  }

  return data;
}

export async function deleteDisasterReport(id) {
  const response = await fetch(`${API_BASE_URL}/api/disaster-reports/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(false),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete disaster report.");
  }

  return data;
}
