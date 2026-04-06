const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

function buildApiUrl(path) {
  // Use same-origin by default (works with Vite proxy in development).
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Failed to reach the API server. Ensure backend is running and Vite proxy/base URL is configured.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = data && typeof data === "object" ? data.message : data;
    throw new Error(message || "Request failed.");
  }

  return data;
}

export function fetchInventory() {
  return apiRequest("/api/inventory");
}

export function fetchInventorySummary() {
  return apiRequest("/api/inventory/summary");
}

export function fetchInventoryTransactions(limit = 10) {
  return apiRequest(`/api/inventory/transactions?limit=${encodeURIComponent(limit)}`);
}

export function createInventoryItem(payload) {
  return apiRequest("/api/inventory", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adjustInventoryStock(itemId, payload) {
  return apiRequest(`/api/inventory/stock/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function transferInventoryStock(itemId, payload) {
  return apiRequest(`/api/inventory/${itemId}/transfer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteInventoryItem(itemId) {
  return apiRequest(`/api/inventory/${itemId}`, {
    method: "DELETE",
  });
}

export async function downloadInventoryCsv() {
  let response;
  try {
    response = await fetch(buildApiUrl("/api/inventory/export"));
  } catch {
    throw new Error("Failed to reach the API server. Ensure backend is running and Vite proxy/base URL is configured.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to export inventory.");
  }

  return response.text();
}

export function fetchResourceRequests(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest(`/api/resource-requests${query}`);
}

export function createResourceRequest(payload) {
  return apiRequest("/api/resource-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDonations(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest(`/api/donations${query}`);
}

export function fetchDonationSummary() {
  return apiRequest("/api/donations/summary");
}

export function createDonation(payload) {
  return apiRequest("/api/donations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyDonation(donationId, payload = {}) {
  return apiRequest(`/api/donations/verify/${donationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function rejectDonation(donationId, payload = {}) {
  return apiRequest(`/api/donations/reject/${donationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function verifyResourceRequest(requestId) {
  return apiRequest(`/api/resource-requests/approve/${requestId}`, {
    method: 'PUT',
  });
}

export function rejectResourceRequest(requestId) {
  return apiRequest(`/api/resource-requests/reject/${requestId}`, {
    method: 'PUT',
  });
}