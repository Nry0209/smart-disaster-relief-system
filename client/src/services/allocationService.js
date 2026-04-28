const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token") || "";
}

function buildHeaders({ includeJson = true, includeAuth = true } = {}) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function requestJson(url, options = {}, fallbackMessage = "Request failed.") {
  try {
    // Ensure headers include authentication
    const defaultHeaders = buildHeaders({ includeJson: true, includeAuth: true });
    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(url, mergedOptions);
    const rawText = await response.text();

    let data = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      let errorMessage = data.message || fallbackMessage;
      
      // Suppress permission-related errors and provide silent handling
      if (response.status === 403 && (
        errorMessage.includes('Insufficient permissions') || 
        errorMessage.includes('requires different permissions') ||
        errorMessage.includes('Access denied')
      )) {
        // Return a special error object that can be handled silently by the UI
        const permissionError = new Error('PERMISSION_DENIED');
        permissionError.status = 403;
        permissionError.isPermissionError = true;
        throw permissionError;
      }
      
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to API server. Start backend server on http://localhost:5000 and try again."
      );
    }
    throw error;
  }
}

export async function upsertAllocationForReport(reportId, payload) {
  return requestJson(
    `${API_BASE_URL}/api/allocations/by-report/${reportId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "Failed to save allocation."
  );
}

export async function clearAllocationForReport(reportId, payload = {}) {
  return requestJson(
    `${API_BASE_URL}/api/allocations/by-report/${reportId}`,
    {
      method: "DELETE",
      body: JSON.stringify(payload),
    },
    "Failed to clear allocation."
  );
}
