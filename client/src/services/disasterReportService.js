const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function createDisasterReport(payload) {
  const response = await fetch(`${API_BASE_URL}/api/disaster-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to create disaster report.");
  }

  return data;
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

  const response = await fetch(endpoint);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch disaster reports.");
  }

  return data;
}
