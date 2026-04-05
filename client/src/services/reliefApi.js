const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

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
  const response = await fetch(`${API_BASE_URL}/api/inventory/export`);

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