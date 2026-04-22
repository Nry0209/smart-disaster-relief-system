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

async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage || "Request failed.");
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

export async function fetchPartners(params = {}) {
  const query = buildQuery(params);
  const response = await fetch(`${API_BASE_URL}/api/partners${query}`, {
    headers: buildHeaders({ includeJson: false, includeAuth: true }),
  });

  const data = await parseResponse(response, "Failed to fetch partners.");
  return data?.data?.partners || [];
}

export async function checkStockAvailability(items) {
  const response = await fetch(`${API_BASE_URL}/api/resource-requests/check-stock`, {
    method: "POST",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify({ items }),
  });

  const data = await parseResponse(response, "Failed to check stock availability.");
  return data.stockChecks || [];
}

export async function createResourceRequest(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resource-requests`, {
    method: "POST",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response, "Failed to create resource request.");
  return data.resourceRequest;
}

export async function createPublicDonation(payload) {
  const response = await fetch(`${API_BASE_URL}/api/donations`, {
    method: "POST",
    headers: buildHeaders({ includeJson: true, includeAuth: false }),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response, "Failed to submit donation.");
  return data.donation;
}

export async function fetchDonations(params = {}) {
  const query = buildQuery(params);
  const response = await fetch(`${API_BASE_URL}/api/donations${query}`, {
    headers: buildHeaders({ includeJson: false, includeAuth: true }),
  });

  const data = await parseResponse(response, "Failed to fetch donations.");
  return data.donations || [];
}

export async function verifyDonationById(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/donations/${id}/verify`, {
    method: "PATCH",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify(payload),
  });

  return parseResponse(response, "Failed to verify donation.");
}

export async function fetchAllocations(params = {}) {
  const query = buildQuery(params);
  const response = await fetch(`${API_BASE_URL}/api/allocations${query}`, {
    headers: buildHeaders({ includeJson: false, includeAuth: true }),
  });

  const data = await parseResponse(response, "Failed to fetch allocations.");
  return data.allocations || [];
}

export async function fetchTrackingRecords(params = {}) {
  const query = buildQuery(params);
  const response = await fetch(`${API_BASE_URL}/api/tracking${query}`, {
    headers: buildHeaders({ includeJson: false, includeAuth: true }),
  });

  const data = await parseResponse(response, "Failed to fetch tracking records.");
  return data?.data?.trackingRecords || [];
}

export async function createTrackingRecord(payload) {
  const response = await fetch(`${API_BASE_URL}/api/tracking`, {
    method: "POST",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response, "Failed to create tracking record.");
  return data?.data?.trackingRecord;
}

export async function updateTrackingRecordById(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/tracking/${id}`, {
    method: "PUT",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response, "Failed to update tracking record.");
  return data?.data?.trackingRecord;
}

export async function confirmTrackingDelivery(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/tracking/${id}/status`, {
    method: "PATCH",
    headers: buildHeaders({ includeJson: true, includeAuth: true }),
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response, "Failed to confirm delivery.");
  return data?.data?.trackingRecord;
}
