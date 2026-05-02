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
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue = typeof value === "string" ? value.trim() : value;

    // Treat category=All as no category filter.
    if (key === "category" && typeof normalizedValue === "string" && normalizedValue.toLowerCase() === "all") {
      return;
    }

    if (normalizedValue !== "") {
      searchParams.append(key, normalizedValue);
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
  const data = await parseJsonResponse(response);

  // Normalize common API response shapes to a straight array of items
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.inventory)) arr = data.inventory;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.data?.inventory)) arr = data.data.inventory;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (data && typeof data === 'object' && (data.id || data._id || data.name)) arr = [data];

  // Normalize each item: ensure id/_id strings, numeric stock/min, packageSize, unit, warehouse
  return arr.map((item) => {
    const rawStock = item?.stock ?? item?.quantityAvailable ?? item?.quantity ?? 0;
    const stock = Number(rawStock) || 0;
    const min = Number(item?.min) || 0;
    const id = item?.id || item?._id || item?.inventoryId || "";
    const norm = {
      // keep original identifiers but ensure both id and _id exist as strings
      id: id ? String(id) : "",
      _id: item?._id ? String(item._id) : id ? String(id) : "",
      name: String(item?.name || item?.itemName || "").trim(),
      category: String(item?.category || "").trim(),
      packageSize: String(item?.packageSize || item?.package || "").trim(),
      unit: String(item?.unit || "units").trim(),
      stock,
      min,
      warehouse: String(item?.warehouse || item?.warehouseLocation || "").trim(),
      // preserve raw object for any other fields
      _raw: item,
    };

    return norm;
  });
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
