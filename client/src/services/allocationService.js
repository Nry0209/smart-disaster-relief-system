const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function requestJson(url, options = {}, fallbackMessage = "Request failed.") {
  try {
    const response = await fetch(url, options);
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
      throw new Error(data.message || fallbackMessage);
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
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to clear allocation."
  );
}
