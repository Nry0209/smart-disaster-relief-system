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

export async function createDisasterReport(payload) {
  return requestJson(
    `${API_BASE_URL}/api/disaster-reports`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to create disaster report."
  );
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

  return requestJson(endpoint, {}, "Failed to fetch disaster reports.");
}

export async function fetchDisasterReportById(id) {
  return requestJson(
    `${API_BASE_URL}/api/disaster-reports/${id}`,
    {},
    "Failed to fetch disaster report."
  );
}

export async function updateDisasterReport(id, payload) {
  return requestJson(
    `${API_BASE_URL}/api/disaster-reports/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to update disaster report."
  );
}

export async function deleteDisasterReport(id) {
  return requestJson(
    `${API_BASE_URL}/api/disaster-reports/${id}`,
    {
      method: "DELETE",
    },
    "Failed to delete disaster report."
  );
}
