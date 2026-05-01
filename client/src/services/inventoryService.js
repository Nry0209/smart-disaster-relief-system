const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token") || "";
}

function buildHeaders({ includeJson = true } = {}) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseJsonResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Inventory request failed.");
  }
  return data;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchInventoryItems(params = {}) {
  const query = buildQuery(params);
  const response = await fetch(`${API_BASE_URL}/api/inventory${query}`, {
    headers: buildHeaders({ includeJson: false }),
  });
  return parseJsonResponse(response);
}

export async function fetchInventoryActivity(limit = 20) {
  const response = await fetch(`${API_BASE_URL}/api/inventory/activity?limit=${limit}`, {
    headers: buildHeaders({ includeJson: false }),
  });
  return parseJsonResponse(response);
}

export async function createInventoryItem(payload) {
  const response = await fetch(`${API_BASE_URL}/api/inventory`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}

export async function updateInventoryItem(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}

export async function deleteInventoryItem(id) {
  const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
    body: JSON.stringify({ performedBy: "Inventory Officer" }),
  });

  return parseJsonResponse(response);
}

export async function adjustInventoryStock(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/inventory/${id}/adjust`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}
